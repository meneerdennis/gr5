import React, { createContext, useContext } from "react";
import { useViewedActivities } from "../hooks/useViewedActivities";

const ViewedActivitiesContext = createContext();

export function ViewedActivitiesProvider({ children }) {
  const viewedActivitiesHook = useViewedActivities();

  return (
    <ViewedActivitiesContext.Provider value={viewedActivitiesHook}>
      {children}
    </ViewedActivitiesContext.Provider>
  );
}

export function useViewedActivitiesContext() {
  const context = useContext(ViewedActivitiesContext);
  if (!context) {
    throw new Error(
      "useViewedActivitiesContext must be used within ViewedActivitiesProvider",
    );
  }
  return context;
}
