import { useEffect, useState } from "react";
import "./ChatList.css";
import AddUser from "./addUser/addUser";
import { useUserStore } from "../../../lib/userStore";
import { doc, getDoc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { useChatStore } from "../../../lib/chatStore";

const ChatList = () => {
  const [chats, setChats] = useState([]);
  const [addMode, setAddMode] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { currentUser } = useUserStore();
  const { changeChat, chatId } = useChatStore();

  useEffect(() => {
    // Reset states when currentUser changes
    if (!currentUser?.id) {
      setChats([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unSub = onSnapshot(
      doc(db, "userchats", currentUser.id), 
      async (res) => {
        try {
          if (!res.exists()) {
            setChats([]);
            setLoading(false);
            return;
          }

          const items = res.data().chats || [];

          if (items.length === 0) {
            setChats([]);
            setLoading(false);
            return;
          }

          const promises = items.map(async (item) => {
            try {
              const userDocRef = doc(db, "users", item.receiverId);
              const userDocSnap = await getDoc(userDocRef);

              const user = userDocSnap.exists() ? userDocSnap.data() : null;

              return { ...item, user };
            } catch (err) {
              console.error("Error fetching user data:", err);
              return { ...item, user: null };
            }
          });

          const chatData = await Promise.all(promises);

          setChats(
            chatData.sort((a, b) => {
              const aTime = a.updatedAt?.toMillis?.() || a.updatedAt || 0;
              const bTime = b.updatedAt?.toMillis?.() || b.updatedAt || 0;
              return bTime - aTime;
            })
          );
        } catch (err) {
          console.error("Error loading chats:", err);
          setError("Failed to load chats");
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        console.error("Firestore listener error:", err);
        setError("Connection error");
        setLoading(false);
      }
    );

    return () => unSub();
  }, [currentUser?.id]);

  const handleSelect = async (chat) => {
    if (!chat.user) return;

    // Close add mode when selecting a chat
    setAddMode(false);

    const userChats = chats.map(({ user, ...rest }) => rest);
    const chatIndex = userChats.findIndex((item) => item.chatId === chat.chatId);
    
    if (chatIndex === -1) return;

    userChats[chatIndex].isSeen = true;

    try {
      await updateDoc(doc(db, "userchats", currentUser.id), { chats: userChats });
      changeChat(chat.chatId, chat.user);
    } catch (err) {
      console.error("Error updating seen status:", err);
    }
  };

  const handleAddModeToggle = () => {
    setAddMode((prev) => !prev);
  };

  const filteredChats = chats.filter((c) => 
    c.user?.username?.toLowerCase().includes(input.toLowerCase())
  );

  const formatLastMessage = (message) => {
    if (!message) return "No messages yet";
    if (message === "Image") return "📷 Photo";
    if (message === "File") return "📎 File";
    if (message.length > 30) return message.substring(0, 30) + "...";
    return message;
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  if (loading) {
    return (
      <div className="chatList">
        <div className="search">
          <div className="searchBar">
            <img src="./search.png" alt="search" />
            <input type="text" placeholder="Search" disabled />
          </div>
          <img src="./plus.png" alt="add" className="add" style={{ opacity: 0.5 }} />
        </div>
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Loading chats...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="chatList">
        <div className="search">
          <div className="searchBar">
            <img src="./search.png" alt="search" />
            <input type="text" placeholder="Search" disabled />
          </div>
          <img src="./plus.png" alt="add" className="add" onClick={handleAddModeToggle} />
        </div>
        <div className="error">
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
        {addMode && <AddUser />}
      </div>
    );
  }

  return (
    <div className="chatList">
      <div className="search">
        <div className="searchBar">
          <img src="./search.png" alt="search" />
          <input
            type="text"
            placeholder="Search chats..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          {input && (
            <img 
              src="./close.png" 
              alt="clear" 
              className="clear"
              onClick={() => setInput("")}
            />
          )}
        </div>
        <img
          src={addMode ? "./minus.png" : "./plus.png"}
          alt="toggle add"
          className="add"
          onClick={handleAddModeToggle}
        />
      </div>

      {filteredChats.length === 0 && !addMode ? (
        <div className="empty-state">
          {chats.length === 0 ? (
            <>
              <img src="./chat.png" alt="no chats" className="empty-icon" />
              <p>No chats yet</p>
              <span>Start a conversation by adding a user</span>
              <button onClick={() => setAddMode(true)} className="start-chat-btn">
                Add User
              </button>
            </>
          ) : (
            <>
              <img src="./search.png" alt="no results" className="empty-icon" />
              <p>No chats found</p>
              <span>Try a different search term</span>
            </>
          )}
        </div>
      ) : (
        <>
          {filteredChats.map((chat) => {
            const isBlocked = chat.user?.blocked?.includes(currentUser.id);
            const isActive = chatId === chat.chatId;

            return (
              <div
                className={`item ${isActive ? 'active' : ''} ${!chat.isSeen ? 'unread' : ''}`}
                key={chat.chatId}
                onClick={() => handleSelect(chat)}
              >
                <div className="avatar-container">
                  <img
                    src={
                      isBlocked
                        ? "./avatar.png"
                        : chat.user?.avatar || "./avatar.png"
                    }
                    alt="avatar"
                    className="avatar"
                  />
                  {!chat.isSeen && <div className="unread-indicator"></div>}
                </div>
                <div className="texts">
                  <div className="top-row">
                    <span className="username">
                      {isBlocked ? "User" : chat.user?.username || "Unknown"}
                    </span>
                    <span className="time"> 
                      {formatTime(chat.updatedAt)}
                    </span>
                  </div>
                  <p className="last-message">
                    {formatLastMessage(chat.lastMessage)}
                  </p>
                </div>
              </div>
            );
          })}
        </>
      )}

      {addMode && (
        <div className="add-user-overlay">
          <AddUser />
        </div>
      )}
    </div>
  );
};

export default ChatList;