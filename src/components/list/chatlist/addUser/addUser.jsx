import "./addUser.css";
import { db } from "../../../../lib/firebase";
import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { useState } from "react";
import { useUserStore } from "../../../../lib/userStore";

const AddUser = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState("");

  const { currentUser } = useUserStore();

  const handleSearch = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const username = formData.get("username");

    if (!username.trim()) {
      setMessage("Please enter a username");
      return;
    }

    // Allow adding yourself - removed self-add restriction
    // This allows single users to access the Detail component with logout button

    setLoading(true);
    setMessage("");
    setUser(null);

    try {
      const userRef = collection(db, "users");
      const q = query(userRef, where("username", "==", username));
      const querySnapShot = await getDocs(q);

      if (!querySnapShot.empty) {
        const foundUser = querySnapShot.docs[0].data();
        
        // Check if chat already exists
        const currentUserChatsDoc = await getDoc(doc(db, "userchats", currentUser.id));
        if (currentUserChatsDoc.exists()) {
          const currentUserChats = currentUserChatsDoc.data().chats || [];
          const existingChat = currentUserChats.find(chat => chat.receiverId === foundUser.id);
          
          if (existingChat) {
            setMessage("Chat already exists with this user");
            setUser(null);
          } else {
            setUser(foundUser);
            setMessage("");
          }
        } else {
          setUser(foundUser);
          setMessage("");
        }
      } else {
        setMessage("User not found");
        setUser(null);
      }
    } catch (err) {
      console.log(err);
      setMessage("Error searching for user");
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!user || adding) return; // Prevent multiple simultaneous adds

    setAdding(true);
    const chatRef = collection(db, "chats");
    const userChatsRef = collection(db, "userchats");

    try {
      // Double-check if chat already exists before adding
      const currentUserChatsDoc = await getDoc(doc(userChatsRef, currentUser.id));
      if (currentUserChatsDoc.exists()) {
        const currentUserChats = currentUserChatsDoc.data().chats || [];
        const existingChat = currentUserChats.find(chat => chat.receiverId === user.id);
        
        if (existingChat) {
          setMessage("Chat already exists with this user");
          setUser(null);
          setAdding(false);
          return;
        }
      }

      // Create new chat document
      const newChatRef = doc(chatRef);
      await setDoc(newChatRef, {
        createdAt: serverTimestamp(),
        messages: [],
        sharedPhotos: [],
        sharedFiles: [],
      });

      const chatData = {
        chatId: newChatRef.id,
        lastMessage: "",
        updatedAt: Date.now(),
        isSeen: false,
      };

      // Add chat to user's chat list (they receive from current user)
      const userChatsDoc = await getDoc(doc(userChatsRef, user.id));
      if (userChatsDoc.exists()) {
        const userChats = userChatsDoc.data().chats || [];
        // Check if chat already exists in their list
        const existingUserChat = userChats.find(chat => chat.receiverId === currentUser.id);
        if (!existingUserChat) {
          await updateDoc(doc(userChatsRef, user.id), {
            chats: [...userChats, { ...chatData, receiverId: currentUser.id }],
          });
        }
      } else {
        await setDoc(doc(userChatsRef, user.id), {
          chats: [{ ...chatData, receiverId: currentUser.id }],
        });
      }

      // Add chat to current user's chat list (they send to user)
      const currentUserChatsDocRefresh = await getDoc(doc(userChatsRef, currentUser.id));
      if (currentUserChatsDocRefresh.exists()) {
        const currentUserChats = currentUserChatsDocRefresh.data().chats || [];
        // Check if chat already exists in current user's list
        const existingCurrentUserChat = currentUserChats.find(chat => chat.receiverId === user.id);
        if (!existingCurrentUserChat) {
          await updateDoc(doc(userChatsRef, currentUser.id), {
            chats: [...currentUserChats, { ...chatData, receiverId: user.id, isSeen: true }],
          });
        }
      } else {
        await setDoc(doc(userChatsRef, currentUser.id), {
          chats: [{ ...chatData, receiverId: user.id, isSeen: true }],
        });
      }

      setMessage("User added successfully!");
      setUser(null);
      
      // Clear the form
      const form = document.querySelector('form');
      if (form) {
        form.reset();
      }

      // Clear success message after 2 seconds
      setTimeout(() => {
        setMessage("");
      }, 2000);

    } catch (err) {
      console.log(err);
      setMessage("Error adding user");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="addUser">
      <form onSubmit={handleSearch}>
        <input 
          type="text" 
          placeholder="Username" 
          name="username"
          disabled={loading}
        />
        <button type="submit" disabled={loading}>
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {message && (
        <div className={`message ${message.includes("successfully") ? "success" : "error"}`}>
          {message}
        </div>
      )}

      {user && (
        <div className="user">
          <div className="detail">
            <img src={user.avatar || "./avatar.png"} alt="" />
            <span>{user.username}</span>
          </div>
          <button onClick={handleAdd} disabled={adding}>
            {adding ? "Adding..." : "Add User"}
          </button>
        </div>
      )}
    </div>
  );
};

export default AddUser;