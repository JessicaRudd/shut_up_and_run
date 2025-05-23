// src/ai/flows/customize-newsletter-content.ts
'use server';

/**
 * @fileOverview Customizes the newsletter content based on user preferences and training plan.
 *
 * - customizeNewsletter - A function that customizes the newsletter content.
 * - CustomizeNewsletterInput - The input type for the customizeNewsletter function.
 * - CustomizeNewsletterOutput - The return type for the customizeNewsletter function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CustomizeNewsletterInputSchema = z.object({
  userName: z.string().describe('The name of the user.'),
  location: z.string().describe('The location of the user.'),
  runningLevel: z.string().describe('The running level of the user (e.g., beginner, intermediate, advanced).'),
  trainingPlanType: z.string().describe('The type of training plan the user is following (e.g., 5k, 10k, half marathon, marathon).'),
  raceDistance: z.string().describe('The race distance the user is training for.'),
  workout: z.string().describe('The workout scheduled for the user for the current day.'),
  newsStories: z
    .array(
      z.object({
        title: z.string().describe('The title of the news story.'),
        url: z.string().url().describe('The URL of the news story.'),
        content: z.string().describe('The content of the news story.'),
      })
    )
    .describe('An array of running-related news stories.'),
  weather: z.string().describe('The local weather for the user.'),
});
export type CustomizeNewsletterInput = z.infer<typeof CustomizeNewsletterInputSchema>;

const CustomizeNewsletterOutputSchema = z.object({
  greeting: z.string().describe('A friendly greeting with a running-related pun.'),
  weather: z.string().describe('The local weather for the user.'),
  workout: z.string().describe('The workout scheduled for the user for the current day.'),
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
  planEndNotification: z.string().optional().describe('A message to update the user profile when the plan ends.'),
});
export type CustomizeNewsletterOutput = z.infer<typeof CustomizeNewsletterOutputSchema>;


const summarizeNewsTool = ai.defineTool({
    name: 'summarizeNews',
    description: 'Summarizes and prioritizes running news stories based on relevance to the user.',
    inputSchema: z.object({
      articles: z
        .array(
          z.object({
            title: z.string().describe('The title of the article.'),
            url: z.string().url().describe('The URL of the article.'),
            content: z.string().describe('The full content of the article.'),
          })
        )
        .describe('An array of running-related news articles.'),
      runningLevel: z.string().describe('The running level of the user.'),
      trainingPlanType: z.string().describe('The type of training plan the user is following.'),
      raceDistance: z.string().describe('The race distance the user is training for.'),
    }),
    outputSchema: z.array(
      z.object({
        title: z.string().describe('The title of the summarized article.'),
        summary: z.string().describe('A concise summary of the article.'),
        url: z.string().url().describe('The URL of the article.'),
        priority: z.number().int().min(1).max(5).describe('The priority of the article (1 is highest).'),
      })
    ),
    async handler(input) {
      // Implement the news summarization and prioritization logic here
      // This is a placeholder implementation
      return input.articles.slice(0, 5).map((article, index) => ({
        title: article.title,
        summary: `Summary of ${article.title}`,
        url: article.url,
        priority: index + 1,
      }));
    },
  });

const generateGreetingTool = ai.defineTool({
  name: 'generateWorkoutPunGreeting',
  description: 'Generates a personalized greeting with a running-related pun.',
  inputSchema: z.object({
    userName: z.string().describe('The name of the user.'),
  }),
  outputSchema: z.string(),
  async handler(input) {
    // This is a placeholder implementation
    return `Hey, ${input.userName}! Ready for your run?`;
  },
});

export async function customizeNewsletter(input: CustomizeNewsletterInput): Promise<CustomizeNewsletterOutput> {
  return customizeNewsletterFlow(input);
}

const prompt = ai.definePrompt({
  name: 'customizeNewsletterPrompt',
  input: {schema: CustomizeNewsletterInputSchema},
  output: {schema: CustomizeNewsletterOutputSchema},
  tools: [summarizeNewsTool, generateGreetingTool],
  prompt: `You are a personalized newsletter generator for runners. You will generate a newsletter based on the user's preferences, training plan, and local weather.

  First, generate a personalized greeting using the generateWorkoutPunGreeting tool.
  Then, provide the local weather information.
  Next, display the workout scheduled for the day.
  Finally, summarize and prioritize the top 5 news stories related to running, using the summarizeNews tool. Ensure the news is relevant to the user's running level, training plan type, and race distance.

  If the user's training plan has ended, include a planEndNotification message, encouraging them to update their profile with a new plan.

  Here are the user details:
  - Name: {{{userName}}}
  - Location: {{{location}}}
  - Running Level: {{{runningLevel}}}
  - Training Plan Type: {{{trainingPlanType}}}
  - Race Distance: {{{raceDistance}}}
  - Workout: {{{workout}}}
  - Weather: {{{weather}}}
  - News Stories: {{newsStories}}}

  Output the greeting, weather, workout, topStories, and planEndNotification in JSON format. The topStories should be an array of summarized and prioritized news stories.
`,
});

const customizeNewsletterFlow = ai.defineFlow(
  {
    name: 'customizeNewsletterFlow',
    inputSchema: CustomizeNewsletterInputSchema,
    outputSchema: CustomizeNewsletterOutputSchema,
  },
  async input => {
    const greeting = await generateGreetingTool({
      userName: input.userName,
    });

    const topStories = await summarizeNewsTool({
      articles: input.newsStories,
      runningLevel: input.runningLevel,
      trainingPlanType: input.trainingPlanType,
      raceDistance: input.raceDistance,
    });

    const {output} = await prompt({
      ...input,
      greeting: greeting,
      topStories: topStories,
    });
    return output!;
  }
);

