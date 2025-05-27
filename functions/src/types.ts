export interface UserProfile {
  name: string;
  email: string;
  location: string;
  timezone?: string;
  runningLevel: 'beginner' | 'intermediate' | 'advanced';
  trainingPlanType: '5k' | '10k' | 'half' | 'marathon';
  raceDistance: string;
  planStartDate?: Date;
  raceDate?: Date;
  runningDaysPerWeek?: number;
  longRunDay?: string;
  weatherUnit?: 'C' | 'F';
  newsSearchPreferences?: string[];
  newsletterDelivery?: {
    email?: string;
    googleChat?: string;
  };
  trainingPlan?: {
    currentWorkout?: string;
    workouts?: any[]; // Define specific workout type if needed
  };
}

export interface WeatherData {
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

export interface NewsArticle {
  title: string;
  link: string;
  snippet: string;
}

export interface NewsletterContent {
  greeting: string;
  weather: string;
  workout: string;
  topStories: Array<{
    title: string;
    summary: string;
    url: string;
    priority: number;
  }>;
  planEndNotification?: string;
  dressMyRunSuggestion: Array<{
    item: string;
    category: string;
  }>;
} 