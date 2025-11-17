import React from "react";
import { useHikeData } from "./hooks/useHikeData";
import Layout from "./components/Layout";
import ElevationProfile from "./components/ElevationProfile";
import ProgressBar from "./components/ProgressBar";
import MapView from "./components/MapView";

function App() {
  const { route, hikes, photos, loading, error } = useHikeData();

  if (loading) return <div>Data laden…</div>;
  if (error) return <div>Er ging iets mis: {error.message}</div>;
  if (!route) return <div>Geen routegegevens gevonden.</div>;

  const progress = route.walkedDistanceKm / route.totalDistanceKm;

  return (
    <Layout>
      <div style={{ padding: "1rem" }}>
        <h1>GR5 Hoek van Holland → Nice</h1>
        <ProgressBar progress={progress} />
        <ElevationProfile
          elevationProfile={route.elevationProfile}
          walkedDistanceKm={route.walkedDistanceKm}
          totalDistanceKm={route.totalDistanceKm}
        />
      </div>
      <div
        style={{
          flex: 1,
          minHeight: "60vh",
          display: "flex",
          justifyContent: "center",
          alignContent: "center",
        }}
      >
        <MapView
          hikes={hikes}
          photos={photos}
          gpxUrl={process.env.PUBLIC_URL + "/gr5.gpx"}
        />
      </div>
    </Layout>
  );
}

export default App;
