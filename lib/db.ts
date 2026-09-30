import type { Collection, Db, Document } from "mongodb";
import clientPromise from "@/lib/mongodb";
import type { FormDoc, InviteDoc, SubmissionDoc } from "@/lib/models";

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db("groupify");
}

export async function formsCollection(): Promise<Collection<FormDoc>> {
  return (await getDb()).collection<FormDoc>("forms");
}

export async function submissionsCollection(): Promise<Collection<SubmissionDoc>> {
  return (await getDb()).collection<SubmissionDoc>("submissions");
}

export async function invitesCollection(): Promise<Collection<InviteDoc>> {
  return (await getDb()).collection<InviteDoc>("invites");
}

/**
 * Users live in the connection string's default database, which is where both
 * NextAuth's adapter and our signup route write them.
 */
export async function usersCollection(): Promise<Collection<Document>> {
  const client = await clientPromise;
  return client.db().collection("users");
}
