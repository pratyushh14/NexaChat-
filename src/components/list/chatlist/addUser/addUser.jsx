import "./addUser.css";
import { supabase } from "../../../../lib/supabase";
import { useRef, useState } from "react";
import { useUserStore } from "../../../../lib/userStore";
import Avatar from "../../../Avatar";

const AddUser = ({ onClose }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  // useRef so the guard works even before React re-renders the button to disabled
  const addingRef = useRef(false);

  const { currentUser } = useUserStore();

  const handleSearch = async (e) => {
    e.preventDefault();
    const username = new FormData(e.target).get("username")?.trim();
    if (!username) { setMessage("Please enter a username"); setIsSuccess(false); return; }

    setLoading(true);
    setMessage("");
    setUser(null);

    try {
      const { data: foundUser } = await supabase
        .from("users").select("*").eq("username", username).maybeSingle();

      if (!foundUser) {
        setMessage("User not found");
        setIsSuccess(false);
        return;
      }

      // Prevent adding yourself
      if (foundUser.id === currentUser.id) {
        setMessage("You can't add yourself!");
        setIsSuccess(false);
        return;
      }

      // Check if chat already exists (fresh DB fetch)
      const { data: myChats } = await supabase
        .from("user_chats").select("chats").eq("user_id", currentUser.id).single();

      const alreadyExists = (myChats?.chats || []).some(c => c.receiverId === foundUser.id);
      if (alreadyExists) {
        setMessage("You already have a chat with this user");
        setIsSuccess(false);
      } else {
        setUser(foundUser);
      }
    } catch (err) {
      console.error(err);
      setMessage("Error searching for user");
      setIsSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    // Use ref for instant guard (state batches, ref doesn't)
    if (!user || addingRef.current) return;
    addingRef.current = true;
    setAdding(true);

    try {
      // Fresh DB check to prevent race-condition duplicates
      const { data: myCurrentChats } = await supabase
        .from("user_chats").select("chats").eq("user_id", currentUser.id).single();

      const alreadyExists = (myCurrentChats?.chats || []).some(c => c.receiverId === user.id);
      if (alreadyExists) {
        setMessage("Chat already exists with this user");
        setIsSuccess(false);
        setUser(null);
        return;
      }

      // Create the chat row
      const { data: newChat, error: chatErr } = await supabase
        .from("chats")
        .insert({ messages: [], shared_photos: [], shared_files: [] })
        .select("id").single();
      if (chatErr) throw chatErr;

      const chatData = {
        chatId: newChat.id,
        lastMessage: "",
        updatedAt: Date.now(),
        isSeen: false,
      };

      // Add to receiver's user_chats
      const { data: otherChats } = await supabase
        .from("user_chats").select("chats").eq("user_id", user.id).single();

      // Deduplicate before updating (safety net)
      const otherExisting = (otherChats?.chats || []).filter(c => c.receiverId !== currentUser.id);
      const otherUpdated = [...otherExisting, { ...chatData, receiverId: currentUser.id }];

      if (otherChats) {
        await supabase.from("user_chats")
          .update({ chats: otherUpdated })
          .eq("user_id", user.id);
      } else {
        await supabase.from("user_chats")
          .insert({ user_id: user.id, chats: [{ ...chatData, receiverId: currentUser.id }] });
      }

      // Add to my user_chats (fetch fresh again to avoid stale data)
      const { data: freshMyChats } = await supabase
        .from("user_chats").select("chats").eq("user_id", currentUser.id).single();

      const myExisting = (freshMyChats?.chats || []).filter(c => c.receiverId !== user.id);
      const myUpdated = [...myExisting, { ...chatData, receiverId: user.id, isSeen: true }];

      if (freshMyChats) {
        await supabase.from("user_chats")
          .update({ chats: myUpdated })
          .eq("user_id", currentUser.id);
      } else {
        await supabase.from("user_chats")
          .insert({ user_id: currentUser.id, chats: [{ ...chatData, receiverId: user.id, isSeen: true }] });
      }

      setIsSuccess(true);
      setMessage("Added successfully!");
      setUser(null);
      setTimeout(() => { setMessage(""); onClose?.(); }, 1200);
    } catch (err) {
      console.error(err);
      setMessage("Error adding user");
      setIsSuccess(false);
    } finally {
      addingRef.current = false;
      setAdding(false);
    }
  };

  return (
    <div className="addUserOverlay" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="addUserBox">
        <div className="addUserHeader">
          <h3>Add Contact</h3>
          <button className="closeBtn" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSearch}>
          <div className="inputRow">
            <input
              type="text"
              placeholder="Search by username…"
              name="username"
              disabled={loading}
              autoFocus
            />
            <button type="submit" disabled={loading}>
              {loading ? "…" : "Search"}
            </button>
          </div>
        </form>

        {message && (
          <div className={`msg ${isSuccess ? "success" : "error"}`}>
            {isSuccess ? "✓" : "✕"} {message}
          </div>
        )}

        {user && (
          <div className="foundUser">
            <div className="foundUserInfo">
              <Avatar src={user.avatar} username={user.username} size={44} />
              <div>
                <span className="foundName">{user.username}</span>
                <span className="foundEmail">{user.email}</span>
              </div>
            </div>
            <button className="addBtn" onClick={handleAdd} disabled={adding}>
              {adding ? "Adding…" : "Add"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddUser;