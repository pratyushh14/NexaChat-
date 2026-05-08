import { useChatStore } from "../../lib/chatStore";
import { supabase } from "../../lib/supabase";
import { useUserStore } from "../../lib/userStore";
import { useEffect, useState } from "react";
import "./detail.css";
import Avatar from "../Avatar";

const Detail = () => {
  const { chatId, user, isCurrentUserBlocked, isReceiverBlocked, changeBlock, resetChat } =
    useChatStore();
  const { currentUser } = useUserStore();

  const [chat, setChat] = useState();
  const [expandedSections, setExpandedSections] = useState({
    chatSettings: false,
    privacy: false,
    sharedPhotos: false,
    sharedFiles: false,
    userActions: false,
  });

  useEffect(() => {
    if (!chatId) return;

    const fetchChat = async () => {
      const { data } = await supabase
        .from("chats")
        .select("*")
        .eq("id", chatId)
        .single();
      if (data) setChat(data);
    };
    fetchChat();

    const channel = supabase
      .channel(`detail-${chatId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chats", filter: `id=eq.${chatId}` },
        (payload) => { setChat(payload.new); }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [chatId]);

  const handleBlock = async () => {
    if (!user) return;

    const { data: userData } = await supabase
      .from("users")
      .select("blocked")
      .eq("id", currentUser.id)
      .single();

    if (!userData) return;

    const currentBlocked = userData.blocked || [];
    const newBlocked = isReceiverBlocked
      ? currentBlocked.filter((id) => id !== user.id)
      : [...currentBlocked, user.id];

    try {
      await supabase
        .from("users")
        .update({ blocked: newBlocked })
        .eq("id", currentUser.id);
      changeBlock();
    } catch (err) {
      console.log(err);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    resetChat();
  };

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const downloadFile = (url, filename) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="detail">
      <div className="user">
        <Avatar
          src={user?.avatar}
          username={user?.username}
          size={84}
          style={{
            border: "3px solid rgba(81, 131, 254, 0.65)",
            boxShadow: "0 8px 28px rgba(81, 131, 254, 0.35)",
            fontSize: 32,
          }}
        />
        <h2>{user?.username}</h2>
        <p>Online status and info</p>
      </div>

      <div className="info">
        <div className="scrollable-content">
          <div className="option">
            <div className="title" onClick={() => toggleSection("chatSettings")}>
              <span>Chat Settings</span>
              <img src={expandedSections.chatSettings ? "./arrowDown.png" : "./arrowUp.png"} alt="" />
            </div>
            {expandedSections.chatSettings && (
              <div className="settings-content">
                <div className="setting-item">
                  <span>Notifications</span>
                  <div className="toggle">
                    <input type="checkbox" id="notifications" defaultChecked />
                    <label htmlFor="notifications"></label>
                  </div>
                </div>
                <div className="setting-item">
                  <span>Message Sound</span>
                  <div className="toggle">
                    <input type="checkbox" id="messageSound" defaultChecked />
                    <label htmlFor="messageSound"></label>
                  </div>
                </div>
                <div className="setting-item">
                  <span>Auto-download Media</span>
                  <div className="toggle">
                    <input type="checkbox" id="autoDownload" />
                    <label htmlFor="autoDownload"></label>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="option">
            <div className="title" onClick={() => toggleSection("privacy")}>
              <span>Privacy &amp; Help</span>
              <img src={expandedSections.privacy ? "./arrowDown.png" : "./arrowUp.png"} alt="" />
            </div>
            {expandedSections.privacy && (
              <div className="privacy-content">
                <div className="privacy-item">
                  <img src="./shield.png" alt="" className="privacy-icon" />
                  <div className="privacy-text">
                    <span>End-to-End Encryption</span>
                    <p>Your messages are secured</p>
                  </div>
                </div>
                <div className="privacy-item">
                  <img src="./report.png" alt="" className="privacy-icon" />
                  <div className="privacy-text">
                    <span>Report User</span>
                    <p>Report inappropriate behavior</p>
                  </div>
                </div>
                <div className="privacy-item">
                  <img src="./help.png" alt="" className="privacy-icon" />
                  <div className="privacy-text">
                    <span>Help Center</span>
                    <p>Get support and FAQs</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="option">
            <div className="title" onClick={() => toggleSection("sharedPhotos")}>
              <span>Shared Photos ({chat?.shared_photos?.length || 0})</span>
              <img src={expandedSections.sharedPhotos ? "./arrowDown.png" : "./arrowUp.png"} alt="" />
            </div>
            {expandedSections.sharedPhotos && (
              <div className="photos">
                {chat?.shared_photos?.length > 0 ? (
                  chat.shared_photos.map((photo, index) => (
                    <div className="photoItem" key={index}>
                      <div className="photoDetail">
                        <img src={photo.url} alt="" />
                        <div className="photo-info">
                          <span className="photo-name">{photo.name}</span>
                          <span className="photo-size">{formatFileSize(photo.size)}</span>
                        </div>
                      </div>
                      <img
                        src="./download.png"
                        alt=""
                        className="icon"
                        onClick={() => downloadFile(photo.url, photo.name)}
                      />
                    </div>
                  ))
                ) : (
                  <div className="no-media">
                    <img src="./no-photos.png" alt="" className="no-media-icon" />
                    <p>No shared photos yet</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="option">
            <div className="title" onClick={() => toggleSection("sharedFiles")}>
              <span>Shared Files ({chat?.shared_files?.length || 0})</span>
              <img src={expandedSections.sharedFiles ? "./arrowDown.png" : "./arrowUp.png"} alt="" />
            </div>
            {expandedSections.sharedFiles && (
              <div className="files">
                {chat?.shared_files?.length > 0 ? (
                  chat.shared_files.map((file, index) => (
                    <div className="fileItem" key={index}>
                      <div className="fileDetail">
                        <img src="./file.png" alt="" className="file-type-icon" />
                        <div className="file-info">
                          <span className="file-name">{file.name}</span>
                          <span className="file-size">{formatFileSize(file.size)}</span>
                        </div>
                      </div>
                      <img
                        src="./download.png"
                        alt=""
                        className="icon"
                        onClick={() => downloadFile(file.url, file.name)}
                      />
                    </div>
                  ))
                ) : (
                  <div className="no-media">
                    <img src="./no-files.png" alt="" className="no-media-icon" />
                    <p>No shared files yet</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="option">
            <div className="title" onClick={() => toggleSection("userActions")}>
              <span>User Actions</span>
              <img src={expandedSections.userActions ? "./arrowDown.png" : "./arrowUp.png"} alt="" />
            </div>
            {expandedSections.userActions && (
              <div className="user-actions-content">
                <button onClick={handleBlock} className="action-button block-button">
                  {isCurrentUserBlocked ? "You are Blocked!" : isReceiverBlocked ? "User blocked" : "Block User"}
                </button>
                <button className="action-button logout-button" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Detail;