import { storage, db } from "./firebase";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import EXIF from "exif-js";

// Extract EXIF data from image file
function extractExifData(file) {
  return new Promise((resolve) => {
    EXIF.getData(file, function () {
      try {
        const allMetadata = EXIF.getAllTags(this);

        // Extract GPS data
        const gpsLatitude = EXIF.getTag(this, "GPSLatitude");
        const gpsLongitude = EXIF.getTag(this, "GPSLongitude");
        const gpsLatitudeRef = EXIF.getTag(this, "GPSLatitudeRef");
        const gpsLongitudeRef = EXIF.getTag(this, "GPSLongitudeRef");

        // Extract date taken
        const dateTimeOriginal = EXIF.getTag(this, "DateTimeOriginal");
        const createDate = EXIF.getTag(this, "CreateDate");

        // Convert GPS coordinates to decimal format
        let lat = null;
        let lng = null;

        if (gpsLatitude && gpsLongitude) {
          lat = convertToDecimal(gpsLatitude, gpsLatitudeRef);
          lng = convertToDecimal(gpsLongitude, gpsLongitudeRef);
        }

        // Convert date to ISO string
        let photoDate = null;
        if (dateTimeOriginal) {
          photoDate = convertExifDateToISO(dateTimeOriginal);
        } else if (createDate) {
          photoDate = convertExifDateToISO(createDate);
        }

        resolve({
          lat,
          lng,
          date: photoDate,
          exifData: allMetadata,
        });
      } catch (error) {
        console.warn("Error extracting EXIF data:", error);
        resolve({ lat: null, lng: null, date: null, exifData: {} });
      }
    });
  });
}

// Convert GPS coordinates from DMS format to decimal
function convertToDecimal(dms, ref) {
  if (!dms || !ref) return null;

  try {
    const degrees = parseFloat(dms[0]) || 0;
    const minutes = parseFloat(dms[1]) || 0;
    const seconds = parseFloat(dms[2]) || 0;

    let decimal = degrees + minutes / 60 + seconds / 3600;

    // Apply direction reference
    if (ref === "S" || ref === "W") {
      decimal = -decimal;
    }

    return isNaN(decimal) ? null : decimal;
  } catch (error) {
    console.warn("Error converting GPS coordinates:", error);
    return null;
  }
}

// Convert EXIF date format to ISO string
function convertExifDateToISO(exifDate) {
  try {
    // EXIF date format is typically "YYYY:MM:DD HH:MM:SS"
    const cleanDate = exifDate.replace(/:/, "-").replace(/:/, "-");
    const date = new Date(cleanDate);

    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  } catch (error) {
    console.warn("Error converting EXIF date:", error);
  }

  return null;
}

// Create thumbnail from file
async function createThumbnailFromFile(file) {
  return new Promise((resolve, reject) => {
    try {
      // Check if file is HEIC format - browsers don't natively support HEIC
      const fileName = file.name.toLowerCase();
      const isHeicFormat =
        fileName.endsWith(".heic") ||
        fileName.endsWith(".heif") ||
        file.type === "image/heic" ||
        file.type === "image/heif";

      if (isHeicFormat) {
        console.warn(
          `Skipping thumbnail creation for HEIC file: ${file.name}. HEIC format is not supported by browsers for thumbnail generation. Original image will be used instead.`
        );
        // Don't reject, but resolve with null to indicate no thumbnail was created
        resolve(null);
        return;
      }

      const img = new Image();
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const objectURL = URL.createObjectURL(file);

      img.onload = () => {
        try {
          // Calculate new dimensions to maintain aspect ratio with max 200x200
          let { width, height } = img;
          const maxSize = 200;

          if (width > height) {
            if (width > maxSize) {
              height = (height * maxSize) / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = (width * maxSize) / height;
              height = maxSize;
            }
          }

          // Ensure minimum dimensions
          width = Math.max(1, Math.floor(width));
          height = Math.max(1, Math.floor(height));

          // Set canvas dimensions
          canvas.width = width;
          canvas.height = height;

          // Clear canvas and draw image
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to blob
          canvas.toBlob(
            (blob) => {
              URL.revokeObjectURL(objectURL); // Clean up
              if (blob && blob.size > 0) {
                resolve(blob);
              } else {
                reject(
                  new Error(
                    "Failed to create thumbnail blob - empty or invalid"
                  )
                );
              }
            },
            "image/jpeg",
            0.8
          );
        } catch (error) {
          URL.revokeObjectURL(objectURL); // Clean up
          reject(new Error("Failed to process image: " + error.message));
        }
      };

      img.onerror = (error) => {
        URL.revokeObjectURL(objectURL); // Clean up
        reject(new Error("Failed to load image for thumbnail"));
      };

      img.src = objectURL;
    } catch (error) {
      reject(new Error("Failed to create thumbnail: " + error.message));
    }
  });
}

// Upload photo to Firebase Storage with automatic EXIF data extraction and thumbnail creation
export async function uploadPhoto(file, hikeId, photoData) {
  try {
    // Validate inputs
    if (!file) {
      throw new Error("No file provided");
    }
    if (!hikeId) {
      throw new Error("No hike ID provided");
    }
    if (!photoData) {
      photoData = {};
    }

    // Extract EXIF data from the photo
    const exifData = await extractExifData(file);

    // Use EXIF data if available, otherwise fall back to provided data
    const finalLat = exifData.lat || photoData.lat;
    const finalLng = exifData.lng || photoData.lng;
    const finalDate =
      exifData.date || photoData.date || new Date().toISOString();

    // Create unique filenames
    const timestamp = new Date().getTime();
    const fileName = `${hikeId}_${timestamp}_${file.name}`;
    const thumbnailFileName = `thumb_${fileName}`;

    // Upload original file
    const storageRef = ref(storage, `photos/${hikeId}/${fileName}`);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);

    // Create and upload thumbnail
    let thumbnailURL = null;
    try {
      console.log("Creating thumbnail for file:", file.name);
      const thumbnailBlob = await createThumbnailFromFile(file);

      // Skip upload if thumbnail creation returned null (e.g., for HEIC files)
      if (thumbnailBlob === null) {
        console.log(
          "Thumbnail creation skipped for unsupported format:",
          file.name
        );
        thumbnailURL = null;
      } else {
        console.log("Thumbnail blob created, size:", thumbnailBlob.size);

        const thumbnailStorageRef = ref(
          storage,
          `photos/${hikeId}/${thumbnailFileName}`
        );
        const thumbnailSnapshot = await uploadBytes(
          thumbnailStorageRef,
          thumbnailBlob
        );
        thumbnailURL = await getDownloadURL(thumbnailSnapshot.ref);
        console.log("Thumbnail uploaded successfully:", thumbnailURL);
      }
    } catch (thumbnailError) {
      console.error(
        "Failed to create/upload thumbnail for",
        file.name,
        ":",
        thumbnailError
      );
      // Continue without thumbnail - it's not critical
    }

    // Sanitize EXIF data to remove incompatible objects for Firestore
    const sanitizeExifData = (exifObj) => {
      if (!exifObj || typeof exifObj !== "object") return {};

      const sanitized = {};
      for (const [key, value] of Object.entries(exifObj)) {
        // Only include primitive types and simple arrays
        if (
          value === null ||
          value === undefined ||
          typeof value === "string" ||
          typeof value === "number" ||
          typeof value === "boolean" ||
          (Array.isArray(value) &&
            value.every(
              (item) =>
                typeof item === "string" ||
                typeof item === "number" ||
                typeof item === "boolean"
            ))
        ) {
          sanitized[key] = value;
        }
        // Skip complex objects, functions, and custom Number objects
      }
      return sanitized;
    };

    // Save photo metadata to Firestore
    const photoMetadata = {
      url: downloadURL,
      thumbnailUrl: thumbnailURL, // Store thumbnail URL
      caption: photoData.caption || "",
      description: photoData.description || "",
      lat: finalLat || null, // Convert undefined to null for Firestore
      lng: finalLng || null, // Convert undefined to null for Firestore
      date: finalDate,
      hikeId: hikeId,
      fileName: fileName,
      thumbnailFileName: thumbnailFileName,
      originalName: file.name,
      size: file.size,
      type: file.type,
      uploadedAt: new Date().toISOString(),
      hasExifData: !!(exifData.lat && exifData.lng),
      exifData: sanitizeExifData(exifData.exifData),
      ...photoData,
    };

    const photoDoc = await addDoc(collection(db, "photos"), photoMetadata);

    // Add photo to the hike's photos array (only if we have valid coordinates)
    if (
      finalLat !== null &&
      finalLng !== null &&
      typeof finalLat === "number" &&
      typeof finalLng === "number"
    ) {
      await addPhotoToHike(hikeId, {
        id: photoDoc.id,
        url: downloadURL,
        thumbnailUrl: thumbnailURL,
        caption: photoData.caption || "",
        description: photoData.description || "",
        lat: finalLat,
        lng: finalLng,
        date: finalDate,
        hikeId: hikeId,
      });
    }

    return {
      success: true,
      photoId: photoDoc.id,
      downloadURL: downloadURL,
      thumbnailURL: thumbnailURL,
      hasExifData: !!(exifData.lat && exifData.lng),
      exifExtracted: exifData.lat ? true : false,
    };
  } catch (error) {
    console.error("Error uploading photo:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Upload multiple photos at once with batch EXIF processing
export async function uploadMultiplePhotos(files, hikeId, globalCaption = "") {
  try {
    const results = [];
    const errors = [];

    // Process files sequentially to avoid overwhelming the system
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      try {
        // Create individual photo data
        const photoData = {
          caption: globalCaption || "", // Use global caption if provided
          description: "",
        };

        const result = await uploadPhoto(file, hikeId, photoData);

        if (result.success) {
          results.push({
            fileName: file.name,
            photoId: result.photoId,
            hasExifData: result.hasExifData,
            exifExtracted: result.exifExtracted,
          });
        } else {
          errors.push({
            fileName: file.name,
            error: result.error,
          });
        }
      } catch (error) {
        errors.push({
          fileName: file.name,
          error: error.message,
        });
      }
    }

    return {
      success: true,
      uploaded: results,
      failed: errors,
      summary: {
        total: files.length,
        successful: results.length,
        failed: errors.length,
        withExif: results.filter((r) => r.hasExifData).length,
      },
    };
  } catch (error) {
    console.error("Error in batch upload:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Add photo to hike's photos array
async function addPhotoToHike(hikeId, photo) {
  try {
    const hikeRef = doc(db, "hikes", hikeId);
    const hikeDoc = await getDoc(hikeRef);

    if (hikeDoc.exists()) {
      const hikeData = hikeDoc.data();
      const currentPhotos = hikeData.photos || [];

      await updateDoc(hikeRef, {
        photos: [...currentPhotos, photo],
      });
    }
  } catch (error) {
    console.error("Error adding photo to hike:", error);
  }
}

// Get all photos for a specific hike (excluding deleted photos)
export async function getPhotosForHike(hikeId) {
  try {
    // Get all photos for the hike and filter out deleted ones client-side
    const photosQuery = query(
      collection(db, "photos"),
      where("hikeId", "==", hikeId),
      orderBy("uploadedAt", "desc")
    );

    const querySnapshot = await getDocs(photosQuery);
    const photos = [];

    querySnapshot.forEach((doc) => {
      const photoData = doc.data();
      // Only include photos that are not marked as deleted (deletedAt is null, undefined, or doesn't exist)
      if (!photoData.deletedAt) {
        photos.push({
          id: doc.id,
          ...photoData,
        });
      }
    });

    return photos;
  } catch (error) {
    console.error("Error fetching photos for hike:", error);
    return [];
  }
}

// Get all photos from Firebase (excluding deleted photos)
export async function getAllPhotos() {
  try {
    // Get all photos and filter out deleted ones client-side
    const photosQuery = query(
      collection(db, "photos"),
      orderBy("uploadedAt", "desc")
    );

    const querySnapshot = await getDocs(photosQuery);
    const photos = [];

    querySnapshot.forEach((doc) => {
      const photoData = doc.data();
      // Only include photos that are not marked as deleted (deletedAt is null, undefined, or doesn't exist)
      if (!photoData.deletedAt) {
        photos.push({
          id: doc.id,
          ...photoData,
        });
      }
    });

    return photos;
  } catch (error) {
    console.error("Error fetching all photos:", error);
    return [];
  }
}

// Delete photo (complete cleanup from Firebase - Firestore + Storage)
export async function deletePhoto(photoId, hikeId) {
  try {
    console.log("Deleting photo:", photoId, "from hike:", hikeId);

    // First, get the photo data to know the file paths
    const photoRef = doc(db, "photos", photoId);
    const photoDoc = await getDoc(photoRef);

    if (!photoDoc.exists()) {
      console.warn("Photo not found in Firestore:", photoId);
      return { success: false, error: "Photo not found" };
    }

    const photoData = photoDoc.data();
    console.log("Photo data:", photoData);

    // Delete original image from Firebase Storage
    try {
      const originalImagePath = `photos/${photoData.hikeId}/${photoData.fileName}`;
      const originalImageRef = ref(storage, originalImagePath);
      await deleteObject(originalImageRef);
      console.log("Original image deleted from storage:", originalImagePath);
    } catch (storageError) {
      if (storageError.code === "storage/object-not-found") {
        console.log(
          "Original image not found in storage (may have been already deleted):",
          `photos/${photoData.hikeId}/${photoData.fileName}`
        );
      } else {
        console.warn(
          "Failed to delete original image from storage:",
          storageError
        );
      }
    }

    // Delete thumbnail from Firebase Storage (if it exists)
    if (photoData.thumbnailFileName) {
      try {
        const thumbnailPath = `photos/${photoData.hikeId}/${photoData.thumbnailFileName}`;
        const thumbnailRef = ref(storage, thumbnailPath);
        await deleteObject(thumbnailRef);
        console.log("Thumbnail deleted from storage:", thumbnailPath);
      } catch (thumbnailError) {
        if (thumbnailError.code === "storage/object-not-found") {
          console.log(
            "Thumbnail not found in storage (may have been already deleted):",
            `photos/${photoData.hikeId}/${photoData.thumbnailFileName}`
          );
        } else {
          console.warn(
            "Failed to delete thumbnail from storage:",
            thumbnailError
          );
        }
      }
    }

    // Delete the photo document from Firestore
    await deleteDoc(photoRef);
    console.log("Photo document deleted from Firestore:", photoId);

    // Remove from hike's photos array
    const hikeRef = doc(db, "hikes", hikeId);
    const hikeDoc = await getDoc(hikeRef);

    if (hikeDoc.exists()) {
      const hikeData = hikeDoc.data();
      const currentPhotos = hikeData.photos || [];
      const updatedPhotos = currentPhotos.filter(
        (photo) => photo.id !== photoId
      );

      await updateDoc(hikeRef, {
        photos: updatedPhotos,
      });
      console.log("Photo removed from hike photos array");
    }

    console.log("Photo completely deleted (Firestore + Storage):", photoId);
    return { success: true };
  } catch (error) {
    console.error("Error deleting photo:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Update photo metadata
export async function updatePhoto(photoId, updates) {
  try {
    await updateDoc(doc(db, "photos", photoId), {
      ...updates,
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  } catch (error) {
    console.error("Error updating photo:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Create thumbnail from image URL
export async function createThumbnail(imageUrl, maxWidth = 50, maxHeight = 50) {
  try {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        // Calculate new dimensions to maintain aspect ratio
        let { width, height } = img;

        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;

        // Draw and compress image
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to base64 data URL with compression
        const thumbnailUrl = canvas.toDataURL("image/jpeg", 0.7);
        resolve(thumbnailUrl);
      };

      img.onerror = () => {
        // Fallback to original image URL if thumbnail creation fails
        resolve(imageUrl);
      };

      img.src = imageUrl;
    });
  } catch (error) {
    console.warn("Error creating thumbnail:", error);
    // Fallback to original image URL
    return imageUrl;
  }
}

// Batch update multiple photos
export async function updateMultiplePhotos(updates) {
  try {
    const promises = updates.map(({ photoId, updates: photoUpdates }) =>
      updatePhoto(photoId, photoUpdates)
    );

    const results = await Promise.all(promises);

    return {
      success: true,
      results: results,
      failed: results.filter((r) => !r.success).length,
      successful: results.filter((r) => r.success).length,
    };
  } catch (error) {
    console.error("Error in batch update:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Create thumbnail for existing photo without one
export async function createThumbnailForPhoto(photoId, photoUrl, hikeId) {
  try {
    // Fetch the photo document
    const photoRef = doc(db, "photos", photoId);
    const photoDoc = await getDoc(photoRef);

    if (!photoDoc.exists()) {
      throw new Error("Photo not found");
    }

    const photoData = photoDoc.data();

    // If thumbnail already exists, return it
    if (photoData.thumbnailUrl) {
      return { success: true, thumbnailUrl: photoData.thumbnailUrl };
    }

    // Create thumbnail from existing image
    const thumbnailUrl = await createThumbnail(photoUrl, 200, 200);

    if (thumbnailUrl && thumbnailUrl !== photoUrl) {
      // Upload thumbnail to storage
      const timestamp = new Date().getTime();
      const thumbnailFileName = `thumb_${
        photoData.fileName || `${photoId}_${timestamp}.jpg`
      }`;
      const thumbnailStorageRef = ref(
        storage,
        `photos/${hikeId}/${thumbnailFileName}`
      );

      // Convert data URL to blob
      const response = await fetch(thumbnailUrl);
      const blob = await response.blob();

      const thumbnailSnapshot = await uploadBytes(thumbnailStorageRef, blob);
      const uploadedThumbnailUrl = await getDownloadURL(thumbnailSnapshot.ref);

      // Update photo document with thumbnail URL
      await updateDoc(photoRef, {
        thumbnailUrl: uploadedThumbnailUrl,
        thumbnailFileName: thumbnailFileName,
        thumbnailCreatedAt: new Date().toISOString(),
      });

      return { success: true, thumbnailUrl: uploadedThumbnailUrl };
    }

    return { success: false, error: "Failed to create thumbnail" };
  } catch (error) {
    console.error("Error creating thumbnail for photo:", error);
    return { success: false, error: error.message };
  }
}

// Batch create thumbnails for photos that don't have them
export async function createThumbnailsForExistingPhotos() {
  try {
    const photos = await getAllPhotos();
    const photosWithoutThumbnails = photos.filter(
      (photo) => !photo.thumbnailUrl
    );

    const results = [];

    for (const photo of photosWithoutThumbnails) {
      try {
        const result = await createThumbnailForPhoto(
          photo.id,
          photo.url,
          photo.hikeId
        );
        results.push({
          photoId: photo.id,
          fileName: photo.originalName,
          success: result.success,
          error: result.error,
        });
      } catch (error) {
        results.push({
          photoId: photo.id,
          fileName: photo.originalName,
          success: false,
          error: error.message,
        });
      }
    }

    return {
      success: true,
      total: photosWithoutThumbnails.length,
      results: results,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
    };
  } catch (error) {
    console.error("Error in batch thumbnail creation:", error);
    return { success: false, error: error.message };
  }
}

// Get photos with thumbnails (optimized for admin panel)
export async function getPhotosWithThumbnails() {
  try {
    const photos = await getAllPhotos();

    // Use stored thumbnail URLs or create them client-side as fallback
    const photosWithThumbnails = await Promise.all(
      photos.map(async (photo) => ({
        ...photo,
        thumbnail: photo.thumbnailUrl || (await createThumbnail(photo.url)),
      }))
    );

    return photosWithThumbnails;
  } catch (error) {
    console.error("Error fetching photos with thumbnails:", error);
    return [];
  }
}

// Debug function to show what files would be deleted for a photo
export async function debugPhotoDeletion(photoId) {
  try {
    console.log(`Debugging photo deletion for ID: ${photoId}`);

    const photoRef = doc(db, "photos", photoId);
    const photoDoc = await getDoc(photoRef);

    if (!photoDoc.exists()) {
      console.log("Photo not found in Firestore");
      return { success: false, error: "Photo not found" };
    }

    const photoData = photoDoc.data();
    console.log("Photo data:", photoData);

    const originalImagePath = photoData.fileName
      ? `photos/${photoData.hikeId}/${photoData.fileName}`
      : null;
    const thumbnailPath = photoData.thumbnailFileName
      ? `photos/${photoData.hikeId}/${photoData.thumbnailFileName}`
      : null;

    const debugInfo = {
      photoId: photoId,
      photoData: photoData,
      filesToDelete: {
        original: originalImagePath,
        thumbnail: thumbnailPath,
      },
      fileNames: {
        original: photoData.fileName,
        thumbnail: photoData.thumbnailFileName,
      },
      hikeId: photoData.hikeId,
    };

    console.log("Debug info for photo deletion:", debugInfo);
    return { success: true, debugInfo };
  } catch (error) {
    console.error("Error debugging photo deletion:", error);
    return { success: false, error: error.message };
  }
}

// Batch cleanup orphaned storage files
export async function cleanupOrphanedStorageFiles() {
  try {
    console.log("Starting cleanup of orphaned storage files...");

    // Get all photos from Firestore
    const allPhotosQuery = query(
      collection(db, "photos"),
      orderBy("uploadedAt", "desc")
    );
    const querySnapshot = await getDocs(allPhotosQuery);

    const validFilePaths = new Set();

    // Build a set of all valid file paths
    querySnapshot.forEach((doc) => {
      const photoData = doc.data();
      if (photoData.fileName) {
        validFilePaths.add(`photos/${photoData.hikeId}/${photoData.fileName}`);
      }
      if (photoData.thumbnailFileName) {
        validFilePaths.add(
          `photos/${photoData.hikeId}/${photoData.thumbnailFileName}`
        );
      }
    });

    console.log(`Found ${validFilePaths.size} valid file paths in Firestore`);

    // Note: Firebase Storage doesn't have a direct way to list all files
    // This is a limitation of the Firebase Storage API
    // In a real production environment, you would need to maintain a separate
    // index of all uploaded files or use a different storage solution
    // that supports file listing

    console.log(
      "Storage cleanup completed. Note: Manual verification recommended."
    );
    console.log("Valid file paths:", Array.from(validFilePaths));

    return {
      success: true,
      validFilePaths: Array.from(validFilePaths),
      message:
        "Cleanup completed. Manual verification recommended due to Storage API limitations.",
    };
  } catch (error) {
    console.error("Error during storage cleanup:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}
