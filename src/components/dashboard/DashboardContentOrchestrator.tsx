"use client";

import { useEffect, useState } from "react";
import type { UserProfile } from "@/lib/types";
import { customizeNewsletter, type CustomizeNewsletterOutput, type CustomizeNewsletterInput } from "@/ai/flows/customize-newsletter-content";
import { mockArticles } from "@/lib/mockNews"; 
import { getTodaysWorkout } from "@/lib/workoutUtils";

import { GreetingSection } from "./GreetingSection";
import { WeatherSection } from "./WeatherSection";
import { WorkoutSection } from "./WorkoutSection";
import { NewsSection } from "./NewsSection";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

// Mock weather data to be passed to AI (as AI expects a string)
// In a real app, this would come from a weather API
const mockWeatherData = {
  temperature: "18°C", // Keep as a base, AI will be asked to format
  condition: "Partly Cloudy",
  humidity: "60%",
  wind: "10 km/h",
  forecast: "Clear skies expected tonight.",
};

const getMockWeatherString = (): string => {
  // This string will be given to the AI, along with the user's unit preference.
  return `${mockWeatherData.condition}, temp: ${mockWeatherData.temperature}. Humidity: ${mockWeatherData.humidity}, Wind: ${mockWeatherData.wind}. Forecast: ${mockWeatherData.forecast}`;
}

interface DashboardContentOrchestratorProps {
  userProfile: UserProfile;
}

export function DashboardContentOrchestrator({ userProfile }: DashboardContentOrchestratorProps) {
  const [newsletterData, setNewsletterData] = useState<CustomizeNewsletterOutput | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userProfile.name || !userProfile.location || !userProfile.weatherUnit) {
      // Dependencies for AI call not met, can happen briefly or if profile incomplete
      setLoading(false);
      return;
    }

    async function fetchNewsletterData() {
      setLoading(true);
      setError(null);
      try {
        const todaysWorkout = getTodaysWorkout(userProfile);
        const weatherString = getMockWeatherString(); 

        const input: CustomizeNewsletterInput = {
          userName: userProfile.name,
          location: userProfile.location,
          runningLevel: userProfile.runningLevel || "beginner",
          trainingPlanType: userProfile.trainingPlan || "5k",
          raceDistance: userProfile.raceDistance || userProfile.trainingPlan || "5k",
          workout: todaysWorkout,
          newsStories: mockArticles.map(a => ({ title: a.title, url: a.url, content: a.content })),
          weather: weatherString,
          weatherUnit: userProfile.weatherUnit || "F", // Pass user's preference
        };
        
        const result = await customizeNewsletter(input);
        setNewsletterData(result);
      } catch (err) {
        console.error("Error fetching personalized newsletter data:", err);
        setError("Could not load your personalized dashboard. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    fetchNewsletterData();
  }, [userProfile]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 w-full" /> {/* Greeting */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-48 w-full" /> {/* Weather */}
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
        <AlertDescription>We are having trouble loading your personalized content. Please ensure your profile is complete and try again.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <GreetingSection greetingWithName={newsletterData.greeting} />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <WeatherSection 
          location={userProfile.location} 
          weatherString={newsletterData.weather} // This will be the AI-formatted string
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
