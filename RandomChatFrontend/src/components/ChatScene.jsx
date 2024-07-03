import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { FiChevronDown } from "react-icons/fi";

const ChatScene = ({ username, ws }) => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [usersInRoom, setUsersInRoom] = useState([username]);
  const [matchedUser, setMatchedUser] = useState(null);
  const [isSearching, setIsSearching] = useState(false); // Updated initial state to false

  useEffect(() => {
    if (ws) {
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === "match") {
          setMatchedUser(data.matched_user);
          setUsersInRoom([username, data.matched_user]);
          setIsSearching(false);
        } else if (data.type === "message") {
          const newMessage = {
            user: data.username,
            text: data.message,
            timestamp: new Date(),
          };
          setMessages((prevMessages) => [...prevMessages, newMessage]);
        } else if (data.type === "disconnect") {
          setMatchedUser(null);
          setUsersInRoom([username]);
          setIsSearching(true);
          ws.send(JSON.stringify({ type: "search" }));
        } else if (data.type === "search") {
          setIsSearching(true);
        }
      };

      ws.onclose = () => {
        console.log("WebSocket closed");
      };
    }

    return () => {
      if (ws) {
        ws.onclose = null;
        ws.onmessage = null;
      }
    };
  }, [ws, username]);

  const handleSendMessage = () => {
    if (message.trim() && ws && matchedUser) {
      ws.send(JSON.stringify({ type: "message", message }));
      setMessage("");
    }
  };

  const handleSkip = () => {
    if (ws && matchedUser) { 4
      ws.send(JSON.stringify({ type: "skip", username: username }));
      setMatchedUser(null);
      setUsersInRoom([username]);
      setIsSearching(true);
    }
  };

  const toggleDropdown = () => {
    setDropdownVisible(!dropdownVisible);
  };

  const handleFindNewUser = () => {
    if (ws && !matchedUser) {
      ws.send(JSON.stringify({ type: "search" }));
      setIsSearching(true);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen">
      {/* Navbar */}
      <div className="bg-blue-400 text-white flex justify-between items-center p-3">
        <div className="text-xl font-semibold">Random Chat</div>
        <div className="flex items-center">
          <div className="mr-4">{username}</div>
          <div className="relative">
            <button
              className="text-white focus:outline-none"
              onClick={toggleDropdown}
            >
              <FiChevronDown className="h-6 w-6" />
            </button>
            {/* Dropdown Menu */}
            {dropdownVisible && (
              <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-lg overflow-hidden">
                <div className="py-1">
                  <button
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 w-full text-left"
                    onClick={() => console.log("Logout clicked")}
                  >
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        <div className="w-3/4 flex flex-col">
          {/* Chat Window */}
          <div className="bg-white overflow-auto flex-1 p-1">
            {isSearching ? (
              <div className="text-center text-gray-500 mt-4">
                Searching for users...
              </div>
            ) : (
              messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex mb-2 ${
                    msg.user === username ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-3/5 py-2 px-3 rounded-lg ${
                      msg.user === username ? "bg-green-200" : "bg-red-200"
                    }`}
                  >
                    <p className="text-sm">
                      <strong>
                        {msg.user === username ? "You" : msg.user}:
                      </strong>{" "}
                      {msg.text}
                    </p>
                    <p className="text-xs text-right">
                      {format(new Date(msg.timestamp), "HH:mm:ss")}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Message Input and Send Button */}
          <div className="flex items-center p-4 bg-gray-200">
            {matchedUser ? (
              <button
                className="px-4 py-2 rounded-md bg-blue-500 text-white mr-2"
                onClick={handleSkip}
              >
                Skip
              </button>
            ) : (
              <button
                className="px-4 py-2 rounded-md bg-blue-500 text-white mr-2"
                onClick={handleFindNewUser}
                disabled={isSearching}
              >
                Find New User
              </button>
            )}
            <input
              type="text"
              className="flex-1 py-2 px-4 border border-gray-300 rounded-md focus:outline-none"
              placeholder="Type your message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={!matchedUser || isSearching}
            />
            <button
              className="px-4 py-2 rounded-md bg-blue-500 text-white ml-2"
              onClick={handleSendMessage}
              disabled={!matchedUser || isSearching}
            >
              Send
            </button>
          </div>
        </div>

        {/* Users in Room (1/4 width) */}
        <div className="w-1/4 bg-gray-300 p-4 overflow-auto">
          <h2 className="text-lg font-semibold mb-4">Users in Room</h2>
          {usersInRoom.map((user, index) => (
            <p key={index} className="text-sm mb-2">
              {user}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChatScene;
