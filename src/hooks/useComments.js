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
    const unsubscribe = onSnapshot(
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
      }
    );
    return unsubscribe;
  }, [activityId]);

  return { comments, loading };
}
