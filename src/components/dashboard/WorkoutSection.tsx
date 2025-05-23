"use client";

import type { UserProfile } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Footprints, AlertTriangle } from "lucide-react";
import { TRAINING_PLANS } from "@/lib/constants";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { Button } from "../ui/button";
import { useEffect, useState } from "react";
import { isPlanEndingSoon, isPlanEnded } from "@/lib/workoutUtils"; // Import from new util

interface WorkoutSectionProps {
  userProfile: UserProfile | null;
  workoutSuggestion: string | null; // From AI
  planEndNotification?: string | null; // From AI
}

export function WorkoutSection({ userProfile, workoutSuggestion, planEndNotification }: WorkoutSectionProps) {
  const [showLocalPlanEndingAlert, setShowLocalPlanEndingAlert] = useState<boolean>(false);
  const [showLocalPlanEndedAlert, setShowLocalPlanEndedAlert] = useState<boolean>(false);

  useEffect(() => {
    // Check local conditions even if AI provides a notification, can be complementary
    if (userProfile) {
      setShowLocalPlanEndingAlert(isPlanEndingSoon(userProfile));
      setShowLocalPlanEndedAlert(isPlanEnded(userProfile));
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

  const finalWorkoutText = workoutSuggestion || "Today's workout details are being prepared...";

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
      <CardContent className="space-y-4">
        <p className="text-lg">{finalWorkoutText}</p>
        
        {planEndNotification && (
          <Alert variant="default" className="bg-accent/20 border-accent text-accent-foreground">
            <AlertTriangle className="h-5 w-5 text-accent" />
            <AlertTitle>Training Plan Update</AlertTitle>
            <AlertDescription>{planEndNotification}</AlertDescription>
          </Alert>
        )}

        {/* Show local alerts if AI doesn't provide one or as additional info */}
        {!planEndNotification && showLocalPlanEndingAlert && (
          <Alert variant="default" className="bg-accent/20 border-accent text-accent-foreground">
            <AlertTriangle className="h-5 w-5 text-accent" />
            <AlertTitle>Plan Ending Soon!</AlertTitle>
            <AlertDescription>
              Your current training plan is about to end. Head to your 
              <Link href="/profile" className="font-semibold underline hover:text-primary ml-1">profile</Link> to set up a new one and keep crushing your goals!
            </AlertDescription>
          </Alert>
        )}
        {!planEndNotification && showLocalPlanEndedAlert && (
           <Alert variant="default" className="bg-primary/10 border-primary text-primary">
            <AlertTriangle className="h-5 w-5 text-primary" />
            <AlertTitle>Plan Completed!</AlertTitle>
            <AlertDescription className="flex flex-col gap-2 text-primary-foreground">
              <span className="text-primary">Congratulations on finishing your training plan! Time to set a new goal?</span>
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
