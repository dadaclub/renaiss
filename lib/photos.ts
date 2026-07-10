export const DEFAULT_PHOTO_URL = "/photos/sample-1.jpg";

export const SAMPLE_PHOTO_URLS = [
  DEFAULT_PHOTO_URL,
  "/photos/sample-2.jpg",
  "/photos/sample-3.jpg",
  "/photos/sample-4.jpg",
] as const;

export const PHOTO_STORAGE_BUCKET = "room-photos";
export const MAX_PHOTO_UPLOAD_BYTES = 5 * 1024 * 1024;
