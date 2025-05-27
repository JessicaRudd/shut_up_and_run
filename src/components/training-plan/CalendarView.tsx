// src/components/training-plan/CalendarView.tsx
"use client";

import React, { useState, useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DatedWorkout } from "@/lib/types";
import { format, startOfMonth } from "date-fns";
import { cn } from "@/lib/utils";

interface CalendarViewProps {
  fullPlan: DatedWorkout[];
  planStartDate: Date;
}

export function CalendarView({ fullPlan, planStartDate }: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [currentMonth, setCurrentMonth] = useState<Date>(startOfMonth(planStartDate || new Date()));

  const workoutsByDate = useMemo(() => {
    const map = new Map<string, DatedWorkout>();
    fullPlan.forEach(dw => map.set(format(dw.date, "yyyy-MM-dd"), dw));
    return map;
  }, [fullPlan]);

  const selectedWorkout = selectedDate ? workoutsByDate.get(format(selectedDate, "yyyy-MM-dd")) : undefined;

  const modifiers = useMemo(() => ({
    workoutDay: fullPlan.filter(dw => !dw.isRestDay).map(dw => dw.date),
    restDay: fullPlan.filter(dw => dw.isRestDay).map(dw => dw.date),
  }), [fullPlan]);

  const modifiersClassNames = {
    workoutDay: "bg-primary/10 border border-primary/30 rounded-md font-semibold",
    restDay: "bg-accent/10 border border-accent/30 rounded-md",
    // selected is handled by react-day-picker default, but can be overridden
    // selected: "bg-primary text-primary-foreground rounded-md", 
  };
  
  // Ensure selected day highlights properly
  const dayPickerSelectedModifiers = { selected: selectedDate || [] };
  const combinedModifiers = { ...modifiers, ...dayPickerSelectedModifiers };
  const combinedModifiersClassNames = {
    ...modifiersClassNames,
    selected: cn("bg-primary text-primary-foreground rounded-md", 
                  selectedWorkout?.isRestDay && "!bg-accent !text-accent-foreground",
                  selectedWorkout && !selectedWorkout.isRestDay && "!bg-primary !text-primary-foreground"
                 ),
  };


  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardContent className="p-2 md:p-4 flex justify-center">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            modifiers={combinedModifiers}
            modifiersClassNames={combinedModifiersClassNames}
            className="rounded-md border"
            defaultMonth={startOfMonth(planStartDate || new Date())}
            fromDate={planStartDate}
            toDate={fullPlan.length > 0 ? fullPlan[fullPlan.length -1].date : addMonths(planStartDate, 6)} // Show reasonable future dates
            numberOfMonths={1} 
          />
        </CardContent>
      </Card>

      {selectedWorkout && (
        <Card className="shadow-md animate-in fade-in-50">
          <CardHeader>
            <CardTitle>Workout for: {format(selectedWorkout.date, "EEEE, MMMM do, yyyy")}</CardTitle>
            <CardDescription>Week {selectedWorkout.weekOfPlan}, Day {selectedWorkout.dayOfPlan} of your plan.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className={selectedWorkout.isRestDay ? "text-accent-foreground font-medium" : ""}>
              {selectedWorkout.workout}
            </p>
            {selectedWorkout.isRestDay && (
              <p className="text-sm text-muted-foreground mt-1">(Rest Day)</p>
            )}
          </CardContent>
        </Card>
      )}
      {!selectedDate && (
         <Card className="shadow-md border-dashed border-primary/50">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Select a day on the calendar to view workout details.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Helper function, if needed in other files, move to utils
function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}
