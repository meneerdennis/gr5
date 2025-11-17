// GpxTrack.js (of in hetzelfde bestand als MapView)
import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet-gpx";

function GpxTrack({ url }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !url) return;

    console.log("GpxTrack: Loading GPX from:", url);

    const gpxLayer = new L.GPX(url, {
      async: true,
      polyline_options: {
        color: "#ff5722",
        weight: 3,
      },
    })
      .on("loaded", (e) => {
        console.log("GpxTrack: GPX loaded successfully");
        // Zoom de kaart zodat de hele route zichtbaar is
        map.fitBounds(e.target.getBounds());
      })
      .on("error", (e) => {
        console.error("GpxTrack: GPX loading error:", e);
      })
      .addTo(map);

    // Opruimen als component unmount
    return () => {
      if (map && gpxLayer) {
        console.log("GpxTrack: Cleaning up GPX layer");
        map.removeLayer(gpxLayer);
      }
    };
  }, [map, url]);

  return null;
}

export default GpxTrack;
