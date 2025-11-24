import { storage, db } from "./firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  collection,
  addDoc,
  updateDoc,
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

// Upload photo to Firebase Storage with automatic EXIF data extraction
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

    // Create unique filename
    const timestamp = new Date().getTime();
    const fileName = `${hikeId}_${timestamp}_${file.name}`;
    const storageRef = ref(storage, `photos/${hikeId}/${fileName}`);

    // Upload file
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);

    // Save photo metadata to Firestore
    const photoMetadata = {
      url: downloadURL,
      caption: photoData.caption || "",
      description: photoData.description || "",
      lat: finalLat || null, // Convert undefined to null for Firestore
      lng: finalLng || null, // Convert undefined to null for Firestore
      date: finalDate,
      hikeId: hikeId,
      fileName: fileName,
      originalName: file.name,
      size: file.size,
      type: file.type,
      uploadedAt: new Date().toISOString(),
      hasExifData: !!(exifData.lat && exifData.lng),
      exifData: exifData.exifData,
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

// Get all photos for a specific hike
export async function getPhotosForHike(hikeId) {
  try {
    const photosQuery = query(
      collection(db, "photos"),
      where("hikeId", "==", hikeId),
      orderBy("uploadedAt", "desc")
    );

    const querySnapshot = await getDocs(photosQuery);
    const photos = [];

    querySnapshot.forEach((doc) => {
      photos.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return photos;
  } catch (error) {
    console.error("Error fetching photos for hike:", error);
    return [];
  }
}

// Get all photos from Firebase
export async function getAllPhotos() {
  try {
    const photosQuery = query(
      collection(db, "photos"),
      orderBy("uploadedAt", "desc")
    );

    const querySnapshot = await getDocs(photosQuery);
    const photos = [];

    querySnapshot.forEach((doc) => {
      photos.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return photos;
  } catch (error) {
    console.error("Error fetching all photos:", error);
    return [];
  }
}

// Delete photo
export async function deletePhoto(photoId, hikeId) {
  try {
    // Delete from Firestore
    await updateDoc(doc(db, "photos", photoId), {
      deletedAt: new Date().toISOString(),
    });

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
    }

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
