
// src/services/weatherService.ts
'use server';

import type { DailyForecastData, HourlyWeatherData } from '@/lib/types';
import axios from 'axios';
import { format, fromUnixTime, startOfDay } from 'date-fns'; // Removed isToday, parseISO as they are not used

const OPENWEATHERMAP_API_URL = 'https://api.openweathermap.org/data/2.5/forecast';

function convertToUserUnit(value: number, unit: 'metric' | 'imperial', type: 'speed' | 'temp'): number {
  if (type === 'speed' && unit === 'metric') { // API gives m/s, convert to km/h
    return parseFloat((value * 3.6).toFixed(1));
  }
  // Temps are already in user's unit by API if units param is set. Speed is mph for imperial.
  return parseFloat(value.toFixed(1));
}

function formatTime(unixTimestamp: number, timezoneOffsetSeconds: number): string {
  // Apply timezone offset before formatting
  const dateInLocationTimezone = fromUnixTime(unixTimestamp + timezoneOffsetSeconds);
  return format(dateInLocationTimezone, 'h:mm a'); // e.g., 6:00 AM
}

function formatDate(date: Date): string {
  // Date is already in location's timezone (passed as displayDate)
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
        'User-Agent': 'ShutUpAndRunApp/1.0', // Good practice to set a User-Agent
      },
    });

    const rawData = response.data;
    if (!rawData || !rawData.list || rawData.list.length === 0 || !rawData.city) {
      return { error: `Could not retrieve detailed forecast for "${location}". The weather service returned incomplete or no data.` };
    }
    
    const timezoneOffsetSeconds = rawData.city.timezone;
    // Determine "today" in the location's timezone
    const nowInUTC = new Date();
    const todayInLocationTimezone = startOfDay(new Date(nowInUTC.getTime() + timezoneOffsetSeconds * 1000));

    // Filter for forecasts that fall on "today" in the location's timezone
    const todaysForecastsRaw = rawData.list.filter((item: any) => {
        const itemDateInLocationTime = startOfDay(fromUnixTime(item.dt + timezoneOffsetSeconds));
        return itemDateInLocationTime.getTime() === todayInLocationTimezone.getTime();
    });

    let forecastToProcess: any[];
    let dateToDisplay: Date;

    if (todaysForecastsRaw.length > 0) {
        forecastToProcess = todaysForecastsRaw;
        dateToDisplay = todayInLocationTimezone;
    } else {
        // No forecast items for "today", try the first available day in the rawData.list
        const firstAvailableSlot = rawData.list[0]; // rawData.list is guaranteed to be non-empty here
        
        // Determine the date for this first available slot in the location's timezone
        const firstSlotDateInLocationTimezone = startOfDay(fromUnixTime(firstAvailableSlot.dt + timezoneOffsetSeconds));
        
        // Filter all items from rawData.list that fall on this firstSlotDate
        const firstDayForecastsRaw = rawData.list.filter((item: any) => {
            const itemDateInLocationTime = startOfDay(fromUnixTime(item.dt + timezoneOffsetSeconds));
            return itemDateInLocationTime.getTime() === firstSlotDateInLocationTimezone.getTime();
        });

        if (firstDayForecastsRaw.length === 0) {
            // This should be rare if rawData.list[0] exists and is processed correctly
            return { error: `No usable forecast data found for "${location}" for the immediate future. The returned data might be for a past date or too far in the future.` };
        }
        forecastToProcess = firstDayForecastsRaw;
        dateToDisplay = firstSlotDateInLocationTimezone;
    }

    return processForecastList(forecastToProcess, rawData, unit, location, timezoneOffsetSeconds, dateToDisplay);

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
  forecastList: any[], // This list is now guaranteed to be for a single specific day
  rawData: any, 
  unit: 'metric' | 'imperial', 
  location: string, // Though rawData.city.name is preferred for display
  timezoneOffsetSeconds: number,
  displayDate: Date // The specific date (in location's timezone) these forecasts are for
): DailyForecastData {

  let tempMin = Infinity;
  let tempMax = -Infinity;
  let totalHumidity = 0;
  let totalWindSpeed = 0;
  let descriptions: Set<string> = new Set();

  // Ensure forecastList is not empty before processing
  if (forecastList.length === 0) {
      // This case should ideally be prevented by the caller, but as a safeguard:
      return {
        locationName: rawData.city.name || location,
        date: formatDate(displayDate),
        overallDescription: "No specific forecast details available for this day.",
        tempMin: 0,
        tempMax: 0,
        sunrise: formatTime(rawData.city.sunrise, timezoneOffsetSeconds),
        sunset: formatTime(rawData.city.sunset, timezoneOffsetSeconds),
        humidityAvg: 0,
        windAvg: 0,
        hourly: [],
        error: "No hourly data found for the selected day." // Add an error to the object itself
      };
  }

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
    date: formatDate(displayDate), // Use the date passed in, which is already in location's timezone
    overallDescription: overallDescriptionText,
    tempMin: tempMin === Infinity ? 0 : tempMin,
    tempMax: tempMax === -Infinity ? 0 : tempMax,
    sunrise: formatTime(rawData.city.sunrise, timezoneOffsetSeconds),
    sunset: formatTime(rawData.city.sunset, timezoneOffsetSeconds),
    humidityAvg: forecastList.length > 0 ? Math.round(totalHumidity / forecastList.length) : 0,
    windAvg: forecastList.length > 0 ? convertToUserUnit(totalWindSpeed / forecastList.length, unit, 'speed') : 0,
    hourly: hourly,
  };
}

