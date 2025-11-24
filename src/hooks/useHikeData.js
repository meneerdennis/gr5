import { useEffect, useState } from "react";
import { getRouteData } from "../services/routeService";
import { getStravaHikes } from "../services/stravaService";
import { getAllPhotosWithHikes } from "../services/firebaseService";

export function useHikeData() {
  const [route, setRoute] = useState(null);
  const [hikes, setHikes] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [routeData, hikesData] = await Promise.all([
          getRouteData(),
          getStravaHikes(),
        ]);
        setRoute(routeData);
        setHikes(hikesData);

        // Extract photos from both hikes and standalone photos collection
        const photosData = await getAllPhotosWithHikes();
        console.log("Hikes data:", hikesData);
        console.log("Extracted photos (including standalone):", photosData);
        setPhotos(photosData);
      } catch (e) {
        console.error(e);
        setError(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return { route, hikes, photos, loading, error };
}
