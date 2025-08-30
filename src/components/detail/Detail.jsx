import { arrayRemove, arrayUnion, doc, updateDoc, onSnapshot } from "firebase/firestore";
import { useChatStore } from "../../lib/chatStore";
import { auth, db } from "../../lib/firebase";
import { useUserStore } from "../../lib/userStore";
import { useEffect, useState } from "react";
import "./detail.css";

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
    userActions: false
  });

  useEffect(() => {
    if (chatId) {
      const unSub = onSnapshot(doc(db, "chats", chatId), (res) => {
        setChat(res.data());
      });

      return () => {
        unSub();
      };
    }
  }, [chatId]);

  const handleBlock = async () => {
    if (!user) return;

    const userDocRef = doc(db, "users", currentUser.id);

    try {
      await updateDoc(userDocRef, {
        blocked: isReceiverBlocked ? arrayRemove(user.id) : arrayUnion(user.id),
      });
      changeBlock();
    } catch (err) {
      console.log(err);
    }
  };

  const handleLogout = () => {
    auth.signOut();
    resetChat();
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const downloadFile = (url, filename) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="detail">
      <div className="user">
        <img src={user?.avatar || "./avatar.png"} alt="" />
        <h2>{user?.username}</h2>
        <p>Online status and info</p>
      </div>
      
      <div className="info">
        <div className="scrollable-content">
          <div className="option">
            <div className="title" onClick={() => toggleSection('chatSettings')}>
              <span>Chat Settings</span>
              <img 
                src={expandedSections.chatSettings ? "./arrowDown.png" : "./arrowUp.png"} 
                alt="" 
              />
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
            <div className="title" onClick={() => toggleSection('privacy')}>
              <span>Privacy & Help</span>
              <img 
                src={expandedSections.privacy ? "./arrowDown.png" : "./arrowUp.png"} 
                alt="" 
              />
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
            <div className="title" onClick={() => toggleSection('sharedPhotos')}>
              <span>Shared Photos ({chat?.sharedPhotos?.length || 0})</span>
              <img 
                src={expandedSections.sharedPhotos ? "./arrowDown.png" : "./arrowUp.png"} 
                alt="" 
              />
            </div>
            {expandedSections.sharedPhotos && (
              <div className="photos">
                {chat?.sharedPhotos?.length > 0 ? (
                  chat.sharedPhotos.map((photo, index) => (
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
            <div className="title" onClick={() => toggleSection('sharedFiles')}>
              <span>Shared Files ({chat?.sharedFiles?.length || 0})</span>
              <img 
                src={expandedSections.sharedFiles ? "./arrowDown.png" : "./arrowUp.png"} 
                alt="" 
              />
            </div>
            {expandedSections.sharedFiles && (
              <div className="files">
                {chat?.sharedFiles?.length > 0 ? (
                  chat.sharedFiles.map((file, index) => (
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
            <div className="title" onClick={() => toggleSection('userActions')}>
              <span>User Actions</span>
              <img 
                src={expandedSections.userActions ? "./arrowDown.png" : "./arrowUp.png"} 
                alt="" 
              />
            </div>
            {expandedSections.userActions && (
              <div className="user-actions-content">
                <button onClick={handleBlock} className="action-button block-button">
                  {isCurrentUserBlocked
                    ? "You are Blocked!"
                    : isReceiverBlocked
                    ? "User blocked"
                    : "Block User"}
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