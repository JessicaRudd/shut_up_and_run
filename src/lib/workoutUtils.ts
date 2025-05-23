import type { UserProfile } from "@/lib/types";
import { TRAINING_PLANS } from "@/lib/constants";

export const getTodaysWorkout = (profile: UserProfile | null): string => {
  if (!profile || !profile.trainingPlan || !profile.runningLevel || !profile.planStartDate) {
    return "Set your training plan, running level, and ensure plan start date is set in your profile to see today's workout.";
  }
  const planDetails = TRAINING_PLANS.find(p => p.value === profile.trainingPlan);
  const planName = planDetails ? planDetails.label : "your selected plan";
  
  const startDate = new Date(profile.planStartDate);
  const today = new Date();
  const dayOfPlan = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 3600 * 24)) + 1;
  const weekOfPlan = Math.floor(dayOfPlan / 7) + 1;
  
  if (dayOfPlan <= 0) return `Your ${planName} starts on ${startDate.toLocaleDateString()}. Get ready!`;
  if (planDetails && weekOfPlan > planDetails.durationWeeks) return `Your ${planName} has finished! Congratulations!`;

  // Example: vary workout by day of week (very simplified)
  // In a real app, this would be a complex algorithm based on dayOfPlan, weekOfPlan, runningLevel, etc.
  const dayOfWeekInPlanCycle = dayOfPlan % 7 === 0 ? 7 : dayOfPlan % 7; // 1-7

  switch(dayOfWeekInPlanCycle) {
    case 1: // Typically Monday - Rest or Light
      return `Week ${weekOfPlan}, Day ${dayOfPlan}: Rest day or light cross-training for your ${planName}. Focus on recovery.`;
    case 2: // Tuesday - Easy/Moderate Run
      return `Week ${weekOfPlan}, Day ${dayOfPlan}: Easy run: 30-45 minutes at a conversational pace for your ${planName}.`;
    case 3: // Wednesday - Intervals/Speed Work
       const intensity = profile.runningLevel === 'beginner' ? 'easy' : (profile.runningLevel === 'intermediate' ? 'moderate' : 'hard');
      return `Week ${weekOfPlan}, Day ${dayOfPlan}: Interval training: e.g., 6x400m at ${intensity} pace for your ${planName}. Warm up and cool down properly.`;
    case 4: // Thursday - Easy/Moderate Run
      return `Week ${weekOfPlan}, Day ${dayOfPlan}: Easy to moderate run: 35-50 minutes for your ${planName}.`;
    case 5: // Friday - Tempo or Cross-Training
      return `Week ${weekOfPlan}, Day ${dayOfPlan}: Tempo run: 20 minutes at a comfortably hard pace, or cross-training (e.g., cycling, swimming) for your ${planName}.`;
    case 6: // Saturday - Long Run
      const longRunDuration = 45 + (weekOfPlan * (profile.runningLevel === 'beginner' ? 5 : (profile.runningLevel === 'intermediate' ? 10 : 15)));
      return `Week ${weekOfPlan}, Day ${dayOfPlan}: Long run: ${longRunDuration} minutes at an easy, sustainable pace for your ${planName}.`;
    case 7: // Sunday - Rest or Active Recovery
      return `Week ${weekOfPlan}, Day ${dayOfPlan}: Active recovery (e.g., walk, stretching) or complete rest for your ${planName}.`;
    default: 
      return `Week ${weekOfPlan}, Day ${dayOfPlan}: Easy run: 30-45 minutes at a conversational pace for your ${planName}.`;
  }
};

export const isPlanEndingSoon = (profile: UserProfile | null): boolean => {
  if (!profile || !profile.planStartDate || !profile.trainingPlan) return false;

  const planDetails = TRAINING_PLANS.find(p => p.value === profile.trainingPlan);
  if (!planDetails) return false;

  const startDate = new Date(profile.planStartDate);
  const planDurationDays = planDetails.durationWeeks * 7;
  const endDate = new Date(startDate.getTime() + planDurationDays * 24 * 60 * 60 * 1000);
  const today = new Date();
  const daysRemaining = (endDate.getTime() - today.getTime()) / (1000 * 3600 * 24);

  return daysRemaining <= 7 && daysRemaining >=0; // Plan ends within the next 7 days
};

export const isPlanEnded = (profile: UserProfile | null): boolean => {
  if (!profile || !profile.planStartDate || !profile.trainingPlan) return false;

  const planDetails = TRAINING_PLANS.find(p => p.value === profile.trainingPlan);
  if (!planDetails) return false;

  const startDate = new Date(profile.planStartDate);
  const planDurationDays = planDetails.durationWeeks * 7;
  const endDate = new Date(startDate.getTime() + planDurationDays * 24 * 60 * 60 * 1000);
  const today = new Date();
  
  return today > endDate;
};
