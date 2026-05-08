import { useEffect, useState } from "react";
import "./ChatList.css";
import AddUser from "./addUser/addUser";
import { useUserStore } from "../../../lib/userStore";
import { supabase } from "../../../lib/supabase";
import { useChatStore } from "../../../lib/chatStore";
import Avatar from "../../Avatar";

const ChatList = () => {
  const [chats, setChats] = useState([]);
  const [addMode, setAddMode] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { currentUser } = useUserStore();
  const { changeChat, chatId } = useChatStore();

  useEffect(() => {
    if (!currentUser?.id) {
      setChats([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const fetchChats = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from("user_chats")
          .select("chats")
          .eq("user_id", currentUser.id)
          .single();

        if (fetchError || !data) {
          setChats([]);
          setLoading(false);
          return;
        }

        const items = data.chats || [];
        if (items.length === 0) {
          setChats([]);
          setLoading(false);
          return;
        }

        const promises = items.map(async (item) => {
          try {
            const { data: userData } = await supabase
              .from("users")
              .select("*")
              .eq("id", item.receiverId)
              .single();
            return { ...item, user: userData || null };
          } catch {
            return { ...item, user: null };
          }
        });

        const chatData = await Promise.all(promises);

        // Deduplicate by receiverId (keep most recent) in case of DB duplicates
        const seen = new Map();
        for (const c of chatData) {
          const key = c.receiverId;
          if (!seen.has(key) || (c.updatedAt || 0) > (seen.get(key).updatedAt || 0)) {
            seen.set(key, c);
          }
        }
        const deduped = Array.from(seen.values());

        setChats(deduped.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)));
      } catch (err) {
        console.error("Error loading chats:", err);
        setError("Failed to load chats");
      } finally {
        setLoading(false);
      }
    };

    fetchChats();

    const channel = supabase
      .channel(`userchats-${currentUser.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_chats", filter: `user_id=eq.${currentUser.id}` },
        () => { fetchChats(); }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [currentUser?.id]);

  const handleSelect = async (chat) => {
    if (!chat.user) return;
    setAddMode(false);

    const userChats = chats.map(({ user, ...rest }) => rest);
    const chatIndex = userChats.findIndex((item) => item.chatId === chat.chatId);
    if (chatIndex === -1) return;

    userChats[chatIndex].isSeen = true;

    try {
      await supabase
        .from("user_chats")
        .update({ chats: userChats })
        .eq("user_id", currentUser.id);
      changeChat(chat.chatId, chat.user);
    } catch (err) {
      console.error("Error updating seen status:", err);
    }
  };

  const filteredChats = chats.filter((c) =>
    c.user?.username?.toLowerCase().includes(input.toLowerCase())
  );

  const formatLastMessage = (message) => {
    if (!message) return "No messages yet";
    if (message === "Image") return "📷 Photo";
    if (message === "File") return "📎 File";
    if (message.length > 32) return message.substring(0, 32) + "…";
    return message;
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return date.toLocaleDateString([], { weekday: "short" });
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <div className="chatList">
      {/* Search + Add button — always at top, never shifts */}
      <div className="search">
        <div className="searchBar">
          <img src="./search.png" alt="search" />
          <input
            type="text"
            placeholder="Search chats…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          {input && (
            <img src="./close.png" alt="clear" className="clear" onClick={() => setInput("")} />
          )}
        </div>
        <button
          className={`addBtn ${addMode ? "active" : ""}`}
          onClick={() => setAddMode((p) => !p)}
          title={addMode ? "Cancel" : "Add user"}
        >
          {addMode ? "✕" : "+"}
        </button>
      </div>

      {/* Chat list */}
      <div className="chatItems">
        {loading && (
          <div className="stateBox">
            <div className="spinner" />
            <p>Loading chats…</p>
          </div>
        )}

        {error && !loading && (
          <div className="stateBox error">
            <p>{error}</p>
            <button onClick={() => window.location.reload()}>Retry</button>
          </div>
        )}

        {!loading && !error && filteredChats.length === 0 && (
          <div className="stateBox empty">
            {chats.length === 0 ? (
              <>
                <div className="emptyIcon">💬</div>
                <p>No conversations yet</p>
                <span>Add a user to start chatting</span>
                <button className="startBtn" onClick={() => setAddMode(true)}>
                  + Add someone
                </button>
              </>
            ) : (
              <>
                <div className="emptyIcon">🔍</div>
                <p>No results</p>
                <span>Try a different name</span>
              </>
            )}
          </div>
        )}

        {!loading && !error && filteredChats.map((chat) => {
          const isBlocked = chat.user?.blocked?.includes(currentUser.id);
          const isActive = chatId === chat.chatId;

          return (
            <div
              className={`item ${isActive ? "active" : ""} ${!chat.isSeen ? "unread" : ""}`}
              key={chat.chatId}
              onClick={() => handleSelect(chat)}
            >
              <div className="avatarWrap">
                <Avatar
                  src={isBlocked ? null : chat.user?.avatar}
                  username={isBlocked ? "?" : chat.user?.username}
                  size={48}
                />
                {!chat.isSeen && <span className="dot" />}
              </div>
              <div className="texts">
                <div className="topRow">
                  <span className="username">
                    {isBlocked ? "User" : chat.user?.username || "Unknown"}
                  </span>
                  <span className="time">{formatTime(chat.updatedAt)}</span>
                </div>
                <p className="preview">{formatLastMessage(chat.lastMessage)}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* AddUser modal — rendered at root level to avoid layout shifts */}
      {addMode && <AddUser onClose={() => setAddMode(false)} />}
    </div>
  );
};

export default ChatList;