import React, { useState, useEffect } from "react";

const LoginPopup = ({ open, onLogin, ws }) => {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [selectedInterest, setSelectedInterest] = useState("Any");

  const interests = [
    "Any",
    "Technology",
    "Sports",
    "Music",
    "Movies",
    "Travel",
  ];

  useEffect(() => {
    // Set up WebSocket message handler
    if (ws) {
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type == "error") {
          setError(data.message);
        } else {
          console.log(data);
          onLogin(data.username, data.interest);
          console.log(data.message);
          localStorage.setItem("username", username);
        }
      };
    }
  }, [ws, onLogin, username]);

  const handleLogin = () => {
    const usernameRegex = /^[a-zA-Z0-9_]+$/;

    if (!usernameRegex.test(username)) {
      setError(
        "Username should only contain letters, numbers, and underscores."
      );
      return;
    }
    console.log(username, selectedInterest);

    if (username && ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "register",
          username: username,
          interest: selectedInterest,
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
          <h3 className="text-lg font-semibold mb-2">Select an Interest</h3>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {interests.map((interest) => (
              <button
                key={interest}
                className={`py-2 px-4 rounded-md border ${
                  selectedInterest === interest
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 text-gray-700"
                } hover:bg-blue-400 hover:text-white`}
                onClick={() => setSelectedInterest(interest)}
              >
                {interest}
              </button>
            ))}
          </div>
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
