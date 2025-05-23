"use client";

import type { UserProfile, RunningLevel, TrainingPlan } from "@/lib/types";
import { DEFAULT_USER_PROFILE } from "@/lib/constants";
import React, { createContext, useContext, useState, useEffect, type ReactNode } from "react";

interface UserProfileContextType {
  userProfile: UserProfile;
  setUserProfileState: (profile: UserProfile) => void;
  loading: boolean;
  isProfileComplete: boolean;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

// Helper function to check profile completeness
const checkProfileCompleteness = (profile: UserProfile | null): boolean => {
  if (!profile) return false;
  return !!(
    profile.name &&
    profile.location &&
    profile.runningLevel &&
    profile.trainingPlan &&
    profile.raceDistance // Added raceDistance check
  );
};


export const UserProfileProvider = ({ children }: { children: ReactNode }) => {
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_USER_PROFILE);
  const [loading, setLoading] = useState(true);
  const [isProfileComplete, setIsProfileComplete] = useState(false);

  useEffect(() => {
    let loadedProfile = DEFAULT_USER_PROFILE;
    try {
      const storedProfile = localStorage.getItem("userProfile");
      if (storedProfile) {
        const parsedProfile = JSON.parse(storedProfile) as UserProfile;
        // Ensure all fields from UserProfile type exist, defaulting if necessary
        loadedProfile = {
          ...DEFAULT_USER_PROFILE, // Start with defaults
          ...parsedProfile, // Override with stored values
          id: parsedProfile.id || DEFAULT_USER_PROFILE.id,
          name: parsedProfile.name || DEFAULT_USER_PROFILE.name,
          location: parsedProfile.location || DEFAULT_USER_PROFILE.location,
          runningLevel: parsedProfile.runningLevel || DEFAULT_USER_PROFILE.runningLevel,
          trainingPlan: parsedProfile.trainingPlan || DEFAULT_USER_PROFILE.trainingPlan,
          raceDistance: parsedProfile.raceDistance || DEFAULT_USER_PROFILE.raceDistance,
          planStartDate: parsedProfile.planStartDate, // Can be undefined
        };
      }
    } catch (error) {
      console.error("Failed to load user profile from localStorage", error);
      // loadedProfile remains DEFAULT_USER_PROFILE
    }
    
    setUserProfile(loadedProfile);
    setIsProfileComplete(checkProfileCompleteness(loadedProfile));
    setLoading(false);
  }, []);

  const setUserProfileState = (profile: UserProfile) => {
    // Ensure all parts of profile are at least empty strings for consistency
    const validatedProfile: UserProfile = {
        ...DEFAULT_USER_PROFILE, // Base defaults
        ...profile, // Apply incoming profile
        id: profile.id || userProfile.id || DEFAULT_USER_PROFILE.id, // Preserve ID if possible
    };
    setUserProfile(validatedProfile);
    setIsProfileComplete(checkProfileCompleteness(validatedProfile));
    try {
      localStorage.setItem("userProfile", JSON.stringify(validatedProfile));
    } catch (error) {
      console.error("Failed to save user profile to localStorage", error);
    }
  };
  
  return (
    <UserProfileContext.Provider value={{ userProfile, setUserProfileState, loading, isProfileComplete }}>
      {children}
    </UserProfileContext.Provider>
  );
};

export const useUserProfile = () => {
  const context = useContext(UserProfileContext);
  if (context === undefined) {
    throw new Error("useUserProfile must be used within a UserProfileProvider");
  }
  return context;
};
