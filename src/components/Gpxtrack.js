import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet-gpx";

function GpxTrack({ url }) {
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
        weight: 3,
      },
    })
      .on("loaded", (e) => {
        map.fitBounds(e.target.getBounds());
      })
      .addTo(map);

    return () => {
      map.removeLayer(gpxLayer);
    };
  }, [map, url]);

  return null;
}

export default GpxTrack;
