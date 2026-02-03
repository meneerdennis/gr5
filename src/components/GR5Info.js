import React, { useState } from "react";
import emailjs from "@emailjs/browser";
import { translateText, getUserLanguage } from "../services/translationService";
import GR5TabContent, { getGR5TextContent } from "../content/GR5TabContent";
import AppTabContent, { getAppTextContent } from "../content/AppTabContent";

// Localized button texts
const buttonTexts = {
  en: {
    see: "See Translation",
    show: "Show Original",
    translating: "Translating...",
    same: "The text is already in your language.",
    error: "Translation failed. Please try again.",
  },
  nl: {
    see: "Vertaling bekijken",
    show: "Origineel tonen",
    translating: "Vertalen...",
    same: "De tekst is al in uw taal.",
    error: "Vertaling mislukt. Probeer het opnieuw.",
  },
  fr: {
    see: "Voir la traduction",
    show: "Afficher l'original",
    translating: "Traduction en cours...",
    same: "Le texte est déjà dans votre langue.",
    error: "La traduction a échoué. Veuillez réessayer.",
  },
  de: {
    see: "Übersetzung anzeigen",
    show: "Original anzeigen",
    translating: "Übersetzen...",
    same: "Der Text ist bereits in Ihrer Sprache.",
    error: "Übersetzung fehlgeschlagen. Bitte versuchen Sie es erneut.",
  },
  lt: {
    see: "Žiūrėti vertimą",
    show: "Rodyti originalą",
    translating: "Verčiama...",
    same: "Tekstas jau yra jūsų kalba.",
    error: "Vertimas nepavyko. Bandykite dar kartą.",
  },
  // Add more languages as needed
};

function GR5Info({ isOpen, onClose, isMobile }) {
  const [activeTab, setActiveTab] = useState("gr5");
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedGR5, setTranslatedGR5] = useState("");
  const [translatedApp, setTranslatedApp] = useState("");
  const [showTranslatedGR5, setShowTranslatedGR5] = useState(false);
  const [showTranslatedApp, setShowTranslatedApp] = useState(false);
  // Contact form state
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [sending, setSending] = useState(false);

  const handleTranslate = async () => {
    const isGR5 = activeTab === "gr5";
    const currentTranslated = isGR5 ? translatedGR5 : translatedApp;
    const currentShow = isGR5 ? showTranslatedGR5 : showTranslatedApp;
    const setCurrentTranslated = isGR5 ? setTranslatedGR5 : setTranslatedApp;
    const setCurrentShow = isGR5 ? setShowTranslatedGR5 : setShowTranslatedApp;
    if (currentTranslated && currentShow) {
      setCurrentShow(false);
      return;
    }
    if (currentTranslated) {
      setCurrentShow(true);
      return;
    }

    setIsTranslating(true);
    try {
      const userLang = getUserLanguage();
      const content = isGR5 ? getGR5TextContent() : getAppTextContent();
      const translated = await translateText(content, userLang);
      if (translated === content) {
        alert(
          buttonTexts[userLang]?.same ||
            "The content is already in your language.",
        );
        setIsTranslating(false);
        return;
      }
      setCurrentTranslated(translated);
      setCurrentShow(true);
    } catch (error) {
      alert(
        buttonTexts[userLang]?.error || "Translation failed. Please try again.",
      );
    } finally {
      setIsTranslating(false);
    }
  };

  const isGR5 = activeTab === "gr5";
  const currentShow = isGR5 ? showTranslatedGR5 : showTranslatedApp;

  const handleContactChange = (e) => {
    setContactForm({ ...contactForm, [e.target.name]: e.target.value });
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      await emailjs.send(
        process.env.REACT_APP_EMAILJS_SERVICE_ID,
        process.env.REACT_APP_EMAILJS_TEMPLATE_ID,
        {
          from_name: contactForm.name,
          from_email: contactForm.email,
          message: contactForm.message,
        },
        process.env.REACT_APP_EMAILJS_PUBLIC_KEY,
      );
      alert("Message sent successfully!");
      setContactForm({ name: "", email: "", message: "" });
      onClose();
    } catch (error) {
      console.error("Failed to send email:", error);
      alert(
        `Failed to send message: ${error?.text || error?.message || "Unknown error"}`,
      );
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
      }}
    >
      <div
        className="glass-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          padding: "1.5rem",
          maxWidth: "50rem",
          width: "100%",
          margin: "1rem",
          maxHeight: "80vh",
          overflowY: "auto",
          color: "#f1f5f9",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>
              Informatie
            </h2>
            {(activeTab === "gr5" || activeTab === "route") &&
              getUserLanguage() !== "nl" && (
                <button
                  onClick={handleTranslate}
                  disabled={isTranslating}
                  style={{
                    fontSize: "0.875rem",
                    color: "#8b5cf6",
                    background: "none",
                    border: "none",
                    cursor: isTranslating ? "not-allowed" : "pointer",
                    textDecoration: "underline",
                    opacity: isTranslating ? 0.5 : 1,
                  }}
                >
                  {isTranslating
                    ? buttonTexts[getUserLanguage()]?.translating ||
                      "Translating..."
                    : currentShow
                      ? buttonTexts[getUserLanguage()]?.show || "Show Original"
                      : buttonTexts[getUserLanguage()]?.see || "Translate"}
                </button>
              )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "1.5rem",
              cursor: "pointer",
              color: "#f1f5f9",
            }}
          >
            ×
          </button>
        </div>
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid rgba(139, 92, 246, 0.2)",
            marginBottom: "1rem",
          }}
        >
          <button
            onClick={() => setActiveTab("gr5")}
            style={{
              padding: "0.5rem 1rem",
              border: "none",
              background:
                activeTab === "gr5" ? "rgba(139, 92, 246, 0.2)" : "transparent",
              color: "#f1f5f9",
              cursor: "pointer",
              fontWeight: activeTab === "gr5" ? "bold" : "normal",
            }}
          >
            GR5
          </button>
          <button
            onClick={() => setActiveTab("route")}
            style={{
              padding: "0.5rem 1rem",
              border: "none",
              background:
                activeTab === "route"
                  ? "rgba(139, 92, 246, 0.2)"
                  : "transparent",
              color: "#f1f5f9",
              cursor: "pointer",
              fontWeight: activeTab === "route" ? "bold" : "normal",
            }}
          >
            Deze app
          </button>
          <button
            onClick={() => setActiveTab("contact")}
            style={{
              padding: "0.5rem 1rem",
              border: "none",
              background:
                activeTab === "contact"
                  ? "rgba(139, 92, 246, 0.2)"
                  : "transparent",
              color: "#f1f5f9",
              cursor: "pointer",
              fontWeight: activeTab === "contact" ? "bold" : "normal",
            }}
          >
            Contact
          </button>
        </div>
        <div>
          {activeTab === "gr5" && showTranslatedGR5 && translatedGR5 && (
            <div
              style={{
                marginBottom: "2rem",
                padding: "1rem",
                backgroundColor: "rgba(139, 92, 246, 0.1)",
                borderRadius: "0.5rem",
              }}
            >
              <h3 style={{ color: "#8b5cf6", marginBottom: "1rem" }}>
                Translated Content:
              </h3>
              <div style={{ whiteSpace: "pre-line", lineHeight: "1.6" }}>
                {translatedGR5}
              </div>
            </div>
          )}
          {activeTab === "gr5" && (!showTranslatedGR5 || !translatedGR5) && (
            <GR5TabContent isMobile={isMobile} />
          )}
          {activeTab === "route" && showTranslatedApp && translatedApp && (
            <div
              style={{
                marginBottom: "2rem",
                padding: "1rem",
                backgroundColor: "rgba(139, 92, 246, 0.1)",
                borderRadius: "0.5rem",
              }}
            >
              <h3 style={{ color: "#8b5cf6", marginBottom: "1rem" }}>
                Translated Content:
              </h3>
              <div style={{ whiteSpace: "pre-line", lineHeight: "1.6" }}>
                {translatedApp}
              </div>
            </div>
          )}
          {activeTab === "route" && (!showTranslatedApp || !translatedApp) && (
            <AppTabContent />
          )}

          {activeTab === "contact" && (
            <div style={{ maxWidth: "28rem", width: "100%" }}>
              <h3 style={{ color: "#8b5cf6", marginBottom: "1rem" }}>
                Contact
              </h3>
              <form onSubmit={handleContactSubmit}>
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", marginBottom: "0.25rem" }}>
                    Name
                  </label>
                  <input
                    name="name"
                    value={contactForm.name}
                    onChange={handleContactChange}
                    required
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      borderRadius: "0.25rem",
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "transparent",
                      color: "#f1f5f9",
                    }}
                  />
                </div>
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", marginBottom: "0.25rem" }}>
                    Email
                  </label>
                  <input
                    name="email"
                    type="email"
                    value={contactForm.email}
                    onChange={handleContactChange}
                    required
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      borderRadius: "0.25rem",
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "transparent",
                      color: "#f1f5f9",
                    }}
                  />
                </div>
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", marginBottom: "0.25rem" }}>
                    Message
                  </label>
                  <textarea
                    name="message"
                    value={contactForm.message}
                    onChange={handleContactChange}
                    rows={4}
                    required
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      borderRadius: "0.25rem",
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "transparent",
                      color: "#f1f5f9",
                    }}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "0.5rem",
                  }}
                >
                  <button
                    type="button"
                    onClick={onClose}
                    style={{
                      padding: "0.5rem 1rem",
                      background: "rgba(255,255,255,0.06)",
                      border: "none",
                      color: "#f1f5f9",
                      borderRadius: "0.25rem",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sending}
                    style={{
                      padding: "0.5rem 1rem",
                      background: "#8b5cf6",
                      border: "none",
                      color: "white",
                      borderRadius: "0.25rem",
                    }}
                  >
                    {sending ? "Sending..." : "Send"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default GR5Info;
