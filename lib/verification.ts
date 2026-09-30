import { createHash, randomBytes } from "crypto";
import { ObjectId } from "mongodb";
import { accountsCollection, getDb, usersCollection } from "@/lib/db";

export const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Verification needs an email provider to be completable. Without one it is switched off
 * (everyone counts as verified) rather than locking people out of shared forms.
 */
export function isVerificationEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export const generateToken = (): string => randomBytes(32).toString("hex");

/** Only the hash is stored, so a database leak can't be used to verify accounts. */
export const hashToken = (raw: string): string => createHash("sha256").update(raw).digest("hex");

export function toObjectId(id: string | undefined): ObjectId | null {
  if (!id) return null;
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}

interface VerificationDoc {
  /** sha256 of the token. */
  _id: string;
  userId: string;
  email: string;
  createdAt: Date;
  expiresAt: Date;
}

async function tokens() {
  return (await getDb()).collection<VerificationDoc>("email_verifications");
}

/**
 * Has this account proved it controls its email address?
 *  - a set `emailVerified` (email link, or Google sign-in), or
 *  - a linked Google account (NextAuth stores `null` for those users, but Google already verified the address).
 * Always true when verification is switched off.
 */
export async function isUserVerified(userId: string | undefined): Promise<boolean> {
  if (!isVerificationEnabled()) return true;
  const oid = toObjectId(userId);
  if (!oid) return false;

  const user = await (await usersCollection()).findOne({ _id: oid }, { projection: { emailVerified: 1 } });
  if (!user) return false;
  if (user.emailVerified) return true;

  const google = await (await accountsCollection()).findOne({ userId: oid, provider: "google" });
  return Boolean(google);
}

/** Record that an address was verified by Google, so it never needs the email step. Best effort. */
export async function markVerifiedByProvider(userId: string | undefined): Promise<void> {
  const oid = toObjectId(userId);
  if (!oid) return;
  try {
    await (await usersCollection()).updateOne(
      { _id: oid, emailVerified: { $in: [null, false] } },
      { $set: { emailVerified: new Date() } },
    );
  } catch (error) {
    console.error("Could not mark provider-verified user:", error);
  }
}

/** Create a fresh token for a user, invalidating any earlier ones. Returns the raw token to email. */
export async function issueVerificationToken(userId: string, email: string): Promise<string> {
  const col = await tokens();
  await col.deleteMany({ userId });

  const raw = generateToken();
  const now = new Date();
  await col.insertOne({
    _id: hashToken(raw),
    userId,
    email,
    createdAt: now,
    expiresAt: new Date(now.getTime() + VERIFY_TTL_MS),
  });
  return raw;
}

export type ConsumeResult =
  | { ok: true; email: string; userId: string }
  | { ok: false; reason: "invalid" | "expired" };

/** Use a token once. It is deleted whether or not it turns out to be usable. */
export async function consumeVerificationToken(raw: unknown): Promise<ConsumeResult> {
  if (typeof raw !== "string" || raw.length < 32 || raw.length > 128) {
    return { ok: false, reason: "invalid" };
  }

  const doc = await (await tokens()).findOneAndDelete({ _id: hashToken(raw) });
  if (!doc) return { ok: false, reason: "invalid" };
  if (new Date(doc.expiresAt) <= new Date()) return { ok: false, reason: "expired" };

  const oid = toObjectId(doc.userId);
  if (!oid) return { ok: false, reason: "invalid" };

  // Matching on email means a token can't verify an address the account no longer has.
  const result = await (await usersCollection()).updateOne(
    { _id: oid, email: doc.email },
    { $set: { emailVerified: new Date() } },
  );
  if (result.matchedCount === 0) return { ok: false, reason: "invalid" };

  return { ok: true, email: doc.email, userId: doc.userId };
}
