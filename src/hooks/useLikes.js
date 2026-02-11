import { useState, useEffect } from "react";
import { doc, onSnapshot, getDoc } from "firebase/firestore";
import { db } from "../services/firebase";

export function useLikes(activityId, uid) {
  const [likesCount, setLikesCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activityId) {
      setLoading(false);
      return;
    }

    let mounted = true;

    const activityRef = doc(db, "hikes", activityId);

    // Get initial likes count once (cheap)
    (async () => {
      try {
        const snap = await getDoc(activityRef);
        if (!mounted) return;
        setLikesCount(snap.exists() ? snap.data().likesCount || 0 : 0);
      } catch (error) {
        console.error("Error fetching likes count:", error);
      }
    })();

    // Listen only to the user's like doc for isLiked state
    let likeUnsub = null;
    let scheduledId = null;
    if (uid) {
      const likeRef = doc(db, "hikes", activityId, "likes", uid);
      const attach = () => {
        likeUnsub = onSnapshot(
          likeRef,
          (doc) => {
            setIsLiked(doc.exists());
          },
          (error) => {
            console.error("Error listening to user like:", error);
          },
        );
      };

      if (typeof window !== "undefined" && "requestIdleCallback" in window) {
        try {
          scheduledId = window.requestIdleCallback(attach, { timeout: 2000 });
        } catch (e) {
          scheduledId = setTimeout(attach, 500);
        }
      } else {
        scheduledId = setTimeout(attach, 500);
      }
    }

    // Listen for optimistic local updates triggered by toggleLike
    const handleLocalLikesUpdate = (e) => {
      const detail = e?.detail || {};
      if (
        detail.activityId === activityId &&
        typeof detail.likesCount === "number"
      ) {
        setLikesCount(detail.likesCount);
      }
    };
    window.addEventListener("likesUpdated", handleLocalLikesUpdate);

    setLoading(false);

    return () => {
      mounted = false;
      if (scheduledId !== null) {
        if (typeof window !== "undefined" && window.cancelIdleCallback) {
          try {
            window.cancelIdleCallback(scheduledId);
          } catch (e) {
            clearTimeout(scheduledId);
          }
        } else {
          clearTimeout(scheduledId);
        }
      }
      if (likeUnsub) likeUnsub();
      window.removeEventListener("likesUpdated", handleLocalLikesUpdate);
    };
  }, [activityId, uid]);

  return { likesCount, isLiked, loading };
}
