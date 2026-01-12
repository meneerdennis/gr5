import { useState, useEffect } from "react";

// Custom hook for managing viewed activities in localStorage
export const useViewedActivities = () => {
  const STORAGE_KEY = "gr5_viewed_activities";

  // Get viewed activities from localStorage
  const getViewedActivities = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.warn("Error reading viewed activities from localStorage:", error);
      return [];
    }
  };

  // Save viewed activities to localStorage
  const saveViewedActivities = (viewedActivities) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(viewedActivities));
    } catch (error) {
      console.warn("Error saving viewed activities to localStorage:", error);
    }
  };

  // Mark an activity as viewed
  const markAsViewed = (activityId) => {
    const viewedActivities = getViewedActivities();
    if (!viewedActivities.includes(activityId)) {
      viewedActivities.push(activityId);
      saveViewedActivities(viewedActivities);
    }
  };

  // Mark multiple activities as viewed
  const markMultipleAsViewed = (activityIds) => {
    const viewedActivities = getViewedActivities();
    const newViewedActivities = [...viewedActivities];

    activityIds.forEach((id) => {
      if (!newViewedActivities.includes(id)) {
        newViewedActivities.push(id);
      }
    });

    saveViewedActivities(newViewedActivities);
  };

  // Check if an activity has been viewed
  const isViewed = (activityId) => {
    const viewedActivities = getViewedActivities();
    return viewedActivities.includes(activityId);
  };

  // Get count of unread activities
  const getUnreadCount = (activities) => {
    const viewedActivities = getViewedActivities();
    return activities.filter(
      (activity) => !viewedActivities.includes(activity.id)
    ).length;
  };

  // Clear all viewed activities (useful for testing or reset)
  const clearViewedActivities = () => {
    localStorage.removeItem(STORAGE_KEY);
  };

  // Get all viewed activities
  const getAllViewedActivities = () => {
    return getViewedActivities();
  };

  return {
    markAsViewed,
    markMultipleAsViewed,
    isViewed,
    getUnreadCount,
    clearViewedActivities,
    getAllViewedActivities,
    getViewedActivities,
  };
};
