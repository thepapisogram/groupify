import type { AuthOptions } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/lib/mongodb";
import { compare } from "bcryptjs";
import { checkRateLimit, getClientIp, RULES } from "@/lib/rate-limit";
import { emailLookupCandidates, normalizeEmail } from "@/lib/validation";
import { isUserVerified, markVerifiedByProvider } from "@/lib/verification";

// Compared against when no account exists, so response time doesn't reveal which emails are registered.
const DUMMY_HASH = "$2b$12$Z6ql/4wk5oJL2kYeQa.fQOrPQSJQR1yY3lTTfi7FerLyiYK3PhmXi";

const INVALID_LOGIN = "Invalid email or password";

export const authOptions: AuthOptions = {
  // @auth/mongodb-adapter is typed against an older mongodb driver than we ship.
  adapter: MongoDBAdapter(clientPromise) as unknown as Adapter,
  session: {
    strategy: "jwt",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: normalizeEmail(profile.email),
          image: profile.picture,
          emailVerified: true,
        };
      },
    }),
    CredentialsProvider({
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        const email = normalizeEmail(credentials?.email);
        const password = credentials?.password;

        if (!email || !password) {
          throw new Error(INVALID_LOGIN);
        }

        const ip = getClientIp((req?.headers ?? {}) as Record<string, unknown>);
        const [perIp, perEmail] = await Promise.all([
          checkRateLimit("login-ip", `${ip}:${email}`, RULES.loginPerIpAndEmail),
          checkRateLimit("login-email", email, RULES.loginPerEmail),
        ]);
        if (!perIp.ok || !perEmail.ok) {
          const minutes = Math.ceil(Math.max(perIp.retryAfter, perEmail.retryAfter) / 60);
          throw new Error(`Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`);
        }

        const client = await clientPromise;
        const db = client.db();

        const user = await db.collection("users").findOne({
          email: { $in: emailLookupCandidates(credentials?.email) },
        });

        if (!user) {
          await compare(password, DUMMY_HASH);
          throw new Error(INVALID_LOGIN);
        }

        if (!user.password) {
          throw new Error("This account uses Google sign-in. Please continue with Google.");
        }

        const isValid = await compare(password, user.password);

        if (!isValid) {
          throw new Error(INVALID_LOGIN);
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub;
        session.user.emailVerified = token.emailVerified;
      }
      return session;
    },
    async jwt({ token, user, account, trigger }) {
      if (user) {
        token.sub = user.id;
        // Google has already verified the address, so record it and skip the email step.
        if (account?.provider === "google") await markVerifiedByProvider(user.id);
      }
      // Refresh the flag at sign-in, after verifying, for older tokens without it, and for as long as it
      // is still false (so confirming on another device clears the reminder on the next page load or focus).
      if (user || trigger === "update" || token.emailVerified !== true) {
        try {
          token.emailVerified = await isUserVerified(token.sub);
        } catch {
          token.emailVerified = token.emailVerified ?? true;
        }
      }
      return token;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
