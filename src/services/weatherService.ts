// src/services/weatherService.ts
'use server';

import type { DailyForecastData, HourlyWeatherData } from '@/lib/types';
import axios from 'axios';
import { format, fromUnixTime,isToday, parseISO, startOfDay } from 'date-fns'; // For date manipulations

const OPENWEATHERMAP_API_URL = 'https://api.openweathermap.org/data/2.5/forecast';

function convertToUserUnit(value: number, unit: 'metric' | 'imperial', type: 'speed' | 'temp'): number {
  if (type === 'speed' && unit === 'metric') { // API gives m/s, convert to km/h
    return parseFloat((value * 3.6).toFixed(1));
  }
  // Temps are already in user's unit by API if units param is set. Speed is mph for imperial.
  return parseFloat(value.toFixed(1));
}

function formatTime(unixTimestamp: number, timezoneOffsetSeconds: number): string {
  const date = fromUnixTime(unixTimestamp + timezoneOffsetSeconds);
  return format(date, 'h:mm a'); // e.g., 6:00 AM
}

function formatDate(date: Date): string {
  return format(date, "EEEE, MMMM do"); // e.g. Tuesday, July 30th
}


/**
 * Fetches and processes a daily weather forecast from OpenWeatherMap API.
 * @param location The city name for which to fetch weather.
 * @param unit 'metric' for Celsius, 'imperial' for Fahrenheit.
 * @returns A DailyForecastData object or an object with an error message.
 */
export async function getWeatherByLocation(location: string, unit: 'metric' | 'imperial'): Promise<DailyForecastData | { error: string }> {
  const apiKey = process.env.OPENWEATHERMAP_API_KEY;

  if (!apiKey) {
    console.error('OpenWeatherMap API key is not set in .env file.');
    return { error: 'Weather service is currently unavailable (API key missing). Please configure the API key.' };
  }

  if (!location) {
    return { error: 'Location not provided for weather lookup.' };
  }

  try {
    const response = await axios.get(OPENWEATHERMAP_API_URL, {
      params: {
        q: location,
        units: unit,
        appid: apiKey,
      },
      headers: {
        'User-Agent': 'ShutUpAndRunApp/1.0',
      },
    });

    const rawData = response.data;
    if (!rawData || !rawData.list || !rawData.city) {
      return { error: `Could not retrieve detailed forecast for "${location}". The weather service returned incomplete data.` };
    }
    
    const timezoneOffsetSeconds = rawData.city.timezone;
    const today = startOfDay(new Date(new Date().getTime() + timezoneOffsetSeconds * 1000)); // Current date in location's timezone

    const todaysForecastsRaw = rawData.list.filter((item: any) => {
        // dt_txt is in UTC. We need to compare it to "today" in the location's timezone.
        // An easier way: convert dt (UTC timestamp) to location's date and check if it's today.
        const itemDateInLocationTime = startOfDay(fromUnixTime(item.dt + timezoneOffsetSeconds));
        return itemDateInLocationTime.getTime() === today.getTime();
    });

    if (todaysForecastsRaw.length === 0) {
      // This might happen if it's late in the day and the forecast only has tomorrow's data.
      // Or if the location is invalid and somehow passed previous checks.
      // For now, let's try to get the next available day's forecast if today is empty.
      // A more robust solution would be to analyze the API's full return.
      // For this iteration, we'll indicate data is for the earliest available slots.
       const firstAvailableSlot = rawData.list[0];
       if (!firstAvailableSlot) return {error: `No future forecast data available for "${location}".`};
       const firstSlotDate = startOfDay(fromUnixTime(firstAvailableSlot.dt + timezoneOffsetSeconds));
       
       const firstDayForecastsRaw = rawData.list.filter((item: any) => {
            const itemDateInLocationTime = startOfDay(fromUnixTime(item.dt + timezoneOffsetSeconds));
            return itemDateInLocationTime.getTime() === firstSlotDate.getTime();
       });

       if(firstDayForecastsRaw.length === 0) {
         return { error: `No forecast data available for "${location}" for the immediate future.`};
       }
       // Use firstDayForecastsRaw instead of todaysForecastsRaw
       return processForecastList(firstDayForecastsRaw, rawData, unit, location, timezoneOffsetSeconds, firstSlotDate);
    }

    return processForecastList(todaysForecastsRaw, rawData, unit, location, timezoneOffsetSeconds, today);

  } catch (error: any) {
    console.error(`Error fetching forecast for "${location}":`, error.response?.data?.message || error.message);
    if (error.response) {
      if (error.response.status === 401) {
        return { error: 'Weather service authentication failed. Please check if the API key is valid.' };
      }
      if (error.response.status === 404) {
        return { error: `Could not find weather information for "${location}". Please check the location name.` };
      }
      if (error.response.status === 429) {
        return { error: 'Weather service rate limit exceeded. Please try again later.' };
      }
      return { error: `Weather service error for "${location}": ${error.response.data?.message || 'Unknown error'}.` };
    }
    return { error: `Failed to fetch forecast for "${location}" due to a network or unknown issue. Please try again later.` };
  }
}

function processForecastList(
  forecastList: any[], 
  rawData: any, 
  unit: 'metric' | 'imperial', 
  location: string, 
  timezoneOffsetSeconds: number,
  displayDate: Date
): DailyForecastData {

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
    totalWindSpeed += item.wind.speed; // raw speed from API
    descriptions.add(item.weather[0].description);

    return {
      time: formatTime(item.dt, timezoneOffsetSeconds),
      temp: temp,
      feelsLike: Math.round(item.main.feels_like),
      description: item.weather[0].description.charAt(0).toUpperCase() + item.weather[0].description.slice(1),
      pop: Math.round(item.pop * 100), // Convert probability from 0-1 to 0-100
      windSpeed: convertToUserUnit(item.wind.speed, unit, 'speed'),
      windGust: item.wind.gust ? convertToUserUnit(item.wind.gust, unit, 'speed') : undefined,
      icon: item.weather[0].icon,
    };
  });
  
  const overallDescription = Array.from(descriptions).join(', ').replace(/,([^,]*)$/, ' and$1'); // "A, B and C"

  return {
    locationName: rawData.city.name,
    date: formatDate(displayDate),
    overallDescription: overallDescription.charAt(0).toUpperCase() + overallDescription.slice(1) + ".",
    tempMin: tempMin === Infinity ? 0 : tempMin, // handle case where no data
    tempMax: tempMax === -Infinity ? 0 : tempMax,
    sunrise: formatTime(rawData.city.sunrise, timezoneOffsetSeconds),
    sunset: formatTime(rawData.city.sunset, timezoneOffsetSeconds),
    humidityAvg: Math.round(totalHumidity / forecastList.length) || 0,
    windAvg: convertToUserUnit(totalWindSpeed / forecastList.length, unit, 'speed') || 0,
    hourly: hourly,
  };
}
