import type { 
  NewsSearchCategory, 
  LongRunDay, 
  UserProfile, 
  RunningLevel, 
  TrainingPlan, 
  WeatherUnit, 
  NewsletterDelivery 
} from "./types";

export const RUNNING_LEVELS = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

export const TRAINING_PLANS = [
  { value: "5k", label: "5K Race Plan", durationWeeks: 8 },
  { value: "10k", label: "10K Race Plan", durationWeeks: 10 },
  { value: "half-marathon", label: "Half Marathon Plan", durationWeeks: 12 },
  { value: "marathon", label: "Marathon Plan", durationWeeks: 16 },
  { value: "ultra", label: "Ultra Marathon (50k+) Plan", durationWeeks: 20 },
];

export const WEATHER_UNITS = [
  { value: "F", label: "Fahrenheit (°F)" },
  { value: "C", label: "Celsius (°C)" },
];

export const NEWSLETTER_DELIVERY_OPTIONS = [
  { value: "email", label: "Email" },
  { value: "hangouts", label: "Google Hangout Alert" },
];

export const NEWS_SEARCH_CATEGORIES: { value: NewsSearchCategory; label: string }[] = [
  { value: "geographic_area", label: "News in my Area" },
  { value: "track_road_trail", label: "Track/Road/Trail News" },
  { value: "running_tech", label: "Running Tech" },
  { value: "running_apparel", label: "Running Apparel" },
  { value: "marathon_majors", label: "Marathon Majors" },
  { value: "nutrition", label: "Nutrition & Hydration" },
  { value: "training", label: "Training Tips & Strategies" },
];

export const RUNNING_DAYS_OPTIONS: { value: number; label: string }[] = [
  { value: 3, label: "3 days / week" },
  { value: 4, label: "4 days / week" },
  { value: 5, label: "5 days / week" },
  { value: 6, label: "6 days / week" },
  { value: 7, label: "7 days / week (Advanced)" },
];

export const LONG_RUN_DAY_OPTIONS: { value: LongRunDay; label: string }[] = [
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
  // Add other days if desired, e.g., Friday
  // { value: "friday", label: "Friday" },
];

export const DEFAULT_USER_PROFILE: UserProfile = {
  id: '',
  name: '',
  location: '',
  runningLevel: "beginner" as RunningLevel,
  trainingPlan: "5k" as TrainingPlan,
  planStartDate: undefined,
  raceDate: undefined,
  weatherUnit: "F" as WeatherUnit,
  newsletterDelivery: "email" as NewsletterDelivery,
  newsSearchPreferences: [] as NewsSearchCategory[],
  runningDaysPerWeek: 5,
  longRunDay: "saturday" as LongRunDay,
};

// For AI flow, structure for news article input (from Google Search tool)
export type NewsArticleFromTool = {
  title: string;
  link: string;
  snippet: string; // Snippet from Google Search
};
