
"use client";

import { useEffect, useState, useCallback } from "react";
import type { UserProfile, DailyForecastData, NewsSearchCategory } from "@/lib/types";
import { customizeNewsletter, type CustomizeNewsletterOutput, type CustomizeNewsletterInput } from "@/ai/flows/customize-newsletter-content";
import { getTodaysWorkout } from "@/lib/workoutUtils";
import { getWeatherByLocation } from "@/services/weatherService";
import { GreetingSection } from "./GreetingSection";
import { WeatherSection } from "./WeatherSection";
import { WorkoutSection } from "./WorkoutSection";
import { NewsSection } from "./NewsSection";
import { DressMyRunSection } from "./DressMyRunSection";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { TRAINING_PLANS } from "@/lib/constants";
import { format } from "date-fns";
import { useUserProfile } from "@/contexts/UserProfileContext";
// Removed: import { fetchGoogleRunningNewsTool } from "@/ai/tools/fetch-google-running-news-tool"; // Not used directly here

interface CachedNewsletterData {
  data: CustomizeNewsletterOutput;
  fetchedDate: string; // "yyyy-MM-dd"
  profileSnapshot: {
    name: string;
    location: string;
    weatherUnit: UserProfile['weatherUnit'];
    runningLevel: UserProfile['runningLevel'];
    trainingPlan: UserProfile['trainingPlan'];
    planStartDate?: string;
    raceDate?: string;
    newsSearchPreferences?: NewsSearchCategory[]; // Ensure this is part of the snapshot
  };
}

const CACHE_KEY = "cachedNewsletterData";

const createProfileSnapshot = (profile: UserProfile): CachedNewsletterData['profileSnapshot'] => ({
  name: profile.name,
  location: profile.location,
  weatherUnit: profile.weatherUnit,
  runningLevel: profile.runningLevel,
  trainingPlan: profile.trainingPlan,
  planStartDate: profile.planStartDate,
  raceDate: profile.raceDate,
  // Ensure newsSearchPreferences are sorted for consistent comparison
  newsSearchPreferences: profile.newsSearchPreferences ? [...profile.newsSearchPreferences].sort() : [],
});


export function DashboardContentOrchestrator() {
  const { userProfile, loading: userProfileLoading, isProfileComplete } = useUserProfile();

  const [newsletterData, setNewsletterData] = useState<CustomizeNewsletterOutput | null>(null);
  const [orchestratorLoading, setOrchestratorLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weatherErrorForAI, setWeatherErrorForAI] = useState<string | null>(null);

  const fetchNewsletterDataAndUpdateState = useCallback(async (currentDateStr: string, currentProfileSnapshotForCache: CachedNewsletterData['profileSnapshot']) => {
    if (!userProfile.name || !userProfile.location || !userProfile.weatherUnit) {
      setError("Please complete your profile including name, location, and weather unit to load the dashboard.");
      setNewsletterData(null);
      setOrchestratorLoading(false);
      return;
    }

    setOrchestratorLoading(true);
    setError(null);
    setWeatherErrorForAI(null);
    console.log("[Orchestrator] Starting to fetch fresh newsletter data for date:", currentDateStr);

    try {
      const todaysWorkout = getTodaysWorkout(userProfile);
      console.log("[Orchestrator] Today's workout:", todaysWorkout);
      
      const weatherApiUnit = userProfile.weatherUnit === "C" ? "metric" : "imperial";
      const weatherResult = await getWeatherByLocation(userProfile.location, weatherApiUnit);
      console.log("[Orchestrator] Weather service result:", weatherResult);

      let weatherInputForAI: CustomizeNewsletterInput['weather'];

      if ('error' in weatherResult) {
        console.warn("[Orchestrator] Weather service returned an error:", weatherResult.error);
        weatherInputForAI = { error: weatherResult.error };
        setWeatherErrorForAI(weatherResult.error); 
      } else {
        weatherInputForAI = weatherResult as DailyForecastData;
        if (weatherResult.error) { // Check for internal error in successfully fetched data
          console.warn("[Orchestrator] Weather data processed with an internal error message:", weatherResult.error);
          weatherInputForAI = { ...weatherResult, error: weatherResult.error }; // Pass along the error
          setWeatherErrorForAI(weatherResult.error);
        }
      }
      
      let derivedRaceDistance = "General Fitness";
      if (userProfile.trainingPlan) {
          const planDetails = TRAINING_PLANS.find(p => p.value === userProfile.trainingPlan);
          if (planDetails) {
              derivedRaceDistance = planDetails.label.replace(" Plan", "").replace(" Race", "");
          } else {
              derivedRaceDistance = userProfile.trainingPlan;
          }
      }

      const inputForAI: CustomizeNewsletterInput = {
        userName: userProfile.name,
        location: userProfile.location,
        runningLevel: userProfile.runningLevel || "beginner",
        trainingPlanType: userProfile.trainingPlan || "5k",
        raceDistance: derivedRaceDistance,
        workout: todaysWorkout,
        weather: weatherInputForAI,
        weatherUnit: userProfile.weatherUnit || "F", 
        newsSearchPreferences: userProfile.newsSearchPreferences || [],
      };
      
      console.log("[Orchestrator] Input for customizeNewsletter AI flow:", JSON.stringify(inputForAI, null, 2));
      const result = await customizeNewsletter(inputForAI);
      console.log("[Orchestrator] Result from customizeNewsletter AI flow:", JSON.stringify(result, null, 2));
      
      const cacheEntry: CachedNewsletterData = {
        data: result,
        fetchedDate: currentDateStr,
        profileSnapshot: currentProfileSnapshotForCache,
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheEntry));
      console.log("[Orchestrator] Newsletter data cached successfully with snapshot:", currentProfileSnapshotForCache);

      setNewsletterData(result);
    } catch (err: any) {
      console.error("[Orchestrator] Error fetching personalized newsletter data:", err);
      let errorMessage = "Could not load your personalized dashboard. ";
      if (err.message) {
        errorMessage += err.message;
      } else if (typeof err === 'string') {
        errorMessage += err;
      } else {
        errorMessage += "An unknown error occurred processing your dashboard content."
      }
      const isAIFlowError = err.message?.toLowerCase().includes('ai') || 
                            err.message?.toLowerCase().includes('flow') || 
                            err.message?.toLowerCase().includes('tool') ||
                            err.message?.toLowerCase().includes('genkit');

      if (weatherErrorForAI && isAIFlowError) {
          setError(`Failed to process data due to an AI or tool error. This might be related to weather data or news search. Weather service message: ${weatherErrorForAI}. AI error: ${err.message}. Full details: ${errorMessage}`);
      } else if (isAIFlowError) {
          setError(`An error occurred with the AI content generation service: ${err.message}. Full details: ${errorMessage}`);
      } else {
          setError(errorMessage);
      }
      setNewsletterData(null);
    } finally {
      console.log("[Orchestrator] Finished fetching newsletter data. Setting orchestrator loading to false.");
      setOrchestratorLoading(false);
    }
  }, [userProfile]); // userProfile is the main dependency for re-fetching

  useEffect(() => {
    if (userProfileLoading) {
      console.log("[Orchestrator] Waiting for user profile to load...");
      setOrchestratorLoading(true);
      return;
    }
    console.log("[Orchestrator] User profile loaded. isProfileComplete:", isProfileComplete, "Profile:", userProfile);

    if (!isProfileComplete) {
      console.log("[Orchestrator] Profile is not complete. Prompting user.");
      setError("Please complete your profile fully (including name, location, weather unit, and training plan selections) to load the dashboard.");
      setNewsletterData(null);
      setOrchestratorLoading(false);
      return;
    }
    
    if (error && error.startsWith("Please complete your profile")) {
        console.log("[Orchestrator] Profile is now complete, clearing previous 'incomplete profile' error.");
        setError(null);
    }

    const todayStr = format(new Date(), "yyyy-MM-dd");
    const currentProfileSnapshot = createProfileSnapshot(userProfile);
    let useCachedVersion = false;

    console.log("[Orchestrator] useEffect for cache check. Today:", todayStr);
    console.log("[Orchestrator] Current Profile Snapshot for cache check:", currentProfileSnapshot);

    const cachedEntryJson = localStorage.getItem(CACHE_KEY);
    if (cachedEntryJson) {
      try {
        const cachedEntry: CachedNewsletterData = JSON.parse(cachedEntryJson);
        console.log("[Orchestrator] Found cached entry:", cachedEntry);
        
        const profileSnapshotsMatch = 
          cachedEntry.profileSnapshot.name === currentProfileSnapshot.name &&
          cachedEntry.profileSnapshot.location === currentProfileSnapshot.location &&
          cachedEntry.profileSnapshot.weatherUnit === currentProfileSnapshot.weatherUnit &&
          cachedEntry.profileSnapshot.runningLevel === currentProfileSnapshot.runningLevel &&
          cachedEntry.profileSnapshot.trainingPlan === currentProfileSnapshot.trainingPlan &&
          cachedEntry.profileSnapshot.planStartDate === currentProfileSnapshot.planStartDate &&
          cachedEntry.profileSnapshot.raceDate === currentProfileSnapshot.raceDate &&
          // Compare sorted news preferences
          JSON.stringify(cachedEntry.profileSnapshot.newsSearchPreferences) === JSON.stringify(currentProfileSnapshot.newsSearchPreferences);

        const weatherWasUnavailableInCache = 
          typeof cachedEntry.data?.weather === 'string' && 
          (cachedEntry.data.weather.toLowerCase().includes("unavailable") || 
           cachedEntry.data.weather.toLowerCase().includes("error") ||
           cachedEntry.data.weather.toLowerCase().includes("could not retrieve"));

        console.log(`[Orchestrator] Cache check: Fetched Date Match: ${cachedEntry.fetchedDate === todayStr} (Cached: ${cachedEntry.fetchedDate}, Today: ${todayStr})`);
        console.log(`[Orchestrator] Cache check: Profile Snapshots Match: ${profileSnapshotsMatch}`);
        console.log(`[Orchestrator] Cache check: Weather Was Unavailable In Cache: ${weatherWasUnavailableInCache}`);

        if (cachedEntry.fetchedDate === todayStr && profileSnapshotsMatch && !weatherWasUnavailableInCache) {
          console.log("[Orchestrator] Using valid cached newsletter data for today (weather available).");
          setNewsletterData(cachedEntry.data);
          setOrchestratorLoading(false);
          setError(null); 
          useCachedVersion = true;
        } else {
          console.log("[Orchestrator] Cache is stale or weather was unavailable/errored. Will attempt to fetch fresh data.");
          if (cachedEntry.fetchedDate !== todayStr) console.log(`  - Cache Invalidation Reason: Date mismatch (Cached: ${cachedEntry.fetchedDate}, Today: ${todayStr})`);
          if (!profileSnapshotsMatch) {
            console.log(`  - Cache Invalidation Reason: Profile snapshot mismatch.`);
            // Detailed comparison for debugging mismatch
            Object.keys(currentProfileSnapshot).forEach(key => {
              const currentVal = currentProfileSnapshot[key as keyof typeof currentProfileSnapshot];
              const cachedVal = cachedEntry.profileSnapshot[key as keyof typeof cachedEntry.profileSnapshot];
              if (JSON.stringify(currentVal) !== JSON.stringify(cachedVal)) {
                console.log(`    Mismatch on key '${key}': Current='${JSON.stringify(currentVal)}', Cached='${JSON.stringify(cachedVal)}'`);
              }
            });
          }
          if (weatherWasUnavailableInCache) {
            console.log(`  - Cache Invalidation Reason: Cached weather was unavailable or errored. Attempting refresh.`);
          }
          // Let it fall through to fetchNewsletterDataAndUpdateState
        }
      } catch (e) {
        console.error("[Orchestrator] Error parsing cached newsletter data:", e);
        localStorage.removeItem(CACHE_KEY); 
        // Let it fall through to fetchNewsletterDataAndUpdateState
      }
    } else {
        console.log("[Orchestrator] No cache found. Will fetch fresh data.");
        // Let it fall through to fetchNewsletterDataAndUpdateState
    }
    
    if (!useCachedVersion) {
      console.log("[Orchestrator] Proceeding to fetch fresh newsletter data because cache was not used.");
      fetchNewsletterDataAndUpdateState(todayStr, currentProfileSnapshot);
    }

  }, [
    userProfileLoading, 
    isProfileComplete,
    userProfile, // Main trigger for re-evaluation
    fetchNewsletterDataAndUpdateState, // useCallback ensures stable reference
    error // To clear "incomplete profile" error if profile becomes complete
  ]);


  if (userProfileLoading || (orchestratorLoading && !newsletterData && !error)) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64 w-full" /> 
          <Skeleton className="h-48 w-full" /> 
        </div>
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-72 w-full" /> 
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mt-6">
        <AlertTriangle className="h-5 w-5" />
        <AlertTitle>Error Loading Dashboard</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  
  if (!orchestratorLoading && !newsletterData) {
     return (
      <Alert variant="default" className="mt-6 border-primary/50 text-primary-foreground bg-primary/10">
        <AlertTriangle className="h-5 w-5 text-primary" />
        <AlertTitle className="text-primary">Dashboard Content Unavailable</AlertTitle>
        <AlertDescription className="text-foreground">
          We are having trouble generating your personalized content at the moment. This could be due to:
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Your profile not being fully completed (check all fields, especially name, location, weather unit, and training plan selections).</li>
            <li>Temporary issues with external services (weather, news search). Please ensure API keys are correctly set in the environment if you are the developer.</li>
            <li>Temporary issues with the AI content generation service.</li>
          </ul>
          Please ensure your profile is complete and try refreshing. If the issue persists, please try again later.
          {weatherErrorForAI && <p className="mt-2 font-semibold">Specific weather service message: {weatherErrorForAI}</p>}
        </AlertDescription>
      </Alert>
    );
  }
  
  if (!newsletterData) { 
    return (
      <div className="text-center py-10">Preparing your dashboard... If this takes too long, please refresh or check back later.</div>
    );
  }

  return (
    <div className="space-y-6">
      <GreetingSection greetingWithName={newsletterData.greeting} />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <WeatherSection 
          location={userProfile.location} 
          weatherString={newsletterData.weather} 
        />
        <WorkoutSection 
          userProfile={userProfile} 
          workoutSuggestion={newsletterData.workout}
          planEndNotification={newsletterData.planEndNotification} 
        />
      </div>
      
      <DressMyRunSection suggestion={newsletterData.dressMyRunSuggestion} />
      
      <NewsSection topStories={newsletterData.topStories} />
    </div>
  );
}

