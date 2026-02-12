// Centralized configuration for hike data hook
export const HIKE_LIMIT = Number(process.env.REACT_APP_HIKE_LIMIT || 200);
export const PHOTO_LIMIT = Number(process.env.REACT_APP_PHOTO_LIMIT || 500);
export const INITIAL_HIKE_LIMIT = Number(
  process.env.REACT_APP_INITIAL_HIKE_LIMIT || 10,
);
export const HIKE_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
export const PHOTO_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
export const COMMENT_POLL_INTERVAL_MS = 10 * 60 * 1000;
