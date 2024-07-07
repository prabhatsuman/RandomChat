import React, { useState, useEffect } from "react";
import LoginPopup from "./components/LoginPopup";
import ChatScene from "./components/ChatScene";
import "./App.css";

const App = () => {
  const [username, setUsername] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [ws, setWs] = useState(null);

  useEffect(() => {
    // Initialize WebSocket connection
    const initializeWebSocket = () => {
      const { hostname, port } = window.location;
      const wsUrl = `ws://${hostname}:${port}/ws/chat/`; // Adjust the URL path as needed
      const ws = new WebSocket(wsUrl);
      setWs(ws);

      ws.onclose = () => {
        console.log("WebSocket closed unexpectedly, reopening...");
        setWs(null); // Clear the WebSocket instance
        if (!isLoggedIn) {
          initializeWebSocket();
        }
      };
    };

    if (!ws) {
      initializeWebSocket();
    }

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [isLoggedIn]);

  const handleLogin = (username) => {
    setUsername(username);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUsername("");
  };

  return (
    <div>
      {!isLoggedIn && (
        <LoginPopup onLogin={handleLogin} ws={ws} open={!isLoggedIn} />
      )}
      {isLoggedIn && (
        <ChatScene username={username} ws={ws} onLogout={handleLogout} />
      )}
    </div>
  );
};

export default App;
