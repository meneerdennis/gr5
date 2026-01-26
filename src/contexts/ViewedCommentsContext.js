import React, { createContext, useContext } from "react";
import { useViewedComments } from "../hooks/useViewedComments";

const ViewedCommentsContext = createContext();

export function ViewedCommentsProvider({ children }) {
  const viewedCommentsHook = useViewedComments();

  return (
    <ViewedCommentsContext.Provider value={viewedCommentsHook}>
      {children}
    </ViewedCommentsContext.Provider>
  );
}

export function useViewedCommentsContext() {
  const context = useContext(ViewedCommentsContext);
  if (!context) {
    throw new Error(
      "useViewedCommentsContext must be used within ViewedCommentsProvider",
    );
  }
  return context;
}
