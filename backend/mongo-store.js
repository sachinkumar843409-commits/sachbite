// ---------- Permanent Data Store (MongoDB Atlas) ----------
// Pehle poora data `db.json` file me store hota tha, jo free hosting (Render Free tier)
// par har restart/redeploy pe REMOVE ho sakta tha. Ab data MongoDB Atlas (free-forever
// database, 512 MB, koi expiry nahi) me permanently store hota hai.
//
// Kaise kaam karta hai (bina baaki server.js code chede):
//  - Poora database ek hi MongoDB document ke roop me store hota hai (jaisa db.json tha).
//  - Server start hote hi ye document memory me load ho jaata hai (fast in-memory cache).
//  - readDB() turant memory se data deta hai (bilkul pehle jaisa hi, synchronous).
//  - writeDB() memory turant update karta hai, aur background me MongoDB me bhi save
//    kar deta hai — isse koi bhi API route slow nahi hota, aur agar internet/Mongo
//    temporarily down ho to bhi site kaam karti rehti hai (agli save pe sync ho jayega).
//
// SETUP:
//  Environment variable MONGODB_URI set karein (MongoDB Atlas se milta hai):
//    MONGODB_URI = mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/
//
//  Agar MONGODB_URI set NAHI hai (jaise local testing me), to ye module apne aap
//  purane tareeke (local db.json file) par fallback kar jaata hai — kuch bhi tootega nahi.

const fs = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");

const DB_PATH = path.join(__dirname, "db.json");
const MONGODB_URI = process.env.MONGODB_URI || "";
const DB_NAME = process.env.MONGODB_DB_NAME || "sachbite";
const COLLECTION_NAME = "app_data";
const DOC_ID = "sachbite_main"; // pura data isi ek document me store hota hai

let cache = null; // in-memory copy of the data (what readDB() returns)
let collection = null; // MongoDB collection reference (null = file-mode fallback)
let mongoAvailable = false;

function readLocalFile() {
  const raw = fs.readFileSync(DB_PATH, "utf-8");
  return JSON.parse(raw);
}

function writeLocalFile(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

/**
 * Server start hote hi ek baar call karna hai. MongoDB se connect karke data
 * memory me load karta hai. Agar MONGODB_URI nahi hai, to local db.json use karta hai.
 */
async function initStore() {
  if (!MONGODB_URI) {
    console.log("ℹ️  MONGODB_URI set nahi hai — local db.json file use ho raha hai (data permanent nahi rahega free hosting par).");
    cache = readLocalFile();
    return;
  }

  try {
    const client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
    await client.connect();
    const db = client.db(DB_NAME);
    collection = db.collection(COLLECTION_NAME);
    mongoAvailable = true;

    const existing = await collection.findOne({ _id: DOC_ID });
    if (existing) {
      delete existing._id;
      cache = existing;
      console.log("✅ MongoDB Atlas se data load ho gaya — data ab permanent hai.");
    } else {
      // Pehli baar — local db.json ko seed data ke roop me Mongo me daal do
      cache = readLocalFile();
      await collection.updateOne({ _id: DOC_ID }, { $set: cache }, { upsert: true });
      console.log("✅ MongoDB Atlas pehli baar seed ho gaya (local db.json se data copy kiya).");
    }
  } catch (err) {
    console.error("❌ MongoDB se connect nahi ho paya, local db.json par fallback kar rahe hain:", err.message);
    mongoAvailable = false;
    collection = null;
    cache = readLocalFile();
  }
}

/** Bilkul pehle jaisa hi — synchronous, turant memory se data deta hai */
function readDB() {
  if (cache === null) {
    // Safety net: agar kisi wajah se initStore() call nahi hui thi
    cache = readLocalFile();
  }
  return cache;
}

/** Memory turant update, MongoDB me background me save (non-blocking) */
function writeDB(data) {
  cache = data;

  if (mongoAvailable && collection) {
    collection
      .updateOne({ _id: DOC_ID }, { $set: data }, { upsert: true })
      .catch((err) => console.error("❌ MongoDB save error (data memory me safe hai, agli save pe retry hoga):", err.message));
  } else {
    // Mongo configure nahi hai — purane tareeke se local file me save karo
    writeLocalFile(data);
  }
}

module.exports = { initStore, readDB, writeDB };
