export type RunningLevel = "beginner" | "intermediate" | "advanced" | "";
export type TrainingPlan = "5k" | "10k" | "half-marathon" | "marathon" | "ultra" | "";

export interface UserProfile {
  id: string;
  name: string;
  location: string; // e.g., "New York"
  runningLevel: RunningLevel;
  trainingPlan: TrainingPlan;
  planStartDate?: string; // ISO date string, e.g., "2024-07-28"
}
