/**
 * scripts/ensure-indexes.ts
 *
 * One-time migration: ensures all required MongoDB indexes exist.
 * Safe to run multiple times (createIndex is idempotent).
 *
 * Usage:
 *   npx tsx scripts/ensure-indexes.ts
 */

import clientPromise from "../lib/mongodb";

async function main() {
  console.log("Connecting to MongoDB...");
  const client = await clientPromise;
  const db = client.db("groupify");

  // ── submissions ──────────────────────────────────────────────────────────
  // Compound index used by:
  //   - Admin dashboard: fetches all submissions for a formId sorted by submittedAt desc
  //   - Submission count aggregation: $match { formId: { $in: [...] } }
  await db.collection("submissions").createIndex(
    { formId: 1, submittedAt: -1 },
    { name: "submissions_formId_submittedAt", background: true }
  );
  console.log("✓  submissions: { formId: 1, submittedAt: -1 }");

  // ── forms ────────────────────────────────────────────────────────────────
  // Supports queries by userId (My Forms page) and adminEmails ($in check)
  await db.collection("forms").createIndex(
    { userId: 1, createdAt: -1 },
    { name: "forms_userId_createdAt", background: true }
  );
  console.log("✓  forms: { userId: 1, createdAt: -1 }");

  await db.collection("forms").createIndex(
    { adminEmails: 1 },
    { name: "forms_adminEmails", background: true }
  );
  console.log("✓  forms: { adminEmails: 1 }");

  console.log("\nAll indexes ensured successfully.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Error ensuring indexes:", err);
  process.exit(1);
});
