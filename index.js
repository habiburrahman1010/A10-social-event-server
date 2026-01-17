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
    const eventsCollection = database.collection("events");
    const joinedUsersCollection = database.collection("joinedUsers");


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

    //get single event
    app.get("/events/:id", async (req, res) => {
      const { id } = req.params;
      const event = await eventsCollection.findOne({ _id: new ObjectId(id) });
      res.send(event);
    });


    //------joined event------
    app.post("/events/:id/join", async (req, res) => {
      const { id } = req.params;
      const { userEmail } = req.body;

      if (!userEmail) return res.status(400).send({ message: "User email required" });


      const joined = await joinedUsersCollection.findOne({ eventId: id, userEmail });
      if (joined) return res.send({ message: "User already joined this event" });


      const result = await joinedUsersCollection.insertOne({
        eventId: id,
        userEmail,
        joinedAt: new Date(),
      });

      res.send({ message: "Joined event successfully", result });
    });
    //----------------------------------
    // Get all joined events for a user
    app.get("/joined-events/:userEmail", async (req, res) => {
      try {
        const userEmail = req.params.userEmail;


        const joinedRecords = await joinedUsersCollection.find({ userEmail }).toArray();


        const eventIds = joinedRecords.map(r => new ObjectId(r.eventId));


        const events = await eventsCollection.find({ _id: { $in: eventIds } }).toArray();

        res.send(events);
      } catch (err) {
        console.error("Get joined events failed:", err);
        res.status(500).send({ message: "Server error" });
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
