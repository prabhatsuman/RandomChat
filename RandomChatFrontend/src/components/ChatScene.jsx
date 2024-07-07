import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { FiChevronDown, FiX, FiSmile, FiMenu } from "react-icons/fi";
import { FaUserCircle, FaImage } from "react-icons/fa";
import EmojiPicker from "emoji-picker-react";

const ChatScene = ({ username, ws, onLogout }) => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [usersInRoom, setUsersInRoom] = useState([username]);
  const [matchedUser, setMatchedUser] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [notification, setNotification] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showUsersInRoom, setShowUsersInRoom] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    if (ws) {
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === "match") {
          setMatchedUser(data.matched_user);
          setUsersInRoom([username, data.matched_user]);
          setIsSearching(false);
          setNotification(`Matched with ${data.matched_user}`);
        } else if (data.type === "message") {
          const newMessage = {
            user: data.username,
            text: data.message,
            image: data.image || null,
            timestamp: new Date(),
          };
          setMessages((prevMessages) => [...prevMessages, newMessage]);
        } else if (data.type === "disconnect") {
          setMatchedUser(null);
          setUsersInRoom([username]);
          setIsSearching(false);
          setMessages([]);
          setNotification("User disconnected, searching for a new match...");
        } else if (data.type === "search") {
          setIsSearching(true);
          setNotification("Searching for users...");
        } else if (data.type === "skip") {
          setMatchedUser(null);
          setUsersInRoom([username]);
          setIsSearching(false);
          setNotification(data.message);
          setMessages([]);
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

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification("");
      }, 5000); // 5 seconds

      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleSendMessage = () => {
    if ((message.trim() || selectedFile) && ws && matchedUser) {
      const resizeImage = (file, callback) => {
        const img = document.createElement("img");
        const reader = new FileReader();

        reader.onload = (e) => {
          img.src = e.target.result;
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");

            const width = img.width * 0.2;
            const height = img.height * 0.2;

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);

            callback(canvas.toDataURL(file.type));
          };
        };

        reader.readAsDataURL(file);
      };

      if (selectedFile) {
        resizeImage(selectedFile, (base64Image) => {
          const data = {
            type: "message",
            message,
            image: base64Image,
          };
          ws.send(JSON.stringify(data));
          setMessage("");
          setSelectedFile(null);
        });
      } else {
        const data = {
          type: "message",
          message,
        };
        ws.send(JSON.stringify(data));
        setMessage("");
      }
    }
  };

  const handleSkip = () => {
    if (ws && matchedUser) {
      ws.send(JSON.stringify({ type: "skip", username: matchedUser }));
      setMatchedUser(null);
      setUsersInRoom([username]);
      setIsSearching(false);
      setMessages([]);
    }
  };

  const toggleDropdown = () => {
    setDropdownVisible(!dropdownVisible);
  };

  const handleFindNewUser = () => {
    if (ws && !matchedUser) {
      ws.send(JSON.stringify({ type: "search" }));
      setIsSearching(true);
      setNotification("Searching for users...");
    }
  };

  const handleCloseNotification = () => {
    setNotification("");
  };

  const handleLocalLogout = () => {
    console.log("Local logout clicked");
    ws.close();
    onLogout(); // Trigger parent component logout handler
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleUsersInRoom = () => {
    setShowUsersInRoom(!showUsersInRoom);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen">
      {/* Navbar */}
      <div className="bg-blue-400 text-white flex justify-between items-center p-3 sticky top-0 z-50 h-12">
        <div className="flex items-center">
          <button
            className="text-white focus:outline-none md:hidden mr-4"
            onClick={toggleUsersInRoom}
          >
            <FiMenu className="h-6 w-6" />
          </button>
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
                    onClick={handleLocalLogout}
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
      <div className="flex-1 flex relative">
        <div className="w-full md:w-4/5 flex flex-col">
          {/* Notification */}
          {notification && (
            <div className="bg-yellow-200 text-yellow-800 p-2 md:w-4/5 w-full text-center fixed top-12">
              {notification}
              <button
                className="absolute right-2 top-1/2 transform -translate-y-1/2"
                onClick={handleCloseNotification}
              >
                <FiX className="h-5 w-5 text-yellow-800" />
              </button>
            </div>
          )}

          {/* Chat Window */}
          <div className="bg-white overflow-y-hidden flex-1 p-1">
            {!isSearching &&
              messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex mb-2 ${
                    msg.user === username ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`py-2 px-3 rounded-lg  ${
                      msg.user === username ? "bg-green-200" : "bg-red-200"
                    } ${msg.image ? "max-w-[80%] md:w-[40%]" : " max-w-[80%]"}`}
                  >
                    {msg.image ? (
                      <img
                        src={msg.image}
                        alt="Shared"
                        className="h-auto rounded-lg"
                      />
                    ) : (
                      <p className="text-sm">
                        <strong>
                          {msg.user === username ? "You" : msg.user}:
                        </strong>{" "}
                        {msg.text}
                      </p>
                    )}
                    <p className="text-xs text-right">
                      {format(new Date(msg.timestamp), "HH:mm:ss")}
                    </p>
                  </div>
                </div>
              ))}
          </div>

          {/* Message Input and Send Button */}
          <div className="flex flex-col items-start bg-gray-200 z-10 sticky bottom-0">
            <div className="w-full px-4 py-1 bg-blue-400">
              {matchedUser ? (
                <button
                  className="px-2 py-1 rounded-md bg-blue-950 text-white"
                  onClick={handleSkip}
                >
                  Skip
                </button>
              ) : (
                <button
                  className="px-2 py-1 rounded-md bg-blue-950 text-white"
                  onClick={handleFindNewUser}
                  disabled={isSearching}
                >
                  Find
                </button>
              )}
            </div>
            <div className="w-full px-1 py-1 bg-gray-200">
              <div className="flex items-center w-full relative bg-white rounded-xl">
                <button
                  className="rounded-md text-black px-2"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                >
                  <FiSmile />
                </button>
                {showEmojiPicker && (
                  <div className="absolute bottom-12">
                    <EmojiPicker
                      onEmojiClick={(emojiObject) =>
                        setMessage((prevMsg) => prevMsg + emojiObject.emoji)
                      }
                    />
                  </div>
                )}
                <input
                  type="text"
                  className="rounded-md w-full p-2 focus:outline-none bg-white"
                  placeholder="Type your message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={!matchedUser || isSearching}
                />
                <label htmlFor="file-input" className="rounded-md text-black px-2 cursor-pointer">
                  <FaImage />
                </label>
                <input
                  id="file-input"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={!matchedUser || isSearching}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Users in Room (1/4 width) */}
        <div
          className={`${
            showUsersInRoom ? "fixed translate-x-0" : "fixed -translate-x-full"
          } md:block md:relative h-full transition-transform duration-300 ease-in-out z-40 md:z-auto md:w-1/5 md:translate-x-0 bg-gray-300 p-4 overflow-auto`}
        >
          <h2 className="text-lg font-semibold mb-4">Users in Room</h2>
          {usersInRoom.map((user, index) => (
            <div key={index} className="flex items-center mb-2">
              <FaUserCircle className="text-3xl text-gray-700 mr-2" />
              <p className="text-sm">{user}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChatScene;
