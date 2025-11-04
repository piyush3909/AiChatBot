// server/aiBackend.js
require("dotenv").config();
const { GoogleGenAI } = require("@google/genai");

// Initialize Gemini with API key
const ai = new GoogleGenAI(process.env.GEMINI_API_KEY);

// Latest stable & recommended chatting model
const MODEL = "gemini-2.5-flash";

/**
 * history format expected:
 * [
 *   { role: "user", parts: [{ text: "hi" }] },
 *   { role: "model", parts: [{ text: "hello" }] }
 * ]
 */

async function aiChat(history) {
  // Convert db format -> GenAI SDK format
  const contents = history.map(m => ({
    role: m.role,
    parts: [{ text: m.parts?.[0]?.text || "" }]
  }));

  // Generate response
  const result = await ai.models.generateContent({
    model: MODEL,
    contents
  });

  // Return plain text answer
  return result.text;
}

module.exports = aiChat;
