import React, { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import { getHikesFromFirebase } from "../services/firebaseService";
import { uploadMultiplePhotos } from "../services/photoService";
import EXIF from "exif-js";
import "leaflet/dist/leaflet.css";

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const photoIcon = new L.Icon({
  iconUrl:
    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUiIGhlaWdodD0iNDEiIHZpZXdCb3g9IjAgMCAyNSA0MSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMjAuNSAyMS41QzIxLjQ4IDE3LjY3MyAyMS41IDEyLjc4NiAyMS41IDhDMjEuNSAzLjYzNjQgMTYuOTQ2IC0xIDExLjUgLTFDMTAuMDQ0IC0xIDguNSAwLjc1MTQgOC41IDIuNTAwOEM4LjUgMi43Mjk0IDguNTI3NyAyLjk2NDYgOC41NSAzLjIxOUw4LjU1IDQuNDI2MUM4LjU1IDQuNDY5IDguNTU4NCA0LjUxMjIgOC41NjcgNC41NTI2TDguNTY3IDQuOTg2MUM4LjU2NyA1LjAzNDQgOC41NjkgNS4wODE0IDguNTcyIDUuMTI5TDguNTcyIDUuNDQ5QzguNTcyIDUuNDk0NiA4LjU3MDYgNS41Mzg3IDguNTY5IDUuNTgyM0w4LjU2OSA1LjkyNTZDNi4yNSA1OS44NTcgMi42OSA0Mi44MzcgMi42OSAyMC44MzNDMi42OSAyMC43OTcgMi42OSAyMC43NjIgMi43MDIgMjAuNzI3TDIuNzAyIDIwLjQ3NUMyLjcwMiAxNi43NTcgMy4yOTEgMTMuMjg3IDQuMjQ2IDEwLjI1NkM1LjI2MiA3LjEzMzYgNi45NDYgNC40NDQzIDkuNzA3IDIuNzg2MUMxMC42ODIgMS45NTM0IDExLjc0OSAxLjUgMTIuODU5IDEuNUMyNy44NTkgMS41IDM5LjUgMTMuMTQxIDM5LjUgMjguMDQxQzM5LjUgNDIuOTUxIDMxLjA3NSA1MS41IDIxLjc1MSA1MS41QzE2LjM2NiA1MS41IDExLjc5NSA0OC4yODQgOS4zMDM5IDQ0LjAzNjlDOC44NzM3IDQwLjgwOSA4LjUgMzcuNTE5IDguNSAzNC4wNzFDOC41IDMyLjA3MSA4Ljk1NDQgMzAuMTk0IDkuNzI3MyAyOC40NTVMMTIuMTIzIDIwLjI4NEw4LjUwNSAzNC4wMTdDOC41MDUgMzQuMTIyIDguNTA2IDMyLjMxNiA4LjUwNiAzMS43MDhDOC41MDYgMzAuMzU2IDguNTY3IDI5LjA3IDguNzE3IDI3Ljk1OEw4LjcxNyAyNy41NDdDOC43MTcgMjcuMTQ4IDguNzQ0IDI2Ljc1MyA4Ljc5IDI2LjM5NkwxMC4yMjUgMTguMjM2TDEyLjMwMyAyMC4yNTdMMTQuMzc1IDE4LjIyOEwxNS44NTIgMTkuNzE2QzE3LjQ4OSAyMS4xOTUgMTguNTQyIDIuNTcyIDE5LjI2NCAxNy44NTZDMjAuNzIgMTYuMzk2IDIwLjUgMjEuNSAyMC41IDIxLjVaIiBmaWxsPSIjZmY1NzIyIi8+PC9zdmc+",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

function AdminUploadPage() {
  const [hikes, setHikes] = useState([]);
  const [selectedHike, setSelectedHike] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [exifPreview, setExifPreview] = useState([]);
  const [formData, setFormData] = useState({
    caption: "",
    description: "",
  });

  useEffect(() => {
    loadHikes();
  }, []);

  const loadHikes = async () => {
    try {
      const hikesData = await getHikesFromFirebase();
      setHikes(hikesData);
    } catch (error) {
      console.error("Error loading hikes:", error);
    }
  };

  const handleFileSelection = async (event) => {
    const files = Array.from(event.target.files);
    setSelectedFiles(files);
    setUploadStatus(null);

    // Extract EXIF preview data for first few files to show user
    const previewData = [];
    for (let i = 0; i < Math.min(files.length, 3); i++) {
      const file = files[i];
      try {
        const exifData = await extractExifData(file);
        previewData.push({
          name: file.name,
          hasLocation: !!(exifData.lat && exifData.lng),
          hasDate: !!exifData.date,
          lat: exifData.lat,
          lng: exifData.lng,
          date: exifData.date,
        });
      } catch (error) {
        previewData.push({
          name: file.name,
          hasLocation: false,
          hasDate: false,
          error: error.message,
        });
      }
    }
    setExifPreview(previewData);
  };

  const handleBatchUpload = async (event) => {
    if (!selectedHike || selectedFiles.length === 0) {
      setUploadStatus({
        type: "error",
        message: "Please select a hike and files first.",
      });
      return;
    }

    setUploading(true);
    setUploadStatus(null);

    try {
      const result = await uploadMultiplePhotos(
        selectedFiles,
        selectedHike,
        formData.caption
      );

      if (result.success) {
        const { uploaded, failed, summary } = result;

        let message = `✅ Successfully uploaded ${summary.successful} photo(s)!`;
        if (summary.withExif > 0) {
          message += ` (${summary.withExif} with location data)`;
        }
        if (summary.failed > 0) {
          message += ` ⚠️ ${summary.failed} failed to upload`;
        }

        setUploadStatus({
          type: summary.failed > 0 ? "warning" : "success",
          message: message,
        });

        // Show details about each uploaded photo
        const details = [];
        uploaded.forEach((photo) => {
          details.push(
            `📸 ${photo.fileName} ${photo.exifExtracted ? "📍" : ""}`
          );
        });
        failed.forEach((fail) => {
          details.push(`❌ ${fail.fileName}: ${fail.error}`);
        });

        if (details.length > 0) {
          setUploadStatus({
            type: summary.failed > 0 ? "warning" : "success",
            message: message,
            details: details,
          });
        }

        // Reset form
        setFormData({ caption: "", description: "" });
        setSelectedFiles([]);
        setExifPreview([]);
        event.target.value = "";
      } else {
        setUploadStatus({
          type: "error",
          message: "Upload failed: " + result.error,
        });
      }
    } catch (error) {
      setUploadStatus({
        type: "error",
        message: "Upload failed: " + error.message,
      });
    } finally {
      setUploading(false);
    }
  };

  const getMapCenter = () => {
    // Default to Switzerland center if no hikes with positions
    const hikeWithPositions = hikes.find(
      (hike) =>
        hike.polyline &&
        hike.polyline.length > 0 &&
        hike.polyline[0] &&
        Array.isArray(hike.polyline[0]) &&
        hike.polyline[0].length >= 2
    );

    if (hikeWithPositions) {
      const firstPosition = hikeWithPositions.polyline[0];
      const lat = parseFloat(firstPosition[0]);
      const lng = parseFloat(firstPosition[1]);

      if (!isNaN(lat) && !isNaN(lng)) {
        return [lat, lng];
      }
    }

    return [46.8182, 8.2275]; // Switzerland center
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="glass-card p-4 sm:p-6 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-100 mb-4">
            📸 Smart Photo Upload
          </h1>
          <p className="text-gray-300 mb-6">
            Upload multiple photos at once. Location and date are automatically
            extracted from photo metadata (EXIF data).
          </p>

          {/* Upload Form */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Left Column - Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Select Hike/Activity
                </label>
                <select
                  value={selectedHike}
                  onChange={(e) => setSelectedHike(e.target.value)}
                  className="input"
                >
                  <option value="" style={{ color: "black" }}>
                    Choose a hike...
                  </option>
                  {hikes.map((hike) => (
                    <option
                      key={hike.id}
                      value={hike.id}
                      style={{ color: "black" }}
                    >
                      {hike.name} ({formatDate(hike.startDate)}) -{" "}
                      {hike.distanceKm?.toFixed(1)}km
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Caption (optional - applies to all photos)
                </label>
                <input
                  type="text"
                  value={formData.caption}
                  onChange={(e) =>
                    setFormData({ ...formData, caption: e.target.value })
                  }
                  className="input"
                  placeholder="Caption for all photos..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Select Photos
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileSelection}
                  className="input"
                  disabled={uploading}
                />
              </div>

              {selectedFiles.length > 0 && (
                <div className="p-3 bg-blue-900 bg-opacity-30 border border-blue-500 border-opacity-30 rounded-lg">
                  <p className="text-blue-300 text-sm mb-2">
                    📁 {selectedFiles.length} photo(s) selected
                  </p>

                  {exifPreview.length > 0 && (
                    <div className="text-xs text-blue-200">
                      <p className="font-medium mb-1">Metadata Preview:</p>
                      {exifPreview.map((preview, index) => (
                        <div key={index} className="mb-1">
                          <span className="font-mono">{preview.name}</span>
                          <span className="ml-2">
                            {preview.hasLocation ? "📍" : "❌"}
                            {preview.hasDate ? " 📅" : " ❌"}
                          </span>
                        </div>
                      ))}
                      {selectedFiles.length > 3 && (
                        <p className="text-xs text-blue-300">
                          ... and {selectedFiles.length - 3} more
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {uploadStatus && (
                <div
                  className={`p-3 rounded-lg ${
                    uploadStatus.type === "success"
                      ? "bg-green-900 bg-opacity-30 text-green-300 border border-green-500 border-opacity-30"
                      : uploadStatus.type === "warning"
                      ? "bg-yellow-900 bg-opacity-30 text-yellow-300 border border-yellow-500 border-opacity-30"
                      : "bg-red-900 bg-opacity-30 text-red-300 border border-red-500 border-opacity-30"
                  }`}
                >
                  <p>{uploadStatus.message}</p>
                  {uploadStatus.details && (
                    <div className="mt-2 text-xs font-mono">
                      {uploadStatus.details.map((detail, index) => (
                        <div key={index}>{detail}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={handleBatchUpload}
                disabled={
                  !selectedHike || selectedFiles.length === 0 || uploading
                }
                className="w-full btn btn-primary"
              >
                {uploading
                  ? "⏳ Uploading Photos..."
                  : `📤 Upload ${selectedFiles.length} Photo(s)`}
              </button>
            </div>

            {/* Right Column - Map & Info */}
            <div className="mt-6 xl:mt-0">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-100 mb-2">
                  🗺️ Route Overview
                </h3>
                <div className="h-64 sm:h-80 lg:h-96">
                  <MapContainer
                    center={getMapCenter()}
                    zoom={8}
                    style={{ height: "100%", width: "100%" }}
                    className="rounded-lg map-container"
                  >
                    <TileLayer
                      attribution="&copy; OpenStreetMap contributors"
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {/* Show existing hike tracks */}
                    {hikes
                      .filter(
                        (hike) =>
                          hike.polyline &&
                          Array.isArray(hike.polyline) &&
                          hike.polyline.length > 0
                      )
                      .map((hike) => {
                        // Filter out invalid coordinates
                        const validPolyline = hike.polyline.filter(
                          (point) =>
                            point &&
                            Array.isArray(point) &&
                            point.length >= 2 &&
                            !isNaN(parseFloat(point[0])) &&
                            !isNaN(parseFloat(point[1]))
                        );

                        if (validPolyline.length === 0) return null;

                        return (
                          <div key={hike.id}>
                            <Polyline
                              positions={validPolyline}
                              color="#3b82f6"
                              weight={2}
                              opacity={0.7}
                            />
                            <Marker
                              position={validPolyline[0]}
                              icon={L.divIcon({
                                html: `<div style="background: #3b82f6; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: bold;">${
                                  hike.name || "Hike"
                                }</div>`,
                                className: "custom-div-icon",
                                iconSize: [80, 20],
                                iconAnchor: [40, 10],
                              })}
                            />
                          </div>
                        );
                      })}
                  </MapContainer>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold text-gray-100 mb-4">
            📋 Smart Upload Instructions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-100 mb-2">
                ✨ Automatic Metadata Extraction
              </h3>
              <div className="space-y-2 text-gray-300 text-sm">
                <p>
                  📍 <strong>Location:</strong> GPS coordinates are
                  automatically read from your photos
                </p>
                <p>
                  📅 <strong>Date:</strong> Photo taken date is extracted from
                  EXIF data
                </p>
                <p>
                  🔄 <strong>Batch Processing:</strong> Upload multiple photos
                  at once
                </p>
                <p>
                  🖼️ <strong>Auto Thumbnails:</strong> 200x200 thumbnails
                  created automatically for fast loading
                </p>
                <p>
                  📋 <strong>Global Caption:</strong> One caption applies to all
                  selected photos
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-100 mb-2">🚀 How to Use</h3>
              <div className="space-y-2 text-gray-300 text-sm">
                <p>
                  1. <strong>Select hike</strong> from the dropdown
                </p>
                <p>
                  2. <strong>Choose photos</strong> from your device
                </p>
                <p>
                  3. <strong>Add caption</strong> (optional)
                </p>
                <p>
                  4. <strong>Upload</strong> - location and date auto-extracted!
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-green-900 bg-opacity-30 border border-green-500 border-opacity-30 rounded-lg">
            <p className="text-green-300 text-sm">
              <strong>💡 Pro Tip:</strong> Make sure your phone's camera has
              location services enabled when taking photos for automatic GPS
              tagging!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to extract EXIF data (duplicate from service for preview)
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

export default AdminUploadPage;
