import "./userInfo.css";
import { useUserStore } from "../../../lib/userStore";
import Avatar from "../../Avatar";

const Userinfo = () => {
  const { currentUser } = useUserStore();

  return (
    <div className="userInfo">
      <div className="user">
        <Avatar
          src={currentUser.avatar}
          username={currentUser.username}
          size={42}
          style={{ border: "2.5px solid rgba(81,131,254,0.6)", boxShadow: "0 4px 14px rgba(81,131,254,0.3)" }}
        />
        <h2>{currentUser.username}</h2>
      </div>
      <div className="icons">
        <img src="./more.png" alt="" />
        <img src="./video.png" alt="" />
        <img src="./edit.png" alt="" />
      </div>
    </div>
  );
};

export default Userinfo;