"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sun, CloudSun, CloudRain, CloudSnow, Wind, CloudDrizzle } from "lucide-react";
import { useEffect, useState } from "react";

interface WeatherSectionProps {
  location: string;
}

// Simple mock weather data
const mockWeatherData = {
  temperature: "18°C",
  condition: "Partly Cloudy",
  humidity: "60%",
  wind: "10 km/h",
  forecast: "Clear skies expected tonight.",
};

// Helper to pick an icon based on condition (very simplified)
const getWeatherIcon = (condition: string) => {
  const lowerCondition = condition.toLowerCase();
  if (lowerCondition.includes("sunny") || lowerCondition.includes("clear")) return <Sun className="mr-2 h-6 w-6 text-yellow-500" />;
  if (lowerCondition.includes("partly cloudy")) return <CloudSun className="mr-2 h-6 w-6 text-sky-500" />;
  if (lowerCondition.includes("cloudy")) return <CloudSun className="mr-2 h-6 w-6 text-gray-500" />; // Using CloudSun for general cloudy
  if (lowerCondition.includes("rain")) return <CloudRain className="mr-2 h-6 w-6 text-blue-500" />;
  if (lowerCondition.includes("drizzle")) return <CloudDrizzle className="mr-2 h-6 w-6 text-blue-400" />;
  if (lowerCondition.includes("snow")) return <CloudSnow className="mr-2 h-6 w-6 text-white" />;
  if (lowerCondition.includes("wind")) return <Wind className="mr-2 h-6 w-6 text-gray-400" />;
  return <Sun className="mr-2 h-6 w-6 text-yellow-500" />; // Default
};

export function WeatherSection({ location }: WeatherSectionProps) {
  // In a real app, you'd fetch weather data here using an API based on `location`
  // For now, we use mock data.
  const [weather, setWeather] = useState(mockWeatherData);
  const [currentLocation, setCurrentLocation] = useState("your area");

  useEffect(() => {
    if (location) {
      setCurrentLocation(location);
      // Here you would typically fetch new weather data if the location changes.
      // For this mock, we'll just update the location string.
      // setWeather(fetchNewWeatherData(location));
    }
  }, [location]);


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

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center text-xl font-semibold">
          {getWeatherIcon(weather.condition)}
          Weather in {currentLocation}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-3xl font-bold">{weather.temperature}</p>
        <p className="text-lg text-muted-foreground">{weather.condition}</p>
        <div className="text-sm space-y-1">
          <p>Humidity: {weather.humidity}</p>
          <p>Wind: {weather.wind}</p>
        </div>
        <p className="text-sm italic mt-2">{weather.forecast}</p>
      </CardContent>
    </Card>
  );
}
