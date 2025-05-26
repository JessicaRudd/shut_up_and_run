"use client";

import type { UserProfile, RunningLevel, TrainingPlan, WeatherUnit, NewsletterDelivery, NewsSearchCategory, LongRunDay } from "@/lib/types";
import { DEFAULT_USER_PROFILE, RUNNING_LEVELS, TRAINING_PLANS, WEATHER_UNITS, NEWSLETTER_DELIVERY_OPTIONS, NEWS_SEARCH_CATEGORIES, RUNNING_DAYS_OPTIONS, LONG_RUN_DAY_OPTIONS } from "@/lib/constants";
import React, { createContext, useContext, useState, useEffect, type ReactNode } from "react";

interface UserProfileContextType {
  userProfile: UserProfile;
  setUserProfileState: (profile: UserProfile) => void;
  loading: boolean;
  isProfileComplete: boolean;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

const isClient = typeof window !== 'undefined';

// Helper to safely access localStorage
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (!isClient) return null;
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn('[UserProfile] Could not access localStorage:', error);
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    if (!isClient) return;
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.warn('[UserProfile] Could not write to localStorage:', error);
    }
  }
};

// Helper function to validate and normalize user profile data
const validateUserProfile = (profile: Partial<UserProfile>): UserProfile => {
  const validatedProfile = {
    ...DEFAULT_USER_PROFILE,
    ...profile,
    id: profile.id || DEFAULT_USER_PROFILE.id,
    runningLevel: (RUNNING_LEVELS.find(rl => rl.value === profile.runningLevel)?.value || DEFAULT_USER_PROFILE.runningLevel) as RunningLevel,
    trainingPlan: (TRAINING_PLANS.find(tp => tp.value === profile.trainingPlan)?.value || DEFAULT_USER_PROFILE.trainingPlan) as TrainingPlan,
    weatherUnit: (WEATHER_UNITS.find(wu => wu.value === profile.weatherUnit)?.value || DEFAULT_USER_PROFILE.weatherUnit) as WeatherUnit,
    newsletterDelivery: (NEWSLETTER_DELIVERY_OPTIONS.find(nd => nd.value === profile.newsletterDelivery)?.value || DEFAULT_USER_PROFILE.newsletterDelivery) as NewsletterDelivery,
    newsSearchPreferences: Array.isArray(profile.newsSearchPreferences)
      ? profile.newsSearchPreferences.filter(pref => NEWS_SEARCH_CATEGORIES.some(cat => cat.value === pref))
      : DEFAULT_USER_PROFILE.newsSearchPreferences,
    runningDaysPerWeek: RUNNING_DAYS_OPTIONS.find(rd => rd.value === profile.runningDaysPerWeek)?.value || DEFAULT_USER_PROFILE.runningDaysPerWeek,
    longRunDay: (LONG_RUN_DAY_OPTIONS.find(lrd => lrd.value === profile.longRunDay)?.value || DEFAULT_USER_PROFILE.longRunDay) as LongRunDay,
  };

  return validatedProfile;
};

// Helper function to check profile completeness
const checkProfileCompleteness = (profile: UserProfile | null): boolean => {
  if (!profile) return false;
  // RaceDate is optional. PlanStartDate is also optional but often derived or defaulted.
  // newsSearchPreferences are optional.
  // runningDaysPerWeek and longRunDay now have defaults, so they are always "set".
  return !!(
    profile.name &&
    profile.location &&
    profile.runningLevel && 
    profile.trainingPlan && 
    profile.weatherUnit &&
    profile.newsletterDelivery &&
    profile.runningDaysPerWeek && // Added check
    profile.longRunDay // Added check
  );
};

export const UserProfileProvider = ({ children }: { children: ReactNode }) => {
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_USER_PROFILE);
  const [loading, setLoading] = useState(true);
  const [isProfileComplete, setIsProfileComplete] = useState(false);

  useEffect(() => {
    let profileToSet = DEFAULT_USER_PROFILE;
    try {
      const storedProfileJson = safeLocalStorage.getItem("userProfile");
      if (storedProfileJson) {
        const storedProfile = JSON.parse(storedProfileJson) as Partial<UserProfile>;
        profileToSet = validateUserProfile(storedProfile);
      }
    } catch (error) {
      console.error("Failed to load user profile from localStorage", error);
    }
    
    setUserProfile(profileToSet);
    setIsProfileComplete(checkProfileCompleteness(profileToSet));
    setLoading(false);
  }, []);

  const setUserProfileState = (profileChanges: Partial<UserProfile>) => {
    setUserProfile(prevProfile => {
      const newProfile = { ...prevProfile, ...profileChanges };
      const validatedProfile = validateUserProfile(newProfile);
      
      try {
        safeLocalStorage.setItem("userProfile", JSON.stringify(validatedProfile));
      } catch (error) {
        console.error("Failed to save user profile to localStorage", error);
      }
      
      return validatedProfile;
    });
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
