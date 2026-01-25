import React, { createContext, useState, useCallback, useContext } from "react";

const NoteModalContext = createContext();

/**
 * NoteModalProvider - Manages modal state independently from main App
 * This prevents cascading re-renders of MapView and ElevationProfile
 * when modal state changes
 */
export function NoteModalProvider({ children }) {
  const [selectedHikeId, setSelectedHikeId] = useState(null);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState(null);
  const [selectedPhotoLocation, setSelectedPhotoLocation] = useState(null);
  const [hikeBounds, setHikeBounds] = useState(null);
  const [translatedNote, setTranslatedNote] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [showTranslated, setShowTranslated] = useState(false);

  // Open modal for a specific hike
  const openModal = useCallback((hikeId, photoUrl = null) => {
    setSelectedHikeId(hikeId);
    setSelectedPhotoUrl(photoUrl);
  }, []);

  // Close modal
  const closeModal = useCallback(() => {
    setSelectedHikeId(null);
    setSelectedPhotoUrl(null);
    setSelectedPhotoLocation(null);
    setHikeBounds(null);
    setTranslatedNote("");
    setShowTranslated(false);
    setIsTranslating(false);
  }, []);

  // Update selected photo
  const setPhotoUrl = useCallback((url) => {
    setSelectedPhotoUrl(url);
  }, []);

  // Update photo location (for map panning)
  const setPhotoLocation = useCallback((location) => {
    setSelectedPhotoLocation(location);
  }, []);

  // Update hike bounds (for map zoom to fit hike)
  const setBounds = useCallback((bounds) => {
    setHikeBounds(bounds);
  }, []);

  // Reset translation state (when changing hikes)
  const resetTranslation = useCallback(() => {
    setTranslatedNote("");
    setShowTranslated(false);
    setIsTranslating(false);
  }, []);

  // Set translation
  const setTranslation = useCallback((text, show = true) => {
    setTranslatedNote(text);
    setShowTranslated(show);
  }, []);

  // Set translating state
  const setTranslatingState = useCallback((isTranslating) => {
    setIsTranslating(isTranslating);
  }, []);

  const value = {
    selectedHikeId,
    selectedPhotoUrl,
    selectedPhotoLocation,
    hikeBounds,
    translatedNote,
    isTranslating,
    showTranslated,
    openModal,
    closeModal,
    setPhotoUrl,
    setPhotoLocation,
    setBounds,
    resetTranslation,
    setTranslation,
    setTranslatingState,
  };

  return (
    <NoteModalContext.Provider value={value}>
      {children}
    </NoteModalContext.Provider>
  );
}

/**
 * Hook to use NoteModal context
 */
export function useNoteModal() {
  const context = useContext(NoteModalContext);
  if (!context) {
    throw new Error("useNoteModal must be used within NoteModalProvider");
  }
  return context;
}
