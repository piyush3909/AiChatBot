import { useState, useEffect } from "react";
import { auth, logOut } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import ChatInterface from "./components/ChatInterface";
import Login from "./components/Login";
import "./index.css";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (currentUser) fetchSessions();
    });

    return () => unsubscribe();
  }, []);

  const fetchSessions = async () => {
    const token = await auth.currentUser.getIdToken();
    const res = await fetch(`${import.meta.env.VITE_API_URL
      }/session`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setSessions(data);
  };

  const newChat = async () => {
    const token = await auth.currentUser.getIdToken();
    const res = await fetch(`${import.meta.env.VITE_API_URL
}/session`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const session = await res.json();
    setSelectedSession(session._id);
    fetchSessions();
  };

  if (loading) return <h3 id="load-status">Loading...</h3>;

  if (!user) return <Login />;

  return (
    <div className="layout-wrapper">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="user-info">
            <img src={user.photoURL} alt={user.displayName} />
            <span>{user.displayName}</span>
          </div>
          <button onClick={logOut} className="logout-btn">Sign Out</button>
        </div>

        <button className="new-chat-btn" onClick={newChat}>+ New Chat</button>

        <div className="chat-list">
          {sessions.map((s) => (
            <div
              key={s._id}
              className={`chat-item ${selectedSession === s._id ? "active" : ""}`}
              onClick={() => setSelectedSession(s._id)}
            >
              {s.title}
            </div>
          ))}
        </div>
      </aside>

      {/* Chat Window */}
      <ChatInterface sessionId={selectedSession} refreshList={fetchSessions} />
    </div>
  );
}

export default App;
