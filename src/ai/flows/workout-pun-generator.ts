'use server';

/**
 * @fileOverview Generates a friendly greeting with a running-related pun.
 *
 * - generateWorkoutPunGreeting - A function that generates the greeting.
 * - WorkoutPunGreetingInput - The input type for the generateWorkoutPunGreeting function.
 * - WorkoutPunGreetingOutput - The return type for the generateWorkoutPunGreeting function.
 * - workoutPunGreetingFlow - The Genkit flow object for use as a tool.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const WorkoutPunGreetingInputSchema = z.object({
  userName: z.string().describe('The name of the user.'),
});
export type WorkoutPunGreetingInput = z.infer<typeof WorkoutPunGreetingInputSchema>;

const WorkoutPunGreetingOutputSchema = z.object({
  greeting: z.string().describe('A friendly greeting with a running-related pun.'),
});
export type WorkoutPunGreetingOutput = z.infer<typeof WorkoutPunGreetingOutputSchema>;

export async function generateWorkoutPunGreeting(input: WorkoutPunGreetingInput): Promise<WorkoutPunGreetingOutput> {
  return workoutPunGreetingFlow(input);
}

const prompt = ai.definePrompt({
  name: 'workoutPunGreetingPrompt',
  input: {schema: WorkoutPunGreetingInputSchema},
  output: {schema: WorkoutPunGreetingOutputSchema},
  prompt: `You are a newsletter writer who specializes in running. You are writing a personalized daily newsletter for runners to motivate them. Always start with a friendly greeting to the runner, and incorporate a running-related pun.

  The runner's name is {{{userName}}}. Be sure to use their name in the greeting.
  
  Example Output: Hey, {{{userName}}}! Lace up your shoes and get ready to run. I hope your workout is a real tread! `,
});

export const workoutPunGreetingFlow = ai.defineFlow( // Added export here
  {
    name: 'workoutPunGreetingFlow',
    inputSchema: WorkoutPunGreetingInputSchema,
    outputSchema: WorkoutPunGreetingOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
