export type RunningLevel = "beginner" | "intermediate" | "advanced" | "";
export type TrainingPlan = "5k" | "10k" | "half-marathon" | "marathon" | "ultra" | "";
export type WeatherUnit = "C" | "F" | "";
export type NewsletterDelivery = "email" | "hangouts" | "";

export interface UserProfile {
  id: string;
  name: string;
  location: string; // e.g., "New York"
  runningLevel: RunningLevel;
  trainingPlan: TrainingPlan;
  raceDistance: string; // e.g., "50k", "100 miles"
  planStartDate?: string; // ISO date string, e.g., "2024-07-28"
  weatherUnit: WeatherUnit;
  newsletterDelivery: NewsletterDelivery;
}
