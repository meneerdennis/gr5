import { useEffect, useState } from 'react';
import { getRouteData } from '../services/routeService';
import { getStravaHikes } from '../services/stravaService';
import { getPolarstepsPhotos } from '../services/polarstepsService';

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
        const [routeData, hikesData, photosData] = await Promise.all([
          getRouteData(),
          getStravaHikes(),
          getPolarstepsPhotos(),
        ]);
        setRoute(routeData);
        setHikes(hikesData);
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