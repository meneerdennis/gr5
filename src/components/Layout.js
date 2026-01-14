import React, { useState, useEffect } from "react";
import ProgressBar from "./ProgressBar";
import { getQuotesFromFirebase } from "../services/firebaseService";

function Layout({ children, progress = 0 }) {
  const [quotes, setQuotes] = useState([]);
  const [randomQuote, setRandomQuote] = useState({});
  const [quoteOpacity, setQuoteOpacity] = useState(1);
  const [quoteTransform, setQuoteTransform] = useState(0);

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
                  <div style={{ width: "100%" }}>
                    <h1
                      className="text-3xl font-bold text-gray-900"
                      style={{ margin: "5px" }}
                    >
                      Mijn GR5
                    </h1>
                    <div
                      className="text-gray-600 text-sm"
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
                      <span
                        style={{
                          display: "block",
                          fontSize: "0.8em",
                          marginTop: "2px",
                        }}
                      >
                        — {randomQuote.author}
                      </span>
                    </div>
                  </div>
                  <ProgressBar
                    progress={progress}
                    compact={false}
                    position="top-right"
                  />
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
    </div>
  );
}

export default Layout;
