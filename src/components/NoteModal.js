import React, { useState, useEffect, useMemo, useRef } from "react";
import { Suspense } from "react";
import { useNoteModal } from "../contexts/NoteModalContext";
import { useLikes } from "../hooks/useLikes";
import { useComments } from "../hooks/useComments";
import { useViewedCommentsContext } from "../contexts/ViewedCommentsContext";
import SwiperComponent, { SwiperSlide } from "./SwiperComponent";
import LikeButton from "./LikeButton";
import CommentsSection from "./CommentsSection";
import { translateText, getUserLanguage } from "../services/translationService";

const buttonTexts = {
  en: {
    see: "See Translation",
    show: "Show Original",
    same: "The text is already in your language.",
    error: "Translation failed. Please try again.",
  },
  nl: {
    see: "Vertaling bekijken",
    show: "Origineel tonen",
    same: "De tekst is al in uw taal.",
    error: "Vertaling mislukt. Probeer het opnieuw.",
  },
  fr: {
    see: "Voir la traduction",
    show: "Afficher l'original",
    same: "Le texte est déjà dans votre langue.",
    error: "La traduction a échoué. Veuillez réessayer.",
  },
  de: {
    see: "Übersetzung anzeigen",
    show: "Original anzeigen",
    same: "Der Text ist bereits in Ihrer Sprache.",
    error: "Übersetzung fehlgeschlagen. Bitte versuchen Sie es erneut.",
  },
  lt: {
    see: "Žiūrėti vertimą",
    show: "Rodyti originalą",
    same: "Tekstas jau yra jūsų kalba.",
    error: "Vertimas nepavyko. Bandykite dar kartą.",
  },
};

function NoteModal({
  hikes,
  photos,
  user,
  markAsViewed,
  hikesWithNotes,
  loadPhotosForHike,
}) {
  const {
    selectedHikeId,
    selectedPhotoUrl,
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
  } = useNoteModal();
  const { markCommentsAsViewed } = useViewedCommentsContext();

  // Mobile detection for modal styling
  const [isMobile, setIsMobile] = useState(false);
  const isInitialSlideRef = useRef(true);
  const [loadedPhotos, setLoadedPhotos] = useState({});
  const [isPWA, setIsPWA] = useState(false);

  const [swipeStart, setSwipeStart] = useState(null);
  const [swipeDistance, setSwipeDistance] = useState(0);
  const backdropRef = useRef(null);
  const modalRef = useRef(null);
  const canSwipeToCloseRef = useRef(false);
  const SWIPE_THRESHOLD = 100; // pixels

  // Get selected hike early (before useEffects that need it)
  const selectedHike = hikes.find((hike) => hike.id === selectedHikeId);
  const songOfTheDay = selectedHike?.songOfTheDay;

  useEffect(() => {
    console.log("Song of the Day:", songOfTheDay);
  }, [songOfTheDay]);

  // Handle touch events for swipe-down-to-close
  const isScrollAtTop = () => {
    return (modalRef.current?.scrollTop || 0) <= 0;
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      canSwipeToCloseRef.current = isScrollAtTop();
      setSwipeStart(e.touches[0].clientY);
      setSwipeDistance(0);
    }
  };

  const handleTouchMove = (e) => {
    if (
      swipeStart !== null &&
      e.touches.length === 1 &&
      canSwipeToCloseRef.current
    ) {
      const currentY = e.touches[0].clientY;
      const distance = currentY - swipeStart;

      // Only track downward swipes
      if (distance > 0) {
        setSwipeDistance(distance);
      }
    }
  };

  const handleTouchEnd = () => {
    if (canSwipeToCloseRef.current && swipeDistance > SWIPE_THRESHOLD) {
      closeModal();
    }
    setSwipeStart(null);
    setSwipeDistance(0);
    canSwipeToCloseRef.current = false;
  };

  useEffect(() => {
    const checkMobile = () => {
      const mediaQuery = window.matchMedia("(max-width: 767px)");
      setIsMobile(mediaQuery.matches);

      const handleChange = (e) => setIsMobile(e.matches);
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    };

    const checkPWA = () => {
      const isStandalone =
        window.matchMedia?.("(display-mode: standalone)")?.matches ||
        window.navigator?.standalone === true;
      setIsPWA(isStandalone);
    };

    checkMobile();
    checkPWA();
  }, []);

  // Reset translation when hike changes and load photos if needed
  useEffect(() => {
    resetTranslation();
    isInitialSlideRef.current = true;
    setLoadedPhotos({});

    // Load photos for this hike if not already loaded
    if (selectedHikeId && loadPhotosForHike) {
      loadPhotosForHike(selectedHikeId);
    }
  }, [selectedHikeId, resetTranslation, loadPhotosForHike]);

  // Set map bounds to show entire hike when modal opens
  useEffect(() => {
    if (selectedHikeId && selectedHike) {
      // Calculate bounds from hike's photo locations
      const photoLocations = photos
        .filter((p) => p.hikeId === selectedHikeId && p.lat && p.lng)
        .map((p) => ({ lat: p.lat, lng: p.lng }));

      if (photoLocations.length > 0) {
        const bounds = {
          south: Math.min(...photoLocations.map((p) => p.lat)),
          west: Math.min(...photoLocations.map((p) => p.lng)),
          north: Math.max(...photoLocations.map((p) => p.lat)),
          east: Math.max(...photoLocations.map((p) => p.lng)),
        };
        setBounds(bounds);
      }
    }
  }, [selectedHikeId, selectedHike, photos, setBounds]);

  // Mark hike as viewed when modal opens or hike changes
  useEffect(() => {
    if (selectedHikeId) {
      markAsViewed(selectedHikeId);
      // Also update localStorage for Dropdown synchronization
      const stored = localStorage.getItem("viewedActivities");
      let viewed = new Set();
      if (stored) {
        try {
          viewed = new Set(JSON.parse(stored));
        } catch (e) {}
      }
      viewed.add(selectedHikeId);
      localStorage.setItem("viewedActivities", JSON.stringify([...viewed]));
      // Dispatch custom event to update Dropdown
      window.dispatchEvent(
        new CustomEvent("viewedActivitiesUpdated", {
          detail: { viewedActivities: viewed },
        }),
      );
    }
  }, [selectedHikeId, markAsViewed]);

  const { comments } = useComments(selectedHikeId);

  useEffect(() => {
    if (!selectedHikeId) return;
    const baseCount =
      hikes.find((hike) => hike.id === selectedHikeId)?.commentsCount || 0;
    const liveCount = Array.isArray(comments) ? comments.length : 0;
    const currentCount = Math.max(baseCount, liveCount);
    markCommentsAsViewed(selectedHikeId, currentCount);
  }, [selectedHikeId, hikes, comments, markCommentsAsViewed]);

  // Get derived values from selected hike
  const { likesCount } = useLikes(selectedHike?.id, user?.uid);
  const noteText = selectedHike?.note || "";
  const showNoteModal = selectedHikeId && noteText;

  // Get photos for this hike
  const hikePhotos = useMemo(() => {
    const filtered = photos.filter((p) => p.hikeId === selectedHikeId);
    // Deduplicate by id, keeping the first occurrence
    const seen = new Set();
    const deduplicated = filtered.filter((photo) => {
      if (seen.has(photo.id)) {
        return false;
      }
      seen.add(photo.id);
      return true;
    });
    // Sort by date ascending (oldest first)
    return deduplicated.sort((a, b) => {
      const aDate = new Date(a.date || a.uploadedAt || 0);
      const bDate = new Date(b.date || b.uploadedAt || 0);
      return aDate - bDate;
    });
  }, [photos, selectedHikeId]);

  const selectedPhotoIndex =
    hikePhotos.findIndex((p) => p.url === selectedPhotoUrl) || 0;

  // Navigation helpers
  const currentNoteIndex = useMemo(() => {
    return hikesWithNotes.findIndex((hike) => hike.id === selectedHikeId);
  }, [hikesWithNotes, selectedHikeId]);

  const hasPreviousNote = currentNoteIndex > 0;
  const hasNextNote = currentNoteIndex < hikesWithNotes.length - 1;

  // Navigation functions
  const scrollModalToTop = () => {
    setTimeout(() => {
      if (modalRef.current) {
        modalRef.current.scrollTo(0, 0);
      }
    }, 0);
  };

  const goToPreviousNote = () => {
    if (hasPreviousNote) {
      const previousHike = hikesWithNotes[currentNoteIndex - 1];
      openModal(previousHike.id);
      // markAsViewed will be called by useEffect when selectedHikeId changes
      scrollModalToTop();
    }
  };

  const goToNextNote = () => {
    if (hasNextNote) {
      const nextHike = hikesWithNotes[currentNoteIndex + 1];
      openModal(nextHike.id);
      // markAsViewed will be called by useEffect when selectedHikeId changes
      scrollModalToTop();
    }
  };

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const handleTranslateNote = async () => {
    if (translatedNote && showTranslated) {
      setTranslation(translatedNote, false);
      return;
    }
    if (translatedNote) {
      setTranslation(translatedNote, true);
      return;
    }
    setTranslatingState(true);
    try {
      const userLang = getUserLanguage();
      const translated = await translateText(noteText, userLang);
      if (translated === noteText) {
        alert(
          buttonTexts[userLang]?.same ||
            "The text is already in your language.",
        );
        setTranslatingState(false);
        return;
      }
      setTranslation(translated, true);
    } catch (error) {
      alert(
        buttonTexts[userLang]?.error || "Translation failed. Please try again.",
      );
    } finally {
      setTranslatingState(false);
    }
  };

  if (!showNoteModal) return null;

  return (
    <div
      ref={backdropRef}
      className="note-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          closeModal();
        }
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: `rgba(0, 0, 0, ${0.8 - swipeDistance / 500})`,
        display: "flex",
        alignItems: isMobile ? "flex-start" : "center",
        justifyContent: "center",
        zIndex: 2000,
        padding: isMobile ? "10px" : "20px",
        overflow: isMobile ? "hidden" : "auto",
        transition: swipeStart === null ? "background-color 0.2s ease" : "none",
      }}
    >
      <div
        ref={modalRef}
        className="instagram-post-modal"
        style={{
          maxWidth: "500px",
          width: "100%",
          maxHeight: isMobile ? (isPWA ? "100vh" : "85vh") : "90vh",
          height: isMobile ? "auto" : "auto",
          backgroundColor: "white",
          borderRadius: "12px",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
          border: "1px solid #e1e5e9",
          overflow: isMobile ? "auto" : "auto",
          display: "flex",
          flexDirection: "column",
          transform: `translateY(${Math.max(0, swipeDistance)}px)`,
          transition: swipeStart === null ? "transform 0.3s ease" : "none",
          opacity: Math.max(0.3, 1 - swipeDistance / 300),
          position: "relative",
        }}
      >
        {/* Instagram Header */}
        <div
          className="instagram-header"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            borderBottom: "1px solid #e1e5e9",
            flexShrink: 0,
            position: "sticky",
            top: 10,
            backgroundColor: "#f5f5f5",
            zIndex: 10,
            color: "#3b3b3b",
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <button
              onClick={closeModal}
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                backgroundColor: "#f0f0f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginRight: "12px",
                fontSize: "16px",
                border: "none",
                cursor: "pointer",
              }}
              title="View hike on map"
            >
              🌍
            </button>
            <div>
              <div style={{ fontWeight: "600", fontSize: "14px" }}>
                {selectedHike?.name || "GR5 Hike"}
              </div>
              <div style={{ fontSize: "12px", color: "#8e8e8e" }}>
                {formatDate(selectedHike?.startDate)} | {selectedHike?.start} →{" "}
                {selectedHike?.end} | {selectedHike?.distanceKm?.toFixed(1)} km
              </div>
            </div>
          </div>

          <button
            onClick={closeModal}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "20px",
              color: "#8e8e8e",
              padding: "4px",
            }}
            title="Close post"
          >
            ×
          </button>
        </div>

        {/* Photos Swiper */}
        {hikePhotos && hikePhotos.length > 0 && (
          <div
            className="instagram-photos"
            style={{
              position: "relative",
              flexShrink: 0,
              width: "100%",
              paddingBottom: "125%", // 5/4 = 1.25 = 125% for aspect ratio 4:5
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
            >
              <SwiperComponent
                key={selectedHikeId}
                initialSlide={selectedPhotoIndex}
                style={{ height: "100%" }}
                onSlideChange={(swiper) => {
                  const activePhoto = hikePhotos[swiper.activeIndex];
                  if (activePhoto) {
                    setPhotoUrl(activePhoto.url);
                    // Only pan to photo if not the initial slide - let zoom-to-hike-bounds handle initial view
                    if (
                      !isInitialSlideRef.current &&
                      activePhoto.lat &&
                      activePhoto.lng
                    ) {
                      setPhotoLocation({
                        lat: activePhoto.lat,
                        lng: activePhoto.lng,
                      });
                    }
                  }
                  // Mark that we've shown the initial slide
                  isInitialSlideRef.current = false;

                  // Handle video autoplay when slide becomes active
                  const activeSlide = swiper.slides[swiper.activeIndex];
                  if (activeSlide) {
                    const videoPlaceholder = activeSlide.querySelector(
                      "[data-video-placeholder]",
                    );
                    if (videoPlaceholder) {
                      const playButton = videoPlaceholder.querySelector(
                        'div[style*="cursor: pointer"]',
                      );
                      if (playButton) {
                        playButton.click();
                      }
                    }
                  }

                  // Pause videos in inactive slides
                  swiper.slides.forEach((slide, index) => {
                    if (index !== swiper.activeIndex) {
                      const video = slide.querySelector("video");
                      if (video && !video.paused) {
                        video.pause();
                      }
                    }
                  });
                }}
                lazy={{
                  loadPrevNext: true,
                  loadPrevNextAmount: 1,
                }}
              >
                {hikePhotos.map((photo, index) => (
                  <SwiperSlide key={photo.id || `${photo.url}-${index}`}>
                    {(photo.type && photo.type.startsWith("video/")) ||
                    photo.url?.includes(".mov") ||
                    photo.url?.includes(".mp4") ||
                    photo.url?.includes(".avi") ||
                    photo.url?.includes(".webm") ? (
                      <div
                        data-video-placeholder
                        style={{
                          position: "relative",
                          width: "100%",
                          height: "100%",
                          backgroundColor: "#000",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "48px",
                            color: "white",
                            background: "rgba(0,0,0,0.7)",
                            borderRadius: "50%",
                            width: "80px",
                            height: "80px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            zIndex: 2,
                          }}
                          onClick={(e) => {
                            const container = e.target.closest(".swiper-slide");
                            if (container) {
                              container.innerHTML = "";
                              const video = document.createElement("video");
                              video.src = photo.url;
                              video.controls = true;
                              video.muted = true;
                              video.playsInline = true;
                              video.loop = true;
                              video.preload = "metadata";
                              video.style.cssText =
                                "width: 100%; height: 100%; object-fit: cover; background-color: #000;";

                              video.oncanplay = () => {
                                video.play().catch((err) => {
                                  console.log("Autoplay failed:", err);
                                });
                              };

                              video.onloadeddata = () => {
                                video.play().catch((err) => {
                                  console.log("Fallback autoplay failed:", err);
                                });
                              };

                              video.onError = () => {
                                console.error(
                                  "Video failed to load:",
                                  photo.url,
                                );
                                container.innerHTML =
                                  '<div style="width: 100%; height: 400px; display: flex; align-items: center; justify-content: center; background: #000; color: white; font-size: 24px;">🎥<br/>Video unavailable</div>';
                              };

                              container.appendChild(video);
                            }
                          }}
                        >
                          ▶️
                        </div>
                        <div
                          style={{
                            position: "absolute",
                            bottom: "10px",
                            right: "10px",
                            color: "white",
                            fontSize: "12px",
                            background: "rgba(0,0,0,0.5)",
                            padding: "2px 6px",
                            borderRadius: "4px",
                          }}
                        >
                          Video
                        </div>
                      </div>
                    ) : (
                      <div
                        className="photo-loading-wrapper"
                        style={{ height: "100%" }}
                      >
                        <div
                          className={`photo-loading-skeleton${
                            loadedPhotos[photo.id || photo.url || index]
                              ? " is-loaded"
                              : ""
                          }`}
                        >
                          <div className="photo-loading-shimmer" />
                          <div className="photo-loading-spinner" />
                        </div>
                        <img
                          src={photo.url}
                          alt={photo.caption || `Photo ${index + 1}`}
                          className={`photo-image${
                            loadedPhotos[photo.id || photo.url || index]
                              ? " is-loaded"
                              : ""
                          }`}
                          loading="eager"
                          decoding={
                            index === selectedPhotoIndex ? "sync" : "async"
                          }
                          fetchpriority={
                            index === selectedPhotoIndex ? "high" : "auto"
                          }
                          onLoad={() => {
                            const key = photo.id || photo.url || index;
                            setLoadedPhotos((prev) => ({
                              ...prev,
                              [key]: true,
                            }));
                          }}
                          onError={() => {
                            const key = photo.id || photo.url || index;
                            setLoadedPhotos((prev) => ({
                              ...prev,
                              [key]: true,
                            }));
                          }}
                        />
                      </div>
                    )}
                  </SwiperSlide>
                ))}
              </SwiperComponent>
            </div>
          </div>
        )}
        {/* Spotify Widget */}
        {songOfTheDay && (
          <>
            <h4 style={{ margin: "0 0 4px 0", fontSize: "14px", fontWeight: "bold", color: "#3b3b3b", padding: "0 10px" }}>
              Song of the Day
            </h4>
            <div
              style={{
                margin: "4px 0", // Minimal margin
                padding: "0 10px",
              }}
            >
              <iframe
                src={`https://open.spotify.com/embed/track/${songOfTheDay.split("/").pop().split("?")[0]}`}
                width="100%"
                height="80"
                frameBorder="0"
                allow="encrypted-media"
                title="Spotify Song of the Day"
                scrolling="no"
                style={{ borderRadius: "4px", overflow: "hidden" }}
              ></iframe>
            </div>
          </>
        )}
        {/* Post Content */}
        <div
          className="instagram-content"
          style={{
            padding: "12px 16px",
            flex: isMobile ? "none" : 1,
            overflowY: "visible",
            color: "#3b3b3b",
          }}
        >
          {/* Action Buttons */}
          <div
            className="instagram-actions"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0px",
              marginBottom: "12px",
            }}
          >
            <LikeButton activityId={selectedHike.id} />
            <span
              style={{
                fontSize: "12px",
                fontWeight: "600",
                color: "#262626",
                marginRight: "2px",
              }}
            >
              {likesCount || 0}
            </span>
            <button
              onClick={() => {
                const commentsSection = document.querySelector(
                  ".instagram-comments",
                );
                if (commentsSection) {
                  commentsSection.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                }
              }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                marginLeft: "8px",
              }}
              title="Comment"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill={comments.length > 0 ? "#0095f6" : "none"}
                stroke={comments.length > 0 ? "none" : "#000000"}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </button>
            <span
              style={{
                fontSize: "12px",
                fontWeight: "600",
                color: "#262626",
              }}
            >
              {comments.length}
            </span>
          </div>

          {/* Caption/Note */}
          <div className="instagram-caption">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "8px",
              }}
            >
              <span style={{ fontWeight: "600" }}>
                {selectedHike?.name || "GR5 Hike"}
              </span>
              {!isTranslating && noteText && getUserLanguage() !== "nl" && (
                <button
                  onClick={handleTranslateNote}
                  style={{
                    fontSize: "12px",
                    color: "#0095f6",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  {showTranslated
                    ? buttonTexts[getUserLanguage()]?.show ||
                      buttonTexts.en.show
                    : buttonTexts[getUserLanguage()]?.see || buttonTexts.en.see}
                </button>
              )}
              {isTranslating && (
                <span
                  style={{
                    fontSize: "12px",
                    color: "#8e8e8e",
                  }}
                >
                  Translating...
                </span>
              )}
            </div>
            <span
              style={{
                fontSize: "14px",
                color: "#262626",
                whiteSpace: "pre-wrap",
              }}
            >
              {showTranslated ? translatedNote : noteText}
            </span>
          </div>

          {/* Comments Section */}
          <div
            className="instagram-comments"
            style={{
              marginTop: "12px",
              paddingTop: "12px",
              borderTop: "1px solid #e1e5e9",
            }}
          >
            <Suspense fallback={<div>Loading comments...</div>}>
              <CommentsSection activityId={selectedHike.id} />
            </Suspense>
          </div>
        </div>

        {/* Navigation Arrows for Multiple Notes */}
        {(hasPreviousNote || hasNextNote) && (
          <div
            className="instagram-navigation"
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "20px 16px",
              backgroundColor: "#f0f0f0",
              borderTop: "1px solid #e1e5e9",
              flexShrink: 0,
              position: "sticky",
              bottom: 0,
            }}
          >
            {hasPreviousNote ? (
              <button
                onClick={goToPreviousNote}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "14px",
                  color: "#0095f6",
                  fontWeight: "600",
                }}
              >
                ‹ Previous
              </button>
            ) : (
              <div />
            )}

            {hikesWithNotes.length > 1 && (
              <span
                style={{
                  fontSize: "12px",
                  color: "#8e8e8e",
                  alignSelf: "center",
                }}
              >
                {currentNoteIndex + 1} of {hikesWithNotes.length}
              </span>
            )}

            {hasNextNote ? (
              <button
                onClick={goToNextNote}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "14px",
                  color: "#0095f6",
                  fontWeight: "600",
                }}
              >
                Next ›
              </button>
            ) : (
              <div />
            )}
          </div>
        )}

      </div>
    </div>
  );
}

export default React.memo(NoteModal);
