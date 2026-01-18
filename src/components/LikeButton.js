import React from "react";
import { useLikes } from "../hooks/useLikes";
import { toggleLike } from "../services/firebaseService";
import { useAuth } from "../hooks/useAuth";

function LikeButton({ activityId }) {
  const { user } = useAuth();
  const { likesCount, isLiked, loading } = useLikes(activityId, user?.uid);

  const handleToggle = async () => {
    if (!user || loading) return;
    try {
      await toggleLike(activityId, user.uid);
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading || !user}
      style={{
        background: "none",
        border: "none",
        cursor: user ? "pointer" : "not-allowed",
        fontSize: "24px",
        color: isLiked ? "#ff3040" : "#262626",
        opacity: loading ? 0.5 : 1,
      }}
      title={isLiked ? "Unlike" : "Like"}
    >
      {isLiked ? "❤️" : "🤍"}
    </button>
  );
}

export default LikeButton;
