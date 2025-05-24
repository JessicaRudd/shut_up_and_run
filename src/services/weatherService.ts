
// src/services/weatherService.ts
'use server';

import type { DailyForecastData, HourlyWeatherData } from '@/lib/types';
import axios from 'axios';
import { format, fromUnixTime, startOfDay, parseISO as dateFnsParseISO } from 'date-fns';

const OPENWEATHERMAP_API_URL = 'https://api.openweathermap.org/data/2.5/forecast';
const CACHE_PREFIX = 'weatherCache_';

// Helper to get cache key: uses location, unit, and a specific date.
const getCacheKey = (loc: string, unitType: string, date: Date): string => {
  const dateStr = format(date, 'yyyy-MM-dd');
  // Normalize location for cache key: lowercase and replace spaces/commas
  const normalizedLocation = loc.toLowerCase().replace(/[\s,]+/g, '-');
  return `${CACHE_PREFIX}${normalizedLocation}_${dateStr}_${unitType}`;
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

export async function getWeatherByLocation(location: string, unit: 'metric' | 'imperial'): Promise<DailyForecastData | { error: string }> {
  const apiKey = process.env.OPENWEATHERMAP_API_KEY;

  if (!apiKey) {
    console.error('OpenWeatherMap API key is not set in .env file.');
    return { error: 'Weather service is currently unavailable (API key missing). Please configure the API key.' };
  }
  if (!location) {
    return { error: 'Location not provided for weather lookup.' };
  }

  const usersCurrentDate = startOfDay(new Date()); // User's current local "today"
  const cacheKeyForTodaysRequest = getCacheKey(location, unit, usersCurrentDate);

  try {
    const cachedDataJson = localStorage.getItem(cacheKeyForTodaysRequest);
    if (cachedDataJson) {
      const cachedData = JSON.parse(cachedDataJson) as DailyForecastData & { metadata_cache_date_str?: string } | { error: string, metadata_cache_date_str?: string };
      
      // Validate cache based on stored metadata_cache_date_str
      if (cachedData.metadata_cache_date_str) {
        if (cachedData.metadata_cache_date_str !== format(usersCurrentDate, 'yyyy-MM-dd')) {
          console.log(`[WeatherService] Cache stale for ${cacheKeyForTodaysRequest}: Stored data is for a different date (${cachedData.metadata_cache_date_str}). Fetching fresh data.`);
          localStorage.removeItem(cacheKeyForTodaysRequest); // Remove stale entry for today's key
          // Proceed to fetch
        } else if (('locationName' in cachedData && cachedData.locationName && cachedData.locationName.toLowerCase() === location.toLowerCase()) || 'error' in cachedData) {
            console.log(`[WeatherService] Cache hit for ${cacheKeyForTodaysRequest} (metadata validated).`);
            // Remove metadata before returning if it's not part of the core type
            const { metadata_cache_date_str, ...returnData } = cachedData;
            return returnData as DailyForecastData | { error: string };
        } else {
            // Should not happen if metadata_cache_date_str matches today but location doesn't
            console.log(`[WeatherService] Cache invalidated for ${cacheKeyForTodaysRequest} due to location mismatch despite matching date.`);
            localStorage.removeItem(cacheKeyForTodaysRequest);
        }
      } else {
        // No metadata, treat as a miss or old format
        console.log(`[WeatherService] Cache miss for ${cacheKeyForTodaysRequest}: metadata_cache_date_str missing. Fetching fresh data.`);
        localStorage.removeItem(cacheKeyForTodaysRequest); // Optionally remove old format cache
      }
    } else {
      console.log(`[WeatherService] Cache miss for ${cacheKeyForTodaysRequest}`);
    }
  } catch (e) {
    console.error('[WeatherService] Error reading from localStorage:', e);
  }

  try {
    console.log(`[WeatherService] Fetching new data for ${location}, Unit: ${unit}`);
    const response = await axios.get(OPENWEATHERMAP_API_URL, {
      params: { q: location, units: unit, appid: apiKey },
      headers: { 'User-Agent': 'ShutUpAndRunApp/1.0' },
    });

    const rawData = response.data;
    if (!rawData || !rawData.list || rawData.list.length === 0 || !rawData.city) {
      const errorResult = { error: `Could not retrieve detailed forecast for "${location}". The weather service returned incomplete or no data.` };
      try {
        const errorToCache = { ...errorResult, metadata_cache_date_str: format(usersCurrentDate, 'yyyy-MM-dd') };
        localStorage.setItem(cacheKeyForTodaysRequest, JSON.stringify(errorToCache));
        console.log(`[WeatherService] Incomplete data error cached with key: ${cacheKeyForTodaysRequest}`);
      } catch (e) { console.error('[WeatherService] Error writing incomplete data error to localStorage:', e); }
      return errorResult;
    }
    
    const timezoneOffsetSeconds = rawData.city.timezone;
    const nowInUTC = new Date();
    const todayAtLocation = startOfDay(new Date(nowInUTC.getTime() + (timezoneOffsetSeconds * 1000)));

    const todaysForecastsRaw = rawData.list.filter((item: any) => {
        const itemDateAtLocation = startOfDay(fromUnixTime(item.dt + timezoneOffsetSeconds));
        return itemDateAtLocation.getTime() === todayAtLocation.getTime();
    });

    let forecastToProcess: any[];
    let actualForecastDateForData: Date; 

    if (todaysForecastsRaw.length > 0) {
        forecastToProcess = todaysForecastsRaw;
        actualForecastDateForData = todayAtLocation;
    } else {
        const firstAvailableSlot = rawData.list[0];
        const firstSlotDateAtLocation = startOfDay(fromUnixTime(firstAvailableSlot.dt + timezoneOffsetSeconds));
        
        const firstDayForecastsRaw = rawData.list.filter((item: any) => {
            const itemDateAtLocation = startOfDay(fromUnixTime(item.dt + timezoneOffsetSeconds));
            return itemDateAtLocation.getTime() === firstSlotDateAtLocation.getTime();
        });

        if (firstDayForecastsRaw.length === 0) {
            const errorResult = { error: `No usable forecast data found for "${location}" for the immediate future.` };
             try {
                const errorToCache = { ...errorResult, metadata_cache_date_str: format(usersCurrentDate, 'yyyy-MM-dd') };
                localStorage.setItem(cacheKeyForTodaysRequest, JSON.stringify(errorToCache));
                console.log(`[WeatherService] No usable data error cached with key: ${cacheKeyForTodaysRequest}`);
            } catch (e) { console.error('[WeatherService] Error writing no usable data error to localStorage:', e); }
            return errorResult;
        }
        forecastToProcess = firstDayForecastsRaw;
        actualForecastDateForData = firstSlotDateAtLocation;
    }
    
    const processedResult = processForecastList(forecastToProcess, rawData, unit, location, timezoneOffsetSeconds, actualForecastDateForData);
    
    // Key for storing the fetched data must use the date the data pertains to.
    const keyForStoringActualData = getCacheKey(location, unit, actualForecastDateForData);
    
    try {
      const dataToCache = { ...processedResult, metadata_cache_date_str: format(actualForecastDateForData, 'yyyy-MM-dd') };
      localStorage.setItem(keyForStoringActualData, JSON.stringify(dataToCache));
      console.log(`[WeatherService] Data cached with key: ${keyForStoringActualData}`);
    } catch (e) {
      console.error('[WeatherService] Error writing processed data to localStorage:', e);
    }
    return processedResult;

  } catch (error: any) {
    console.error(`Error fetching forecast for "${location}":`, error.response?.data?.message || error.message);
    let errorDetail = 'Unknown error';
    if (error.response) {
      if (error.response.status === 401) errorDetail = 'Weather service authentication failed. Check API key.';
      else if (error.response.status === 404) errorDetail = `Could not find weather for "${location}". Check location name.`;
      else if (error.response.status === 429) errorDetail = 'Weather service rate limit exceeded. Try later.';
      else errorDetail = `Weather service error: ${error.response.data?.message || 'Service error'}.`;
    } else {
      errorDetail = `Network or unknown issue fetching weather for "${location}".`;
    }
    const errorResult = { error: errorDetail };
    try {
        const errorToCache = { ...errorResult, metadata_cache_date_str: format(usersCurrentDate, 'yyyy-MM-dd') };
        localStorage.setItem(cacheKeyForTodaysRequest, JSON.stringify(errorToCache));
        console.log(`[WeatherService] API error cached with key: ${cacheKeyForTodaysRequest}`);
    } catch (e) { console.error('[WeatherService] Error writing API error to localStorage:', e); }
    return errorResult;
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

    