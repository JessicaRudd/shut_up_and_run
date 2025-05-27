"use client";

import type { UserProfile, RunningLevel, TrainingPlan, WeatherUnit, NewsletterDelivery, NewsSearchCategory, LongRunDay } from "@/lib/types";
import { DEFAULT_USER_PROFILE, RUNNING_LEVELS, TRAINING_PLANS, WEATHER_UNITS, NEWSLETTER_DELIVERY_OPTIONS, NEWS_SEARCH_CATEGORIES, RUNNING_DAYS_OPTIONS, LONG_RUN_DAY_OPTIONS } from "@/lib/constants";
import React, { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { userProfileService } from "@/lib/firebase/userProfile";

interface UserProfileContextType {
  userProfile: UserProfile;
  setUserProfileState: (profile: UserProfile) => void;
  loading: boolean;
  isProfileComplete: boolean;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

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
  return !!(
    profile.name &&
    profile.location &&
    profile.runningLevel && 
    profile.trainingPlan && 
    profile.weatherUnit &&
    profile.newsletterDelivery &&
    profile.runningDaysPerWeek &&
    profile.longRunDay
  );
};

export const UserProfileProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_USER_PROFILE);
  const [loading, setLoading] = useState(true);
  const [isProfileComplete, setIsProfileComplete] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      if (user) {
        try {
          const profile = await userProfileService.getUserProfile(user.uid);
          if (profile) {
            const validatedProfile = validateUserProfile(profile);
            setUserProfile(validatedProfile);
            setIsProfileComplete(checkProfileCompleteness(validatedProfile));
          } else {
            setUserProfile(DEFAULT_USER_PROFILE);
            setIsProfileComplete(false);
          }
        } catch (error) {
          console.error("Error loading user profile:", error);
          setUserProfile(DEFAULT_USER_PROFILE);
          setIsProfileComplete(false);
        }
      } else {
        setUserProfile(DEFAULT_USER_PROFILE);
        setIsProfileComplete(false);
      }
      setLoading(false);
    };

    loadProfile();
  }, [user]);

  const setUserProfileState = async (profileChanges: Partial<UserProfile>) => {
    if (!user) return;

    try {
      const newProfile = { ...userProfile, ...profileChanges };
      const validatedProfile = validateUserProfile(newProfile);
      
      // Update in Firebase
      await userProfileService.updateUserProfile(user.uid, validatedProfile);
      
      // Update local state
      setUserProfile(validatedProfile);
      setIsProfileComplete(checkProfileCompleteness(validatedProfile));
    } catch (error) {
      console.error("Error updating user profile:", error);
      throw error;
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
