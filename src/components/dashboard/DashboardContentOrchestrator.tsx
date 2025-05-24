
"use client";

import { useEffect, useState } from "react";
import type { UserProfile, DailyForecastData } from "@/lib/types";
import { customizeNewsletter, type CustomizeNewsletterOutput, type CustomizeNewsletterInput } from "@/ai/flows/customize-newsletter-content";
// import { mockArticles } from "@/lib/mockNews"; // Remove mock articles
import { getTodaysWorkout } from "@/lib/workoutUtils";
import { getWeatherByLocation } from "@/services/weatherService"; 
import { fetchAndParseRSSFeeds } from "@/services/newsService"; // Import new news service
import { RSS_FEED_URLS, type NewsArticleAIInput } from "@/lib/constants"; // Import RSS_FEED_URLS

import { GreetingSection } from "./GreetingSection";
import { WeatherSection } from "./WeatherSection";
import { WorkoutSection } from "./WorkoutSection";
import { NewsSection } from "./NewsSection";
import { DressMyRunSection } from "./DressMyRunSection";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { TRAINING_PLANS } from "@/lib/constants";

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
          setWeatherErrorForAI(weatherResult.error); 
        } else {
          weatherInputForAI = weatherResult as DailyForecastData;
          if (weatherResult.error) {
            console.warn("Weather data processed with an internal error:", weatherResult.error);
            setWeatherErrorForAI(weatherResult.error);
          }
        }

        // Fetch real news articles
        let fetchedArticles: NewsArticleAIInput[] = [];
        try {
          fetchedArticles = await fetchAndParseRSSFeeds(RSS_FEED_URLS);
          if (fetchedArticles.length === 0) {
            console.warn("No articles fetched from RSS feeds. AI will receive empty news list.");
          }
        } catch (newsError: any) {
          console.error("Error fetching news articles:", newsError);
          // Proceed with empty articles list, AI flow should handle this
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


        const input: CustomizeNewsletterInput = {
          userName: userProfile.name,
          location: userProfile.location,
          runningLevel: userProfile.runningLevel || "beginner",
          trainingPlanType: userProfile.trainingPlan || "5k",
          raceDistance: derivedRaceDistance,
          workout: todaysWorkout,
          newsStories: fetchedArticles, // Use fetched articles
          weather: weatherInputForAI,
          weatherUnit: userProfile.weatherUnit || "F", 
        };
        
        const result = await customizeNewsletter(input);
        setNewsletterData(result);
      } catch (err: any) {
        console.error("Error fetching personalized newsletter data, weather or news:", err);
        let errorMessage = "Could not load your personalized dashboard. ";
        if (err.message) {
          errorMessage += err.message;
        } else if (typeof err === 'string') {
          errorMessage += err;
        } else {
          errorMessage += "An unknown error occurred."
        }
        if (weatherErrorForAI && (err.message?.toLowerCase().includes('ai') || err.message?.toLowerCase().includes('flow'))) {
            setError(`Failed to process weather data: ${weatherErrorForAI}. Details: ${errorMessage}`);
        } else {
            setError(errorMessage);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchNewsletterData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile]);

  if (loading) {
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
  
  if (!newsletterData) {
     return (
      <Alert variant="default" className="mt-6">
        <AlertTriangle className="h-5 w-5" />
        <AlertTitle>Dashboard Content Unavailable</AlertTitle>
        <AlertDescription>
          We are having trouble generating your personalized content at the moment. This could be due to:
          <ul className="list-disc list-inside mt-2">
            <li>Your profile not being fully completed.</li>
            <li>Temporary issues with the weather or news services.</li>
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
      
      <DressMyRunSection suggestion={newsletterData.dressMyRunSuggestion} />
      
      <NewsSection topStories={newsletterData.topStories} />
    </div>
  );
}
