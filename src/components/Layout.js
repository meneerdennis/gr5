import React, { useState, useEffect, lazy, Suspense } from "react";
import ProgressBar from "./ProgressBar";
import quotesData from "../data/quotes.json";
// Lazy load GR5Info since it's only shown in modal
const GR5Info = lazy(() => import("./GR5Info"));
import { useNotifications } from "../hooks/useNotifications";
// Lazy load components that are only shown conditionally
const NotificationPrompt = lazy(() => import("./NotificationPrompt"));

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

  useEffect(() => {
    if (notifyOpen && notificationPermission === "granted") {
      setNotifyOpen(false); // Close the notification prompt if already granted
    }
  }, [notifyOpen, notificationPermission]);

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
        <div className="container mx-auto">{children}</div>
      </main>

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
      <Suspense fallback={null}>
        <GR5Info
          isOpen={isGR5InfoOpen}
          onClose={() => setIsGR5InfoOpen(false)}
          isMobile={isMobile}
          initialTab={initialTab}
        />
      </Suspense>
      <Suspense fallback={null}>
        <NotificationPrompt
          open={notifyOpen}
          onClose={() => setNotifyOpen(false)}
        />
      </Suspense>
    </div>
  );
}

export default Layout;
