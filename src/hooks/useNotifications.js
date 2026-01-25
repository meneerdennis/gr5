// Notifications removed; return inert defaults to satisfy any lingering imports.
export function useNotifications() {
  return {
    tokenReady: false,
    notificationPermission: "default",
    canReceiveNotifications: false,
  };
}
