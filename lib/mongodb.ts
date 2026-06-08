import { MongoClient, ObjectId } from "mongodb";

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}

const uri = process.env.MONGODB_URI;
const options = {};

async function connectAndInit(): Promise<MongoClient> {
  const c = new MongoClient(uri, options);
  await c.connect();
  const db = c.db("groupify");
  
  // Ensure indexes without blocking the connection return
  Promise.all([
    db.collection("submissions").createIndex(
      { formId: 1, submittedAt: -1 },
      { name: "submissions_formId_submittedAt", background: true }
    ),
    db.collection("forms").createIndex(
      { userId: 1, createdAt: -1 },
      { name: "forms_userId_createdAt", background: true }
    ),
    db.collection("forms").createIndex(
      { confirmedAdmins: 1 },
      { name: "forms_confirmedAdmins", background: true }
    ),
    db.collection("invites").createIndex(
      { formId: 1, status: 1 },
      { name: "invites_formId_status", background: true }
    ),
    db.collection("invites").createIndex(
      { invitedEmail: 1, status: 1 },
      { name: "invites_invitedEmail_status", background: true }
    )
  ]).catch(err => console.error("Failed to ensure indexes:", err));
  
  return c;
}

let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    globalWithMongo._mongoClientPromise = connectAndInit();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  clientPromise = connectAndInit();
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise;

export function safeObjectId(id: string): ObjectId | string {
  try {
    return new ObjectId(id);
  } catch {
    return id;
  }
}
