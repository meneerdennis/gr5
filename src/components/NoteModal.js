import React, { useState, useEffect, useMemo } from "react";
import { Suspense } from "react";
import { useNoteModal } from "../contexts/NoteModalContext";
import { useLikes } from "../hooks/useLikes";
import { useComments } from "../hooks/useComments";
import SwiperComponent from "./SwiperComponent";
import { SwiperSlide } from "swiper/react";
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

function NoteModal({ hikes, photos, user, markAsViewed, hikesWithNotes }) {
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
    resetTranslation,
    setTranslation,
    setTranslatingState,
  } = useNoteModal();

  // Mobile detection for modal styling
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mediaQuery = window.matchMedia("(max-width: 767px)");
      setIsMobile(mediaQuery.matches);

      const handleChange = (e) => setIsMobile(e.matches);
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    };

    checkMobile();
  }, []);

  // Reset translation when hike changes
  useEffect(() => {
    resetTranslation();
  }, [selectedHikeId, resetTranslation]);

  // Get selected hike
  const selectedHike = hikes.find((hike) => hike.id === selectedHikeId);
  const { likesCount } = useLikes(selectedHike?.id, user?.uid);
  const { comments } = useComments(selectedHike?.id);
  const noteText = selectedHike?.note || "";
  const showNoteModal = selectedHikeId && noteText;

  // Get photos for this hike
  const hikePhotos = useMemo(() => {
    return photos.filter((p) => p.hikeId === selectedHikeId);
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
  const goToPreviousNote = () => {
    if (hasPreviousNote) {
      const previousHike = hikesWithNotes[currentNoteIndex - 1];
      openModal(previousHike.id);
      markAsViewed(previousHike.id);
      const modal = document.querySelector(".instagram-post-modal");
      if (modal) modal.scrollTo(0, 0);
    }
  };

  const goToNextNote = () => {
    if (hasNextNote) {
      const nextHike = hikesWithNotes[currentNoteIndex + 1];
      openModal(nextHike.id);
      markAsViewed(nextHike.id);
      const modal = document.querySelector(".instagram-post-modal");
      if (modal) modal.scrollTo(0, 0);
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
      className="note-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          closeModal();
        }
      }}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        display: "flex",
        alignItems: isMobile ? "flex-start" : "center",
        justifyContent: "center",
        zIndex: 2000,
        padding: isMobile ? "10px" : "20px",
        overflowY: "auto",
      }}
    >
      <div
        className="instagram-post-modal"
        style={{
          maxWidth: "500px",
          width: "100%",
          maxHeight: isMobile ? "none" : "90vh",
          height: isMobile ? "auto" : "auto",
          backgroundColor: "white",
          borderRadius: "12px",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
          border: "1px solid #e1e5e9",
          overflow: isMobile ? "visible" : "auto",
          display: "flex",
          flexDirection: "column",
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
            top: 0,
            backgroundColor: "white",
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
            style={{ position: "relative", flexShrink: 0 }}
          >
            <SwiperComponent
              key={selectedHikeId}
              initialSlide={selectedPhotoIndex}
              style={{ height: "400px" }}
              onSlideChange={(swiper) => {
                const activePhoto = hikePhotos[swiper.activeIndex];
                if (activePhoto) {
                  setPhotoUrl(activePhoto.url);
                  if (activePhoto.lat && activePhoto.lng) {
                    setPhotoLocation({
                      lat: activePhoto.lat,
                      lng: activePhoto.lng,
                    });
                  }
                }

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
            >
              {hikePhotos.map((photo, index) => (
                <SwiperSlide key={photo.id || index}>
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
                        height: "400px",
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
                            video.preload = "auto";
                            video.style.cssText =
                              "width: 100%; height: 400px; object-fit: cover; background-color: #000;";

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
                              console.error("Video failed to load:", photo.url);
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
                    <img
                      src={photo.url}
                      alt={photo.caption || `Photo ${index + 1}`}
                      style={{
                        width: "100%",
                        height: "400px",
                        objectFit: "cover",
                      }}
                      loading="lazy"
                    />
                  )}
                </SwiperSlide>
              ))}
            </SwiperComponent>
          </div>
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
              padding: "8px 16px",
              backgroundColor: "#fafafa",
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
