
"use client";

import type { UserProfile, RunningLevel, TrainingPlan, WeatherUnit, NewsletterDelivery, NewsSearchCategory } from "@/lib/types";
import { DEFAULT_USER_PROFILE, RUNNING_LEVELS, TRAINING_PLANS, WEATHER_UNITS, NEWSLETTER_DELIVERY_OPTIONS, NEWS_SEARCH_CATEGORIES } from "@/lib/constants";
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
  // newsSearchPreferences are optional.
  return !!(
    profile.name &&
    profile.location &&
    profile.runningLevel && 
    profile.trainingPlan && 
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
          ...DEFAULT_USER_PROFILE, 
          ...storedProfile,        
          
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
          newsSearchPreferences: Array.isArray(storedProfile.newsSearchPreferences)
                          ? storedProfile.newsSearchPreferences.filter(pref => NEWS_SEARCH_CATEGORIES.some(cat => cat.value === pref))
                          : DEFAULT_USER_PROFILE.newsSearchPreferences,
          id: storedProfile.id || DEFAULT_USER_PROFILE.id,
        };
      }
    } catch (error) {
      console.error("Failed to load user profile from localStorage", error);
    }
    
    setUserProfile(profileToSet);
    setIsProfileComplete(checkProfileCompleteness(profileToSet));
    setLoading(false);
  }, []);

  const setUserProfileState = (profileChanges: Partial<UserProfile>) => {
    const newProfileCandidate = {
      ...userProfile, 
      ...profileChanges 
    };

    const validatedProfile: UserProfile = {
      ...DEFAULT_USER_PROFILE, 
      ...newProfileCandidate,  
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
      newsSearchPreferences: Array.isArray(newProfileCandidate.newsSearchPreferences)
                      ? newProfileCandidate.newsSearchPreferences.filter(pref => NEWS_SEARCH_CATEGORIES.some(cat => cat.value === pref))
                      : DEFAULT_USER_PROFILE.newsSearchPreferences,
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
