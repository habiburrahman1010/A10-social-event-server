import express from "express";
import cors from "cors";
import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xqjpkxx.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: { version: ServerApiVersion.v1 },
});

let db;

async function getDb() {
  if (!db) {
    await client.connect();
    db = client.db("socialEventsDB");
  }
  return db;
}

app.get("/", (req, res) => res.send("Server is running"));

app.post("/events", async (req, res) => {
  const db = await getDb();
  const eventsCollection = db.collection("events");

  const event = req.body;
  event.date = new Date(event.date);

  if (!event.title || !event.date || !event.creatorEmail) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const result = await eventsCollection.insertOne(event);
  res.json(result);
});

app.get("/events", async (req, res) => {
  const db = await getDb();
  const eventsCollection = db.collection("events");

  const { type, search } = req.query;
  const today = new Date();
  const filter = { date: { $gte: today } };

  if (type && type !== "all") {
    filter.type = { $regex: `^${type}$`, $options: "i" };
  }
  if (search) {
    filter.title = { $regex: search, $options: "i" };
  }

  const events = await eventsCollection
    .find(filter)
    .sort({ date: 1 })
    .toArray();

  res.json(events);
});

app.get("/events/:id", async (req, res) => {
  const db = await getDb();
  const eventsCollection = db.collection("events");

  const event = await eventsCollection.findOne({
    _id: new ObjectId(req.params.id),
  });

  res.json(event);
});

app.post("/events/:id/join", async (req, res) => {
  const db = await getDb();
  const joinedUsersCollection = db.collection("joinedUsers");

  const { userEmail } = req.body;

  const joined = await joinedUsersCollection.findOne({
    eventId: req.params.id,
    userEmail,
  });

  if (joined) return res.json({ message: "Already joined" });

  const result = await joinedUsersCollection.insertOne({
    eventId: req.params.id,
    userEmail,
    joinedAt: new Date(),
  });

  res.json({ message: "Joined event", result });
});

app.get("/joined-events/:userEmail", async (req, res) => {
  const db = await getDb();
  const joinedUsersCollection = db.collection("joinedUsers");
  const eventsCollection = db.collection("events");

  const joinedRecords = await joinedUsersCollection
    .find({ userEmail: req.params.userEmail })
    .toArray();

  const eventIds = joinedRecords.map(
    (r) => new ObjectId(r.eventId)
  );

  const events = await eventsCollection
    .find({ _id: { $in: eventIds } })
    .toArray();

  res.json(events);
});

app.get("/my-events/:userEmail", async (req, res) => {
  const db = await getDb();
  const eventsCollection = db.collection("events");

  const events = await eventsCollection
    .find({ creatorEmail: req.params.userEmail })
    .sort({ date: 1 })
    .toArray();

  res.json(events);
});

app.put("/events/:id", async (req, res) => {
  const db = await getDb();
  const eventsCollection = db.collection("events");

  const updatedEvent = req.body;
  if (updatedEvent.date) {
    updatedEvent.date = new Date(updatedEvent.date);
  }

  const result = await eventsCollection.updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: updatedEvent }
  );

  res.json(result);
});

export default app;
