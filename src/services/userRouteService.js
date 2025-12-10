import { db } from "./firebase";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
} from "firebase/firestore";

export class UserRouteService {
  constructor(userId) {
    this.userId = userId;
    this.routesCollection = collection(db, "userRoutes");
  }

  // Create a new user route
  async createRoute(routeData) {
    try {
      const route = {
        userId: this.userId,
        name: routeData.name,
        description: routeData.description || "",
        gpxData: routeData.gpxData,
        polyline: routeData.polyline || [],
        coordinates: routeData.coordinates || [],
        distanceKm: routeData.distanceKm || 0,
        elevationGain: routeData.elevationGain || 0,
        startLocation: routeData.startLocation || null,
        endLocation: routeData.endLocation || null,
        isPublic: routeData.isPublic || false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        photos: [],
        activities: [],
      };

      const docRef = await addDoc(this.routesCollection, route);
      return { id: docRef.id, ...route };
    } catch (error) {
      console.error("Error creating route:", error);
      throw error;
    }
  }

  // Get all routes for the current user
  async getUserRoutes() {
    try {
      const q = query(
        this.routesCollection,
        where("userId", "==", this.userId),
        orderBy("createdAt", "desc")
      );
      const querySnapshot = await getDocs(q);

      const routes = [];
      querySnapshot.forEach((doc) => {
        routes.push({ id: doc.id, ...doc.data() });
      });

      return routes;
    } catch (error) {
      console.error("Error fetching user routes:", error);
      throw error;
    }
  }

  // Get a specific route
  async getRoute(routeId) {
    try {
      const routeRef = doc(db, "userRoutes", routeId);
      const routeSnap = await getDoc(routeRef);

      if (routeSnap.exists() && routeSnap.data().userId === this.userId) {
        return { id: routeSnap.id, ...routeSnap.data() };
      }

      return null;
    } catch (error) {
      console.error("Error fetching route:", error);
      throw error;
    }
  }

  // Update a route
  async updateRoute(routeId, updates) {
    try {
      const routeRef = doc(db, "userRoutes", routeId);
      const updatedData = {
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(routeRef, updatedData);

      // Return the updated route
      return await this.getRoute(routeId);
    } catch (error) {
      console.error("Error updating route:", error);
      throw error;
    }
  }

  // Delete a route
  async deleteRoute(routeId) {
    try {
      const routeRef = doc(db, "userRoutes", routeId);
      await deleteDoc(routeRef);
      return true;
    } catch (error) {
      console.error("Error deleting route:", error);
      throw error;
    }
  }

  // Get public routes (for sharing)
  async getPublicRoutes(limit = 50) {
    try {
      const q = query(
        this.routesCollection,
        where("isPublic", "==", true),
        orderBy("createdAt", "desc")
      );

      const querySnapshot = await getDocs(q);
      const routes = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Remove sensitive user data from public routes
        const publicRoute = {
          id: doc.id,
          name: data.name,
          description: data.description,
          distanceKm: data.distanceKm,
          elevationGain: data.elevationGain,
          startLocation: data.startLocation,
          endLocation: data.endLocation,
          createdAt: data.createdAt,
          photos: data.photos || [],
          activities: data.activities || [],
          userId: data.userId, // Keep for user identification
        };
        routes.push(publicRoute);
      });

      return routes.slice(0, limit);
    } catch (error) {
      console.error("Error fetching public routes:", error);
      throw error;
    }
  }

  // Get route by username (for public sharing)
  async getRouteByUsername(username, routeId) {
    try {
      // First get the user by username
      const usersQuery = query(
        collection(db, "users"),
        where("username", "==", username)
      );
      const userSnapshot = await getDocs(usersQuery);

      if (userSnapshot.empty) {
        return null;
      }

      const userDoc = userSnapshot.docs[0];
      const userData = userDoc.data();

      // Then get the specific route
      const routeRef = doc(db, "userRoutes", routeId);
      const routeSnap = await getDoc(routeRef);

      if (routeSnap.exists()) {
        const routeData = routeSnap.data();

        // Verify the route belongs to this user and is public
        if (routeData.userId === userData.uid && routeData.isPublic) {
          return {
            id: routeSnap.id,
            ...routeData,
            username: username,
            userDisplayName: userData.displayName,
            userPhoto: userData.photoURL,
          };
        }
      }

      return null;
    } catch (error) {
      console.error("Error fetching route by username:", error);
      throw error;
    }
  }

  // Add activity to route
  async addActivityToRoute(routeId, activity) {
    try {
      const route = await this.getRoute(routeId);
      if (!route) {
        throw new Error("Route not found");
      }

      const activities = route.activities || [];
      activities.push({
        ...activity,
        addedAt: new Date().toISOString(),
      });

      await this.updateRoute(routeId, { activities });
      return true;
    } catch (error) {
      console.error("Error adding activity to route:", error);
      throw error;
    }
  }

  // Add photo to route
  async addPhotoToRoute(routeId, photo) {
    try {
      const route = await this.getRoute(routeId);
      if (!route) {
        throw new Error("Route not found");
      }

      const photos = route.photos || [];
      photos.push({
        ...photo,
        addedAt: new Date().toISOString(),
      });

      await this.updateRoute(routeId, { photos });
      return true;
    } catch (error) {
      console.error("Error adding photo to route:", error);
      throw error;
    }
  }
}

// Utility function to parse GPX file
export const parseGPXFile = (gpxFile) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(e.target.result, "text/xml");

        // Check for parsing errors
        const parsererror = xmlDoc.getElementsByTagName("parsererror");
        if (parsererror.length > 0) {
          throw new Error("Invalid GPX file format");
        }

        const trackPoints = xmlDoc.getElementsByTagName("trkpt");
        const routePoints = xmlDoc.getElementsByTagName("rtept");

        let points = [];
        let coordinates = [];

        if (trackPoints.length > 0) {
          // Parse track points
          for (let i = 0; i < trackPoints.length; i++) {
            const point = trackPoints[i];
            const lat = parseFloat(point.getAttribute("lat"));
            const lng = parseFloat(point.getAttribute("lon"));
            const elevation =
              point.getElementsByTagName("ele")[0]?.textContent || 0;
            const time =
              point.getElementsByTagName("time")[0]?.textContent || "";

            points.push({ lat, lng, elevation: parseFloat(elevation), time });
            coordinates.push([lat, lng]);
          }
        } else if (routePoints.length > 0) {
          // Parse route points
          for (let i = 0; i < routePoints.length; i++) {
            const point = routePoints[i];
            const lat = parseFloat(point.getAttribute("lat"));
            const lng = parseFloat(point.getAttribute("lon"));
            const elevation =
              point.getElementsByTagName("ele")[0]?.textContent || 0;

            points.push({ lat, lng, elevation: parseFloat(elevation) });
            coordinates.push([lat, lng]);
          }
        }

        if (points.length === 0) {
          throw new Error("No valid track points found in GPX file");
        }

        // Calculate distance (simplified)
        const distance = calculateDistance(coordinates);
        const elevationGain = calculateElevationGain(points);

        resolve({
          points,
          coordinates,
          distanceKm: distance,
          elevationGain: elevationGain,
          startLocation: points[0],
          endLocation: points[points.length - 1],
        });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error("Failed to read GPX file"));
    reader.readAsText(gpxFile);
  });
};

// Calculate distance between points (simplified Haversine)
const calculateDistance = (coordinates) => {
  let totalDistance = 0;

  for (let i = 1; i < coordinates.length; i++) {
    const [lat1, lng1] = coordinates[i - 1];
    const [lat2, lng2] = coordinates[i];

    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    totalDistance += distance;
  }

  return Math.round(totalDistance * 100) / 100; // Round to 2 decimal places
};

// Calculate elevation gain
const calculateElevationGain = (points) => {
  let totalGain = 0;

  for (let i = 1; i < points.length; i++) {
    const elevationDiff = points[i].elevation - points[i - 1].elevation;
    if (elevationDiff > 0) {
      totalGain += elevationDiff;
    }
  }

  return Math.round(totalGain);
};
