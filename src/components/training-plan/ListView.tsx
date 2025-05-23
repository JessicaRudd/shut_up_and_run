// src/components/training-plan/ListView.tsx
"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DatedWorkout } from "@/lib/types";
import { format } from "date-fns";

interface ListViewProps {
  fullPlan: DatedWorkout[];
}

export function ListView({ fullPlan }: ListViewProps) {
  if (!fullPlan || fullPlan.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">No training plan data available to display.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-250px)] pr-4"> {/* Adjust height as needed */}
      <div className="space-y-4">
        {fullPlan.map((dw) => (
          <Card 
            key={dw.date.toISOString()} 
            className={dw.isRestDay ? "bg-muted/30 border-dashed border-accent/50" : "shadow-sm"}
          >
            <CardHeader>
              <CardTitle>{format(dw.date, "EEEE, MMMM do, yyyy")}</CardTitle>
              <CardDescription>
                Week {dw.weekOfPlan}, Day {dw.dayOfPlan}
                {dw.isRestDay && <span className="ml-2 font-semibold text-accent">(Rest Day)</span>}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>{dw.workout}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}
