import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./useAuth";
import {
  getViewedActivitiesFromFirebase,
  saveViewedActivitiesToFirebase,
  markActivityAsViewedInFirebase,
  markMultipleActivitiesAsViewedInFirebase,
} from "../services/firebaseService";

// Custom hook for managing viewed activities (localStorage primary, Firebase backup)
// This ensures activities persist immediately and survive hard refreshes
export const useViewedActivities = () => {
  const { user } = useAuth();
  const [viewedActivities, setViewedActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const STORAGE_KEY = "gr5_viewed_activities";

  // Load viewed activities from localStorage on initial mount
  useEffect(() => {
    const savedActivities = localStorage.getItem(STORAGE_KEY);
    if (savedActivities) {
      try {
        const parsed = JSON.parse(savedActivities);
        setViewedActivities(parsed);
      } catch (error) {
        console.warn("Error parsing saved viewed activities:", error);
        setViewedActivities([]);
      }
    }
    setLoading(false);
  }, []);

  // Sync localStorage to Firebase when user logs in
  useEffect(() => {
    if (!user?.uid || loading) return;

    const syncWithFirebase = async () => {
      try {
        const activities = await getViewedActivitiesFromFirebase(user.uid);
        // Merge local and remote, keeping all viewed items
        const merged = Array.from(
          new Set([...viewedActivities, ...activities]),
        );
        setViewedActivities(merged);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        // Save merged data back to Firebase
        await saveViewedActivitiesToFirebase(user.uid, merged);
      } catch (error) {
        console.warn("Error syncing viewed activities with Firebase:", error);
        // Continue with localStorage data even if Firebase sync fails
      }
    };

    syncWithFirebase();
  }, [user?.uid, loading, viewedActivities]);

  // Mark an activity as viewed
  const markAsViewed = useCallback(
    async (activityId) => {
      // Update local state immediately for responsive UI
      setViewedActivities((prev) => {
        if (!prev.includes(activityId)) {
          const updated = [...prev, activityId];
          // Save to localStorage immediately - this is the primary storage
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          return updated;
        }
        return prev;
      });

      // Optionally sync to Firebase in background if user is logged in
      if (user?.uid) {
        try {
          await markActivityAsViewedInFirebase(user.uid, activityId);
        } catch (error) {
          console.warn("Error syncing to Firebase:", error);
          // Continue - localStorage already has the data
        }
      }
    },
    [user?.uid],
  );

  // Mark multiple activities as viewed
  const markMultipleAsViewed = useCallback(
    async (activityIds) => {
      if (!activityIds.length) return;

      // Update local state immediately
      setViewedActivities((prev) => {
        const newViewed = [...prev];
        activityIds.forEach((id) => {
          if (!newViewed.includes(id)) {
            newViewed.push(id);
          }
        });
        // Save to localStorage immediately
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newViewed));
        return newViewed;
      });

      // Optionally sync to Firebase in background if user is logged in
      if (user?.uid) {
        try {
          await markMultipleActivitiesAsViewedInFirebase(user.uid, activityIds);
        } catch (error) {
          console.warn("Error syncing multiple activities to Firebase:", error);
          // Continue - localStorage already has the data
        }
      }
    },
    [user?.uid],
  );

  // Check if an activity has been viewed
  const isViewed = useCallback(
    (activityId) => {
      return viewedActivities.includes(activityId);
    },
    [viewedActivities],
  );

  // Get count of unread activities
  const getUnreadCount = useCallback(
    (activities) => {
      if (!activities) return 0;
      return activities.filter(
        (activity) => !viewedActivities.includes(activity.id),
      ).length;
    },
    [viewedActivities],
  );

  // Clear all viewed activities (useful for testing or reset)
  const clearViewedActivities = useCallback(async () => {
    setViewedActivities([]);
    localStorage.removeItem(STORAGE_KEY);
    if (user?.uid) {
      try {
        await saveViewedActivitiesToFirebase(user.uid, []);
      } catch (error) {
        console.warn("Error clearing viewed activities from Firebase:", error);
      }
    }
  }, [user?.uid]);

  // Get all viewed activities
  const getAllViewedActivities = useCallback(() => {
    return [...viewedActivities];
  }, [viewedActivities]);

  // Get viewed activities (for compatibility)
  const getViewedActivities = useCallback(() => {
    return [...viewedActivities];
  }, [viewedActivities]);

  return {
    markAsViewed,
    markMultipleAsViewed,
    isViewed,
    getUnreadCount,
    clearViewedActivities,
    getAllViewedActivities,
    getViewedActivities,
    loading,
  };
};
