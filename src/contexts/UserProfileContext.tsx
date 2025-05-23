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

export const UserProfileProvider = ({ children }: { children: ReactNode }) => {
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_USER_PROFILE);
  const [loading, setLoading] = useState(true);
  const [isProfileComplete, setIsProfileComplete] = useState(false);

  useEffect(() => {
    try {
      const storedProfile = localStorage.getItem("userProfile");
      if (storedProfile) {
        const parsedProfile = JSON.parse(storedProfile) as UserProfile;
        setUserProfile(parsedProfile);
        setIsProfileComplete(!!parsedProfile.name && !!parsedProfile.location && !!parsedProfile.runningLevel && !!parsedProfile.trainingPlan);
      } else {
        // Ensure default empty strings for levels/plans if nothing stored
        setUserProfile(prev => ({
          ...prev,
          runningLevel: prev.runningLevel || '',
          trainingPlan: prev.trainingPlan || '',
        }));
      }
    } catch (error) {
      console.error("Failed to load user profile from localStorage", error);
      // Set to default if error
       setUserProfile(DEFAULT_USER_PROFILE);
    }
    setLoading(false);
  }, []);

  const setUserProfileState = (profile: UserProfile) => {
    setUserProfile(profile);
    setIsProfileComplete(!!profile.name && !!profile.location && !!profile.runningLevel && !!profile.trainingPlan);
    try {
      localStorage.setItem("userProfile", JSON.stringify(profile));
    } catch (error) {
      console.error("Failed to save user profile to localStorage", error);
    }
  };
  
  // Ensure runningLevel and trainingPlan are initialized to empty strings if not set
  const profileWithDefaults = {
    ...userProfile,
    runningLevel: userProfile.runningLevel || '' as RunningLevel,
    trainingPlan: userProfile.trainingPlan || '' as TrainingPlan,
  };


  return (
    <UserProfileContext.Provider value={{ userProfile: profileWithDefaults, setUserProfileState, loading, isProfileComplete }}>
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
