import { useEffect, useRef, useState } from "react";
import "./chat.css";
import EmojiPicker from "emoji-picker-react";
import { toast } from "react-toastify";
import { supabase } from "../../lib/supabase";
import { useChatStore } from "../../lib/chatStore";
import { useUserStore } from "../../lib/userStore";
import upload from "../../lib/upload";
import { format } from "timeago.js";
import Avatar from "../Avatar";

// Returns an emoji icon and label based on file extension
const getFileInfo = (fileName = "") => {
  const ext = fileName.split(".").pop()?.toLowerCase();
  const map = {
    pdf:  { icon: "📄", label: "PDF" },
    doc:  { icon: "📝", label: "Word" },
    docx: { icon: "📝", label: "Word" },
    xls:  { icon: "📊", label: "Excel" },
    xlsx: { icon: "📊", label: "Excel" },
    csv:  { icon: "📊", label: "CSV" },
    ppt:  { icon: "📑", label: "PowerPoint" },
    pptx: { icon: "📑", label: "PowerPoint" },
    zip:  { icon: "🗜️", label: "Archive" },
    rar:  { icon: "🗜️", label: "Archive" },
    txt:  { icon: "📃", label: "Text" },
    mp3:  { icon: "🎵", label: "Audio" },
    wav:  { icon: "🎵", label: "Audio" },
    mp4:  { icon: "🎬", label: "Video" },
    mov:  { icon: "🎬", label: "Video" },
  };
  return map[ext] || { icon: "📎", label: ext?.toUpperCase() || "File" };
};

const formatBytes = (bytes) => {
  if (!bytes) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
};

const Chat = () => {
  const [chat, setChat] = useState();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [img, setImg] = useState({ file: null, url: "" });

  const { currentUser } = useUserStore();
  const { chatId, user, isCurrentUserBlocked, isReceiverBlocked } = useChatStore();

  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat?.messages]);

  useEffect(() => {
    if (!chatId) return;

    // Initial fetch
    const fetchChat = async () => {
      const { data } = await supabase
        .from("chats")
        .select("*")
        .eq("id", chatId)
        .single();
      if (data) setChat(data);
    };
    fetchChat();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`chat-${chatId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chats", filter: `id=eq.${chatId}` },
        (payload) => { setChat(payload.new); }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [chatId]);

  const handleEmoji = (e) => {
    setText((prev) => prev + e.emoji);
    setOpen(false);
  };

  const handleImg = (e) => {
    if (e.target.files[0]) {
      setImg({
        file: e.target.files[0],
        url: URL.createObjectURL(e.target.files[0]),
      });
    }
  };

  const handleSend = async () => {
    if (text === "" && !img.file) return;

    let imgUrl = null;
    let fileType = null;

    try {
      if (img.file) {
        try {
          imgUrl = await upload(img.file);
          fileType = img.file.type.startsWith("image/") ? "image" : "file";
        } catch (uploadErr) {
          console.error(uploadErr);
          toast.error("Image upload failed. Make sure the 'chat-images' bucket exists in Supabase Storage.");
          setImg({ file: null, url: "" });
          return;
        }
      }

      const messageData = {
        senderId: currentUser.id,
        text: text || "",
        createdAt: new Date().toISOString(),
        ...(imgUrl && { img: imgUrl, fileType, fileName: img.file?.name, fileSize: img.file?.size }),
      };

      // Fetch current chat state
      const { data: currentChat } = await supabase
        .from("chats")
        .select("*")
        .eq("id", chatId)
        .single();

      const updatedMessages = [...(currentChat.messages || []), messageData];
      let updatePayload = { messages: updatedMessages };

      if (imgUrl && img.file) {
        const sharedItem = {
          url: imgUrl,
          name: img.file.name,
          type: fileType,
          uploadedBy: currentUser.id,
          uploadedAt: new Date().toISOString(),
          size: img.file.size,
        };
        if (fileType === "image") {
          updatePayload.shared_photos = [...(currentChat.shared_photos || []), sharedItem];
        } else {
          updatePayload.shared_files = [...(currentChat.shared_files || []), sharedItem];
        }
      }

      await supabase.from("chats").update(updatePayload).eq("id", chatId);

      // Update user_chats for both users
      const userIDs = [currentUser.id, user.id];
      for (const id of userIDs) {
        const { data: userChatsData } = await supabase
          .from("user_chats")
          .select("chats")
          .eq("user_id", id)
          .single();

        if (userChatsData) {
          const userChats = [...(userChatsData.chats || [])];
          const chatIndex = userChats.findIndex((c) => c.chatId === chatId);
          if (chatIndex !== -1) {
            userChats[chatIndex].lastMessage = text || (imgUrl ? "📷 Photo" : "📎 File");
            userChats[chatIndex].isSeen = id === currentUser.id ? true : false;
            userChats[chatIndex].updatedAt = Date.now();
            await supabase
              .from("user_chats")
              .update({ chats: userChats })
              .eq("user_id", id);
          }
        }
      }
    } catch (err) {
      console.log(err);
    } finally {
      setImg({ file: null, url: "" });
      setText("");
    }
  };

  return (
    <div className="chat">
      <div className="top">
        <div className="user">
          <Avatar
            src={user?.avatar}
            username={user?.username}
            size={48}
            style={{ border: "2.5px solid #5183fe", boxShadow: "0 4px 20px rgba(81,131,254,0.4)" }}
          />
          <div className="texts">
            <span>{user?.username}</span>
            <p>{isCurrentUserBlocked || isReceiverBlocked ? "Blocked" : "Click to view profile"}</p>
          </div>
        </div>
        <div className="icons">
          <img src="./phone.png" alt="" />
          <img src="./video.png" alt="" />
          <img src="./info.png" alt="" />
        </div>
      </div>
      <div className="center">
        {chat?.messages?.map((message) => (
          <div
            className={message.senderId === currentUser?.id ? "message own" : "message"}
            key={message?.createdAt}
          >
            <div className="texts">
              {message.img && (
                <div className="media-container">
                  {message.fileType === "image" ? (
                    <img src={message.img} alt="" />
                  ) : (
                    <div className="file-preview">
                      <div className="file-preview-top">
                        <span className="file-emoji">
                          {getFileInfo(message.fileName).icon}
                        </span>
                        <div className="file-meta">
                          <span className="file-name">{message.fileName || "File"}</span>
                          <span className="file-type-label">
                            {getFileInfo(message.fileName).label}
                            {message.fileSize ? " · " + formatBytes(message.fileSize) : ""}
                          </span>
                        </div>
                      </div>
                      <a
                        href={message.img}
                        target="_blank"
                        rel="noreferrer"
                        download
                        className="download-btn"
                      >
                        <img src="./download.png" alt="" />
                        Download
                      </a>
                    </div>
                  )}
                </div>
              )}
              {message.text && <p>{message.text}</p>}
              <span>{format(new Date(message.createdAt))}</span>
            </div>
          </div>
        ))}
        {img.url && (
          <div className="message own">
            <div className="texts">
              <img src={img.url} alt="" />
            </div>
          </div>
        )}
        <div ref={endRef}></div>
      </div>
      <div className="bottom">
        <div className="icons">
          <label htmlFor="file">
            <img src="./img.png" alt="" />
          </label>
          <input
            type="file"
            id="file"
            style={{ display: "none" }}
            onChange={handleImg}
            accept="image/*,video/*,.pdf,.doc,.docx,.txt,.zip,.rar"
          />
          <img src="./camera.png" alt="" />
          <img src="./mic.png" alt="" />
        </div>
        <input
          type="text"
          placeholder={
            isCurrentUserBlocked || isReceiverBlocked
              ? "You cannot send a message"
              : "Type a message..."
          }
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={isCurrentUserBlocked || isReceiverBlocked}
          onKeyPress={(e) => e.key === "Enter" && handleSend()}
        />
        <div className="emoji">
          <img src="./emoji.png" alt="" onClick={() => setOpen((prev) => !prev)} />
          <div className="picker">
            <EmojiPicker open={open} onEmojiClick={handleEmoji} />
          </div>
        </div>
        <button
          className="sendButton"
          onClick={handleSend}
          disabled={isCurrentUserBlocked || isReceiverBlocked || (!text.trim() && !img.file)}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default Chat;