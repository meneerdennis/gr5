import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet-gpx";

function GpxTrack({ url, elevationProfile, onHover }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !url) return;

    const gpxLayer = new L.GPX(url, {
      async: true,

      // 👉 Zorg dat waypoints (wpt) NIET worden geparsed
      gpx_options: {
        parseElements: ["track", "route"], // géén 'waypoint'
      },

      // 👉 Alle interne markers uitschakelen
      markers: {
        startIcon: null, // geen startmarker
        endIcon: null, // geen eindmarker
        wptIcons: { "": null }, // geen default waypoint-icoon
        wptTypeIcons: {}, // geen type-specifieke icons
        pointMatchers: [], // geen named-point icons
      },

      polyline_options: {
        color: "#ff5722",
        weight: 5, // Increased for easier hover detection
        opacity: 0.8,
      },
    })
      .on("loaded", (e) => {
        map.fitBounds(e.target.getBounds());

        // Add mousemove event to the GPX layer for hover detection
        if (elevationProfile && onHover) {
          e.target.on("mousemove", (event) => {
            const latlng = event.latlng;

            // Find closest point in elevation profile
            let closestPoint = null;
            let minDistance = Infinity;

            elevationProfile.forEach((point) => {
              if (!point.lat || !point.lon) return;
              const distance = Math.sqrt(
                Math.pow(point.lat - latlng.lat, 2) +
                  Math.pow(point.lon - latlng.lng, 2)
              );
              if (distance < minDistance) {
                minDistance = distance;
                closestPoint = point;
              }
            });

            if (closestPoint) {
              onHover(closestPoint);
            }
          });

          e.target.on("mouseout", () => {
            onHover(null);
          });
        }
      })
      .addTo(map);

    return () => {
      map.removeLayer(gpxLayer);
    };
  }, [map, url, elevationProfile, onHover]);

  return null;
}

export default GpxTrack;
