// Notifications have been fully removed; exported no-ops remain for safety.
export const initializeMessaging = async () => null;
export const registerServiceWorkerAndGetToken = async () => null;
export const saveFCMToken = async () => {};
export const getAllUserTokens = async () => [];
export const removeFCMToken = async () => {};
export const sendHikeNotification = async () => ({ success: false });
export const requestNotificationPermission = async () => ({
  granted: false,
  reason: "Notifications disabled",
});
