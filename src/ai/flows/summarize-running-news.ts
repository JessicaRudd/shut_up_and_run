// src/ai/flows/summarize-running-news.ts
'use server';

/**
 * @fileOverview Summarizes running news stories for a personalized newsletter.
 *
 * - summarizeRunningNews - A function that summarizes running news stories.
 * - SummarizeRunningNewsInput - The input type for the summarizeRunningNews function.
 * - SummarizeRunningNewsOutput - The return type for the summarizeRunningNews function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeRunningNewsInputSchema = z.object({
  articles: z
    .array(
      z.object({
        title: z.string().describe('The title of the article.'),
        url: z.string().url().describe('The URL of the article.'),
        content: z.string().describe('The full content of the article.'),
      })
    )
    .describe('An array of running-related news articles.'),
});
export type SummarizeRunningNewsInput = z.infer<typeof SummarizeRunningNewsInputSchema>;

const SummarizeRunningNewsOutputSchema = z.object({
  topStories: z
    .array(
      z.object({
        title: z.string().describe('The title of the summarized article.'),
        summary: z.string().describe('A concise summary of the article.'),
        url: z.string().url().describe('The URL of the article.'),
      })
    )
    .describe('An array of the top summarized news stories.'),
});
export type SummarizeRunningNewsOutput = z.infer<typeof SummarizeRunningNewsOutputSchema>;

export async function summarizeRunningNews(input: SummarizeRunningNewsInput): Promise<SummarizeRunningNewsOutput> {
  return summarizeRunningNewsFlow(input);
}

const summarizeRunningNewsPrompt = ai.definePrompt({
  name: 'summarizeRunningNewsPrompt',
  input: {schema: SummarizeRunningNewsInputSchema},
  output: {schema: SummarizeRunningNewsOutputSchema},
  prompt: `You are a running news expert. You will receive a list of running-related news articles. Your task is to summarize each article concisely.

  Articles:
  {{#each articles}}
  Title: {{this.title}}
  URL: {{this.url}}
  Content: {{this.content}}
  ---
  {{/each}}`,
});

const summarizeRunningNewsFlow = ai.defineFlow(
  {
    name: 'summarizeRunningNewsFlow',
    inputSchema: SummarizeRunningNewsInputSchema,
    outputSchema: SummarizeRunningNewsOutputSchema,
  },
  async input => {
    const {output} = await summarizeRunningNewsPrompt(input);
    return output!;
  }
);
