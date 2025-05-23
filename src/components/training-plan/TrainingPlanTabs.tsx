// src/components/training-plan/TrainingPlanTabs.tsx
"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarView } from "./CalendarView";
import { ListView } from "./ListView";
import type { DatedWorkout } from "@/lib/types";

interface TrainingPlanTabsProps {
  fullPlan: DatedWorkout[];
  planStartDate: Date;
}

export function TrainingPlanTabs({ fullPlan, planStartDate }: TrainingPlanTabsProps) {
  return (
    <Tabs defaultValue="calendar" className="w-full">
      <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
        <TabsTrigger value="calendar">Calendar View</TabsTrigger>
        <TabsTrigger value="list">List View</TabsTrigger>
      </TabsList>
      <TabsContent value="calendar">
        <CalendarView fullPlan={fullPlan} planStartDate={planStartDate} />
      </TabsContent>
      <TabsContent value="list">
        <ListView fullPlan={fullPlan} />
      </TabsContent>
    </Tabs>
  );
}
