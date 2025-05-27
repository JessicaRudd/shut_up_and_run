import type { UserProfile, DatedWorkout, TrainingPlan, LongRunDay } from "@/lib/types";
import { TRAINING_PLANS, DEFAULT_USER_PROFILE } from "@/lib/constants";
import { addDays, differenceInCalendarDays, startOfDay, getDay, formatISO } from "date-fns";

type WorkoutType = "LongRun" | "Interval" | "Tempo" | "EasyRun" | "Rest" | "RaceDay";

interface DailyWorkoutDetail {
  workout: string;
  isRestDay: boolean;
  workoutType: WorkoutType;
  isRaceDay?: boolean;
}

// Helper to determine the numeric day of the week (0=Sunday, 6=Saturday)
const getDayNumber = (dayName?: LongRunDay): number => {
  if (dayName === "saturday") return 6;
  if (dayName === "sunday") return 0;
  return 6; // Default to Saturday if not specified or invalid
};

/**
 * Assigns workout types to days of the week based on preferences.
 * This is a simplified assignment logic.
 */
const assignWorkoutTypesToWeek = (
  numRunningDays: number,
  longRunDayNumber: number // 0 for Sunday, 6 for Saturday
): WorkoutType[] => {
  const weekSchedule: WorkoutType[] = Array(7).fill("Rest");
  let runsPlaced = 0;

  // Place Long Run
  if (numRunningDays > 0) {
    weekSchedule[longRunDayNumber] = "LongRun";
    runsPlaced++;
  }

  // Define preferred days for other key workouts (relative to a Monday start)
  // Tuesday for Intervals, Thursday for Tempo
  const intervalPreferredDay = 2; // Tuesday
  const tempoPreferredDay = 4; // Thursday

  // Place Interval Run
  if (runsPlaced < numRunningDays) {
    if (weekSchedule[intervalPreferredDay] === "Rest") {
      weekSchedule[intervalPreferredDay] = "Interval";
      runsPlaced++;
    } else if (weekSchedule[(intervalPreferredDay + 1) % 7] === "Rest") { // Try Wednesday
      weekSchedule[(intervalPreferredDay + 1) % 7] = "Interval";
      runsPlaced++;
    }
  }

  // Place Tempo Run
  if (runsPlaced < numRunningDays) {
    if (weekSchedule[tempoPreferredDay] === "Rest") {
      weekSchedule[tempoPreferredDay] = "Tempo";
      runsPlaced++;
    } else if (weekSchedule[(tempoPreferredDay - 1 + 7) % 7] === "Rest") { // Try Wednesday if not Interval
       if(weekSchedule[(tempoPreferredDay - 1 + 7) % 7] === "Rest") { // double check wednesday
           weekSchedule[(tempoPreferredDay - 1 + 7) % 7] = "Tempo";
           runsPlaced++;
       }
    } else if (weekSchedule[(tempoPreferredDay + 1) % 7] === "Rest") { // Try Friday
        if(weekSchedule[(tempoPreferredDay + 1) % 7] === "Rest") {
            weekSchedule[(tempoPreferredDay + 1) % 7] = "Tempo";
            runsPlaced++;
        }
    }
  }

  // Fill remaining run days with Easy Runs
  // Iterate through days, typically Mon, Wed, Fri if not already taken and not LR day
  const easyRunPlacementOrder = [1, 3, 5, 0, 2, 4, 6]; // Mon, Wed, Fri, Sun, Tue, Thu, Sat

  for (const dayIndex of easyRunPlacementOrder) {
    if (runsPlaced < numRunningDays && weekSchedule[dayIndex] === "Rest") {
      weekSchedule[dayIndex] = "EasyRun";
      runsPlaced++;
    }
  }
  
  // If still not enough runs placed (e.g., user wants 6-7 runs, force fill remaining rests)
  if (runsPlaced < numRunningDays) {
    for (let i = 0; i < 7 && runsPlaced < numRunningDays; i++) {
        if (weekSchedule[i] === "Rest") {
            weekSchedule[i] = "EasyRun";
            runsPlaced++;
        }
    }
  }


  return weekSchedule;
};

const generateWorkoutDescription = (
  workoutType: WorkoutType,
  weekOfPlan: number,
  runningLevel: UserProfile["runningLevel"],
  planName: string,
  dayOfPlan: number,
  planDetails: { durationWeeks: number } | undefined,
  isRaceDay: boolean = false,
  daysUntilRace?: number
): string => {
  
  if (isRaceDay) {
    return `RACE DAY! Good luck with your ${planName}! Remember your strategy and enjoy the experience!`;
  }

  // Tapering logic (simplified: last 1-2 weeks)
  let inTaper = false;
  if (planDetails && daysUntilRace !== undefined) {
      if (planDetails.durationWeeks >= 12 && daysUntilRace <= 14) { // Taper for 2 weeks for longer plans
          inTaper = true;
      } else if (planDetails.durationWeeks >=8 && daysUntilRace <= 7) { // Taper for 1 week for medium plans
          inTaper = true;
      }
  }


  let description = `Week ${weekOfPlan}, Day ${dayOfPlan} of your ${planName}: `;

  switch (workoutType) {
    case "LongRun":
      const baseLR = runningLevel === "beginner" ? 30 : runningLevel === "intermediate" ? 45 : 60;
      let lrDuration = baseLR + (weekOfPlan * (runningLevel === "beginner" ? 5 : runningLevel === "intermediate" ? 7 : 10));
      lrDuration = Math.min(lrDuration, planName.includes("Ultra") ? 240 : planName.includes("Marathon") ? 180 : planName.includes("Half") ? 120 : 90);
      if (inTaper) lrDuration = Math.max(30, Math.floor(lrDuration * 0.5)); // Significantly reduce LR during taper
      description += `Long Run: ${lrDuration} minutes at an easy, sustainable pace.`;
      break;
    case "Interval":
      const intervalPace = runningLevel === "beginner" ? "controlled" : runningLevel === "intermediate" ? "moderate" : "hard";
      let intervalReps = runningLevel === "beginner" ? 4 : runningLevel === "intermediate" ? 6 : 8;
      if (inTaper) intervalReps = Math.max(2, Math.floor(intervalReps * 0.6));
      description += `Interval Training: ${intervalReps}x400m at ${intervalPace} pace with recovery jogs. Warm up and cool down.`;
      break;
    case "Tempo":
      let tempoDuration = runningLevel === "beginner" ? 15 : runningLevel === "intermediate" ? 20 : 30;
      if (inTaper) tempoDuration = Math.max(10, Math.floor(tempoDuration * 0.6));
      description += `Tempo Run: ${tempoDuration} minutes at a comfortably hard pace. Include warm up and cool down.`;
      break;
    case "EasyRun":
      let easyRunDuration = runningLevel === "beginner" ? 20 : runningLevel === "intermediate" ? 30 : 40;
      if (inTaper && daysUntilRace !== undefined && daysUntilRace <=3 ) easyRunDuration = Math.max(15, Math.floor(easyRunDuration*0.5)); // Very short if very close to race
      else if (inTaper) easyRunDuration = Math.max(20, Math.floor(easyRunDuration * 0.7));
      description += `Easy Run: ${easyRunDuration} minutes at a conversational pace.`;
      break;
    case "Rest":
      description += `Rest day or light cross-training (e.g., stretching, yoga). Focus on recovery.`;
      break;
    default:
      description += "General training activity.";
  }
  if (inTaper && workoutType !== "Rest") {
      description += " (Tapering week - focus on feeling fresh!)";
  }
  return description;
};


export const getDailyWorkoutDetails = (
  profile: UserProfile,
  currentDate: Date,
  weekOfPlan: number, // 1-indexed
  dayOfPlan: number // 1-indexed overall day in plan
): DailyWorkoutDetail => {
  const planDetails = TRAINING_PLANS.find(p => p.value === profile.trainingPlan);
  const planName = planDetails ? planDetails.label : "your selected plan";

  if (!planDetails) {
    return { workout: "Training plan details not found.", isRestDay: false, workoutType: "Rest" };
  }

  const dayOfWeek = getDay(currentDate); // 0 for Sunday, 6 for Saturday
  const numRunningDays = profile.runningDaysPerWeek || DEFAULT_USER_PROFILE.runningDaysPerWeek!;
  const preferredLongRunDayName = profile.longRunDay || DEFAULT_USER_PROFILE.longRunDay!;
  const preferredLongRunDayNumber = getDayNumber(preferredLongRunDayName);

  const weeklyWorkoutTypes = assignWorkoutTypesToWeek(numRunningDays, preferredLongRunDayNumber);
  let workoutType = weeklyWorkoutTypes[dayOfWeek];
  
  let isRaceDayFinal = false;
  let daysToRace: number | undefined = undefined;

  if (profile.raceDate && profile.planStartDate) {
      const raceD = startOfDay(new Date(profile.raceDate));
      const planStartD = startOfDay(new Date(profile.planStartDate));
      // Calculate total plan days based on raceDate and planStartDate if raceDate is set
      const totalPlanDaysFromDates = differenceInCalendarDays(raceD, planStartD) + 1;

      if (dayOfPlan === totalPlanDaysFromDates && formatISO(currentDate, { representation: 'date' }) === formatISO(raceD, { representation: 'date' })) {
          workoutType = "RaceDay";
          isRaceDayFinal = true;
      }
      daysToRace = differenceInCalendarDays(raceD, currentDate);
  }


  const workout = generateWorkoutDescription(workoutType, weekOfPlan, profile.runningLevel, planName, dayOfPlan, planDetails, isRaceDayFinal, daysToRace);
  const isRestDay = workoutType === "Rest";

  return { workout, isRestDay, workoutType, isRaceDay: isRaceDayFinal };
};


export const getTodaysWorkout = (profile: UserProfile | null): string => {
  if (!profile || !profile.trainingPlan || !profile.runningLevel || !profile.planStartDate) {
    return "Set your training plan, running level, and plan start date in your profile to see today's workout.";
  }
  
  const planDetails = TRAINING_PLANS.find(p => p.value === profile.trainingPlan);
  if (!planDetails) return "Selected training plan details not found.";

  const startDate = startOfDay(new Date(profile.planStartDate));
  const today = startOfDay(new Date());
  
  let dayOfPlan = differenceInCalendarDays(today, startDate) + 1;
  
  if (dayOfPlan <= 0) {
    return `Your ${planDetails.label} starts on ${startDate.toLocaleDateString()}. Get ready!`;
  }
  
  const weekOfPlan = Math.floor((dayOfPlan - 1) / 7) + 1;
  let planDurationDays = planDetails.durationWeeks * 7;

  // If raceDate is set, it determines the end of the plan
  if (profile.raceDate) {
      const raceD = startOfDay(new Date(profile.raceDate));
      planDurationDays = differenceInCalendarDays(raceD, startDate) + 1;
      if (dayOfPlan > planDurationDays) {
          // This case means today is past the race date.
           return `Your ${planDetails.label} concluded on ${raceD.toLocaleDateString()}. Hope the race went well! Consider starting a new plan.`;
      }
  } else {
      // No race date, use standard plan duration
      if (weekOfPlan > planDetails.durationWeeks) {
        return `Your ${planDetails.label} has finished! Congratulations! Consider starting a new plan.`;
      }
  }
  
  const { workout } = getDailyWorkoutDetails(profile, today, weekOfPlan, dayOfPlan);
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
  
  let totalDaysInPlan = planDetails.durationWeeks * 7;

  // If raceDate is set, it determines the plan length
  if (profile.raceDate) {
      const raceD = startOfDay(new Date(profile.raceDate));
      const planStartD = startOfDay(new Date(profile.planStartDate)); // ensure this is also startOfDay for correct diff
      
      if (raceD < planStartD) { // Race date is before plan start date, invalid scenario for generation
          console.error("Race date cannot be before plan start date.");
          return []; // Or handle error appropriately
      }
      totalDaysInPlan = differenceInCalendarDays(raceD, planStartD) + 1;
  }


  for (let i = 0; i < totalDaysInPlan; i++) {
    const currentDate = addDays(startDate, i);
    const dayOfPlan = i + 1;
    const weekOfPlan = Math.floor(i / 7) + 1;
    const { workout, isRestDay, isRaceDay } = getDailyWorkoutDetails(profile, currentDate, weekOfPlan, dayOfPlan);
    
    fullPlan.push({
      date: currentDate,
      workout,
      dayOfPlan,
      weekOfPlan,
      isRestDay,
      isRaceDay,
    });
  }
  return fullPlan;
};


export const isPlanEndingSoon = (profile: UserProfile | null): boolean => {
  if (!profile || !profile.planStartDate || !profile.trainingPlan) return false;

  const planDetails = TRAINING_PLANS.find(p => p.value === profile.trainingPlan);
  if (!planDetails) return false;

  const startDate = startOfDay(new Date(profile.planStartDate));
  let planDurationDays = planDetails.durationWeeks * 7;

  if (profile.raceDate) {
      const raceD = startOfDay(new Date(profile.raceDate));
      if (raceD < startDate) return false; // Invalid
      planDurationDays = differenceInCalendarDays(raceD, startDate) + 1;
  }
  
  const endDate = addDays(startDate, planDurationDays -1);
  const today = startOfDay(new Date());
  const daysRemaining = differenceInCalendarDays(endDate, today);

  // Ending soon if within the last week or already ended
  return daysRemaining <= 7 && daysRemaining >=0 ; 
};

export const isPlanEnded = (profile: UserProfile | null): boolean => {
  if (!profile || !profile.planStartDate || !profile.trainingPlan) return false;

  const planDetails = TRAINING_PLANS.find(p => p.value === profile.trainingPlan);
  if (!planDetails) return false;

  const startDate = startOfDay(new Date(profile.planStartDate));
  let planDurationDays = planDetails.durationWeeks * 7;

  if (profile.raceDate) {
      const raceD = startOfDay(new Date(profile.raceDate));
       if (raceD < startDate) return false; // Invalid
      planDurationDays = differenceInCalendarDays(raceD, startDate) + 1;
  }

  const endDate = addDays(startDate, planDurationDays -1);
  const today = startOfDay(new Date());
  
  return today > endDate;
};
