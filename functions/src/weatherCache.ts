import * as functions from 'firebase-functions';
import { db } from './lib/firebase/admin';
import axios from 'axios';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const secretManager = new SecretManagerServiceClient();

async function getSecret(secretName: string): Promise<string> {
  const [version] = await secretManager.accessSecretVersion({
    name: `projects/shut-up-and-run/secrets/${secretName}/versions/latest`,
  });
  return version.payload?.data?.toString() || '';
}

interface WeatherData {
  locationName: string;
  date: string;
  overallDescription: string;
  tempMin: number;
  tempMax: number;
  sunrise: string;
  sunset: string;
  humidityAvg: number;
  windAvg: number;
  hourly: Array<{
    time: string;
    temp: number;
    feelsLike: number;
    description: string;
    pop: number;
    windSpeed: number;
    windGust?: number;
    icon: string;
  }>;
}

interface WeatherCacheData {
  weatherData: WeatherData;
  timestamp: FirebaseFirestore.Timestamp;
}

export async function fetchWeatherData(location: string, unit = 'imperial'): Promise<WeatherData> {
  console.log(`[WeatherCache] Fetching weather data for ${location} with unit ${unit}`);
  
  // Normalize location for cache key
  const normalizedLocation = location.toLowerCase().replace(/[\s,]+/g, '-');
  const cacheRef = db.collection('weatherCache').doc(`${normalizedLocation}_${unit}`);
  
  try {
    // Check cache first
    const cacheDoc = await cacheRef.get();
    
    if (cacheDoc.exists) {
      const cachedData = cacheDoc.data() as WeatherCacheData;
      const cacheTime = cachedData.timestamp.toDate();
      const now = new Date();
      // Cache is valid for 1 hour
      if (cacheTime && (now.getTime() - cacheTime.getTime() < 3600000)) {
        console.log(`[WeatherCache] Using cached data for ${location} (cached at ${cacheTime.toISOString()})`);
        return cachedData.weatherData;
      }
      console.log(`[WeatherCache] Cache expired for ${location}, fetching fresh data`);
    } else {
      console.log(`[WeatherCache] No cache found for ${location}, fetching fresh data`);
    }

    // Get API key from Secret Manager
    const apiKey = await getSecret('OPENWEATHERMAP_API_KEY');
    if (!apiKey) {
      throw new Error('OpenWeatherMap API key not found in Secret Manager');
    }

    // Fetch new data from OpenWeatherMap
    console.log(`[WeatherCache] Fetching from OpenWeatherMap API for ${location}`);
    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/forecast?q=${location}&units=${unit}&appid=${apiKey}`
    );

    if (!response.data || !response.data.list || !response.data.city) {
      throw new Error('Invalid response from OpenWeatherMap API');
    }

    const weatherData: WeatherData = {
      locationName: response.data.city.name,
      date: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
      overallDescription: response.data.list[0].weather[0].description,
      tempMin: Math.min(...response.data.list.map((item: any) => item.main.temp_min)),
      tempMax: Math.max(...response.data.list.map((item: any) => item.main.temp_max)),
      sunrise: new Date(response.data.city.sunrise * 1000).toLocaleTimeString(),
      sunset: new Date(response.data.city.sunset * 1000).toLocaleTimeString(),
      humidityAvg: response.data.list.reduce((acc: number, item: any) => acc + item.main.humidity, 0) / response.data.list.length,
      windAvg: response.data.list.reduce((acc: number, item: any) => acc + item.wind.speed, 0) / response.data.list.length,
      hourly: response.data.list.slice(0, 8).map((item: any) => ({
        time: new Date(item.dt * 1000).toLocaleTimeString(),
        temp: Math.round(item.main.temp),
        feelsLike: Math.round(item.main.feels_like),
        description: item.weather[0].description,
        pop: Math.round(item.pop * 100),
        windSpeed: item.wind.speed,
        windGust: item.wind.gust,
        icon: item.weather[0].icon
      }))
    };

    // Update cache in Firestore
    console.log(`[WeatherCache] Updating Firestore cache for ${location}`);
    await cacheRef.set({
      weatherData,
      timestamp: new Date()
    });

    return weatherData;
  } catch (error: any) {
    console.error(`[WeatherCache] Error fetching weather data for ${location}:`, error);
    throw new functions.https.HttpsError('internal', `Failed to fetch weather data: ${error.message}`);
  }
}

export const getWeatherData = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { location, unit = 'imperial' } = data;
  if (!location) {
    throw new functions.https.HttpsError('invalid-argument', 'Location is required');
  }

  try {
    return await fetchWeatherData(location, unit);
  } catch (error: any) {
    console.error(`[WeatherCache] Error in getWeatherData for ${location}:`, error);
    throw new functions.https.HttpsError('internal', `Failed to get weather data: ${error.message}`);
  }
}); 