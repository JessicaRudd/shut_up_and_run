'use server';

/**
 * @fileOverview Generates a friendly greeting with a running-related pun.
 *
 * - generateRunningPun - A function that generates the greeting.
 * - GenerateRunningPunInput - The input type for the generateRunningPun function.
 * - GenerateRunningPunOutput - The return type for the generateRunningPun function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateRunningPunInputSchema = z.object({
  userName: z.string().describe('The name of the user.'),
});
export type GenerateRunningPunInput = z.infer<typeof GenerateRunningPunInputSchema>;

const GenerateRunningPunOutputSchema = z.object({
  greeting: z.string().describe('A friendly greeting with a running-related pun.'),
});
export type GenerateRunningPunOutput = z.infer<typeof GenerateRunningPunOutputSchema>;

export async function generateRunningPun(input: GenerateRunningPunInput): Promise<GenerateRunningPunOutput> {
  return generateRunningPunFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateRunningPunPrompt',
  input: {schema: GenerateRunningPunInputSchema},
  output: {schema: GenerateRunningPunOutputSchema},
  prompt: `You are a newsletter writer who specializes in running. You are writing a personalized daily newsletter for runners to motivate them. Always start with a friendly greeting to the runner, and incorporate a running-related pun.\n
  The runner's name is {{{userName}}}. Be sure to use their name in the greeting.\n  \n  Example Output: Hey, {{{userName}}}! Lace up your shoes and get ready to run. I hope your workout is a real tread! `,
});

const generateRunningPunFlow = ai.defineFlow(
  {
    name: 'generateRunningPunFlow',
    inputSchema: GenerateRunningPunInputSchema,
    outputSchema: GenerateRunningPunOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
