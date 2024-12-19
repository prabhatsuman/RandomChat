import React, { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { FiChevronDown, FiX } from "react-icons/fi";

const ChatScene = ({ username, interest, ws, onLogout }) => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [matchedUser, setMatchedUser] = useState(null);
  const [notification, setNotification] = useState("");
  const [isSearching, setIsSearching] = useState(true);
  const [currentInterest, setCurrentInterest] = useState(interest);
  const [interestsDropdownVisible, setInterestsDropdownVisible] =
    useState(false);

  const lastMessageRef = useRef(null);
  const interestDropdownRef = useRef(null);
  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        interestsDropdownVisible &&
        interestDropdownRef.current &&
        !interestDropdownRef.current.contains(e.target)
      ) {
        setInterestsDropdownVisible(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [interestsDropdownVisible]);
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (ws) {
        ws.send(JSON.stringify({ type: "logout" }));
        ws.close();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    if (ws) {
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "success") {
          setNotification(data.message);
        } else if (data.type === "error") {
          setNotification(data.message);
        } else if (data.type === "search") {
          setNotification(data.message);
        } else if (data.type === "match") {
          setMatchedUser(data.matched_user);
          setIsSearching(false);
          setNotification(`Matched with ${data.matched_user}`);
        } else if (data.type === "message") {
          const newMessage = {
            user: data.username,
            text: data.message,
            timestamp: new Date(),
          };
          setMessages((prevMessages) => [...prevMessages, newMessage]);
        } else if (data.type === "disconnect") {
          setMatchedUser(null);
          setMessages([]);
          setNotification(data.message);
        } else if (data.type === "skip") {
          setMatchedUser(null);
          setNotification(data.message);
          setMessages([]);
        } else if (data.type === "interest_changed") {
          setNotification(data.message);
        }
      };

      ws.onclose = () => {
        console.log("WebSocket closed");
      };
    }

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [ws, username]);
  useEffect(() => {
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (message.trim() && ws && matchedUser) {
      const data = {
        type: "message",
        message,
      };
      ws.send(JSON.stringify(data));
      setMessage("");
    }
  };

  const handleSkip = () => {
    if (ws && matchedUser) {
      ws.send(JSON.stringify({ type: "skip", username: matchedUser }));
      setMatchedUser(null);
      setMessages([]);
    }
  };

  const handleFindNewUser = () => {
    if (ws && !matchedUser) {
      ws.send(JSON.stringify({ type: "find_new_user" }));
      setIsSearching(true);
    }
  };

  const handleInterestChange = (newInterest) => {
    if (matchedUser) handleSkip();
    else {
      setIsSearching(false);
    }
    if (ws) {
      ws.send(
        JSON.stringify({ type: "change_interest", new_interest: newInterest })
      );
      setCurrentInterest(newInterest);
      setInterestsDropdownVisible(false);
    }
  };
  const handleLogout = () => {
    if (ws) {
      ws.send(JSON.stringify({ type: "logout" }));
    }
    onLogout();
  };
  const toggleDropdown = () => {
    setDropdownVisible(!dropdownVisible);
  };

  const handleCloseNotification = () => {
    setNotification("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen">
      {/* Navbar */}
      <div className="bg-blue-400 text-white flex justify-between items-center p-3 sticky top-0 z-50 h-12">
        <div className="flex items-center">
          <div className="text-xl font-semibold">Random Chat</div>
        </div>
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
              <div className="absolute z-50 right-0 mt-2 w-48 bg-white shadow-lg rounded-lg overflow-hidden">
                <div className="py-1">
                  <button
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 w-full text-left"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                  <button
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 w-full text-left"
                    onClick={() =>
                      setInterestsDropdownVisible(!interestsDropdownVisible)
                    }
                  >
                    Change Interest
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Interests Dropdown */}
      {interestsDropdownVisible && (
        <div
          ref={interestDropdownRef}
          className="absolute z-50 bg-white shadow-lg rounded-lg p-4 top-16 right-4"
        >
          <h3 className="font-semibold mb-2">Select Interest:</h3>
          <div className="grid grid-cols-3 gap-2">
            {["Any", "Technology", "Sports", "Music", "Movies", "Travel"].map(
              (interestOption) => (
                <button
                  key={interestOption}
                  className={`px-4 py-2 text-sm rounded-md ${
                    currentInterest === interestOption
                      ? "bg-blue-400 text-white"
                      : "bg-gray-200"
                  }`}
                  onClick={() => handleInterestChange(interestOption)}
                >
                  {interestOption}
                </button>
              )
            )}
          </div>
        </div>
      )}

      {/* Chat */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Messages */}
        <div className="w-full flex flex-col">
          {notification && (
            <div className="bg-yellow-200 text-yellow-800 p-2 text-center fixed top-12 w-full">
              {notification}
              <button
                className="absolute right-2 top-1/2 transform -translate-y-1/2"
                onClick={handleCloseNotification}
              >
                <FiX className="h-5 w-5 text-yellow-800" />
              </button>
            </div>
          )}

          <div className="flex flex-1 flex-col-reverse overflow-y-auto p-4 no-scrollbar">
            <div className="flex flex-col">
              {!isSearching &&
                messages.map((msg, index) => (
                  <div
                    key={index}
                    ref={index === messages.length - 1 ? lastMessageRef : null}
                    className={`flex mb-2 ${
                      msg.user === username ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`inline-block rounded-lg px-3 py-2 ${
                        msg.user === username ? "bg-green-200" : "bg-gray-200"
                      }`}
                    >
                      <p>
                        <strong>
                          {msg.user === username ? "You" : msg.user}:
                        </strong>{" "}
                        {msg.text}
                      </p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(msg.timestamp), "HH:mm:ss")}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
          {/* Input  and find user button*/}

          <div className="flex flex-col items-start bg-gray-200 z-10 sticky bottom-0">
            <div className="w-full px-4 mt-1 py-1">
              {matchedUser ? (
                <button
                  className="px-2 py-1 rounded-md bg-yellow-400 text-white"
                  onClick={handleSkip}
                >
                  Skip User
                </button>
              ) : (
                <button
                  className="px-2 py-1 rounded-md bg-green-400 text-white"
                  onClick={handleFindNewUser}
                  disabled={isSearching}
                >
                  Find New User
                </button>
              )}
            </div>
            <div className="flex items-center w-full px-2 py-1 pb-4">
              <input
                className="flex-1 px-4 py-2 border rounded-lg w-fullfocus:outline-none focus:ring focus:ring-blue-500"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                onKeyDown={handleKeyDown}
                disabled={!matchedUser || isSearching}
              />
            </div>
           
          </div>
           <div className="bg-blue-400 text-white text-center pb-1  w-full flex justify-center gap-10">
              <div>
                <strong>Current Match:</strong>{" "}
                {matchedUser ? matchedUser : "No match yet"}
              </div>
              <div>
                <strong>Selected Interest:</strong> {currentInterest}
              </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ChatScene;
