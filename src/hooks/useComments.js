import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../services/firebase";

export function useComments(activityId) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activityId) {
      setLoading(false);
      return;
    }
    const commentsRef = collection(db, "hikes", activityId, "comments");
    const q = query(commentsRef, where("approved", "==", true));
    // Defer attaching the persistent listener until the browser is idle
    let scheduledId = null;
    let unsubscribe = null;
    const attach = () => {
      unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          const commentsData = [];
          querySnapshot.forEach((doc) => {
            commentsData.push({
              id: doc.id,
              ...doc.data(),
            });
          });
          // Sort by createdAt ascending (chronological)
          commentsData.sort((a, b) => {
            const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
            const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
            return aTime - bTime;
          });
          setComments(commentsData);
          setLoading(false);
        },
        (error) => {
          console.error("Error listening to comments:", error);
          setLoading(false);
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

    return () => {
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
      if (unsubscribe) unsubscribe();
    };
  }, [activityId]);

  return { comments, loading };
}
