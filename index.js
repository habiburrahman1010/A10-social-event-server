const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId, ServerApiVersion } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;


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
    const db = client.db("socialEventsDB");
    const eventsCollection = db.collection("events");
    const joinedUsersCollection = db.collection("joinedUsers");

    console.log("MongoDB connected");

    // Create event
    app.post("/events", async (req, res) => {
      try {
        const event = req.body;
        event.date = new Date(event.date);

        if (!event.title || !event.date || !event.creatorEmail) {
          return res.status(400).json({ message: "Missing required fields" });
        }

        const result = await eventsCollection.insertOne(event);
        res.json(result);
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
      }
    });

    // Get all events
    // Get all upcoming events with filter + search
    app.get("/events", async (req, res) => {
      try {
        const { type, search } = req.query;
        const today = new Date();

        // Build MongoDB filter
        const filter = { date: { $gte: today } };

        if (type && type !== "all") {
          filter.type = { $regex: `^${type}$`, $options: "i" }; // case-insensitive exact match
        }

        if (search) {
          filter.title = { $regex: search, $options: "i" }; // case-insensitive search
        }

        const events = await eventsCollection.find(filter).sort({ date: 1 }).toArray();
        res.json(events);
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
      }
    });


    // Get single event
    app.get("/events/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const event = await eventsCollection.findOne({ _id: new ObjectId(id) });
        res.json(event);
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
      }
    });




    // Joined events
    app.post("/events/:id/join", async (req, res) => {
      try {
        const { id } = req.params;
        const { userEmail } = req.body;



        const joined = await joinedUsersCollection.findOne({ eventId: id, userEmail });
        if (joined) return res.json({ message: "Already joined" });

        const result = await joinedUsersCollection.insertOne({
          eventId: id,
          userEmail,
          joinedAt: new Date(),
        });

        res.json({ message: "Joined event", result });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
      }
    });

    app.get("/joined-events/:userEmail", async (req, res) => {
      try {
        const email = req.params.userEmail;

        const joinedRecords = await joinedUsersCollection.find({ userEmail: email }).toArray();
        const eventIds = joinedRecords.map(r => new ObjectId(r.eventId));
        const events = await eventsCollection.find({ _id: { $in: eventIds } }).toArray();

        res.json(events);
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
      }
    });


    // Get events created by a specific user
    app.get("/my-events/:userEmail", async (req, res) => {
      try {
        const email = req.params.userEmail;

        const events = await eventsCollection
          .find({ creatorEmail: email })
          .sort({ date: 1 })
          .toArray();

        res.json(events);
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
      }
    });

    //update
    // update event
    app.put("/events/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const updatedEvent = req.body;

        if (updatedEvent.date) {
          updatedEvent.date = new Date(updatedEvent.date);
        }

        const result = await eventsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedEvent }
        );

        res.send(result);
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
      }
    });





    app.listen(port, () => console.log(`Server running on port ${port}`));
  } catch (err) {
    console.error(err);
  }
}

run().catch(console.dir);
