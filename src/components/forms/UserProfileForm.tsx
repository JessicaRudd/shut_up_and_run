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
import { useUserProfile } from "@/contexts/UserProfileContext";
import { RUNNING_LEVELS, TRAINING_PLANS, WEATHER_UNITS, NEWSLETTER_DELIVERY_OPTIONS } from "@/lib/constants";
import type { UserProfile, RunningLevel, TrainingPlan, WeatherUnit, NewsletterDelivery } from "@/lib/types";
import { useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from 'uuid';

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  location: z.string().min(2, { message: "Location is required." }),
  runningLevel: z.enum(["beginner", "intermediate", "advanced"]),
  trainingPlan: z.enum(["5k", "10k", "half-marathon", "marathon", "ultra"]),
  raceDistance: z.string().min(1, { message: "Race distance is required (e.g., 5k, 10k, 50 miles)." }),
  weatherUnit: z.enum(["C", "F"]),
  newsletterDelivery: z.enum(["email", "hangouts"]),
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
      weatherUnit: "F",
      newsletterDelivery: "email",
    },
  });

  useEffect(() => {
    if (!loading && userProfile) {
      form.reset({
        name: userProfile.name || "",
        location: userProfile.location || "",
        runningLevel: userProfile.runningLevel || "beginner",
        trainingPlan: userProfile.trainingPlan || "5k",
        raceDistance: userProfile.raceDistance || (userProfile.trainingPlan !== "ultra" ? userProfile.trainingPlan : ""),
        weatherUnit: userProfile.weatherUnit || "F",
        newsletterDelivery: userProfile.newsletterDelivery || "email",
      });
    }
  }, [loading, userProfile, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    const newProfile: UserProfile = {
      id: userProfile.id || uuidv4(),
      name: values.name,
      location: values.location,
      runningLevel: values.runningLevel as RunningLevel,
      trainingPlan: values.trainingPlan as TrainingPlan,
      raceDistance: values.raceDistance,
      planStartDate: userProfile.planStartDate && userProfile.trainingPlan === values.trainingPlan ? userProfile.planStartDate : new Date().toISOString().split('T')[0],
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
              <FormControl>
                <Input placeholder="Your Name" {...field} />
              </FormControl>
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
              <FormControl>
                <Input placeholder="e.g., Springfield" {...field} />
              </FormControl>
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
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your running level" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {RUNNING_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
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
                  // Auto-fill race distance if not ultra
                  if (value !== "ultra") {
                    form.setValue("raceDistance", value);
                  } else if (form.getValues("raceDistance") === form.getValues("trainingPlan")) {
                     form.setValue("raceDistance", ""); // Clear if it was auto-filled from a non-ultra plan
                  }
                }} 
                value={field.value || undefined}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a training plan" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {TRAINING_PLANS.map((plan) => (
                    <SelectItem key={plan.value} value={plan.value}>
                      {plan.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>Choose a plan to follow.</FormDescription>
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
              <FormControl>
                <Input placeholder="e.g., 5k, 10k, 50 miles" {...field} />
              </FormControl>
              <FormDescription>Specify the distance you're training for (e.g., 5k, 10k, 21.1k, 42.2k, 50k, 100 miles).</FormDescription>
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
              <Select onValueChange={field.onChange} value={field.value || undefined} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select weather unit" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {WEATHER_UNITS.map((unit) => (
                    <SelectItem key={unit.value} value={unit.value}>
                      {unit.label}
                    </SelectItem>
                  ))}
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
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select delivery method" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {NEWSLETTER_DELIVERY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
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
