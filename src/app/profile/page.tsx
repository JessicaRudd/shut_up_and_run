"use client";

import { UserProfileForm } from "@/components/forms/UserProfileForm";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProfilePage() {
  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-3xl font-bold">Your Profile & Preferences</CardTitle>
            <CardDescription>
              Keep your information up to date to get the most out of Shut Up and Run.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UserProfileForm />
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
