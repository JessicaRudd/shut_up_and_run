// src/services/weatherService.ts

import type { DailyForecastData, HourlyWeatherData } from '@/lib/types';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { format, fromUnixTime, startOfDay, parseISO as dateFnsParseISO } from 'date-fns';
import { WeatherData } from '@/types/weather';

const CACHE_PREFIX = 'weatherCache_';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

const isClient = typeof window !== 'undefined';

// Helper to get cache key: uses location, unit, and a specific date.
const getCacheKey = (loc: string, unitType: string, date: Date): string => {
  const dateStr = format(date, 'yyyy-MM-dd');
  // Normalize location for cache key: lowercase and replace spaces/commas
  const normalizedLocation = loc.toLowerCase().replace(/[\s,]+/g, '-');
  return `${CACHE_PREFIX}${normalizedLocation}_${dateStr}_${unitType}`;
};

// Helper to safely access localStorage
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (!isClient) return null;
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn('[WeatherService] Could not access localStorage:', error);
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    if (!isClient) return;
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.warn('[WeatherService] Could not write to localStorage:', error);
    }
  }
};

function convertToUserUnit(value: number, unit: 'metric' | 'imperial', type: 'speed' | 'temp'): number {
  if (type === 'speed' && unit === 'metric') { // API gives m/s, convert to km/h
    return parseFloat((value * 3.6).toFixed(1));
  }
  return parseFloat(value.toFixed(1));
}

function formatTime(unixTimestamp: number, timezoneOffsetSeconds: number): string {
  const dateInLocationTimezone = fromUnixTime(unixTimestamp + timezoneOffsetSeconds);
  return format(dateInLocationTimezone, 'h:mm a');
}

function formatDate(date: Date): string {
  return format(date, "EEEE, MMMM do");
}

export async function getWeatherByLocation(location: string, unit: 'metric' | 'imperial' = 'imperial'): Promise<WeatherData> {
  if (!location) {
    throw new Error('Location is required');
  }

  try {
    // Initialize Firebase Functions
    const functions = getFunctions();
    const getWeatherData = httpsCallable<{ location: string; unit: string }, WeatherData>(functions, 'weather-getData');

    // Call the Cloud Function
    const result = await getWeatherData({ location, unit });
    
    // Only use localStorage for client-side caching if we're in the browser
    if (isClient) {
      safeLocalStorage.setItem(`weather_${location}_${unit}`, JSON.stringify({
        data: result.data,
        timestamp: Date.now(),
      }));
    }

    return result.data;
  } catch (error) {
    console.error('[WeatherService] Error fetching weather data:', error);
    throw error;
  }
}

function processForecastList(
  forecastList: any[], 
  rawData: any, 
  unit: 'metric' | 'imperial', 
  locationInput: string,
  timezoneOffsetSeconds: number,
  displayDate: Date // This is actualForecastDateForData
): DailyForecastData {

  if (forecastList.length === 0) {
      return {
        locationName: rawData.city.name || locationInput,
        date: formatDate(displayDate), // Use the determined actual date of forecast
        overallDescription: "No specific forecast details available for this day.",
        tempMin: 0, tempMax: 0,
        sunrise: formatTime(rawData.city.sunrise, timezoneOffsetSeconds),
        sunset: formatTime(rawData.city.sunset, timezoneOffsetSeconds),
        humidityAvg: 0, windAvg: 0,
        hourly: [],
        error: "No hourly data found for the selected day."
      };
  }

  let tempMin = Infinity;
  let tempMax = -Infinity;
  let totalHumidity = 0;
  let totalWindSpeed = 0;
  let descriptions: Set<string> = new Set();

  const hourly: HourlyWeatherData[] = forecastList.map((item: any) => {
    const temp = Math.round(item.main.temp);
    if (temp < tempMin) tempMin = temp;
    if (temp > tempMax) tempMax = temp;
    totalHumidity += item.main.humidity;
    totalWindSpeed += item.wind.speed;
    descriptions.add(item.weather[0].description);

    return {
      time: formatTime(item.dt, timezoneOffsetSeconds),
      temp: temp,
      feelsLike: Math.round(item.main.feels_like),
      description: item.weather[0].description.charAt(0).toUpperCase() + item.weather[0].description.slice(1),
      pop: Math.round(item.pop * 100),
      windSpeed: convertToUserUnit(item.wind.speed, unit, 'speed'),
      windGust: item.wind.gust ? convertToUserUnit(item.wind.gust, unit, 'speed') : undefined,
      icon: item.weather[0].icon,
    };
  });
  
  const uniqueDescriptions = Array.from(descriptions);
  let overallDescriptionText = "Varied conditions.";
  if (uniqueDescriptions.length === 1) {
    overallDescriptionText = uniqueDescriptions[0].charAt(0).toUpperCase() + uniqueDescriptions[0].slice(1) + ".";
  } else if (uniqueDescriptions.length > 1) {
    overallDescriptionText = uniqueDescriptions.join(', ').replace(/,([^,]*)$/, ' and$1');
    overallDescriptionText = overallDescriptionText.charAt(0).toUpperCase() + overallDescriptionText.slice(1) + ".";
  }

  return {
    locationName: rawData.city.name,
    date: formatDate(displayDate), // Use the determined actual date of forecast
    overallDescription: overallDescriptionText,
    tempMin: tempMin === Infinity ? 0 : tempMin,
    tempMax: tempMax === -Infinity ? 0 : tempMax,
    sunrise: formatTime(rawData.city.sunrise, timezoneOffsetSeconds),
    sunset: formatTime(rawData.city.sunset, timezoneOffsetSeconds),
    humidityAvg: forecastList.length > 0 ? Math.round(totalHumidity / forecastList.length) : 0,
    windAvg: forecastList.length > 0 ? convertToUserUnit(totalWindSpeed / forecastList.length, unit, 'speed') : 0,
    hourly: hourly,
    // No top-level `error` field here; internal errors go into DailyForecastData.error if necessary
  };
}

    