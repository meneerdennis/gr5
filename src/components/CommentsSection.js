import React, { useEffect, useState, lazy, Suspense } from "react";
const HCaptcha = lazy(() => import("@hcaptcha/react-hcaptcha"));
import { useComments } from "../hooks/useComments";
import { addComment, deleteComment } from "../services/firebaseService";
import { useAuth } from "../hooks/useAuth";
import { translateText, getUserLanguage } from "../services/translationService";
import { useViewedCommentsContext } from "../contexts/ViewedCommentsContext";

// Localized button texts for comments
const commentButtonTexts = {
  en: {
    translate: "Translate",
    showOriginal: "Show Original",
    translating: "Translating...",
  },
  nl: {
    translate: "Vertalen",
    showOriginal: "Origineel tonen",
    translating: "Vertalen...",
  },
  fr: {
    translate: "Traduire",
    showOriginal: "Afficher l'original",
    translating: "Traduction...",
  },
  de: {
    translate: "Übersetzen",
    showOriginal: "Original anzeigen",
    translating: "Übersetzen...",
  },
  lt: {
    translate: "Versti",
    showOriginal: "Rodyti originalą",
    translating: "Verčiama...",
  },
};

function CommentsSection({ activityId }) {
  const { user } = useAuth();
  const { comments, loading } = useComments(activityId);
  const { markCommentsAsViewed } = useViewedCommentsContext();
  const [newComment, setNewComment] = useState("");
  const [nickname, setNickname] = useState("");
  const [captchaToken, setCaptchaToken] = useState(null);
  const [commentTranslations, setCommentTranslations] = useState({});
  const [translatingComments, setTranslatingComments] = useState(new Set());


  useEffect(() => {
    if (!activityId || loading) return;
    markCommentsAsViewed(activityId, comments.length);
  }, [activityId, comments.length, loading, markCommentsAsViewed]);

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
        nickname.trim() || "Anonymous hiker",
      );
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("commentAdded", {
            detail: { activityId, uid: user.uid },
          }),
        );
      }
      setNewComment("");
      setNickname("");
      setCaptchaToken(null); // Reset captcha
    } catch (error) {
      console.error("Error adding comment:", error);
      alert("Failed to post comment. Please try again.");
    }
  };
  const handleTranslateComment = async (commentId, commentText) => {
    const currentTranslation = commentTranslations[commentId];

    if (currentTranslation && currentTranslation.showTranslated) {
      setCommentTranslations((prev) => ({
        ...prev,
        [commentId]: { ...currentTranslation, showTranslated: false },
      }));
      return;
    }

    if (currentTranslation && currentTranslation.translatedText) {
      setCommentTranslations((prev) => ({
        ...prev,
        [commentId]: { ...currentTranslation, showTranslated: true },
      }));
      return;
    }

    setTranslatingComments((prev) => new Set(prev).add(commentId));

    try {
      const userLang = getUserLanguage();
      const translated = await translateText(commentText, userLang);

      if (translated === commentText) {
        alert("The comment is already in your language.");
        setTranslatingComments((prev) => {
          const newSet = new Set(prev);
          newSet.delete(commentId);
          return newSet;
        });
        return;
      }

      setCommentTranslations((prev) => ({
        ...prev,
        [commentId]: { translatedText: translated, showTranslated: true },
      }));
    } catch (error) {
      alert("Translation failed. Please try again.");
    } finally {
      setTranslatingComments((prev) => {
        const newSet = new Set(prev);
        newSet.delete(commentId);
        return newSet;
      });
    }
  };

  const handleDelete = async (commentId) => {
    if (!user) return;
    if (!confirm("Are you sure you want to delete this comment?")) return;
    try {
      await deleteComment(activityId, commentId, user.uid);
      // Optionally dispatch an event to let other components know comments changed
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("commentDeleted", { detail: { activityId, commentId } }),
        );
      }
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
              <div style={{ marginBottom: "4px" }}>
                {commentTranslations[comment.id]?.showTranslated
                  ? commentTranslations[comment.id].translatedText
                  : comment.text}
              </div>
              <div
                style={{ display: "flex", gap: "8px", alignItems: "center" }}
              >
                {getUserLanguage() !== "nl" && comment.text && (
                  <button
                    onClick={() =>
                      handleTranslateComment(comment.id, comment.text)
                    }
                    disabled={translatingComments.has(comment.id)}
                    style={{
                      fontSize: "11px",
                      color: "#0095f6",
                      background: "none",
                      border: "none",
                      cursor: translatingComments.has(comment.id)
                        ? "not-allowed"
                        : "pointer",
                      textDecoration: "underline",
                      opacity: translatingComments.has(comment.id) ? 0.5 : 1,
                    }}
                  >
                    {translatingComments.has(comment.id)
                      ? commentButtonTexts[getUserLanguage()]?.translating ||
                        commentButtonTexts.en.translating
                      : commentTranslations[comment.id]?.showTranslated
                        ? commentButtonTexts[getUserLanguage()]?.showOriginal ||
                          commentButtonTexts.en.showOriginal
                        : commentButtonTexts[getUserLanguage()]?.translate ||
                          commentButtonTexts.en.translate}
                  </button>
                )}

                {user && comment.uid === user.uid && (
                  <button
                    onClick={() => handleDelete(comment.id)}
                    style={{
                      fontSize: "11px",
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

          {/* hCaptcha Widget (dynamically loaded) */}
          <div style={{ margin: "8px 0" }}>
            <Suspense
              fallback={<div style={{ height: 60, color: "#8e8e8e" }}>Loading captcha...</div>}
            >
              <HCaptcha
                sitekey={process.env.REACT_APP_HCAPTCHA_SITE_KEY}
                onVerify={(token) => setCaptchaToken(token)}
                onExpire={() => setCaptchaToken(null)}
              />
            </Suspense>
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

export default React.memo(CommentsSection);
