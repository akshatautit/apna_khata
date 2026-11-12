const { MongoClient } = require("mongodb");
require("dotenv").config();

function clusterUri(uri) {
  // Drop the database name so we can pick source and target DBs explicitly.
  // mongodb+srv://user:pass@host/DB?... -> mongodb+srv://user:pass@host/?...
  return uri.replace(/\/[^/?]+(\?|$)/, "/$1");
}

(async () => {
  const uri = clusterUri(process.env.MONGODB_URI || "");
  if (!uri) {
    console.error("MONGODB_URI is not set in .env");
    process.exit(1);
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const source = client.db("test").collection("statements");
    const target = client.db("khaata").collection("statements");

    const docs = await source.find().toArray();
    console.log(`[migrate] found ${docs.length} document(s) in test.statements`);

    if (docs.length) {
      try {
        const result = await target.insertMany(docs, { ordered: false });
        console.log(`[migrate] inserted ${result.insertedCount} document(s) into khaata.statements`);
      } catch (err) {
        // duplicate _id means they were already migrated — not fatal
        console.log(`[migrate] insert note: ${err.message}`);
      }
    } else {
      console.log("[migrate] nothing to migrate");
    }

    const tCount = await target.countDocuments();
    console.log(`[migrate] khaata.statements now has ${tCount} document(s)`);
  } finally {
    await client.close();
    console.log("[migrate] done");
  }
})().catch((err) => {
  console.error("[migrate] failed:", err.message);
  process.exit(1);
});