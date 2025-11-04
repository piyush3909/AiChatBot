// server/index.js
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const admin = require("firebase-admin");

const aiChat = require("./aiBackend");
const Chat = require("./model/chatSchema");


const multer = require("multer");
const pdfParse = require("pdf-parse");
const fs = require("fs");

const upload = multer({ dest: "uploads/" });
// ----- Firebase Admin -----
/**
 * .env must contain:
 * FIREBASE_SERVICE_ACCOUNT_JSON=./serviceAccountKey.json
 * and the JSON file should be present at that path.
 * 
 * 
 *
 */

async function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).send("Unauthorized");
  }

  const token = authHeader.split("Bearer ")[1];

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.userId = decoded.uid;
    next();
  } catch (err) {
    return res.status(403).send("Invalid token");
  }
}

const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const app = express();
app.use(cors());
app.use(express.json());

// ----- Auth Middleware -----
async function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).send("Unauthorized: No token");

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.userId = decoded.uid;
    next();
  } catch (err) {
    console.error("Auth error:", err);
    return res.status(403).send("Unauthorized: Invalid token");
  }
}

// ----- MongoDB -----
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => {
    console.log("✅ MongoDB Connected");
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () =>
      console.log(`✅ Server listening on http://localhost:${PORT}`)
    );
  })
  .catch((err) => console.error("❌ MongoDB Error:", err));

// ----- Routes -----

// Get existing chat history (for sidebar / restore)
app.get("/chat-history", auth, async (req, res) => {
  try {
    const chat = await Chat.findOne({ userId: req.userId });
    if (!chat) return res.json([]);

    const history = chat.history.map((m) => ({
      role: m.role,
      text: m.parts[0].text,
    }));
    res.json(history);
  } catch (err) {
    console.error("History fetch error:", err);
    res.status(500).send("Error fetching chat history");
  }
});

// Send a new message to AI
app.post("/chat", auth, async (req, res) => {
  const { msg } = req.body;
  if (!msg || typeof msg !== "string") {
    return res.status(400).send("Missing 'msg' in request body");
  }

  let chat = await Chat.findOne({ userId: req.userId });
  if (!chat) chat = new Chat({ userId: req.userId, history: [] });

  // Build latest history for the request
  const promptHistory = [
    ...chat.history,
    { role: "user", parts: [{ text: msg }] },
  ];

  try {
    const answer = await aiChat(promptHistory);

    // Persist both turns
    chat.history.push(
      { role: "user", parts: [{ text: msg }] },
      { role: "model", parts: [{ text: answer }] }
    );
    await chat.save();

    res.send(answer);
  } catch (err) {
    console.error("AI Error:", err);
    res.status(500).send("AI error — check backend logs");
  }
});

app.post("/session", auth, async (req, res) => {
  const newSession = await Chat.create({
    userId: req.userId,
    title: "New Chat",
    messages: []
  });

  res.json(newSession);
});

app.get("/sessions", auth, async (req, res) => {
  const sessions = await Chat.find({ userId: req.userId })
    .sort({ createdAt: -1 })
    .select("_id title createdAt");

  res.json(sessions);
});

app.get("/session/:id", auth, async (req, res) => {
  const chat = await Chat.findOne({
    _id: req.params.id,
    userId: req.userId
  });

  res.json(chat?.messages || []);
});

app.post("/session/:id/message", auth, async (req, res) => {
  const { msg } = req.body;

  const chat = await Chat.findOne({ _id: req.params.id, userId: req.userId });
  if (!chat) return res.status(404).send("Session not found");

  const context = [
    ...chat.messages,
    { role: "user", parts: [{ text: msg }] }
  ];

  const answer = await aiChat(context);

  chat.messages.push(
    { role: "user", parts: [{ text: msg }] },
    { role: "model", parts: [{ text: answer }] }
  );

  if (chat.title === "New Chat") chat.title = msg.slice(0, 30);

  await chat.save();
  res.json(answer);
});

app.delete("/session/:id", auth, async (req, res) => {
  await Chat.deleteOne({ _id: req.params.id, userId: req.userId });
  res.send("deleted");
});

app.post("/session/:id/upload", auth, upload.single("file"), async (req, res) => {
  try {
    const sessionId = req.params.id;
    const filePath = req.file.path;

    const session = await Chat.findOne({ _id: sessionId, userId: req.userId });
    if (!session) return res.status(404).send("Session not found");

    const fileBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(fileBuffer);
    const text = pdfData.text.substring(0, 40000); // keep safe size

    fs.unlinkSync(filePath); // delete temporary file

    // Save PDF extracted text in session
    session.messages.push({
      role: "system",
      parts: [{ text: `Extracted document text:\n${text}` }],
    });
    await session.save();

    res.send("File uploaded & processed");
  } catch (err) {
    console.error(err);
    res.status(500).send("Upload error");
  }
});


















