import React, { useState, useEffect } from "react";
import ProgressBar from "./ProgressBar";
import quotesData from "../data/quotes.json";
import GR5Info from "./GR5Info";
import { useNotifications } from "../hooks/useNotifications";
import NotificationPrompt from "./NotificationPrompt";

function Layout({
  children,
  progress = 0,
  onRefresh = null,
  refreshInProgress = false,
}) {
  const [quotes] = useState(quotesData);
  const [randomQuote, setRandomQuote] = useState({});
  const [quoteOpacity, setQuoteOpacity] = useState(1);
  const [quoteTransform, setQuoteTransform] = useState(0);
  const [isGR5InfoOpen, setIsGR5InfoOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [initialTab, setInitialTab] = useState("gr5");
  const {
    canReceiveNotifications,
    notificationPermission,
    subscribeForNotifications,
    tokenReady,
    error: notificationError,
    lastMessage,
    messagingSupported,
    supportReason,
  } = useNotifications();
  const [toastMessage, setToastMessage] = useState(null);
  const lastRefreshKeyRef = React.useRef(null);

  useEffect(() => {
    if (!lastMessage?.notification && !lastMessage?.data) return;
    const title =
      lastMessage?.notification?.title ||
      lastMessage?.data?.title ||
      "New update";
    const body =
      lastMessage?.notification?.body || lastMessage?.data?.body || "";
    setToastMessage({ title, body });

    const timer = setTimeout(() => setToastMessage(null), 6000);
    return () => clearTimeout(timer);
  }, [lastMessage]);

  useEffect(() => {
    if (!lastMessage?.data?.refreshHikes) return;
    if (!onRefresh || refreshInProgress) return;
    const refreshKey = `${lastMessage?.data?.type || ""}|${
      lastMessage?.data?.hikeId || ""
    }|${lastMessage?.data?.message || ""}`;
    if (lastRefreshKeyRef.current === refreshKey) return;
    lastRefreshKeyRef.current = refreshKey;
    onRefresh();
  }, [lastMessage, onRefresh, refreshInProgress]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (quotes.length === 0) return;

    const updateQuote = () => {
      // Slide up and fade out
      setQuoteOpacity(0);
      setQuoteTransform(-20);
      // After animation, change quote and slide down and fade in
      setTimeout(() => {
        const randomIndex = Math.floor(Math.random() * quotes.length);
        setRandomQuote(quotes[randomIndex]);
        setQuoteOpacity(1);
        setQuoteTransform(0);
      }, 500);
    };

    // Set initial quote
    const randomIndex = Math.floor(Math.random() * quotes.length);
    setRandomQuote(quotes[randomIndex]);

    // Update every 20 seconds
    const interval = setInterval(updateQuote, 20000);

    return () => clearInterval(interval);
  }, [quotes]);

  return (
    <div
      className="flex-1 flex-col min-h-screen"
      style={{ fontFamily: "var(--font-sans)" }}
    >
      {/* Modern Header */}
      <div
        className="container mx-auto"
        style={{ marginBottom: "7px", marginTop: "5px" }}
      >
        <header className="glass-card">
          <div className="container slide-up justify-between">
            <div className="flex items-center justify-between">
              <div className="flex-1 " style={{ width: "100%" }}>
                <div
                  className="flex  items-center gap-4"
                  style={{ width: "100%" }}
                >
                  <img
                    src="/hiker.png"
                    alt="Hiker"
                    style={{
                      height: "110px",
                      width: "110px",
                      marginRight: "10px",
                    }}
                  />
                  <div style={{ width: "100%" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "0.5rem",
                      }}
                    >
                      <h1
                        className="text-lg md:text-3xl font-bold text-gray-900"
                        style={{ marginTop: "10px" }}
                      >
                        Mijn GR5
                      </h1>
                      <button
                        onClick={() => {
                          setInitialTab("gr5");
                          setIsGR5InfoOpen(true);
                        }}
                        style={{
                          width: "18px",
                          height: "18px",
                          borderRadius: "50%",
                          backgroundColor: "#3b82f6",
                          color: "white",
                          border: "none",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "12px",
                          fontWeight: "bold",
                          marginTop: "15px",
                        }}
                        title="Meer informatie over GR5"
                      >
                        i
                      </button>
                      {isMobile && (
                        <button
                          onClick={() => setNotifyOpen(true)}
                          style={{
                            width: "20px",
                            height: "20px",
                            borderRadius: "50%",
                            background: "transparent",
                            color: canReceiveNotifications
                              ? "#10b981"
                              : "#3b82f6",
                            border: "none",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "14px",
                            marginTop: "15px",
                            opacity:
                              canReceiveNotifications ||
                              notificationPermission === "denied" ||
                              !messagingSupported
                                ? 0.7
                                : 1,
                          }}
                          title={
                            canReceiveNotifications
                              ? tokenReady
                                ? "Notifications enabled"
                                : "Enabling notifications..."
                              : notificationPermission === "denied"
                                ? "Notifications blocked"
                                : !messagingSupported
                                  ? supportReason ||
                                    "Notifications not supported"
                                  : notificationError
                                    ? `Enable push notifications (${notificationError})`
                                    : "Enable push notifications"
                          }
                          aria-label="Open notifications prompt"
                        >
                          {canReceiveNotifications ? "🔔" : "🔕"}
                        </button>
                      )}
                    </div>
                    <div
                      className="text-gray-600 text-xs md:text-sm"
                      style={{
                        marginBottom: "5px",
                        fontStyle: "italic",
                        opacity: quoteOpacity,
                        transform: `translateY(${quoteTransform}px)`,
                        transition:
                          "opacity 0.5s ease-in-out, transform 0.5s ease-in-out",
                      }}
                    >
                      "{randomQuote.quote}"
                      <br />
                      <span className="block text-xs md:text-sm mt-0.5">
                        — {randomQuote.author}
                      </span>
                    </div>
                  </div>
                  {!isMobile && (
                    <ProgressBar
                      progress={progress}
                      compact={false}
                      position="top-right"
                      headerRight={
                        <button
                          onClick={() => setNotifyOpen(true)}
                          style={{
                            width: "26px",
                            height: "26px",
                            borderRadius: "50%",
                            background: "transparent",
                            color: canReceiveNotifications
                              ? "#10b981"
                              : "#3b82f6",
                            border: "none",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "16px",
                            opacity:
                              canReceiveNotifications ||
                              notificationPermission === "denied" ||
                              !messagingSupported
                                ? 0.7
                                : 1,
                          }}
                          title={
                            canReceiveNotifications
                              ? tokenReady
                                ? "Notifications enabled"
                                : "Enabling notifications..."
                              : notificationPermission === "denied"
                                ? "Notifications blocked"
                                : !messagingSupported
                                  ? supportReason ||
                                    "Notifications not supported"
                                  : notificationError
                                    ? `Enable push notifications (${notificationError})`
                                    : "Enable push notifications"
                          }
                          aria-label="Open notifications prompt"
                        >
                          {canReceiveNotifications ? "🔔" : "🔕"}
                        </button>
                      }
                    />
                  )}
                  {isMobile && (
                    <ProgressBar
                      progress={progress}
                      compact={true}
                      position="top-right"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>
      </div>

      {/* Compact Progress Bar positioned at top-right of header */}

      {/* Main Content */}
      <main className="flex-1">
        <div className="container mx-auto h-full">{children}</div>
      </main>

      <footer
        style={{
          background: "var(--glass-bg)",
          padding: "0 0",
          marginTop: "auto",
        }}
      >
        <div className="container mx-auto text-center">
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "1rem",
              alignItems: "center",
            }}
          >
            <a
              onClick={() => {
                setInitialTab("contact");
                setIsGR5InfoOpen(true);
              }}
              title="Contact me"
              style={{
                color: "#8b5cf6",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "0.5rem",
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                {" "}
                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />{" "}
              </svg>
            </a>
            <a
              href="https://www.instagram.com/mijngr5"
              target="_blank"
              rel="noopener noreferrer"
              title="Instagram (@dennisvers)"
              style={{
                color: "#8b5cf6",
                textDecoration: "none",
                padding: "0.5rem",
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="-1 -1 26 26"
                fill="currentColor"
              >
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </a>
          </div>
        </div>
      </footer>

      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: "1.5rem",
            right: isMobile ? "1rem" : "1.5rem",
            left: isMobile ? "1rem" : "auto",
            zIndex: 9999,
            background: "rgba(15, 23, 42, 0.95)",
            color: "white",
            padding: "0.75rem 1rem",
            borderRadius: "0.75rem",
            boxShadow: "0 10px 25px rgba(0,0,0,0.35)",
            maxWidth: isMobile ? "calc(100% - 2rem)" : "320px",
            fontSize: "0.85rem",
          }}
          role="status"
          aria-live="polite"
        >
          <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>
            {toastMessage.title}
          </div>
          <div style={{ opacity: 0.9 }}>{toastMessage.body}</div>
        </div>
      )}
      <GR5Info
        isOpen={isGR5InfoOpen}
        onClose={() => setIsGR5InfoOpen(false)}
        isMobile={isMobile}
        initialTab={initialTab}
      />
      <NotificationPrompt
        open={notifyOpen}
        onClose={() => setNotifyOpen(false)}
      />
    </div>
  );
}

export default Layout;
