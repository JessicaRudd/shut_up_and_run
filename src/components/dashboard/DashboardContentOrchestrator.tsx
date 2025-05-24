
"use client";

import { useEffect, useState, useCallback } from "react";
import type { UserProfile, DailyForecastData } from "@/lib/types";
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

interface DashboardContentOrchestratorProps {
  userProfile: UserProfile;
}

export function DashboardContentOrchestrator({ userProfile }: DashboardContentOrchestratorProps) {
  const [newsletterData, setNewsletterData] = useState<CustomizeNewsletterOutput | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weatherErrorForAI, setWeatherErrorForAI] = useState<string | null>(null);
  const [lastFetchedDate, setLastFetchedDate] = useState<string | null>(null);


  const fetchNewsletterDataCallback = useCallback(async (currentDateStr: string) => {
    if (!userProfile.name || !userProfile.location || !userProfile.weatherUnit) {
      setError("Please complete your profile including name, location, and weather unit to load the dashboard.");
      setNewsletterData(null);
      setLastFetchedDate(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setWeatherErrorForAI(null);
    console.log("[Orchestrator] Starting to fetch newsletter data for date:", currentDateStr);

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
        if (weatherResult.error) { // This checks for internal errors if DailyForecastData schema allows it
          console.warn("[Orchestrator] Weather data processed with an internal error:", weatherResult.error);
          setWeatherErrorForAI(weatherResult.error);
           weatherInputForAI = { ...weatherResult, error: weatherResult.error };
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
      console.log("[Orchestrator] Result from customizeNewsletter AI flow:", result);
      
      setNewsletterData(result);
      setLastFetchedDate(currentDateStr);
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
      // Check if the error message suggests an AI/tool specific issue
      const isAIFlowError = err.message?.toLowerCase().includes('ai') || 
                            err.message?.toLowerCase().includes('flow') || 
                            err.message?.toLowerCase().includes('tool') ||
                            err.message?.toLowerCase().includes('genkit');

      if (weatherErrorForAI && isAIFlowError) {
          setError(`Failed to process data due to an AI or tool error, possibly related to weather data. Weather service message: ${weatherErrorForAI}. AI error: ${err.message}. Full details: ${errorMessage}`);
      } else if (isAIFlowError) {
          setError(`An error occurred with the AI content generation service: ${err.message}. Full details: ${errorMessage}`);
      } else {
          setError(errorMessage);
      }
      setNewsletterData(null);
    } finally {
      console.log("[Orchestrator] Finished fetching newsletter data. Setting loading to false.");
      setLoading(false);
    }
  }, [userProfile]); 

  useEffect(() => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    console.log("[Orchestrator] useEffect triggered. Profile Name:", userProfile.name, "Location:", userProfile.location, "Weather Unit:", userProfile.weatherUnit, "Newsletter Data Present:", !!newsletterData, "Last Fetched Date:", lastFetchedDate, "Today:", todayStr);

    if (!userProfile.name || !userProfile.location || !userProfile.weatherUnit) {
      if (!error) { // Only set error if not already set to avoid re-renders
        setError("Please complete your profile including name, location, and weather unit to load the dashboard.");
      }
      if (newsletterData) setNewsletterData(null); // Clear old data if profile becomes incomplete
      setLoading(false);
      return;
    }
    
    // If profile is complete, clear the profile completion error if it was set
    if (error === "Please complete your profile including name, location, and weather unit to load the dashboard.") {
        setError(null);
    }

    if (!newsletterData || lastFetchedDate !== todayStr) {
       fetchNewsletterDataCallback(todayStr);
    } else {
      setLoading(false); // Already have data for today
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile.name, userProfile.location, userProfile.weatherUnit, userProfile.newsSearchPreferences, userProfile.runningLevel, userProfile.trainingPlan, userProfile.planStartDate, userProfile.raceDate, newsletterData, lastFetchedDate, fetchNewsletterDataCallback]);
  // Note: fetchNewsletterDataCallback is memoized with userProfile. For a more granular control, list all userProfile dependencies here if fetchNewsletterDataCallback isn't re-memoized correctly.


  if (loading && !newsletterData && !error) {
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
  
  if (!loading && !newsletterData) {
     return (
      <Alert variant="default" className="mt-6 border-primary/50 text-primary-foreground bg-primary/10">
        <AlertTriangle className="h-5 w-5 text-primary" />
        <AlertTitle className="text-primary">Dashboard Content Unavailable</AlertTitle>
        <AlertDescription className="text-foreground">
          We are having trouble generating your personalized content at the moment. This could be due to:
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Your profile not being fully completed (check name, location, weather unit).</li>
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
    // This case should ideally be covered by the above, but as a fallback:
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
