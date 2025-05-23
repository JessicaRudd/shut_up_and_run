// src/ai/flows/newsletter-summarization.ts
'use server';

/**
 * @fileOverview Summarizes and prioritizes running news stories for a personalized newsletter.
 *
 * - summarizeNews - A function that summarizes and prioritizes running news stories.
 * - SummarizeNewsInput - The input type for the summarizeNews function.
 * - SummarizeNewsOutput - The return type for the summarizeNews function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeNewsInputSchema = z.object({
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
export type SummarizeNewsInput = z.infer<typeof SummarizeNewsInputSchema>;

const SummarizeNewsOutputSchema = z.object({
  topStories: z
    .array(
      z.object({
        title: z.string().describe('The title of the summarized article.'),
        summary: z.string().describe('A concise summary of the article.'),
        url: z.string().url().describe('The URL of the article.'),
        priority: z
          .number()
          .int()
          .min(1)
          .max(5)
          .describe('The priority of the article (1 is highest).'),
      })
    )
    .describe('An array of the top summarized and prioritized news stories.'),
});
export type SummarizeNewsOutput = z.infer<typeof SummarizeNewsOutputSchema>;

export async function summarizeNews(input: SummarizeNewsInput): Promise<SummarizeNewsOutput> {
  return summarizeNewsFlow(input);
}

const summarizeNewsPrompt = ai.definePrompt({
  name: 'summarizeNewsPrompt',
  input: {schema: SummarizeNewsInputSchema},
  output: {schema: SummarizeNewsOutputSchema},
  prompt: `You are a running news expert. You will receive a list of running-related news articles. Your task is to summarize each article and prioritize the top 5 stories.

  Prioritization should be based on relevance to runners, impact on the running community, and overall importance.

  Articles:
  {{#each articles}}
  Title: {{this.title}}
  URL: {{this.url}}
  Content: {{this.content}}
  ---
  {{/each}}`,
});

const summarizeNewsFlow = ai.defineFlow(
  {
    name: 'summarizeNewsFlow',
    inputSchema: SummarizeNewsInputSchema,
    outputSchema: SummarizeNewsOutputSchema,
  },
  async input => {
    const {output} = await summarizeNewsPrompt(input);
    return output!;
  }
);
