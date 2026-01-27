import React, { useState, useEffect } from "react";
import ProgressBar from "./ProgressBar";
import { getQuotesFromFirebase } from "../services/firebaseService";
import emailjs from "@emailjs/browser";
import GR5Info from "./GR5Info";
import { useNotifications } from "../hooks/useNotifications";

function ContactModal({ isOpen, onClose }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await emailjs.send(
        process.env.REACT_APP_EMAILJS_SERVICE_ID,
        process.env.REACT_APP_EMAILJS_TEMPLATE_ID,
        {
          from_name: formData.name,
          from_email: formData.email,
          message: formData.message,
        },
        process.env.REACT_APP_EMAILJS_PUBLIC_KEY,
      );
      alert("Message sent successfully!");
      setFormData({ name: "", email: "", message: "" });
      onClose();
    } catch (error) {
      console.error("Failed to send email:", error);
      alert(
        `Failed to send message: ${
          error?.text || error?.message || "Unknown error"
        }`,
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          color: "black",
          padding: "1.5rem",
          borderRadius: "0.5rem",
          boxShadow: "0 10px 15px rgba(0, 0, 0, 0.5)",
          maxWidth: "28rem",
          width: "100%",
          margin: "1rem",
        }}
      >
        <h2
          style={{
            fontSize: "1.25rem",
            fontWeight: "bold",
            marginBottom: "1rem",
            color: "black",
          }}
        >
          Contact Me
        </h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1rem" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: "500",
                marginBottom: "0.25rem",
                color: "black",
              }}
            >
              Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              style={{
                width: "100%",
                padding: "0.5rem",
                border: "1px solid #d1d5db",
                borderRadius: "0.25rem",
                boxSizing: "border-box",
                color: "black",
              }}
              required
            />
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: "500",
                marginBottom: "0.25rem",
                color: "black",
              }}
            >
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              style={{
                width: "100%",
                padding: "0.5rem",
                border: "1px solid #d1d5db",
                borderRadius: "0.25rem",
                boxSizing: "border-box",
                color: "black",
              }}
              required
            />
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: "500",
                marginBottom: "0.25rem",
                color: "black",
              }}
            >
              Message
            </label>
            <textarea
              name="message"
              value={formData.message}
              onChange={handleChange}
              style={{
                width: "100%",
                padding: "0.5rem",
                border: "1px solid #d1d5db",
                borderRadius: "0.25rem",
                boxSizing: "border-box",
                resize: "vertical",
                color: "black",
              }}
              rows="4"
              required
            />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                marginRight: "0.5rem",
                padding: "0.5rem 1rem",
                backgroundColor: "#d1d5db",
                border: "none",
                borderRadius: "0.25rem",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "0.25rem",
                cursor: "pointer",
              }}
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Layout({ children, progress = 0 }) {
  const [quotes, setQuotes] = useState([]);
  const [randomQuote, setRandomQuote] = useState({});
  const [quoteOpacity, setQuoteOpacity] = useState(1);
  const [quoteTransform, setQuoteTransform] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGR5InfoOpen, setIsGR5InfoOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
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
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const fetchQuotes = async () => {
      const fetchedQuotes = await getQuotesFromFirebase();
      setQuotes(fetchedQuotes);
    };
    fetchQuotes();
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
                <div className="flex  gap-4" style={{ width: "100%" }}>
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
                        onClick={() => setIsGR5InfoOpen(true)}
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
      <main className="flex-1 ">
        <div className="container mx-auto">{children}</div>
      </main>

      {/* Footer */}
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
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={subscribeForNotifications}
              disabled={
                canReceiveNotifications || notificationPermission === "denied"
              }
              style={{
                color: canReceiveNotifications ? "#10b981" : "#8b5cf6",
                background: "none",
                border: "1px solid currentColor",
                borderRadius: "999px",
                cursor:
                  canReceiveNotifications || notificationPermission === "denied"
                    ? "default"
                    : "pointer",
                padding: "0.35rem 0.75rem",
                fontSize: "0.75rem",
                opacity:
                  canReceiveNotifications || notificationPermission === "denied"
                    ? 0.7
                    : 1,
              }}
              title="Enable push notifications"
            >
              {canReceiveNotifications
                ? tokenReady
                  ? "🔔 Notifications enabled"
                  : "🔔 Enabling notifications..."
                : notificationPermission === "denied"
                  ? "🔕 Notifications blocked"
                  : "🔔 Enable notifications"}
            </button>
            {notificationError && (
              <span
                style={{
                  color: "#ef4444",
                  fontSize: "0.75rem",
                }}
              >
                {notificationError}
              </span>
            )}
            {!messagingSupported && supportReason && (
              <span
                style={{
                  color: "#f59e0b",
                  fontSize: "0.75rem",
                }}
              >
                {supportReason}
              </span>
            )}
            <a
              onClick={() => setIsModalOpen(true)}
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
              href="https://www.instagram.com/dennisvers/"
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
            <a
              href="https://github.com/meneerdennis"
              target="_blank"
              rel="noopener noreferrer"
              title="GitHub (meneerdennis)"
              style={{
                color: "#8b5cf6",
                textDecoration: "none",
                padding: "0.5rem",
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="-0.5 -0.5 25 25"
                fill="currentColor"
              >
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </a>
          </div>
        </div>
      </footer>

      <ContactModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
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
      />
    </div>
  );
}

export default Layout;
