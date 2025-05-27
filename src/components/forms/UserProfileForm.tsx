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
import { 
  RUNNING_LEVELS, 
  TRAINING_PLANS, 
  WEATHER_UNITS, 
  NEWSLETTER_DELIVERY_OPTIONS, 
  DEFAULT_USER_PROFILE, 
  NEWS_SEARCH_CATEGORIES,
  RUNNING_DAYS_OPTIONS,
  LONG_RUN_DAY_OPTIONS
} from "@/lib/constants";
import type { UserProfile, RunningLevel, TrainingPlan as TrainingPlanType, WeatherUnit, NewsletterDelivery, NewsSearchCategory, LongRunDay } from "@/lib/types";
import { useEffect, useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from 'uuid';
import { format, addDays, subDays, isValid, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

const newsSearchCategoryValues = NEWS_SEARCH_CATEGORIES.map(c => c.value) as [NewsSearchCategory, ...NewsSearchCategory[]];
const runningDaysValues = RUNNING_DAYS_OPTIONS.map(d => d.value) as [number, ...number[]];
const longRunDayValues = LONG_RUN_DAY_OPTIONS.map(d => d.value) as [LongRunDay, ...LongRunDay[]];


const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  location: z.string().min(2, { message: "Location is required." }),
  runningLevel: z.enum(["beginner", "intermediate", "advanced"]),
  trainingPlan: z.enum(["5k", "10k", "half-marathon", "marathon", "ultra"]),
  runningDaysPerWeek: z.coerce.number().min(3).max(7, {message: "Please select how many days per week you plan to run."}),
  longRunDay: z.enum(longRunDayValues),
  planStartDate: z.string().optional(),
  raceDate: z.string().optional(),
  weatherUnit: z.enum(["C", "F"]),
  newsletterDelivery: z.enum(["email", "hangouts"]),
  newsSearchPreferences: z.array(z.enum(newsSearchCategoryValues)).optional(),
}).refine(data => {
  if (data.raceDate && data.planStartDate) {
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
    defaultValues: {
      name: "",
      location: "",
      runningLevel: "beginner" as RunningLevel,
      trainingPlan: "5k" as TrainingPlanType,
      runningDaysPerWeek: DEFAULT_USER_PROFILE.runningDaysPerWeek,
      longRunDay: DEFAULT_USER_PROFILE.longRunDay,
      planStartDate: undefined,
      raceDate: undefined,
      weatherUnit: "F" as WeatherUnit,
      newsletterDelivery: "email" as NewsletterDelivery,
      newsSearchPreferences: DEFAULT_USER_PROFILE.newsSearchPreferences || [],
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
      const newPlanStartDate = calculatePlanStartDate(watchedRaceDate, watchedTrainingPlan as TrainingPlanType);
      if (newPlanStartDate) {
        form.setValue("planStartDate", newPlanStartDate, { shouldValidate: true });
      }
    }
  }, [watchedRaceDate, watchedTrainingPlan, calculatePlanStartDate, form]);


  useEffect(() => {
    if (!loading && userProfile) {
      let planStartDateForForm = userProfile.planStartDate;
      if (userProfile.raceDate && userProfile.trainingPlan) {
        planStartDateForForm = calculatePlanStartDate(userProfile.raceDate, userProfile.trainingPlan) || userProfile.planStartDate;
      }

      form.reset({
        name: userProfile.name || "", 
        location: userProfile.location || "", 
        runningLevel: userProfile.runningLevel, 
        trainingPlan: userProfile.trainingPlan,
        runningDaysPerWeek: userProfile.runningDaysPerWeek || DEFAULT_USER_PROFILE.runningDaysPerWeek,
        longRunDay: userProfile.longRunDay || DEFAULT_USER_PROFILE.longRunDay,
        planStartDate: planStartDateForForm,
        raceDate: userProfile.raceDate,
        weatherUnit: userProfile.weatherUnit,
        newsletterDelivery: userProfile.newsletterDelivery,
        newsSearchPreferences: userProfile.newsSearchPreferences || [],
      });
    }
  }, [loading, userProfile, calculatePlanStartDate, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    let finalPlanStartDate = values.planStartDate;

    if (values.raceDate && values.trainingPlan) {
      finalPlanStartDate = calculatePlanStartDate(values.raceDate, values.trainingPlan as TrainingPlanType);
    } else if (!values.raceDate && !values.planStartDate) {
      finalPlanStartDate = format(new Date(), "yyyy-MM-dd");
    }

    const updatedProfile: UserProfile = {
      ...DEFAULT_USER_PROFILE, // Start with defaults to ensure all fields are present
      ...userProfile, // Overlay existing profile to preserve ID and other potentially missing fields
      id: userProfile.id || uuidv4(),
      name: values.name,
      location: values.location,
      runningLevel: values.runningLevel,
      trainingPlan: values.trainingPlan,
      runningDaysPerWeek: values.runningDaysPerWeek,
      longRunDay: values.longRunDay,
      planStartDate: finalPlanStartDate,
      raceDate: values.raceDate,
      weatherUnit: values.weatherUnit,
      newsletterDelivery: values.newsletterDelivery,
      newsSearchPreferences: values.newsSearchPreferences || [],
    };

    setUserProfileState(updatedProfile);
    toast({
      title: "Profile Saved!",
      description: "Your preferences have been updated.",
    });
  }

  if (loading) {
    return <div className="text-center p-10">Loading profile...</div>;
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
              <FormControl><Input placeholder="Your Name" {...field} value={field.value || ""} /></FormControl>
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
              <FormControl><Input placeholder="e.g., Springfield" {...field} value={field.value || ""} /></FormControl>
              <FormDescription>Used for local weather and potentially geographic news.</FormDescription>
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
              <Select onValueChange={field.onChange} value={field.value}>
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
                     if (!form.getValues("planStartDate") || (userProfile && userProfile.trainingPlan !== selectedPlanValue)) {
                         form.setValue("planStartDate", format(new Date(), "yyyy-MM-dd"), { shouldValidate: true });
                    }
                  }
                }}
                value={field.value}
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
          name="runningDaysPerWeek"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Running Days Per Week</FormLabel>
              <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select number of running days" /></SelectTrigger></FormControl>
                <SelectContent>
                  {RUNNING_DAYS_OPTIONS.map((option) => (<SelectItem key={option.value} value={option.value.toString()}>{option.label}</SelectItem>))}
                </SelectContent>
              </Select>
              <FormDescription>How many days you want to run each week.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="longRunDay"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Preferred Long Run Day</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select preferred long run day" /></SelectTrigger></FormControl>
                <SelectContent>
                  {LONG_RUN_DAY_OPTIONS.map((option) => (<SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>))}
                </SelectContent>
              </Select>
              <FormDescription>The day of the week you prefer for your longest run.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

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
                      {field.value && isValid(parseISO(field.value)) ?
                        format(parseISO(field.value), "PPP")
                       : (
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
                        const existingPlanStartDate = form.getValues("planStartDate");
                        form.setValue("planStartDate", existingPlanStartDate || format(new Date(), "yyyy-MM-dd") , { shouldValidate: true });
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
                      {field.value && isValid(parseISO(field.value)) ?
                        format(parseISO(field.value), "PPP")
                       : (
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
        
        <FormField
          control={form.control}
          name="newsSearchPreferences"
          render={() => (
            <FormItem>
              <div className="mb-4">
                <FormLabel className="text-base">News Search Preferences</FormLabel>
                <FormDescription>
                  Select topics you're interested in for your news feed.
                </FormDescription>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {NEWS_SEARCH_CATEGORIES.map((item) => (
                  <FormField
                    key={item.value}
                    control={form.control}
                    name="newsSearchPreferences"
                    render={({ field }) => {
                      return (
                        <FormItem
                          key={item.value}
                          className="flex flex-row items-center space-x-3 space-y-0 p-2 border rounded-md hover:bg-muted/50"
                        >
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(item.value)}
                              onCheckedChange={(checked) => {
                                return checked
                                  ? field.onChange([...(field.value || []), item.value])
                                  : field.onChange(
                                      (field.value || []).filter(
                                        (value) => value !== item.value
                                      )
                                    );
                              }}
                            />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer flex-1">
                            {item.label}
                          </FormLabel>
                        </FormItem>
                      );
                    }}
                  />
                ))}
              </div>
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
