
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sun, Cloud, Zap, HelpCircle } from "lucide-react"; 

interface WeatherSectionProps {
  location: string;
  weatherString: string | null; // Weather description + recommendation from AI
}

// Basic icon based on keywords in the weather string. This is a very rough heuristic
// as the AI's output can be quite varied.
const getWeatherIcon = (weatherString: string | null) => {
  if (!weatherString) return <HelpCircle className="mr-2 h-6 w-6 text-gray-400" />;
  const lowerCondition = weatherString.toLowerCase();
  if (lowerCondition.includes("sun") || lowerCondition.includes("clear")) return <Sun className="mr-2 h-6 w-6 text-yellow-500" />;
  if (lowerCondition.includes("cloud")) return <Cloud className="mr-2 h-6 w-6 text-sky-500" />;
  if (lowerCondition.includes("rain") || lowerCondition.includes("drizzle") || lowerCondition.includes("shower")) return <Zap className="mr-2 h-6 w-6 text-blue-500" />;
  if (lowerCondition.includes("snow")) return <Zap className="mr-2 h-6 w-6 text-blue-300" />; // Using Zap as a general AI weather icon
  if (lowerCondition.includes("unavailable") || lowerCondition.includes("error")) return <HelpCircle className="mr-2 h-6 w-6 text-destructive" />;
  return <Zap className="mr-2 h-6 w-6 text-gray-500" />; // Default AI weather icon
};


export function WeatherSection({ location, weatherString }: WeatherSectionProps) {
  if (!location) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center text-xl font-semibold">
            <Sun className="mr-2 h-6 w-6 text-yellow-400" />
            Local Weather & Run Recommendation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Please set your location in the profile to see local weather and running recommendations.</p>
        </CardContent>
      </Card>
    );
  }
  
  const displayWeatherString = weatherString || "Weather information is currently being processed or is unavailable.";

  return (
    <Card className="shadow-md min-h-[200px]"> {/* Ensure a minimum height for consistency */}
      <CardHeader>
        <CardTitle className="flex items-center text-xl font-semibold">
          {getWeatherIcon(displayWeatherString)}
          Weather in {location}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Apply whitespace-pre-line to respect newlines in AI's output */}
        <p className="text-base whitespace-pre-line">{displayWeatherString}</p> 
        <p className="text-xs text-muted-foreground italic pt-2">
          Forecast details and running recommendation powered by AI using OpenWeatherMap data.
        </p>
      </CardContent>
    </Card>
  );
}
