import React, { useState } from "react";
import { signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "../services/firebase";

function LoginPage({ onLoginSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError("");

      const result = await signInWithPopup(auth, googleProvider);

      // Check if sign in was successful
      if (result.user) {
        onLoginSuccess(result.user);
      }
    } catch (error) {
      console.error("Sign in error:", error);
      setError("Failed to sign in with Google. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      onLoginSuccess(null); // Trigger logout
    } catch (error) {
      console.error("Sign out error:", error);
      setError("Failed to sign out. Please try again.");
    }
  };

  // Remove redundant auth state listener - AdminRoute handles this

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-sm sm:max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8 text-center">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-full flex items-center justify-center mb-3 sm:mb-4">
              <span className="text-xl sm:text-2xl">🔐</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
              Admin Login
            </h1>
            <p className="text-gray-700 text-xs sm:text-sm lg:text-base px-2">
              Sign in with Google to access the admin panel
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Google Sign-In Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 sm:px-4 sm:py-3 text-gray-700 font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200 flex items-center justify-center space-x-2 mb-4"
          >
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0"
              viewBox="0 0 24 24"
            >
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span
              className="text-xs sm:text-sm font-medium"
              style={{ color: "black" }}
            >
              {loading ? "Signing in..." : "Continue with Google"}
            </span>
          </button>

          {/* Additional Info */}
          <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-700 text-xs sm:text-sm">
              <strong>Note:</strong> Only authorized administrators can access
              this page.
            </p>
          </div>

          {/* Features */}
          <div className="mt-4 sm:mt-6 text-left">
            <h3 className="text-sm font-medium text-gray-900 mb-2 sm:mb-3">
              Admin Panel Features:
            </h3>
            <ul className="text-xs sm:text-sm text-gray-700 space-y-1.5 sm:space-y-2">
              <li className="flex items-start">
                <span className="text-green-500 mr-1.5 sm:mr-2 mt-0.5 flex-shrink-0 text-xs sm:text-sm">
                  ✓
                </span>
                <span className="leading-tight">Upload and manage photos</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-1.5 sm:mr-2 mt-0.5 flex-shrink-0 text-xs sm:text-sm">
                  ✓
                </span>
                <span className="leading-tight">
                  Automatic location extraction
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-1.5 sm:mr-2 mt-0.5 flex-shrink-0 text-xs sm:text-sm">
                  ✓
                </span>
                <span className="leading-tight">Batch photo processing</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-1.5 sm:mr-2 mt-0.5 flex-shrink-0 text-xs sm:text-sm">
                  ✓
                </span>
                <span className="leading-tight">EXIF metadata handling</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 sm:mt-8">
          <p className="text-gray-500 text-xs sm:text-sm">
            GR5 Trail Admin Panel
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
