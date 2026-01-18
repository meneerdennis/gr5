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
        opacity: loading ? 0.5 : 1,
      }}
      title={isLiked ? "Unlike" : "Like"}
    >
      {isLiked ? (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="#ff3040">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      ) : (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#000000"
          strokeWidth="2"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      )}
    </button>
  );
}

export default LikeButton;
