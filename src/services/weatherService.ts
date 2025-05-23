// src/services/weatherService.ts
'use server';

import axios from 'axios';

const OPENWEATHERMAP_API_URL = 'https://api.openweathermap.org/data/2.5/weather';

/**
 * Fetches weather data from OpenWeatherMap API.
 * @param location The city name for which to fetch weather.
 * @param unit 'metric' for Celsius, 'imperial' for Fahrenheit.
 * @returns A descriptive string of weather conditions or an error message.
 */
export async function getWeatherByLocation(location: string, unit: 'metric' | 'imperial'): Promise<string> {
  const apiKey = process.env.OPENWEATHERMAP_API_KEY;

  if (!apiKey) {
    console.error('OpenWeatherMap API key is not set in .env file.');
    return 'Weather service is currently unavailable (API key missing). Please configure the API key.';
  }

  if (!location) {
    return 'Location not provided for weather lookup.';
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

    const data = response.data;
    if (data && data.weather && data.main && data.wind) {
      const description = data.weather[0].description;
      const temp = Math.round(data.main.temp);
      const unitSymbol = unit === 'metric' ? '°C' : '°F';
      
      let windSpeed = data.wind.speed; // m/s for metric, mph for imperial by default from API
      let windUnitLabel = unit === 'metric' ? 'km/h' : 'mph';
      
      if (unit === 'metric') {
        windSpeed = (windSpeed * 3.6).toFixed(1); // Convert m/s to km/h
      } else {
        windSpeed = windSpeed.toFixed(1);
      }

      return `${description.charAt(0).toUpperCase() + description.slice(1)}, Temperature: ${temp}${unitSymbol}. Wind: ${windSpeed} ${windUnitLabel}. Humidity: ${data.main.humidity}%.`;
    } else {
      return `Could not retrieve detailed weather for "${location}". The weather service returned incomplete data.`;
    }
  } catch (error: any) {
    console.error(`Error fetching weather for "${location}":`, error.response?.data?.message || error.message);
    if (error.response) {
      if (error.response.status === 401) {
        return 'Weather service authentication failed. Please check if the API key is valid.';
      }
      if (error.response.status === 404) {
        return `Could not find weather information for "${location}". Please check the location name.`;
      }
      if (error.response.status === 429) {
        return 'Weather service rate limit exceeded. Please try again later.';
      }
      return `Weather service error for "${location}": ${error.response.data?.message || 'Unknown error'}.`;
    }
    return `Failed to fetch weather for "${location}" due to a network or unknown issue. Please try again later.`;
  }
}
