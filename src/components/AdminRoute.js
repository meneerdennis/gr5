import React, { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../services/firebase";
import { Link, useLocation } from "react-router-dom";
import LoginPage from "./LoginPage";

function AdminRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [initialized, setInitialized] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);

      // Only set loading to false after we've received the initial auth state
      if (!initialized) {
        setLoading(false);
        setInitialized(true);
      }
    });

    return () => unsubscribe();
  }, [initialized]);

  const handleLoginSuccess = (user) => {
    if (user) {
      setUser(user);
    } else {
      // User signed out
      setUser(null);
    }
  };

  if (loading) {
    return (
      <div
        className="flex items-center justify-center p-4"
        style={{
          background: "var(--gradient-background)",
          minHeight: "100vh",
        }}
      >
        <div className="text-center glass-card p-8">
          <div className="animate-spin rounded-full mx-auto mb-4 border-b-2 border-blue-400 h-10 w-10 sm:h-12 sm:w-12"></div>
          <p className="text-gray-200 text-sm sm:text-base">
            Checking authentication...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // User is authenticated, render the protected content
  return (
    <div
      className="relative flex flex-col items-center"
      style={{
        background: "var(--gradient-background)",
        minHeight: "100vh",
      }}
    >
      {/* Admin Header */}
      <div className="admin-header w-full">
        <div className="w-full mx-auto px-3 sm:px-4 lg:px-6 max-w-none sm:max-w-4xl">
          <div className="flex  h-14 sm:h-16">
            {/* Centered Logo and Title */}
            <div className="flex  flex-1 min-w-0" style={{ gap: "0.75rem" }}>
              <div
                className="rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg"
                style={{
                  width: "2.5rem",
                  height: "2.5rem",
                  background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                }}
              >
                <span className="text-white text-lg sm:text-xl">🛡️</span>
              </div>
              <div className="text-center">
                <div className="hidden md:block">
                  <h1
                    className="font-bold truncate"
                    style={{
                      fontSize: "1.25rem",
                      background: "linear-gradient(135deg, #60a5fa, #a855f7)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    Admin Panel
                  </h1>
                  <p
                    className="text-xs sm:text-sm text-gray-400 truncate mt-1"
                    style={{ maxWidth: "20rem" }}
                  >
                    Welcome, {user.displayName || user.email}
                  </p>
                </div>
                {/* Mobile title */}
                <div className="md:hidden">
                  <h1
                    className="font-bold"
                    style={{
                      fontSize: "1.125rem",
                      background: "linear-gradient(135deg, #60a5fa, #a855f7)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    Admin
                  </h1>
                </div>
              </div>
            </div>

            {/* User Info and Actions - positioned to the right */}
            <div
              className="flex items-center flex-shrink-0 ml-auto"
              style={{ gap: "0.5rem" }}
            >
              {/* User Avatar */}
              {user.photoURL && (
                <img
                  src={user.photoURL}
                  alt="Profile"
                  className="rounded-full border-2 border-blue-400"
                  style={{ width: "1.75rem", height: "1.75rem" }}
                />
              )}

              {/* Sign Out Button */}
              <button
                onClick={() => auth.signOut()}
                className="btn btn-secondary text-sm"
              >
                <span className="hidden lg:inline">Sign Out</span>
                <span className="lg:hidden">Out</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div
            className="border-t"
            style={{
              borderColor: "rgba(148, 163, 184, 0.3)",
              marginTop: "10px",
            }}
          >
            <nav
              className="flex overflow-x-auto py-2"
              style={{ gap: "0.25rem" }}
            >
              <Link
                to="/admin/upload"
                className={`admin-nav-tab ${
                  location.pathname === "/admin/upload" ||
                  location.pathname === "/admin"
                    ? "active"
                    : ""
                }`}
              >
                <span className="text-base">📤</span>
                <span>Upload Photos</span>
              </Link>
              <Link
                to="/admin/manage"
                className={`admin-nav-tab ${
                  location.pathname === "/admin/manage" ? "active" : ""
                }`}
              >
                <span className="text-base">📸</span>
                <span>Manage Photos</span>
              </Link>
            </nav>
          </div>
        </div>
      </div>

      {/* Protected Content */}
      <div className="flex-1 w-full mx-auto px-3 sm:px-4 lg:px-6 py-6 max-w-none sm:max-w-4xl">
        {children}
      </div>
    </div>
  );
}

export default AdminRoute;
