"use client";

import { MainLayout } from "@/components/layout/MainLayout";
import { GreetingSection } from "@/components/dashboard/GreetingSection";
import { WeatherSection } from "@/components/dashboard/WeatherSection";
import { WorkoutSection } from "@/components/dashboard/WorkoutSection";
import { NewsSection } from "@/components/dashboard/NewsSection";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function DashboardPage() {
  const { userProfile, loading, isProfileComplete } = useUserProfile();

  if (loading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Skeleton className="h-24 w-full" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </MainLayout>
    );
  }

  if (!isProfileComplete) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Card className="w-full max-w-md text-center shadow-xl">
          <CardHeader>
            <AlertTriangle className="mx-auto h-12 w-12 text-primary" />
            <CardTitle className="text-2xl mt-4">Welcome to Shut Up and Run!</CardTitle>
            <CardDescription className="mt-2">
              To get your personalized running dashboard, please complete your profile.
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

  return (
    <MainLayout>
      <div className="space-y-6">
        <GreetingSection userName={userProfile.name} />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <WeatherSection location={userProfile.location} />
          <WorkoutSection userProfile={userProfile} />
        </div>
        
        <NewsSection />
      </div>
    </MainLayout>
  );
}
