import { useState, useEffect, useRef } from "react";
import { auth } from "../firebase";

export default function ChatInterface({ sessionId, refreshList }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatRef = useRef(null);

  const suggestions = [
    "Summarize this article I paste",
    "Brainstorm app ideas for students",
    "Explain this code in simple words",
    "Turn notes into a clean email",
  ];

  const scrollToBottom = () => {
    if (!chatRef.current) return;
    chatRef.current.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  };
  useEffect(scrollToBottom, [messages, loading]);

  useEffect(() => {
    if (!sessionId) return setMessages([]);
    loadMessages();
  }, [sessionId]);

  const loadMessages = async () => {
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL
      }/session/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setMessages(data);
      scrollToBottom();
    } catch (e) {
      console.error("Failed to load messages:", e);
    }
  };

  const sendMessage = async (preset = null) => {
    const text = preset ?? input;
    if (!text.trim() || !sessionId) return;

    const newUserMsg = { role: "user", parts: [{ text }] };
    setMessages((prev) => [...prev, newUserMsg]);
    setInput("");
    setLoading(true);

    try {
      const token = await auth.currentUser.getIdToken();

      const res = await fetch(
        `${import.meta.env.VITE_API_URL
          }/session/${sessionId}/message`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ msg: text }),
        }
      );

      const reply = await res.json();

      setMessages((prev) => [
        ...prev,
        { role: "model", parts: [{ text: reply }] },
      ]);

      refreshList();
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { role: "model", parts: [{ text: "⚠️ Error. Try again." }] },
      ]);
    }

    setLoading(false);
    scrollToBottom();
  };

  /* ✅ PDF Upload Handler */
  const uploadFile = async (e) => {
    const file = e.target.files[0];
    if (!file || !sessionId) return;

    const form = new FormData();
    form.append("file", file);

    try {
      const token = await auth.currentUser.getIdToken();

      await fetch(`${import.meta.env.VITE_API_URL
        }/session/${sessionId}/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form
      });

      alert("✅ PDF uploaded. You can now ask questions about it.");
      e.target.value = "";
    } catch (err) {
      console.error(err);
      alert("❌ Upload failed");
    }
  };

  const userAvatar = auth.currentUser?.photoURL || "";
  const userInitial = (auth.currentUser?.displayName || "U").slice(0, 1).toUpperCase();

  return (
    <>
      <div style={{ paddingTop: "8px", paddingBottom: "4px", textAlign: "left" }}>
        <h2 style={{ fontSize: "26px", fontWeight: "600", marginBottom: "0" }}>
          AI Assistant
        </h2>
      </div>

      <div className="chat-layout">
        <div className="chat-column">
          {!sessionId ? (
            <div className="empty-screen">Select or start a chat</div>
          ) : (
            <>
              <div id="chat-container" ref={chatRef}>
                {messages.map((m, i) => (
                  <MessageRow
                    key={i}
                    role={m.role}
                    text={m.parts?.[0]?.text}
                    userAvatar={userAvatar}
                    userInitial={userInitial}
                  />
                ))}

                {loading && (
                  <div className="message-row">
                    <div className="avatar ai">AI</div>
                    <div className="message bot typing">
                      <span className="dot" />
                      <span className="dot" />
                      <span className="dot" />
                    </div>
                  </div>
                )}
              </div>

              {messages.length === 0 && (
                <div className="suggestions">
                  {suggestions.map((s, i) => (
                    <button key={i} className="chip" onClick={() => sendMessage(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {/* ✅ PDF Upload Bar */}
              <div className="file-upload-bar">
                <input
                  type="file"
                  id="file-upload"
                  accept="application/pdf"
                  onChange={uploadFile}
                />
              </div>

              {/* ✅ File Upload + Input Box */}
              <div id="input-area" className="input-floating">

                {/* File Upload Button */}
                <label className="file-upload-btn">
                  📎
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={uploadFile}
                    style={{ display: "none" }}
                  />
                </label>

                <input
                  type="text"
                  id="user-input"
                  placeholder="Ask anything…"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                />

                <button id="send-btn" disabled={loading} onClick={() => sendMessage()}>
                  Send
                </button>
              </div>

            </>
          )}
        </div>

        <aside className="context-panel">
          <div className="panel-card">
            <div className="panel-title">Session</div>
            <div className="panel-item"><span>Model</span><strong>Gemini 2.5 Flash</strong></div>
            <div className="panel-item"><span>User</span><strong>{auth.currentUser?.displayName || "You"}</strong></div>
          </div>

          <div className="panel-card">
            <div className="panel-title">Tips</div>
            <ul className="tips">
              <li>Ask for step-by-step plans</li>
              <li>Paste text to summarize</li>
              <li>Request examples</li>
              <li>Say “continue” to expand</li>
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}

function MessageRow({ role, text, userAvatar, userInitial }) {
  const isUser = role === "user";

  return (
    <div className={`message-row ${isUser ? "right" : ""}`}>
      {isUser ? (
        <div className="avatar user">
          {userAvatar ? <img src={userAvatar} alt="" /> : <span>{userInitial}</span>}
        </div>
      ) : (
        <div className="avatar ai">AI</div>
      )}

      <div className={`message ${isUser ? "user" : "bot"} fade-in`}>
        <span style={{ whiteSpace: "pre-wrap" }}>
          {`${isUser ? "USER" : "AI"}: ${text}`}
        </span>
      </div>
    </div>
  );
}
