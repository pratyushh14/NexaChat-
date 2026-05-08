import { useState } from "react";

const COLORS = [
  "linear-gradient(135deg, #5183fe, #3d68d8)",
  "linear-gradient(135deg, #7c6af7, #5a4bc4)",
  "linear-gradient(135deg, #e64a6a, #c23057)",
  "linear-gradient(135deg, #f59e0b, #d4830a)",
  "linear-gradient(135deg, #10b981, #0d9466)",
  "linear-gradient(135deg, #06b6d4, #0594ac)",
  "linear-gradient(135deg, #8b5cf6, #6d3fd1)",
  "linear-gradient(135deg, #ec4899, #c9297a)",
];

const Avatar = ({ src, username, size = 46, style = {}, className = "" }) => {
  const [imgError, setImgError] = useState(false);

  const initial = username ? username.charAt(0).toUpperCase() : "?";
  const colorIndex = username
    ? username.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % COLORS.length
    : 0;
  const bg = COLORS[colorIndex];

  const isDefaultOrMissing = !src || src === "./avatar.png" || src === "" || imgError;

  const baseStyle = {
    width: size,
    height: size,
    borderRadius: "50%",
    flexShrink: 0,
    objectFit: "cover",
    ...style,
  };

  if (isDefaultOrMissing) {
    return (
      <div
        className={`avatar-initial ${className}`}
        style={{
          ...baseStyle,
          background: bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: Math.round(size * 0.38),
          fontWeight: 700,
          color: "#fff",
          letterSpacing: "-0.5px",
          userSelect: "none",
        }}
      >
        {initial}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={username || "avatar"}
      className={className}
      style={baseStyle}
      onError={() => setImgError(true)}
    />
  );
};

export default Avatar;
