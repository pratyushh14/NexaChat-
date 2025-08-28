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

  const { currentUser } = useUserStore();
  const { changeChat } = useChatStore();

  useEffect(() => {
    if (!currentUser?.id) return;

    const unSub = onSnapshot(doc(db, "userchats", currentUser.id), async (res) => {
      if (!res.exists()) {
        setChats([]);
        return;
      }

      const items = res.data().chats || [];

      const promises = items.map(async (item) => {
        const userDocRef = doc(db, "users", item.receiverId);
        const userDocSnap = await getDoc(userDocRef);

        const user = userDocSnap.exists() ? userDocSnap.data() : null;

        return { ...item, user };
      });

      const chatData = await Promise.all(promises);

      setChats(
        chatData.sort((a, b) => {
          const aTime = a.updatedAt?.toMillis?.() || a.updatedAt || 0;
          const bTime = b.updatedAt?.toMillis?.() || b.updatedAt || 0;
          return bTime - aTime;
        })
      );
    });

    return () => unSub();
  }, [currentUser?.id]);

  const handleSelect = async (chat) => {
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

  const filteredChats = chats.filter(
    (c) => c.user?.username?.toLowerCase().includes(input.toLowerCase())
  );

  return (
    <div className="chatList">
      <div className="search">
        <div className="searchBar">
          <img src="./search.png" alt="search" />
          <input
            type="text"
            placeholder="Search"
            onChange={(e) => setInput(e.target.value)}
          />
        </div>
        <img
          src={addMode ? "./minus.png" : "./plus.png"}
          alt="toggle add"
          className="add"
          onClick={() => setAddMode((prev) => !prev)}
        />
      </div>

      {filteredChats.map((chat) => {
        const isBlocked = chat.user?.blocked?.includes(currentUser.id);

        return (
          <div
            className="item"
            key={chat.chatId}
            onClick={() => handleSelect(chat)}
            style={{
              backgroundColor: chat?.isSeen ? "transparent" : "#5183fe",
            }}
          >
            <img
              src={
                isBlocked
                  ? "./avatar.png"
                  : chat.user?.avatar || "./avatar.png"
              }
              alt="avatar"
            />
            <div className="texts">
              <span>{isBlocked ? "User" : chat.user?.username || "Unknown"}</span>
              <p>{chat.lastMessage}</p>
            </div>
          </div>
        );
      })}

      {addMode && <AddUser />}
    </div>
  );
};

export default ChatList;
