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

export const DEFAULT_USER_PROFILE = {
  id: '',
  name: '',
  location: '',
  runningLevel: '',
  trainingPlan: '',
  planStartDate: undefined,
};
