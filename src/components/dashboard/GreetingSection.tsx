"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Smile } from "lucide-react";

interface GreetingSectionProps {
  greetingWithName: string | null; // Expecting the greeting to include the name already
}

export function GreetingSection({ greetingWithName }: GreetingSectionProps) {
  if (!greetingWithName) {
    return (
      <Card className="shadow-md bg-gradient-to-r from-primary/10 via-accent/5 to-background">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl font-semibold">
            <Smile className="mr-2 h-7 w-7 text-primary" />
            Daily Motivation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg text-muted-foreground">
            Personalized greeting will appear here once available.
          </p>
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
        <p className="text-lg">{greetingWithName}</p>
      </CardContent>
    </Card>
  );
}
