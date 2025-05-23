import type { UserProfile, DatedWorkout } from "@/lib/types";
import { TRAINING_PLANS } from "@/lib/constants";
import { addDays, differenceInCalendarDays, startOfDay } from "date-fns";

export const getWorkoutForDayOfPlan = (
  profile: UserProfile,
  dayOfPlan: number,
  weekOfPlan: number
): { workout: string; isRestDay: boolean } => {
  const planDetails = TRAINING_PLANS.find(p => p.value === profile.trainingPlan);
  const planName = planDetails ? planDetails.label : "your selected plan";

  if (!planDetails) {
    return { workout: "Training plan details not found.", isRestDay: false };
  }

  const dayOfWeekInPlanCycle = dayOfPlan % 7 === 0 ? 7 : dayOfPlan % 7; // 1-7, assuming plan starts on day 1

  let workout = "";
  let isRestDay = false;

  switch(dayOfWeekInPlanCycle) {
    case 1: // Typically Monday
      workout = `Week ${weekOfPlan}, Day ${dayOfPlan}: Rest day or light cross-training for your ${planName}. Focus on recovery.`;
      isRestDay = true;
      break;
    case 2: // Tuesday
      workout = `Week ${weekOfPlan}, Day ${dayOfPlan}: Easy run: 30-45 minutes at a conversational pace for your ${planName}.`;
      break;
    case 3: // Wednesday
      const intensity = profile.runningLevel === 'beginner' ? 'easy' : (profile.runningLevel === 'intermediate' ? 'moderate' : 'hard');
      workout = `Week ${weekOfPlan}, Day ${dayOfPlan}: Interval training: e.g., 6x400m at ${intensity} pace for your ${planName}. Warm up and cool down properly.`;
      break;
    case 4: // Thursday
      workout = `Week ${weekOfPlan}, Day ${dayOfPlan}: Easy to moderate run: 35-50 minutes for your ${planName}.`;
      break;
    case 5: // Friday
      workout = `Week ${weekOfPlan}, Day ${dayOfPlan}: Tempo run: 20 minutes at a comfortably hard pace, or cross-training (e.g., cycling, swimming) for your ${planName}.`;
      break;
    case 6: // Saturday
      const longRunBase = profile.runningLevel === 'beginner' ? 30 : (profile.runningLevel === 'intermediate' ? 45 : 60);
      const longRunIncrement = profile.runningLevel === 'beginner' ? 5 : (profile.runningLevel === 'intermediate' ? 10 : 15);
      const longRunDuration = longRunBase + (weekOfPlan * longRunIncrement);
      workout = `Week ${weekOfPlan}, Day ${dayOfPlan}: Long run: ${Math.min(longRunDuration, 180)} minutes at an easy, sustainable pace for your ${planName}.`; // Cap long run for this example
      break;
    case 7: // Sunday
      workout = `Week ${weekOfPlan}, Day ${dayOfPlan}: Active recovery (e.g., walk, stretching) or complete rest for your ${planName}.`;
      isRestDay = true;
      break;
    default: 
      workout = `Week ${weekOfPlan}, Day ${dayOfPlan}: General training for your ${planName}.`;
  }
  return { workout, isRestDay };
};

export const getTodaysWorkout = (profile: UserProfile | null): string => {
  if (!profile || !profile.trainingPlan || !profile.runningLevel || !profile.planStartDate) {
    return "Set your training plan, running level, and plan start date in your profile to see today's workout.";
  }
  
  const planDetails = TRAINING_PLANS.find(p => p.value === profile.trainingPlan);
  if (!planDetails) return "Selected training plan details not found.";

  const startDate = startOfDay(new Date(profile.planStartDate));
  const today = startOfDay(new Date());
  
  const dayOfPlan = differenceInCalendarDays(today, startDate) + 1;
  
  if (dayOfPlan <= 0) {
    return `Your ${planDetails.label} starts on ${startDate.toLocaleDateString()}. Get ready!`;
  }
  
  const weekOfPlan = Math.floor((dayOfPlan - 1) / 7) + 1;

  if (weekOfPlan > planDetails.durationWeeks) {
    return `Your ${planDetails.label} has finished! Congratulations! Consider starting a new plan.`;
  }
  
  const { workout } = getWorkoutForDayOfPlan(profile, dayOfPlan, weekOfPlan);
  return workout;
};


export const generateFullTrainingPlan = (profile: UserProfile | null): DatedWorkout[] => {
  if (!profile || !profile.planStartDate || !profile.trainingPlan || !profile.runningLevel) {
    return [];
  }

  const planDetails = TRAINING_PLANS.find(p => p.value === profile.trainingPlan);
  if (!planDetails) {
    return [];
  }

  const fullPlan: DatedWorkout[] = [];
  const startDate = startOfDay(new Date(profile.planStartDate));
  const totalDaysInPlan = planDetails.durationWeeks * 7;

  for (let i = 0; i < totalDaysInPlan; i++) {
    const currentDate = addDays(startDate, i);
    const dayOfPlan = i + 1;
    const weekOfPlan = Math.floor(i / 7) + 1;
    const { workout, isRestDay } = getWorkoutForDayOfPlan(profile, dayOfPlan, weekOfPlan);
    
    fullPlan.push({
      date: currentDate,
      workout,
      dayOfPlan,
      weekOfPlan,
      isRestDay,
    });
  }
  return fullPlan;
};


export const isPlanEndingSoon = (profile: UserProfile | null): boolean => {
  if (!profile || !profile.planStartDate || !profile.trainingPlan) return false;

  const planDetails = TRAINING_PLANS.find(p => p.value === profile.trainingPlan);
  if (!planDetails) return false;

  const startDate = new Date(profile.planStartDate);
  const planDurationDays = planDetails.durationWeeks * 7;
  const endDate = addDays(startOfDay(startDate), planDurationDays -1); // -1 because day 1 is start date
  const today = startOfDay(new Date());
  const daysRemaining = differenceInCalendarDays(endDate, today);

  return daysRemaining <= 7 && daysRemaining >=0; // Plan ends within the next 7 days (inclusive of today)
};

export const isPlanEnded = (profile: UserProfile | null): boolean => {
  if (!profile || !profile.planStartDate || !profile.trainingPlan) return false;

  const planDetails = TRAINING_PLANS.find(p => p.value === profile.trainingPlan);
  if (!planDetails) return false;

  const startDate = new Date(profile.planStartDate);
  const planDurationDays = planDetails.durationWeeks * 7;
  const endDate = addDays(startOfDay(startDate), planDurationDays -1);
  const today = startOfDay(new Date());
  
  return today > endDate;
};
