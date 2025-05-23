
"use client";

import type { UserProfile, RunningLevel, TrainingPlan, WeatherUnit, NewsletterDelivery } from "@/lib/types";
import { DEFAULT_USER_PROFILE, RUNNING_LEVELS, TRAINING_PLANS, WEATHER_UNITS, NEWSLETTER_DELIVERY_OPTIONS } from "@/lib/constants";
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
  // RaceDate is optional. PlanStartDate is also optional but often derived or defaulted.
  return !!(
    profile.name &&
    profile.location &&
    profile.runningLevel && // This will be false if profile.runningLevel is ""
    profile.trainingPlan && // This will be false if profile.trainingPlan is ""
    profile.weatherUnit &&
    profile.newsletterDelivery
  );
};


export const UserProfileProvider = ({ children }: { children: ReactNode }) => {
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_USER_PROFILE);
  const [loading, setLoading] = useState(true);
  const [isProfileComplete, setIsProfileComplete] = useState(false);

  useEffect(() => {
    let profileToSet = DEFAULT_USER_PROFILE;
    try {
      const storedProfileJson = localStorage.getItem("userProfile");
      if (storedProfileJson) {
        const storedProfile = JSON.parse(storedProfileJson) as Partial<UserProfile>;
        
        profileToSet = {
          ...DEFAULT_USER_PROFILE, // Start with defaults
          ...storedProfile,        // Override with stored values that are present
          
          // Explicitly validate/coerce enums that might be invalid from old storage or missing
          runningLevel: RUNNING_LEVELS.find(rl => rl.value === storedProfile.runningLevel)
                          ? storedProfile.runningLevel! 
                          : DEFAULT_USER_PROFILE.runningLevel,
          trainingPlan: TRAINING_PLANS.find(tp => tp.value === storedProfile.trainingPlan)
                          ? storedProfile.trainingPlan!
                          : DEFAULT_USER_PROFILE.trainingPlan,
          weatherUnit: WEATHER_UNITS.find(wu => wu.value === storedProfile.weatherUnit)
                          ? storedProfile.weatherUnit!
                          : DEFAULT_USER_PROFILE.weatherUnit,
          newsletterDelivery: NEWSLETTER_DELIVERY_OPTIONS.find(nd => nd.value === storedProfile.newsletterDelivery)
                          ? storedProfile.newsletterDelivery!
                          : DEFAULT_USER_PROFILE.newsletterDelivery,
          // Ensure id is preserved from storedProfile if it exists, otherwise from DEFAULT_USER_PROFILE
          id: storedProfile.id || DEFAULT_USER_PROFILE.id,
        };
      }
    } catch (error) {
      console.error("Failed to load user profile from localStorage", error);
      // profileToSet remains DEFAULT_USER_PROFILE
    }
    
    setUserProfile(profileToSet);
    setIsProfileComplete(checkProfileCompleteness(profileToSet));
    setLoading(false);
  }, []);

  const setUserProfileState = (profileChanges: Partial<UserProfile>) => {
    // Merge changes with current profile, then validate and save
    const newProfileCandidate = {
      ...userProfile, // Current state as base
      ...profileChanges // Apply incoming changes
    };

    const validatedProfile: UserProfile = {
      ...DEFAULT_USER_PROFILE, // Base defaults for any missing fields
      ...newProfileCandidate,  // Merged profile
      // Re-validate enums and ensure ID is correctly handled
      id: newProfileCandidate.id || DEFAULT_USER_PROFILE.id,
      runningLevel: RUNNING_LEVELS.find(rl => rl.value === newProfileCandidate.runningLevel) 
                      ? newProfileCandidate.runningLevel 
                      : DEFAULT_USER_PROFILE.runningLevel,
      trainingPlan: TRAINING_PLANS.find(tp => tp.value === newProfileCandidate.trainingPlan) 
                      ? newProfileCandidate.trainingPlan 
                      : DEFAULT_USER_PROFILE.trainingPlan,
      weatherUnit: WEATHER_UNITS.find(wu => wu.value === newProfileCandidate.weatherUnit)
                      ? newProfileCandidate.weatherUnit
                      : DEFAULT_USER_PROFILE.weatherUnit,
      newsletterDelivery: NEWSLETTER_DELIVERY_OPTIONS.find(nd => nd.value === newProfileCandidate.newsletterDelivery)
                      ? newProfileCandidate.newsletterDelivery
                      : DEFAULT_USER_PROFILE.newsletterDelivery,
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
