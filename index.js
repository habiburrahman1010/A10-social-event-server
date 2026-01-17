const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId, ServerApiVersion } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xqjpkxx.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    const database = client.db("socialEventsDB"); // Use correct DB
    const eventsCollection = database.collection("events"); // Fixed variable name

    console.log("MongoDB connected");

    // Create Event
    app.post("/events", async (req, res) => {
      try {
        const event = req.body;

        // Convert date string to Date object
        event.date = new Date(event.date);

        if (!event.title || !event.date || !event.creatorEmail) {
          return res.status(400).send({ message: "Missing required fields" });
        }

        const result = await eventsCollection.insertOne(event);
        res.send(result);
      } catch (err) {
        console.error("Insert event failed:", err);
        res.status(500).send({ message: "Server error", error: err.message });
      }
    });

    // Get all upcoming events
    app.get("/events", async (req, res) => {
      try {
        const today = new Date();
        const events = await eventsCollection
          .find({ date: { $gte: today } }) // compare with Date object
          .sort({ date: 1 })
          .toArray();
        res.send(events);
      } catch (err) {
        console.error("Get events failed:", err);
        res.status(500).send({ message: "Server error", error: err.message });
      }
    });

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } catch (err) {
    console.error(err);
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log(`Server running on port: ${port}`);
});
