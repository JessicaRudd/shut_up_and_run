"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sun, Cloud, Zap } from "lucide-react"; // Using Zap as a generic "AI processed" weather icon

interface WeatherSectionProps {
  location: string;
  weatherString: string | null; // Weather description from AI
}

// Basic icon based on keywords in the weather string
const getWeatherIcon = (weatherString: string | null) => {
  if (!weatherString) return <Cloud className="mr-2 h-6 w-6 text-gray-400" />;
  const lowerCondition = weatherString.toLowerCase();
  if (lowerCondition.includes("sun") || lowerCondition.includes("clear")) return <Sun className="mr-2 h-6 w-6 text-yellow-500" />;
  if (lowerCondition.includes("cloud")) return <Cloud className="mr-2 h-6 w-6 text-sky-500" />;
  if (lowerCondition.includes("rain") || lowerCondition.includes("drizzle")) return <Zap className="mr-2 h-6 w-6 text-blue-500" />; // Using Zap to represent general weather from AI
  if (lowerCondition.includes("snow")) return <Zap className="mr-2 h-6 w-6 text-blue-300" />;
  return <Zap className="mr-2 h-6 w-6 text-gray-500" />; // Default AI weather icon
};


export function WeatherSection({ location, weatherString }: WeatherSectionProps) {
  if (!location) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center text-xl font-semibold">
            <Sun className="mr-2 h-6 w-6 text-yellow-400" />
            Local Weather
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Please set your location in the profile to see local weather.</p>
        </CardContent>
      </Card>
    );
  }
  
  if (!weatherString) {
     return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center text-xl font-semibold">
             {getWeatherIcon(null)}
            Weather in {location}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Weather information is currently unavailable.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center text-xl font-semibold">
          {getWeatherIcon(weatherString)}
          Weather in {location}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-lg">{weatherString}</p>
        <p className="text-xs text-muted-foreground italic mt-2">Weather summary powered by AI.</p>
      </CardContent>
    </Card>
  );
}
