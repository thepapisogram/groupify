import { hash } from "bcryptjs";
import { getDb, usersCollection } from "@/lib/db";
import { generateToken, hashToken, toObjectId } from "@/lib/verification";

export const RESET_TTL_MS = 60 * 60 * 1000;

/** Reset links are emailed, so like verification this needs an email provider to be usable. */
export function isPasswordResetEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

interface ResetDoc {
  /** sha256 of the token. */
  _id: string;
  userId: string;
  /** The address the link was sent to, so it can't be used after the account's email changes. */
  email: string;
  createdAt: Date;
  expiresAt: Date;
}

async function tokens() {
  return (await getDb()).collection<ResetDoc>("password_resets");
}

/** Create a one-hour token for a user, invalidating any earlier ones. Returns the raw token to email. */
export async function issueResetToken(userId: string, email: string): Promise<string> {
  const col = await tokens();
  await col.deleteMany({ userId });

  const raw = generateToken();
  const now = new Date();
  await col.insertOne({
    _id: hashToken(raw),
    userId,
    email,
    createdAt: now,
    expiresAt: new Date(now.getTime() + RESET_TTL_MS),
  });
  return raw;
}

export type ResetResult = { ok: true } | { ok: false; reason: "invalid" | "expired" };

/**
 * Spend a reset token and set the new password. The token is deleted whether or not it turns out to be usable.
 * Because the link went to the address's inbox, this also proves the person controls it, so the account counts
 * as verified; and every session started before now is voided (in case the old password was known to someone else).
 */
export async function consumeResetToken(raw: unknown, newPassword: string): Promise<ResetResult> {
  if (typeof raw !== "string" || raw.length < 32 || raw.length > 128) {
    return { ok: false, reason: "invalid" };
  }

  const doc = await (await tokens()).findOneAndDelete({ _id: hashToken(raw) });
  if (!doc) return { ok: false, reason: "invalid" };
  if (new Date(doc.expiresAt) <= new Date()) return { ok: false, reason: "expired" };

  const oid = toObjectId(doc.userId);
  if (!oid) return { ok: false, reason: "invalid" };

  const now = new Date();
  const users = await usersCollection();
  const result = await users.updateOne(
    { _id: oid, email: doc.email },
    { $set: { password: await hash(newPassword, 12), sessionsValidAfter: now } },
  );
  if (result.matchedCount === 0) return { ok: false, reason: "invalid" };

  await users.updateOne({ _id: oid, emailVerified: { $in: [null, false] } }, { $set: { emailVerified: now } });
  // Any confirmation link sent before the reset is now moot.
  await (await getDb()).collection("email_verifications").deleteMany({ userId: doc.userId });
  return { ok: true };
}
