import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
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
    const activityRef = doc(db, "hikes", activityId);
    const unsubscribers = [];

    // Listen to activity for likesCount
    const activityUnsub = onSnapshot(
      activityRef,
      (doc) => {
        if (doc.exists()) {
          setLikesCount(doc.data().likesCount || 0);
        } else {
          setLikesCount(0);
        }
      },
      (error) => {
        console.error("Error listening to likes count:", error);
      }
    );

    unsubscribers.push(activityUnsub);

    // Listen to user's like
    if (uid) {
      const likeRef = doc(db, "hikes", activityId, "likes", uid);
      const likeUnsub = onSnapshot(
        likeRef,
        (doc) => {
          setIsLiked(doc.exists());
        },
        (error) => {
          console.error("Error listening to user like:", error);
        }
      );
      unsubscribers.push(likeUnsub);
    }

    setLoading(false);

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [activityId, uid]);

  return { likesCount, isLiked, loading };
}
