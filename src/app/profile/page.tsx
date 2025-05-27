"use client";

import { UserProfileForm } from "@/components/forms/UserProfileForm";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const { logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

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
            <div className="mt-6 pt-6 border-t">
              <Button 
                variant="destructive" 
                onClick={handleLogout}
                className="w-full"
              >
                Logout
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

export const dynamic = "force-dynamic";
