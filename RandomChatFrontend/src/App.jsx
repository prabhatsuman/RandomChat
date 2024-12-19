import React, { useState, useEffect } from "react";
import LoginPopup from "./components/LoginPopup";
import ChatScene from "./components/ChatScene";
import "./App.css";

const App = () => {
  const [username, setUsername] = useState("");
  const [interest, setInterest] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [ws, setWs] = useState(null);

  useEffect(() => {
    // Initialize WebSocket connection
    const initializeWebSocket = () => {
      if(import.meta.env.DEV)
      {
        var wsUrl = "ws://localhost:8000/ws/chat/";
      }
      else
      {
        var wsUrl = `ws://${window.location.hostname}:${window.location.port}/ws/chat/`;
      }
      const ws = new WebSocket(wsUrl);
      setWs(ws);
      try {
        ws.onopen = () => {
          console.log("WebSocket connected");
        };
      } catch (error) {
        console.error("WebSocket error", error);
      }

      ws.onclose = () => {
        console.log("WebSocket closed unexpectedly, reopening...");
        setWs(null); // Clear the WebSocket instance
      };
    };

    if (!isLoggedIn) {
      initializeWebSocket();
    }

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [isLoggedIn]);

  const handleLogin = (username, interest) => {
    setUsername(username);
    setInterest(interest);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUsername("");
    setInterest("");
  };

  return (
    <div>
      {!isLoggedIn && (
        <LoginPopup onLogin={handleLogin} ws={ws} open={!isLoggedIn} />
      )}
      {isLoggedIn && (
        <ChatScene
          username={username}
          interest={interest}
          ws={ws}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
};

export default App;
