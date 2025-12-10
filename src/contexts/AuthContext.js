import React, { createContext, useContext, useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../services/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../services/firebase";

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);

      if (user) {
        // Create or get user profile
        await createUserProfile(user);
      } else {
        setUserProfile(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const createUserProfile = async (user) => {
    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        // Create new user profile
        const newProfile = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          createdAt: new Date().toISOString(),
          username:
            user.displayName?.toLowerCase().replace(/\s+/g, "") +
            Math.random().toString(36).substr(2, 5),
          settings: {
            theme: "light",
            notifications: true,
            stravaConnected: false,
          },
          routes: [],
          activities: [],
          publicProfile: true,
        };

        await setDoc(userRef, newProfile);
        setUserProfile(newProfile);
      } else {
        setUserProfile(userSnap.data());
      }
    } catch (error) {
      console.error("Error creating/getting user profile:", error);
    }
  };

  const updateUserProfile = async (updates) => {
    if (!user || !userProfile) return;

    try {
      const userRef = doc(db, "users", user.uid);
      const updatedProfile = { ...userProfile, ...updates };

      await setDoc(userRef, updatedProfile, { merge: true });
      setUserProfile(updatedProfile);
    } catch (error) {
      console.error("Error updating user profile:", error);
      throw error;
    }
  };

  const value = {
    user,
    userProfile,
    loading,
    updateUserProfile,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
