import React from "react";

function PhotoMarkerPopup({ photo }) {
  return (
    <div style={{ width: "200px" }}>
      {(photo.type && photo.type.startsWith("video/")) ||
      photo.url?.includes(".mov") ||
      photo.url?.includes(".mp4") ||
      photo.url?.includes(".avi") ||
      photo.url?.includes(".webm") ? (
        <div style={{ position: "relative" }}>
          <video
            src={photo.url}
            style={{
              width: "100%",
              borderRadius: "4px",
              marginBottom: "0.5rem",
            }}
            muted
          />
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              fontSize: "1.5rem",
            }}
          >
            ▶️
          </div>
        </div>
      ) : (
        <img
          src={photo.url}
          alt={photo.caption || "Foto"}
          style={{ width: "100%", borderRadius: "4px", marginBottom: "0.5rem" }}
        />
      )}
    </div>
  );
}

export default PhotoMarkerPopup;
