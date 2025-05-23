
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { RUNNING_LEVELS, TRAINING_PLANS, WEATHER_UNITS, NEWSLETTER_DELIVERY_OPTIONS } from "@/lib/constants";
import type { UserProfile, RunningLevel, TrainingPlan as TrainingPlanType, WeatherUnit, NewsletterDelivery } from "@/lib/types"; // Renamed TrainingPlan to TrainingPlanType to avoid conflict
import { useEffect, useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from 'uuid';
import { format, addDays, subDays, isValid, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  location: z.string().min(2, { message: "Location is required." }),
  runningLevel: z.enum(["beginner", "intermediate", "advanced"]),
  trainingPlan: z.enum(["5k", "10k", "half-marathon", "marathon", "ultra"]),
  raceDistance: z.string().min(1, { message: "Race distance is required (e.g., 5k, 10k, 50 miles)." }),
  planStartDate: z.string().optional(), // Will be an ISO string
  raceDate: z.string().optional(), // Will be an ISO string
  weatherUnit: z.enum(["C", "F"]),
  newsletterDelivery: z.enum(["email", "hangouts"]),
}).refine(data => {
  if (data.raceDate && data.planStartDate) {
    return new Date(data.planStartDate) < new Date(data.raceDate);
  }
  return true;
}, {
  message: "Plan start date must be before the race date.",
  path: ["planStartDate"],
});

export function UserProfileForm() {
  const { userProfile, setUserProfileState, loading } = useUserProfile();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      location: "",
      runningLevel: "beginner",
      trainingPlan: "5k",
      raceDistance: "",
      planStartDate: undefined,
      raceDate: undefined,
      weatherUnit: "F",
      newsletterDelivery: "email",
    },
  });

  const calculatePlanStartDate = useCallback((raceDateVal?: string, trainingPlanVal?: TrainingPlanType) => {
    if (raceDateVal && trainingPlanVal) {
      const planMeta = TRAINING_PLANS.find(p => p.value === trainingPlanVal);
      if (planMeta) {
        const raceD = parseISO(raceDateVal);
        if (isValid(raceD)) {
          return format(subDays(raceD, planMeta.durationWeeks * 7 -1), "yyyy-MM-dd"); // -1 because race day is part of the plan
        }
      }
    }
    return undefined;
  }, []);

  // Watch for changes in raceDate and trainingPlan to update planStartDate
  const watchedRaceDate = form.watch("raceDate");
  const watchedTrainingPlan = form.watch("trainingPlan");

  useEffect(() => {
    if (watchedRaceDate && watchedTrainingPlan) {
      const newPlanStartDate = calculatePlanStartDate(watchedRaceDate, watchedTrainingPlan);
      if (newPlanStartDate) {
        form.setValue("planStartDate", newPlanStartDate, { shouldValidate: true });
      }
    } else if (!watchedRaceDate && form.getValues("planStartDate") === undefined) {
      // If raceDate is cleared and planStartDate was auto-set, clear it or set to default
      // For simplicity, let's set it to today if user hasn't touched it manually
      // This part can be tricky; for now, if raceDate is cleared, planStartDate is user's responsibility
      // Or set to today IF it was previously derived.
      // A better approach might be to retain user's manual planStartDate if raceDate is cleared.
      // For now, if user clears raceDate, we won't automatically set planStartDate here.
      // It will take userProfile.planStartDate or default to today on new plan selection if empty.
    }
  }, [watchedRaceDate, watchedTrainingPlan, form, calculatePlanStartDate]);


  useEffect(() => {
    if (!loading && userProfile) {
      let initialPlanStartDate = userProfile.planStartDate;
      if (userProfile.raceDate && userProfile.trainingPlan) {
        // If loading profile with a raceDate, recalculate planStartDate to ensure consistency
        initialPlanStartDate = calculatePlanStartDate(userProfile.raceDate, userProfile.trainingPlan) || userProfile.planStartDate;
      }

      form.reset({
        name: userProfile.name || "",
        location: userProfile.location || "",
        runningLevel: userProfile.runningLevel || "beginner",
        trainingPlan: userProfile.trainingPlan || "5k",
        raceDistance: userProfile.raceDistance || (userProfile.trainingPlan && userProfile.trainingPlan !== "ultra" ? userProfile.trainingPlan : ""),
        planStartDate: initialPlanStartDate,
        raceDate: userProfile.raceDate,
        weatherUnit: userProfile.weatherUnit || "F",
        newsletterDelivery: userProfile.newsletterDelivery || "email",
      });
    }
  }, [loading, userProfile, form, calculatePlanStartDate]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    let finalPlanStartDate = values.planStartDate;

    // If raceDate is set, ensure planStartDate is derived from it
    if (values.raceDate && values.trainingPlan) {
      finalPlanStartDate = calculatePlanStartDate(values.raceDate, values.trainingPlan as TrainingPlanType);
    } else if (!values.raceDate && !values.planStartDate) {
      // If no raceDate and no planStartDate, default planStartDate to today
      finalPlanStartDate = format(new Date(), "yyyy-MM-dd");
    }


    const newProfile: UserProfile = {
      id: userProfile.id || uuidv4(),
      name: values.name,
      location: values.location,
      runningLevel: values.runningLevel as RunningLevel,
      trainingPlan: values.trainingPlan as TrainingPlanType,
      raceDistance: values.raceDistance,
      planStartDate: finalPlanStartDate,
      raceDate: values.raceDate,
      weatherUnit: values.weatherUnit as WeatherUnit,
      newsletterDelivery: values.newsletterDelivery as NewsletterDelivery,
    };
    setUserProfileState(newProfile);
    toast({
      title: "Profile Saved!",
      description: "Your preferences have been updated.",
    });
  }

  if (loading) {
    return <div>Loading profile...</div>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Name, Location, Running Level */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl><Input placeholder="Your Name" {...field} /></FormControl>
              <FormDescription>This is your public display name.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location (City)</FormLabel>
              <FormControl><Input placeholder="e.g., Springfield" {...field} /></FormControl>
              <FormDescription>Used for local weather information.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="runningLevel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Running Level</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || undefined} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select your running level" /></SelectTrigger></FormControl>
                <SelectContent>
                  {RUNNING_LEVELS.map((level) => (<SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Training Plan and Race Distance */}
        <FormField
          control={form.control}
          name="trainingPlan"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Training Plan</FormLabel>
              <Select
                onValueChange={(value) => {
                  field.onChange(value);
                  const currentRaceDate = form.getValues("raceDate");
                  const selectedPlanValue = value as TrainingPlanType;

                  if (currentRaceDate && selectedPlanValue) {
                     const newPlanStartDate = calculatePlanStartDate(currentRaceDate, selectedPlanValue);
                     if (newPlanStartDate) {
                       form.setValue("planStartDate", newPlanStartDate, { shouldValidate: true });
                     }
                  } else if (!currentRaceDate) {
                    // Auto-fill race distance if not ultra and no race date target
                    if (selectedPlanValue !== "ultra") {
                      form.setValue("raceDistance", selectedPlanValue);
                    } else if (form.getValues("raceDistance") === form.getValues("trainingPlan")) {
                       form.setValue("raceDistance", "");
                    }
                    // If no race date, set plan start date to today if it's not already set or if plan changes
                    if (!form.getValues("planStartDate") || userProfile.trainingPlan !== selectedPlanValue) {
                         form.setValue("planStartDate", format(new Date(), "yyyy-MM-dd"), { shouldValidate: true });
                    }
                  }
                }}
                value={field.value || undefined}
                defaultValue={field.value}
              >
                <FormControl><SelectTrigger><SelectValue placeholder="Select a training plan" /></SelectTrigger></FormControl>
                <SelectContent>
                  {TRAINING_PLANS.map((plan) => (<SelectItem key={plan.value} value={plan.value}>{plan.label} ({plan.durationWeeks} weeks)</SelectItem>))}
                </SelectContent>
              </Select>
              <FormDescription>Choose a plan. Selecting a race date below will adjust the plan's start date.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="raceDistance"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Race Distance</FormLabel>
              <FormControl><Input placeholder="e.g., 5k, 10k, Marathon" {...field} /></FormControl>
              <FormDescription>Specify the distance you're training for.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Race Date */}
        <FormField
          control={form.control}
          name="raceDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Target Race Date (Optional)</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(parseISO(field.value), "PPP")
                      ) : (
                        <span>Pick a race date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value ? parseISO(field.value) : undefined}
                    onSelect={(date) => {
                      const newRaceDate = date ? format(date, "yyyy-MM-dd") : undefined;
                      field.onChange(newRaceDate);
                      const currentTrainingPlan = form.getValues("trainingPlan");
                      if (newRaceDate && currentTrainingPlan) {
                        const newPlanStartDate = calculatePlanStartDate(newRaceDate, currentTrainingPlan as TrainingPlanType);
                        if (newPlanStartDate) {
                          form.setValue("planStartDate", newPlanStartDate, { shouldValidate: true });
                        }
                      } else if (!newRaceDate) {
                        // If raceDate is cleared, reset planStartDate or let user set it.
                        // For now, clear it, which means onSubmit it will default to today if not manually set.
                        form.setValue("planStartDate", undefined, { shouldValidate: true });
                      }
                    }}
                    disabled={(date) => date < addDays(new Date(), -1) } // Disable past dates
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormDescription>
                If you set a race date, the plan start date will be calculated to finish on this date, including taper.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Plan Start Date (conditionally displayed/editable) */}
        <FormField
          control={form.control}
          name="planStartDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Plan Start Date</FormLabel>
               <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground",
                        !!watchedRaceDate && "bg-muted/50 cursor-not-allowed" // Indicate non-editable if raceDate is set
                      )}
                      disabled={!!watchedRaceDate} // Disable if raceDate is set
                    >
                      {field.value ? (
                        format(parseISO(field.value), "PPP")
                      ) : (
                        <span>Pick a start date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value ? parseISO(field.value) : undefined}
                    onSelect={(date) => {
                        if (!watchedRaceDate) { // Only allow manual set if no raceDate
                           field.onChange(date ? format(date, "yyyy-MM-dd") : undefined);
                        }
                    }}
                    disabled={(date) => (!!watchedRaceDate || date < addDays(new Date(), -365)) } // Disable if raceDate is set or too far in past
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormDescription>
                {watchedRaceDate 
                  ? "Automatically calculated based on your race date and plan duration." 
                  : "Select when your training plan should begin. If not set, defaults to today upon saving."}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Weather Unit and Newsletter Delivery */}
        <FormField
          control={form.control}
          name="weatherUnit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Weather Unit</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || undefined} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select weather unit" /></SelectTrigger></FormControl>
                <SelectContent>
                  {WEATHER_UNITS.map((unit) => (<SelectItem key={unit.value} value={unit.value}>{unit.label}</SelectItem>))}
                </SelectContent>
              </Select>
              <FormDescription>Choose how temperature is displayed.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="newsletterDelivery"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Newsletter Delivery</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || undefined} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select delivery method" /></SelectTrigger></FormControl>
                <SelectContent>
                  {NEWSLETTER_DELIVERY_OPTIONS.map((option) => (<SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>))}
                </SelectContent>
              </Select>
              <FormDescription>How you'd like to receive your newsletter.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground">
          Save Preferences
        </Button>
      </form>
    </Form>
  );
}

