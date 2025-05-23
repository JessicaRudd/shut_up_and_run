"use client";

import { useEffect, useState } from "react";
import { generateWorkoutPunGreeting } from "@/ai/flows/workout-pun-generator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Smile } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface GreetingSectionProps {
  userName: string;
}

export function GreetingSection({ userName }: GreetingSectionProps) {
  const [greeting, setGreeting] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userName) {
      setLoading(false);
      // Don't try to generate if no username, profile might be incomplete.
      return;
    }

    async function fetchGreeting() {
      setLoading(true);
      setError(null);
      try {
        const result = await generateWorkoutPunGreeting({ userName });
        setGreeting(result.greeting);
      } catch (err) {
        console.error("Error generating greeting:", err);
        setError("Could not fetch a witty greeting for you today. Just know you're awesome!");
      } finally {
        setLoading(false);
      }
    }

    fetchGreeting();
  }, [userName]);

  if (loading) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl font-semibold">
            <Smile className="mr-2 h-6 w-6 text-primary" />
            Just a moment...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-6 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md bg-gradient-to-r from-primary/10 via-accent/5 to-background">
      <CardHeader>
        <CardTitle className="flex items-center text-2xl font-semibold">
          <Smile className="mr-2 h-7 w-7 text-primary" />
          Daily Motivation
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Oops!</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {greeting && <p className="text-lg">{greeting}</p>}
        {!greeting && !error && !userName && (
          <p className="text-lg text-muted-foreground">
            Complete your profile to get a personalized greeting!
          </p>
        )}
      </CardContent>
    </Card>
  );
}
