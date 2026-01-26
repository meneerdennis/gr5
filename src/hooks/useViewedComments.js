import { useCallback, useEffect, useState } from "react";

// Track viewed comments count per activity (localStorage primary)
export const useViewedComments = () => {
  const [viewedComments, setViewedComments] = useState({});
  const [loading, setLoading] = useState(true);
  const [hasStoredData, setHasStoredData] = useState(false);
  const STORAGE_KEY = "gr5_viewed_comments";

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          setViewedComments(parsed);
          setHasStoredData(true);
        }
      } catch (error) {
        console.warn("Error parsing viewed comments:", error);
      }
    }
    setLoading(false);
  }, []);

  const markCommentsAsViewed = useCallback((activityId, count = 0) => {
    if (!activityId) return;
    setViewedComments((prev) => {
      const updated = {
        ...prev,
        [activityId]: Math.max(0, Number(count) || 0),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const getLastViewedCount = useCallback(
    (activityId) => {
      if (!activityId) return 0;
      return Number(viewedComments[activityId] || 0);
    },
    [viewedComments],
  );

  const hasNewComments = useCallback(
    (activityId, currentCount = 0) => {
      if (!activityId) return false;
      const lastViewed = Number(viewedComments[activityId] || 0);
      return Number(currentCount || 0) > lastViewed;
    },
    [viewedComments],
  );

  return {
    loading,
    hasStoredData,
    markCommentsAsViewed,
    getLastViewedCount,
    hasNewComments,
  };
};
