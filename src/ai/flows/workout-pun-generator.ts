
'use server';

/**
 * @fileOverview Generates a friendly greeting with a running-related pun.
 *
 * - generateWorkoutPunGreeting - A function that generates the greeting.
 * - WorkoutPunGreetingInput - The input type for the generateWorkoutPunGreeting function.
 * - WorkoutPunGreetingOutput - The return type for the generateWorkoutPunGreeting function.
 * - workoutPunGreetingTool - A Genkit tool that wraps the workoutPunGreetingFlow.
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

// This is the original flow logic
const workoutPunGreetingFlowInternal = ai.defineFlow(
  {
    name: 'workoutPunGreetingFlowInternal', // Changed name to avoid conflict if any
    inputSchema: WorkoutPunGreetingInputSchema,
    outputSchema: WorkoutPunGreetingOutputSchema,
  },
  async (input) => {
    const prompt = ai.definePrompt({
        name: 'workoutPunGreetingPrompt', // Keep original prompt name
        input: {schema: WorkoutPunGreetingInputSchema},
        output: {schema: WorkoutPunGreetingOutputSchema},
        prompt: `You are a newsletter writer who specializes in running. You are writing a personalized daily newsletter for runners to motivate them. Always start with a friendly greeting to the runner, and incorporate a running-related pun.

The runner's name is {{{userName}}}. Be sure to use their name in the greeting.

Example Output: Hey, {{{userName}}}! Lace up your shoes and get ready to run. I hope your workout is a real tread! `,
      });
    const {output} = await prompt(input);
    return output!;
  }
);

// Exported wrapper function for direct calls if needed elsewhere (though not typical for tools)
export async function generateWorkoutPunGreeting(input: WorkoutPunGreetingInput): Promise<WorkoutPunGreetingOutput> {
  return workoutPunGreetingFlowInternal(input);
}

// Define and export a dedicated tool that uses the flow
export const workoutPunGreetingTool = ai.defineTool(
  {
    name: 'workoutPunGreetingTool', // Explicit tool name
    description: 'Generates a friendly greeting with a running-related pun for the user.',
    inputSchema: WorkoutPunGreetingInputSchema,
    outputSchema: WorkoutPunGreetingOutputSchema,
  },
  async (input) => {
    // The tool calls the internal flow
    return await workoutPunGreetingFlowInternal(input);
  }
);

// Export the original flow if it's intended to be callable directly elsewhere as a flow
// For tool usage, workoutPunGreetingTool is preferred.
export const workoutPunGreetingFlow = workoutPunGreetingFlowInternal;
// However, to avoid confusion and the previous error, we will use the explicit tool.
// The issue might have been Genkit struggling to resolve a flow used as a tool without an explicit ai.defineTool wrapper in some contexts.
