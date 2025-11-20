import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/modern.css";
import "leaflet/dist/leaflet.css";
import "leaflet-gpx";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
