/**
 * Minimal in-memory stand-in for the MongoDB collections our routes use.
 * Supports equality filters, `$in`, `$set`, `$unset`, `$addToSet`, sort by one key and
 * counting: enough to exercise route logic without a database server.
 */
type Doc = Record<string, unknown>;

function matches(doc: Doc, filter: Doc): boolean {
  return Object.entries(filter).every(([key, cond]) => {
    const value = doc[key];
    if (cond && typeof cond === "object" && "$in" in (cond as Doc)) {
      return ((cond as { $in: unknown[] }).$in).includes(value);
    }
    if (cond && typeof cond === "object" && "$exists" in (cond as Doc)) {
      return ((cond as { $exists: boolean }).$exists) === (key in doc);
    }
    return value === cond;
  });
}

export class FakeCollection {
  docs: Doc[] = [];

  async findOne(filter: Doc) {
    const found = this.docs.find((d) => matches(d, filter));
    return found ? structuredClone(found) : null;
  }

  find(filter: Doc = {}) {
    let rows = this.docs.filter((d) => matches(d, filter));
    const cursor = {
      sort: (spec: Record<string, 1 | -1>) => {
        const [[key, dir]] = Object.entries(spec);
        rows = [...rows].sort((a, b) => {
          const av = a[key] as Date | number;
          const bv = b[key] as Date | number;
          return (av > bv ? 1 : av < bv ? -1 : 0) * dir;
        });
        return cursor;
      },
      toArray: async () => structuredClone(rows),
    };
    return cursor;
  }

  async countDocuments(filter: Doc = {}) {
    return this.docs.filter((d) => matches(d, filter)).length;
  }

  async insertOne(doc: Doc) {
    if (this.docs.some((d) => d._id === doc._id)) throw new Error("duplicate _id");
    this.docs.push(structuredClone(doc));
    return { insertedId: doc._id };
  }

  private apply(doc: Doc, update: Doc) {
    const set = (update.$set ?? {}) as Doc;
    Object.assign(doc, structuredClone(set));
    for (const key of Object.keys((update.$unset ?? {}) as Doc)) delete doc[key];
    const addToSet = (update.$addToSet ?? {}) as Doc;
    for (const [key, value] of Object.entries(addToSet)) {
      const list = (doc[key] as unknown[] | undefined) ?? [];
      if (!list.includes(value)) list.push(value);
      doc[key] = list;
    }
  }

  async updateOne(filter: Doc, update: Doc) {
    const doc = this.docs.find((d) => matches(d, filter));
    if (doc) this.apply(doc, update);
    return { matchedCount: doc ? 1 : 0, modifiedCount: doc ? 1 : 0 };
  }

  async updateMany(filter: Doc, update: Doc) {
    const rows = this.docs.filter((d) => matches(d, filter));
    rows.forEach((d) => this.apply(d, update));
    return { matchedCount: rows.length, modifiedCount: rows.length };
  }

  async deleteOne(filter: Doc) {
    const index = this.docs.findIndex((d) => matches(d, filter));
    if (index >= 0) this.docs.splice(index, 1);
    return { deletedCount: index >= 0 ? 1 : 0 };
  }

  async deleteMany(filter: Doc) {
    const before = this.docs.length;
    this.docs = this.docs.filter((d) => !matches(d, filter));
    return { deletedCount: before - this.docs.length };
  }
}

export const db = {
  forms: new FakeCollection(),
  submissions: new FakeCollection(),
  invites: new FakeCollection(),
  users: new FakeCollection(),
};

export function resetDb() {
  db.forms = new FakeCollection();
  db.submissions = new FakeCollection();
  db.invites = new FakeCollection();
  db.users = new FakeCollection();
}

// Same surface as lib/db.ts, so it can stand in for it via vi.mock.
export const getDb = async () => ({});
export const formsCollection = async () => db.forms;
export const submissionsCollection = async () => db.submissions;
export const invitesCollection = async () => db.invites;
export const usersCollection = async () => db.users;
