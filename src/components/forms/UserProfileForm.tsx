
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
import type { UserProfile, RunningLevel, TrainingPlan as TrainingPlanType, WeatherUnit, NewsletterDelivery } from "@/lib/types";
import { useEffect, useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from 'uuid';
import { format, addDays, subDays, isValid, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  location: z.string().min(2, { message: "Location is required." }),
  runningLevel: z.enum(["beginner", "intermediate", "advanced"], {
    errorMap: () => ({ message: "Please select a running level." }),
  }),
  trainingPlan: z.enum(["5k", "10k", "half-marathon", "marathon", "ultra"], {
    errorMap: () => ({ message: "Please select a training plan." }),
  }),
  // raceDistance field removed
  planStartDate: z.string().optional(), // Will be an ISO string
  raceDate: z.string().optional(), // Will be an ISO string
  weatherUnit: z.enum(["C", "F"]),
  newsletterDelivery: z.enum(["email", "hangouts"]),
}).refine(data => {
  if (data.raceDate && data.planStartDate) {
    // Ensure dates are valid before comparing
    const planStartDateValid = parseISO(data.planStartDate);
    const raceDateValid = parseISO(data.raceDate);
    if (isValid(planStartDateValid) && isValid(raceDateValid)) {
      return planStartDateValid < raceDateValid;
    }
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
    defaultValues: { // These will be overridden by useEffect -> form.reset
      name: "",
      location: "",
      runningLevel: "beginner", // Fallback default
      trainingPlan: "5k", // Fallback default
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
          return format(subDays(raceD, planMeta.durationWeeks * 7 -1), "yyyy-MM-dd");
        }
      }
    }
    return undefined;
  }, []);

  const watchedRaceDate = form.watch("raceDate");
  const watchedTrainingPlan = form.watch("trainingPlan");

  useEffect(() => {
    if (watchedRaceDate && watchedTrainingPlan) {
      const newPlanStartDate = calculatePlanStartDate(watchedRaceDate, watchedTrainingPlan);
      if (newPlanStartDate) {
        form.setValue("planStartDate", newPlanStartDate, { shouldValidate: true });
      }
    }
  }, [watchedRaceDate, watchedTrainingPlan, form, calculatePlanStartDate]);


  useEffect(() => {
    if (!loading && userProfile) {
      let initialPlanStartDate = userProfile.planStartDate;
      if (userProfile.raceDate && userProfile.trainingPlan) {
        initialPlanStartDate = calculatePlanStartDate(userProfile.raceDate, userProfile.trainingPlan) || userProfile.planStartDate;
      }

      form.reset({
        name: userProfile.name || "",
        location: userProfile.location || "",
        runningLevel: userProfile.runningLevel || "beginner", // Ensures a valid enum value
        trainingPlan: userProfile.trainingPlan || "5k", // Ensures a valid enum value
        planStartDate: initialPlanStartDate,
        raceDate: userProfile.raceDate,
        weatherUnit: userProfile.weatherUnit || "F",
        newsletterDelivery: userProfile.newsletterDelivery || "email",
      });
    }
  }, [loading, userProfile, form, calculatePlanStartDate]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    let finalPlanStartDate = values.planStartDate;

    if (values.raceDate && values.trainingPlan) {
      finalPlanStartDate = calculatePlanStartDate(values.raceDate, values.trainingPlan as TrainingPlanType);
    } else if (!values.raceDate && !values.planStartDate) {
      finalPlanStartDate = format(new Date(), "yyyy-MM-dd");
    }

    const newProfile: UserProfile = {
      id: userProfile.id || uuidv4(),
      name: values.name,
      location: values.location,
      runningLevel: values.runningLevel as RunningLevel, // Already validated by schema
      trainingPlan: values.trainingPlan as TrainingPlanType, // Already validated by schema
      // raceDistance is no longer part of UserProfile
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
              <Select onValueChange={field.onChange} value={field.value} /* No '|| undefined', use direct value */>
                <FormControl><SelectTrigger><SelectValue placeholder="Select your running level" /></SelectTrigger></FormControl>
                <SelectContent>
                  {RUNNING_LEVELS.map((level) => (<SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

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
                    // If no race date, set plan start date to today if it's not already set or if plan changes
                    // This logic ensures planStartDate is updated if plan changes without a race date
                     if (!form.getValues("planStartDate") || (userProfile && userProfile.trainingPlan !== selectedPlanValue)) {
                         form.setValue("planStartDate", format(new Date(), "yyyy-MM-dd"), { shouldValidate: true });
                    }
                  }
                }}
                value={field.value} /* No '|| undefined', use direct value */
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
        {/* Race Distance Field Removed */}

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
                      {field.value && isValid(parseISO(field.value)) ? ( // Check validity before formatting
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
                    selected={field.value && isValid(parseISO(field.value)) ? parseISO(field.value) : undefined}
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
                        form.setValue("planStartDate", undefined, { shouldValidate: true });
                      }
                    }}
                    disabled={(date) => date < addDays(new Date(), -1) }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormDescription>
                If you set a race date, the plan start date will be calculated.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

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
                        !!watchedRaceDate && "bg-muted/50 cursor-not-allowed"
                      )}
                      disabled={!!watchedRaceDate}
                    >
                      {field.value && isValid(parseISO(field.value)) ? ( // Check validity
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
                    selected={field.value && isValid(parseISO(field.value)) ? parseISO(field.value) : undefined}
                    onSelect={(date) => {
                        if (!watchedRaceDate) {
                           field.onChange(date ? format(date, "yyyy-MM-dd") : undefined);
                        }
                    }}
                    disabled={(date) => (!!watchedRaceDate || date < addDays(new Date(), -365)) }
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

        <FormField
          control={form.control}
          name="weatherUnit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Weather Unit</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} >
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
              <Select onValueChange={field.onChange} value={field.value} >
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

