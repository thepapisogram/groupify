import "next-auth";

declare module "next-auth" {
  interface Session {
    user?: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      /** False only while email verification is required and outstanding. Display use only; the server re-checks. */
      emailVerified?: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    emailVerified?: boolean;
    /** Whether the account proved its email, regardless of whether verification is enforced. */
    emailProven?: boolean;
    /** When this session started (ms), so it can be voided if the account is taken over. */
    authAt?: number;
  }
}
