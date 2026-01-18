import React, { useState } from "react";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { useComments } from "../hooks/useComments";
import { addComment, deleteComment } from "../services/firebaseService";
import { useAuth } from "../hooks/useAuth";

function CommentsSection({ activityId }) {
  const { user } = useAuth();
  const { comments, loading } = useComments(activityId);
  const [newComment, setNewComment] = useState("");
  const [nickname, setNickname] = useState("");
  const [captchaToken, setCaptchaToken] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    // hCaptcha verification
    if (!captchaToken) {
      alert("Please complete the captcha verification");
      return;
    }

    try {
      await addComment(
        activityId,
        user.uid,
        newComment.trim(),
        nickname.trim() || "Anonymous hiker"
      );
      setNewComment("");
      setNickname("");
      setCaptchaToken(null); // Reset captcha
    } catch (error) {
      console.error("Error adding comment:", error);
      alert("Failed to post comment. Please try again.");
    }
  };

  const handleDelete = async (commentId) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;
    try {
      await deleteComment(activityId, commentId, user.uid);
    } catch (error) {
      console.error("Error deleting comment:", error);
      alert("Failed to delete comment. Please try again.");
    }
  };

  if (loading)
    return (
      <div style={{ fontSize: "14px", color: "#8e8e8e" }}>
        Loading comments...
      </div>
    );

  return (
    <div style={{ marginTop: "12px" }}>
      {comments.length > 0 && (
        <div style={{ marginBottom: "12px" }}>
          {comments.map((comment) => (
            <div
              key={comment.id}
              style={{
                marginBottom: "8px",
                fontSize: "14px",
                padding: "8px",
                backgroundColor: "#f8f8f8",
                borderRadius: "4px",
              }}
            >
              <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
                {comment.nickname}
              </div>
              <div>{comment.text}</div>
              {user && comment.uid === user.uid && (
                <button
                  onClick={() => handleDelete(comment.id)}
                  style={{
                    marginTop: "4px",
                    fontSize: "12px",
                    color: "red",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {user ? (
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Nickname (optional)"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            style={{
              width: "100%",
              marginBottom: "4px",
              padding: "8px",
              border: "1px solid #dbdbdb",
              borderRadius: "4px",
              fontSize: "14px",
            }}
          />
          <textarea
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            style={{
              width: "100%",
              minHeight: "60px",
              padding: "8px",
              border: "1px solid #dbdbdb",
              borderRadius: "4px",
              fontSize: "14px",
              resize: "vertical",
            }}
            required
          />

          {/* hCaptcha Widget */}
          <div style={{ margin: "8px 0" }}>
            <HCaptcha
              sitekey={process.env.REACT_APP_HCAPTCHA_SITE_KEY}
              onVerify={(token) => setCaptchaToken(token)}
              onExpire={() => setCaptchaToken(null)}
            />
          </div>

          <button
            type="submit"
            disabled={!newComment.trim() || !captchaToken}
            style={{
              marginTop: "8px",
              padding: "8px 16px",
              backgroundColor: "#0095f6",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
              opacity: newComment.trim() && captchaToken ? 1 : 0.5,
            }}
          >
            Post Comment
          </button>
        </form>
      ) : (
        <div style={{ fontSize: "14px", color: "#8e8e8e" }}>
          Sign in to comment
        </div>
      )}
    </div>
  );
}

export default CommentsSection;
