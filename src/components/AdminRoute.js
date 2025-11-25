import React, { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../services/firebase";
import LoginPage from "./LoginPage";

function AdminRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [initialized, setInitialized] = useState(false);

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
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm sm:text-base">
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
    <div className="relative min-h-screen bg-gray-50">
      {/* Admin Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Left side - Logo and Title */}
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
              <span className="text-lg sm:text-2xl flex-shrink-0">🛡️</span>
              <div className="hidden md:block min-w-0">
                <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
                  Admin Panel
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 truncate max-w-xs">
                  Welcome, {user.displayName || user.email}
                </p>
              </div>
              {/* Mobile title */}
              <div className="md:hidden">
                <h1 className="text-base sm:text-lg font-semibold text-gray-900">
                  Admin
                </h1>
              </div>
            </div>

            {/* Right side - User Info and Actions */}
            <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
              {/* User Avatar */}
              {user.photoURL && (
                <img
                  src={user.photoURL}
                  alt="Profile"
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-gray-200"
                />
              )}

              {/* Sign Out Button */}
              <button
                onClick={() => auth.signOut()}
                className="inline-flex items-center px-2.5 py-1.5 sm:px-3 sm:py-2 border border-transparent text-xs sm:text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition duration-200"
              >
                <span className="hidden lg:inline" style={{ color: "black" }}>
                  Sign Out
                </span>
                <span className="lg:hidden">Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Protected Content */}
      <div className="flex-1">{children}</div>
    </div>
  );
}

export default AdminRoute;
