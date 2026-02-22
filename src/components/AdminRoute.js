import React, { useState, useEffect, useRef } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../services/firebase";
import { Link, useLocation } from "react-router-dom";
import LoginPage from "./LoginPage";

function AdminRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [initialized, setInitialized] = useState(false);
  const location = useLocation();

  // Compact dropdown for admin navigation (saves horizontal space)
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const navItems = [
    {
      to: "/admin/manage",
      label: "Photo Management",
      icon: "📸",
      matches: ["/admin/manage", "/admin/upload", "/admin"],
    },
    {
      to: "/admin/notes",
      label: "Activity Notes",
      icon: "📝",
      matches: ["/admin/notes"],
    },
    {
      to: "/admin/activities",
      label: "Manage Activities",
      icon: "🗑️",
      matches: ["/admin/activities"],
    },
  ];

  // Return the best matching nav item (prefer longest prefix match).
  const getActiveItem = () => {
    const path = location.pathname || "";
    let best = null;
    let bestLen = -1;
    navItems.forEach((item) => {
      item.matches.forEach((m) => {
        if (path === m || path.startsWith(m + "/") || path.startsWith(m)) {
          if (m.length > bestLen) {
            best = item;
            bestLen = m.length;
          }
        }
      });
    });
    return best;
  };

  useEffect(() => {
    // close menu when navigating
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function onDocClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    function onKey(e) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("touchstart", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("touchstart", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

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

  if (!user || user.isAnonymous) {
    // Anonymous users are not allowed in the admin panel — show login prompt instead
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // User is authenticated, render the protected content
  return (
    <div
      className="relative flex flex-col items-center admin-route-container"
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

          {/* Navigation Tabs (collapsed into a compact dropdown to save horizontal space) */}
          <div
            className="border-t"
            style={{
              borderColor: "rgba(148, 163, 184, 0.3)",
              marginTop: "10px",
            }}
          >
            <div className="relative py-2 admin-nav-dropdown" ref={menuRef}>
              <button
                type="button"
                className="admin-nav-tab inline-flex items-center justify-between w-full sm:w-auto"
                aria-haspopup="true"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((s) => !s)}
              >
                {/** compute once so label stays in sync with menu highlighting */}
                {(() => {
                  const activeItem = getActiveItem();
                  return (
                    <span
                      className="flex items-center gap-2"
                      style={{ whiteSpace: "nowrap" }}
                    >
                      <span className="text-base">
                        {activeItem ? activeItem.icon : "🗂️"}
                      </span>
                      <span>
                        {activeItem ? activeItem.label : "Admin Menu"}
                      </span>
                      {/* small circular indicator to show this is a dropdown */}
                      <span className="dropdown-indicator" aria-hidden="true">
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 20 20"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          aria-hidden="true"
                          focusable="false"
                        >
                          <path
                            d="M5 7l5 5 5-5"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    </span>
                  );
                })()}
                <svg
                  className={`w-4 h-4 ml-2 transform ${menuOpen ? "rotate-180" : ""}`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 011.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {menuOpen && (
                <div className="absolute left-0 mt-2 admin-nav-dropdown-menu z-50">
                  {navItems.map((item) => {
                    const activeItem = getActiveItem();
                    const isActive = activeItem && activeItem.to === item.to;
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setMenuOpen(false)}
                        className={`block px-4 py-2 hover:bg-gray-700 ${isActive ? "bg-gray-700 font-semibold text-white" : "text-gray-200"}`}
                      >
                        <span className="icon">{item.icon}</span>
                        <span className="label">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
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
