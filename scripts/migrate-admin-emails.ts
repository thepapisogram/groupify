/**
 * scripts/migrate-admin-emails.ts
 *
 * One-time migration: reads all forms with adminEmails, creates accepted invite records,
 * populates confirmedAdmins, and removes adminEmails.
 * Safe to run multiple times.
 *
 * Usage: npx tsx scripts/migrate-admin-emails.ts
 */

import clientPromise from "../lib/mongodb";
import crypto from "crypto";

async function main() {
  console.log("Connecting to MongoDB...");
  const client = await clientPromise;
  const db = client.db("groupify");
  
  const formsCollection = db.collection("forms");
  const invitesCollection = db.collection("invites");

  const forms = await formsCollection.find({ adminEmails: { $exists: true, $not: { $size: 0 } } }).toArray();
  console.log(`Found ${forms.length} forms with adminEmails to migrate.`);

  let migratedCount = 0;

  for (const form of forms) {
    const adminEmails = form.adminEmails as string[];
    const formId = String(form._id);
    const formTitle = form.title;
    
    // Default to a system owner if we can't find one, or just empty
    const ownerEmail = "system@groupify"; 

    // Look for existing confirmedAdmins to preserve them
    const existingConfirmed = new Set<string>((form.confirmedAdmins as string[]) || []);
    let updated = false;

    for (const email of adminEmails) {
      if (!existingConfirmed.has(email)) {
        // Create an accepted invite record
        const token = crypto.randomBytes(8).toString("hex");
        const now = new Date();
        
        await invitesCollection.insertOne({
          _id: token,
          formId,
          formTitle,
          invitedEmail: email,
          invitedBy: ownerEmail, // We might not know the exact owner's email, so we leave it generic or use system
          status: "accepted",
          createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // Backdate 7 days
          expiresAt: now,
          acceptedAt: now,
        } as any);

        existingConfirmed.add(email);
        updated = true;
      }
    }

    if (updated || form.adminEmails !== undefined) {
      // Add confirmedAdmins, remove adminEmails
      await formsCollection.updateOne(
        { _id: form._id },
        { 
          $set: { confirmedAdmins: Array.from(existingConfirmed) },
          $unset: { adminEmails: "" }
        }
      );
      migratedCount++;
    }
  }

  console.log(`Migration complete. Migrated ${migratedCount} forms.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
