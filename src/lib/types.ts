export type RunningLevel = "beginner" | "intermediate" | "advanced";
export type TrainingPlan = "5k" | "10k" | "half-marathon" | "marathon" | "ultra";
export type WeatherUnit = "C" | "F";
export type NewsletterDelivery = "email" | "hangouts";

export type NewsSearchCategory = 
  | "geographic_area" 
  | "track_road_trail" 
  | "running_tech" 
  | "running_apparel" 
  | "marathon_majors" 
  | "nutrition" 
  | "training";

export type LongRunDay = "saturday" | "sunday" | ""; // Add more if needed

export interface UserProfile {
  id: string;
  name: string;
  location: string; // e.g., "New York"
  runningLevel: RunningLevel;
  trainingPlan: TrainingPlan;
  planStartDate?: string; // ISO date string, e.g., "2024-07-28".
  raceDate?: string; // ISO date string, e.g., "2024-10-20"
  weatherUnit: WeatherUnit;
  newsletterDelivery: NewsletterDelivery;
  newsSearchPreferences?: NewsSearchCategory[];
  runningDaysPerWeek?: number; // e.g., 3, 4, 5, 6, 7
  longRunDay?: LongRunDay; // e.g., "saturday", "sunday"
}

// New types for structured weather forecast
export interface HourlyWeatherData {
  time: string; // e.g., "9:00 AM" (local time)
  temp: number;
  feelsLike: number;
  description: string;
  pop: number; // Probability of precipitation (0-1, will be converted to 0-100 for AI)
  windSpeed: number; // Already in user's preferred unit system (km/h or mph)
  windGust?: number;
  icon: string; // Weather icon code from OpenWeatherMap
}

export interface DailyForecastData {
  locationName: string; // e.g. "London"
  date: string; // e.g. "Tuesday, July 30th" (local date)
  overallDescription: string; // e.g. "Cloudy with periods of rain, clearing later."
  tempMin: number;
  tempMax: number;
  sunrise: string; // e.g. "6:00 AM" (local time)
  sunset: string; // e.g. "8:30 PM" (local time)
  humidityAvg: number; // Average humidity for the day
  windAvg: number; // Average wind speed for the day
  hourly: HourlyWeatherData[];
  error?: string; // Optional error message if fetching failed
}

export interface DatedWorkout {
  date: Date;
  workout: string;
  dayOfPlan: number;
  weekOfPlan: number;
  isRestDay: boolean;
  isRaceDay?: boolean; // Added for race day identification
}
