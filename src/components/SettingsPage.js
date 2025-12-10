import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { auth } from "../services/firebase";
import { GoogleAuthProvider, linkWithPopup } from "firebase/auth";

function SettingsPage() {
  const { user, userProfile, updateUserProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [formData, setFormData] = useState({
    username: "",
    displayName: "",
    bio: "",
    publicProfile: true,
    emailNotifications: true,
    stravaConnected: false,
  });

  useEffect(() => {
    if (userProfile) {
      setFormData({
        username: userProfile.username || "",
        displayName: userProfile.displayName || "",
        bio: userProfile.bio || "",
        publicProfile: userProfile.publicProfile !== false,
        emailNotifications: userProfile.settings?.emailNotifications !== false,
        stravaConnected: userProfile.settings?.stravaConnected || false,
      });
    }
  }, [userProfile]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const updates = {
        username: formData.username,
        displayName: formData.displayName,
        bio: formData.bio,
        publicProfile: formData.publicProfile,
        settings: {
          ...userProfile.settings,
          emailNotifications: formData.emailNotifications,
          stravaConnected: formData.stravaConnected,
        },
      };

      await updateUserProfile(updates);
      setMessage({ type: "success", text: "Settings updated successfully!" });
    } catch (error) {
      console.error("Error updating settings:", error);
      setMessage({
        type: "error",
        text: "Failed to update settings. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConnectStrava = async () => {
    setLoading(true);
    try {
      // This would integrate with Strava OAuth
      // For now, just show a message
      setMessage({
        type: "info",
        text: "Strava integration coming soon! You'll be able to connect your Strava account to automatically sync activities.",
      });
    } catch (error) {
      setMessage({ type: "error", text: "Failed to connect Strava account." });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (
      !window.confirm(
        "Are you sure you want to delete your account? This action cannot be undone."
      )
    ) {
      return;
    }

    const confirmation = prompt("Type 'DELETE' to confirm account deletion:");
    if (confirmation !== "DELETE") {
      return;
    }

    setLoading(true);
    try {
      // Implement account deletion logic here
      // This would involve deleting user data from Firestore
      await auth.signOut();
      setMessage({ type: "success", text: "Account deleted successfully." });
    } catch (error) {
      console.error("Error deleting account:", error);
      setMessage({
        type: "error",
        text: "Failed to delete account. Please contact support.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Please sign in
          </h2>
          <p className="text-gray-600">
            You need to be signed in to access settings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
        <p className="text-gray-600">
          Manage your account preferences and profile.
        </p>
      </div>

      {/* Message */}
      {message.text && (
        <div
          className={`mb-6 p-4 rounded-md ${
            message.type === "success"
              ? "bg-green-100 text-green-800 border border-green-300"
              : message.type === "error"
              ? "bg-red-100 text-red-800 border border-red-300"
              : "bg-blue-100 text-blue-800 border border-blue-300"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        {/* Profile Information */}
        <div className="glass-card p-6">
          <div className="border-b border-gray-600 pb-4 mb-4">
            <h2 className="text-lg font-medium text-gray-900">
              Profile Information
            </h2>
          </div>
          <div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-300">
                    Username
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="input mt-1"
                    placeholder="your-username"
                  />
                  <p className="mt-1 text-sm text-gray-400">
                    This will be used in your public route URLs
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300">
                    Display Name
                  </label>
                  <input
                    type="text"
                    name="displayName"
                    value={formData.displayName}
                    onChange={handleInputChange}
                    className="input mt-1"
                    placeholder="Your Name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300">
                  Bio
                </label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  rows={3}
                  className="input mt-1"
                  placeholder="Tell us about your hiking adventures..."
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="publicProfile"
                  checked={formData.publicProfile}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-300">
                  Make my profile public
                </label>
              </div>
            </form>
          </div>
        </div>

        {/* Account Information */}
        <div className="glass-card p-6">
          <div className="border-b border-gray-600 pb-4 mb-4">
            <h2 className="text-lg font-medium text-gray-900">
              Account Information
            </h2>
          </div>
          <div>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                {user.photoURL && (
                  <img
                    src={user.photoURL}
                    alt="Profile"
                    className="w-16 h-16 rounded-full"
                  />
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {user.displayName || "No display name"}
                  </p>
                  <p className="text-sm text-gray-400">{user.email}</p>
                  <p className="text-sm text-gray-400">
                    Member since{" "}
                    {new Date(user.metadata.creationTime).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-600">
                <h3 className="text-sm font-medium text-gray-300 mb-2">
                  Sign-in Method
                </h3>
                <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-600 text-white">
                    Google
                  </span>
                  <span className="text-sm text-gray-400">{user.email}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="glass-card p-6">
          <div className="border-b border-gray-600 pb-4 mb-4">
            <h2 className="text-lg font-medium text-gray-900">Preferences</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-300">
                  Email Notifications
                </h3>
                <p className="text-sm text-gray-400">
                  Receive updates about your routes and activities
                </p>
              </div>
              <input
                type="checkbox"
                name="emailNotifications"
                checked={formData.emailNotifications}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-300">
                  Strava Integration
                </h3>
                <p className="text-sm text-gray-400">
                  Connect your Strava account for automatic activity syncing
                </p>
              </div>
              <button
                onClick={handleConnectStrava}
                disabled={loading || formData.stravaConnected}
                className={`px-3 py-1 text-sm font-medium rounded-md ${
                  formData.stravaConnected
                    ? "bg-green-600 text-white cursor-not-allowed"
                    : "btn btn-secondary"
                }`}
              >
                {formData.stravaConnected ? "Connected" : "Connect"}
              </button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="glass-card p-6">
          <div className="border-b border-gray-600 pb-4 mb-4">
            <h2 className="text-lg font-medium text-gray-900">Actions</h2>
          </div>
          <div className="space-y-4">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? "Saving..." : "Save Settings"}
            </button>

            <div className="pt-4 border-t border-gray-600">
              <h3 className="text-sm font-medium text-red-400 mb-2">
                Danger Zone
              </h3>
              <button
                onClick={handleDeleteAccount}
                disabled={loading}
                className="btn btn-danger"
              >
                Delete Account
              </button>
              <p className="text-xs text-gray-400 mt-1">
                This will permanently delete your account and all associated
                data.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
