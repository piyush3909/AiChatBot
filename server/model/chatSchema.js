const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    role: String,
    parts: [{ text: String }],
  },
  { _id: false }
);

const chatSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  title: { type: String, required: true },
  messages: [messageSchema],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("ChatSession", chatSchema);
