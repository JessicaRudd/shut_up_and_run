"use client";

import type { UserProfile } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Footprints, AlertTriangle } from "lucide-react";
import { TRAINING_PLANS } from "@/lib/constants";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { Button } from "../ui/button";
import { useEffect, useState } from "react";

interface WorkoutSectionProps {
  userProfile: UserProfile | null;
}

// Placeholder for workout generation logic
const getTodaysWorkout = (profile: UserProfile): string => {
  if (!profile.trainingPlan || !profile.runningLevel) {
    return "Set your training plan and running level in your profile to see today's workout.";
  }
  const planDetails = TRAINING_PLANS.find(p => p.value === profile.trainingPlan);
  const planName = planDetails ? planDetails.label : "your selected plan";
  
  // Example: vary workout by day of week (very simplified)
  const dayOfWeek = new Date().getDay(); // Sunday = 0, Monday = 1, ...
  switch(dayOfWeek) {
    case 1: // Monday
      return `Rest day or light cross-training for your ${planName}.`;
    case 3: // Wednesday
      return `Interval training: 6x400m at ${profile.runningLevel === 'beginner' ? 'easy' : 'moderate'} pace for your ${planName}.`;
    case 5: // Friday
      return `Tempo run: 20 minutes at a comfortably hard pace for your ${planName}.`;
    default: // Other days
      return `Easy run: 30-45 minutes at a conversational pace for your ${planName}.`;
  }
};

const isPlanEndingSoon = (profile: UserProfile): boolean => {
  if (!profile.planStartDate || !profile.trainingPlan) return false;

  const planDetails = TRAINING_PLANS.find(p => p.value === profile.trainingPlan);
  if (!planDetails) return false;

  const startDate = new Date(profile.planStartDate);
  const planDurationDays = planDetails.durationWeeks * 7;
  const endDate = new Date(startDate.getTime() + planDurationDays * 24 * 60 * 60 * 1000);
  const today = new Date();
  const daysRemaining = (endDate.getTime() - today.getTime()) / (1000 * 3600 * 24);

  return daysRemaining <= 7 && daysRemaining >=0; // Plan ends within the next 7 days
};

const isPlanEnded = (profile: UserProfile): boolean => {
  if (!profile.planStartDate || !profile.trainingPlan) return false;

  const planDetails = TRAINING_PLANS.find(p => p.value === profile.trainingPlan);
  if (!planDetails) return false;

  const startDate = new Date(profile.planStartDate);
  const planDurationDays = planDetails.durationWeeks * 7;
  const endDate = new Date(startDate.getTime() + planDurationDays * 24 * 60 * 60 * 1000);
  const today = new Date();
  
  return today > endDate;
}

export function WorkoutSection({ userProfile }: WorkoutSectionProps) {
  const [workout, setWorkout] = useState<string>("Loading workout...");
  const [planEnding, setPlanEnding] = useState<boolean>(false);
  const [planHasEnded, setPlanHasEnded] = useState<boolean>(false);
  const [currentDate, setCurrentDate] = useState<Date | null>(null);

  useEffect(() => {
    setCurrentDate(new Date()); // Ensure Date is only used client-side
    if (userProfile) {
      setWorkout(getTodaysWorkout(userProfile));
      setPlanEnding(isPlanEndingSoon(userProfile));
      setPlanHasEnded(isPlanEnded(userProfile));
    } else {
      setWorkout("Please complete your profile to see your workout.");
    }
  }, [userProfile]);


  if (!userProfile || !userProfile.name) {
     return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center text-xl font-semibold">
            <Footprints className="mr-2 h-6 w-6 text-primary" />
            Today's Workout
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Workout details will appear here once your profile is set up.</p>
        </CardContent>
      </Card>
    );
  }
  
  if (!currentDate) { // Avoid rendering until date is set
    return <Skeleton className="h-40 w-full" />;
  }


  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center text-xl font-semibold">
          <Footprints className="mr-2 h-6 w-6 text-primary" />
          Today's Workout
        </CardTitle>
        {userProfile.trainingPlan && (
           <CardDescription>
            Part of your {TRAINING_PLANS.find(p=>p.value === userProfile.trainingPlan)?.label || 'training plan'}.
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <p className="text-lg mb-4">{workout}</p>
        {planEnding && (
          <Alert variant="default" className="bg-accent/20 border-accent text-accent-foreground">
            <AlertTriangle className="h-5 w-5 text-accent" />
            <AlertTitle>Plan Ending Soon!</AlertTitle>
            <AlertDescription>
              Your current training plan is about to end. Head to your 
              <Link href="/profile" className="font-semibold underline hover:text-primary ml-1">profile</Link> to set up a new one and keep crushing your goals!
            </AlertDescription>
          </Alert>
        )}
        {planHasEnded && (
           <Alert variant="default" className="bg-primary/10 border-primary text-primary-foreground">
            <AlertTriangle className="h-5 w-5 text-primary" />
            <AlertTitle>Plan Completed!</AlertTitle>
            <AlertDescription className="flex flex-col gap-2">
              <span>Congratulations on finishing your training plan! Time to set a new goal?</span>
              <Button asChild size="sm" className="w-fit bg-primary hover:bg-primary/90 text-primary-foreground">
                <Link href="/profile">Update Your Profile</Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
