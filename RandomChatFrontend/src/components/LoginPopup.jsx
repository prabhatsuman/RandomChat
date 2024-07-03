import React, { useState, useEffect } from "react";

const LoginPopup = ({ open, onLogin, ws }) => {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // Set up WebSocket message handler
    if (ws) {
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.error) {
          setError(data.error);
        } else {
          onLogin(username);
          localStorage.setItem("username", username);
        }
      };
    }
  }, [ws, onLogin, username]);

  const handleLogin = () => {
    if (username && ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "register",
          username: username,
        })
      );
      
    }
  };

  return (
    <div className={`fixed inset-0 ${open ? "block" : "hidden"}`}>
      <div className="flex items-center justify-center h-screen bg-gray-300 bg-opacity-75">
        <div className="bg-white shadow-md rounded-lg p-6 max-w-sm w-full">
          <h2 className="text-xl font-bold mb-4">Enter your username</h2>
          <input
            className="w-full mb-4 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring focus:ring-blue-500 bg-white text-black"
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          <button
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring focus:ring-blue-500"
            onClick={handleLogin}
          >
            Start Chatting
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPopup;
