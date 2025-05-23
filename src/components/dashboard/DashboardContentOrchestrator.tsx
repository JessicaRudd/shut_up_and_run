
"use client";

import { useEffect, useState } from "react";
import type { UserProfile, DailyForecastData } from "@/lib/types";
import { customizeNewsletter, type CustomizeNewsletterOutput, type CustomizeNewsletterInput } from "@/ai/flows/customize-newsletter-content";
import { mockArticles } from "@/lib/mockNews"; 
import { getTodaysWorkout } from "@/lib/workoutUtils";
import { getWeatherByLocation } from "@/services/weatherService"; 

import { GreetingSection } from "./GreetingSection";
import { WeatherSection } from "./WeatherSection";
import { WorkoutSection } from "./WorkoutSection";
import { NewsSection } from "./NewsSection";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface DashboardContentOrchestratorProps {
  userProfile: UserProfile;
}

export function DashboardContentOrchestrator({ userProfile }: DashboardContentOrchestratorProps) {
  const [newsletterData, setNewsletterData] = useState<CustomizeNewsletterOutput | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weatherErrorForAI, setWeatherErrorForAI] = useState<string | null>(null);


  useEffect(() => {
    if (!userProfile.name || !userProfile.location || !userProfile.weatherUnit) {
      setLoading(false);
      setError("Please complete your profile including name, location, and weather unit to load the dashboard.");
      return;
    }

    async function fetchNewsletterData() {
      setLoading(true);
      setError(null);
      setWeatherErrorForAI(null);
      try {
        const todaysWorkout = getTodaysWorkout(userProfile);
        
        const weatherApiUnit = userProfile.weatherUnit === "C" ? "metric" : "imperial";
        const weatherResult = await getWeatherByLocation(userProfile.location, weatherApiUnit);

        let weatherInputForAI: CustomizeNewsletterInput['weather'];

        if ('error' in weatherResult) {
          console.warn("Weather service returned an error:", weatherResult.error);
          weatherInputForAI = { error: weatherResult.error };
          setWeatherErrorForAI(weatherResult.error); // Store this to potentially show a more direct error if AI also fails
        } else {
          weatherInputForAI = weatherResult as DailyForecastData; // Type assertion after check
        }

        const input: CustomizeNewsletterInput = {
          userName: userProfile.name,
          location: userProfile.location,
          runningLevel: userProfile.runningLevel || "beginner",
          trainingPlanType: userProfile.trainingPlan || "5k",
          raceDistance: userProfile.raceDistance || userProfile.trainingPlan || "5k",
          workout: todaysWorkout,
          newsStories: mockArticles.map(a => ({ title: a.title, url: a.url, content: a.content })),
          weather: weatherInputForAI,
          weatherUnit: userProfile.weatherUnit || "F", 
        };
        
        const result = await customizeNewsletter(input);
        setNewsletterData(result);
      } catch (err: any) {
        console.error("Error fetching personalized newsletter data or weather:", err);
        let errorMessage = "Could not load your personalized dashboard. ";
        if (err.message) {
          errorMessage += err.message;
        } else if (typeof err === 'string') {
          errorMessage += err;
        } else {
          errorMessage += "An unknown error occurred."
        }
         // If AI failed and we also had a weather specific error, prioritize showing that.
        if (weatherErrorForAI && errorMessage.includes("AI")) {
            setError(`Failed to process weather data: ${weatherErrorForAI}. ${errorMessage}`);
        } else {
            setError(errorMessage);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchNewsletterData();
  }, [userProfile, weatherErrorForAI]); // Added weatherErrorForAI to dependencies to avoid stale closure issues, though it's set within.

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 w-full" /> {/* Greeting */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64 w-full" /> {/* Weather (taller now) */}
          <Skeleton className="h-48 w-full" /> {/* Workout */}
        </div>
        <Skeleton className="h-72 w-full" /> {/* News */}
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
  
  if (!newsletterData) {
     return (
      <Alert variant="default" className="mt-6">
        <AlertTriangle className="h-5 w-5" />
        <AlertTitle>Dashboard Content Unavailable</AlertTitle>
        <AlertDescription>
          We are having trouble generating your personalized content at the moment. This could be due to:
          <ul className="list-disc list-inside mt-2">
            <li>Your profile not being fully completed.</li>
            <li>Temporary issues with the weather service.</li>
            <li>Temporary issues with the AI content generation service.</li>
          </ul>
          Please ensure your profile is complete and try refreshing. If the issue persists, please try again later.
          {weatherErrorForAI && <p className="mt-2 font-semibold">Specific weather issue: {weatherErrorForAI}</p>}
        </AlertDescription>
      </Alert>
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
      
      <NewsSection topStories={newsletterData.topStories} />
    </div>
  );
}
