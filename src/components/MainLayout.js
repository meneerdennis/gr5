import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { auth } from "../services/firebase";

function MainLayout({ children }) {
  const { user, userProfile } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: "🏠" },
    { name: "My Routes", href: "/routes", icon: "🗺️" },
    { name: "Photos", href: "/photos", icon: "📸" },
    { name: "Settings", href: "/settings", icon: "⚙️" },
  ];

  const adminNavigation = [
    { name: "Upload Photos", href: "/admin/upload", icon: "📤" },
    { name: "Manage Photos", href: "/admin/manage", icon: "📋" },
    { name: "Activity Notes", href: "/admin/notes", icon: "📝" },
    { name: "Strava Sync", href: "/admin/strava", icon: "🔄" },
  ];

  const getPageTitle = () => {
    if (location.pathname === "/dashboard") return "Dashboard";
    if (location.pathname === "/routes") return "My Routes";
    if (location.pathname === "/photos") return "Photos";
    if (location.pathname === "/settings") return "Settings";
    if (location.pathname.startsWith("/admin/upload")) return "Upload Photos";
    if (location.pathname.startsWith("/admin/manage")) return "Manage Photos";
    if (location.pathname.startsWith("/admin/notes")) return "Activity Notes";
    if (location.pathname.startsWith("/admin/strava")) return "Strava Sync";
    return "TrailMapper";
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Right Sidebar */}
      <div
        className={`glass-card fixed right-0 w-64 z-50 transition-all duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{
          width: "16rem",
          right: sidebarOpen ? "0" : "-16rem",
          top: "5rem",
          bottom: "2rem",
          visibility: sidebarOpen ? "visible" : "hidden",
        }}
      >
        <div className="flex flex-col h-full">
          {/* Header with close button */}
          <div className="flex items-center justify-between h-20 px-6 border-b border-gray-600">
            <span className="text-white font-bold">Menu</span>
            <button
              type="button"
              className="h-8 w-8 inline-flex items-center justify-center rounded text-gray-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              onClick={() => setSidebarOpen(false)}
            >
              <svg
                className="h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* User Info */}
          {user && (
            <div className="p-3 border-b border-gray-600">
              <div className="flex items-center">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt="Profile"
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                    <span className="text-white text-xs font-medium">
                      {(user.displayName || user.email).charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user.displayName || user.email}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    @{userProfile?.username}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
            {/* Main Navigation */}
            <div className="space-y-1">
              <h3 className="px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Main
              </h3>
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? "bg-blue-600 text-white"
                        : "text-gray-300 hover:bg-gray-700 hover:text-white"
                    }`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.name}
                  </Link>
                );
              })}
            </div>

            {/* Admin Navigation */}
            {user && (
              <div className="space-y-1 pt-3">
                <h3 className="px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Admin
                </h3>
                {adminNavigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                        isActive
                          ? "bg-blue-600 text-white"
                          : "text-gray-300 hover:bg-gray-700 hover:text-white"
                      }`}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <span className="mr-2">{item.icon}</span>
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            )}
          </nav>

          {/* Sign Out */}
          {user && (
            <div className="p-3 border-t border-gray-600">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center px-2 py-2 text-sm font-medium text-gray-300 rounded-md hover:bg-gray-700 hover:text-white"
              >
                <span className="mr-2">🚪</span>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col min-h-screen">
        {/* Top navigation - Compact header */}
        <div
          className="main-layout-header justify-between"
          style={{ height: "4.5rem !important" }}
        >
          {/* Left side - Page title */}
          <div className="flex-1 min-w-0 px-4 sm:px-6">
            {/* Page title - Larger */}
            <h1 className="text-xl font-semibold text-gray-900 truncate">
              {getPageTitle()}
            </h1>
          </div>

          {/* Right side actions - fixed width container pushed to far right */}
          <div className="flex items-center space-x-3 px-4 sm:px-6">
            {/* User menu - Larger */}
            {user ? (
              <div className="flex items-center">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt="Profile"
                    className="w-9 h-9 rounded-full"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {(user.displayName || user.email).charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-gray-900 truncate max-w-24 ml-2">
                    {user.displayName || "User"}
                  </p>
                </div>
              </div>
            ) : (
              <Link to="/" className="btn btn-primary text-sm px-4 py-2">
                Sign In
              </Link>
            )}

            {/* Share button */}
            {userProfile && userProfile.username && (
              <Link
                to={`/public/${userProfile.username}/latest`}
                target="_blank"
                className="btn btn-secondary text-sm px-3 py-2"
              >
                🔗 Share
              </Link>
            )}

            {/* Menu button - Larger and pushed to the far right */}
            <button
              type="button"
              className="h-16 w-16 inline-flex items-center justify-center rounded border-0 bg-transparent text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 ml-auto p-0 appearance-none"
              style={{
                border: "none",
                background: "transparent",
                padding: "0",
                margin: "0",
              }}
              onClick={() => setSidebarOpen(true)}
            >
              <svg
                className="h-8 w-8"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 p-4">
          <div className="container mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}

export default MainLayout;
