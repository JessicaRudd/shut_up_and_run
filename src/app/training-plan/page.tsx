// src/app/training-plan/page.tsx
"use client";

import { MainLayout } from "@/components/layout/MainLayout";
import { TrainingPlanTabs } from "@/components/training-plan/TrainingPlanTabs";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { generateFullTrainingPlan } from "@/lib/workoutUtils";
import type { DatedWorkout } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { AlertTriangle, Info } from "lucide-react";
import { useMemo } from "react";

export default function TrainingPlanPage() {
  const { userProfile, loading, isProfileComplete } = useUserProfile();

  const fullPlan: DatedWorkout[] = useMemo(() => {
    if (loading || !isProfileComplete || !userProfile.planStartDate || !userProfile.trainingPlan) {
      return [];
    }
    return generateFullTrainingPlan(userProfile);
  }, [userProfile, loading, isProfileComplete]);

  if (loading) {
    return (
      <MainLayout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-48" /> {/* Tabs Skeleton */}
          <Skeleton className="h-80 w-full" /> {/* Content Skeleton */}
        </div>
      </MainLayout>
    );
  }

  if (!isProfileComplete || !userProfile.planStartDate || !userProfile.trainingPlan) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
          <Card className="w-full max-w-lg text-center shadow-xl">
            <CardHeader>
              <AlertTriangle className="mx-auto h-12 w-12 text-primary" />
              <CardTitle className="text-2xl mt-4">Training Plan Not Set</CardTitle>
              <CardDescription className="mt-2">
                To view your training plan, please complete your profile, ensuring you have selected a training plan and set a plan start date.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                <Link href="/profile">Complete Your Profile</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }
  
  if (fullPlan.length === 0) {
     return (
      <MainLayout>
        <Card className="w-full max-w-lg mx-auto text-center shadow-xl">
            <CardHeader>
              <Info className="mx-auto h-12 w-12 text-primary" />
              <CardTitle className="text-2xl mt-4">No Plan Generated</CardTitle>
              <CardDescription className="mt-2">
                Could not generate your training plan. This might be due to missing profile information or an issue with the plan settings. Please check your profile.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                <Link href="/profile">Check Your Profile</Link>
              </Button>
            </CardContent>
          </Card>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Your Training Plan</h1>
        <p className="text-muted-foreground">
          Visualize your upcoming workouts in calendar or list view.
        </p>
      </div>
      <TrainingPlanTabs fullPlan={fullPlan} planStartDate={new Date(userProfile.planStartDate)} />
    </MainLayout>
  );
}
