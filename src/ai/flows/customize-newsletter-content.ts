
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
  weather: z.string().describe("The detailed weather information fetched from a weather service. This might include current conditions, temperature with unit, wind, and humidity. It could also be an error message like 'Could not retrieve weather for London.' or 'Weather service unavailable'."),
  weatherUnit: z.enum(["C", "F"]).describe("The user's preferred weather unit (Celsius or Fahrenheit). This is for the AI's reference to ensure the output language uses the correct unit symbol if temperature is mentioned."),
});
export type CustomizeNewsletterInput = z.infer<typeof CustomizeNewsletterInputSchema>;

const CustomizeNewsletterOutputSchema = z.object({
  greeting: z.string().describe('A friendly greeting with a running-related pun.'),
  weather: z.string().describe('A user-friendly summary of the local weather, formatted according to their preference. If weather data is unavailable, this should state so clearly.'),
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
    description: 'Summarizes and prioritizes running news stories based on relevance to the user. Provides top 5 stories.',
    inputSchema: z.object({
      articles: z
        .array(
          z.object({
            title: z.string().describe('The title of the article.'),
            url: z.string().url().describe('The URL of the article.'),
            content: z.string().describe('The full content of the article.'),
          })
        )
        .min(1) 
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
    ).max(5), 
    async handler(input) {
      // Placeholder: Simulates LLM-based summarization & prioritization
       // In a real scenario, this would involve more sophisticated logic, perhaps another LLM call.
      // For now, we'll just take the first 5 and add some placeholder summary text.
      return input.articles.slice(0, 5).map((article, index) => ({
        title: article.title,
        summary: `Personalized summary for ${input.runningLevel} runner targeting ${input.raceDistance}: ${article.content.substring(0, Math.min(150, article.content.length / 2))}... (Based on your ${input.trainingPlanType} plan).`,
        url: article.url,
        priority: index + 1, 
      }));
    },
  });

const generateGreetingTool = ai.defineTool({
  name: 'generateWorkoutPunGreeting',
  description: 'Generates a personalized greeting with a running-related pun for the specified user.',
  inputSchema: z.object({
    userName: z.string().describe('The name of the user.'),
  }),
  outputSchema: z.string().describe('The personalized greeting string, including a pun.'),
  async handler(input) {
    // Placeholder: Simulates LLM-based pun generation or retrieval
    const puns = [
      `Ready to hit the ground running, ${input.userName}? Hope your day is a marathon, not a sprint!`,
      `Time to lace up, ${input.userName}! May your run be swift and your coffee strong.`,
      `${input.userName}, let's make today legen-dairy with a great run!`,
      `Don't stop when you're tired, ${input.userName}, stop when you're done! Go get 'em!`,
      `Hey, ${input.userName}! Remember, every mile is a new adventure. Enjoy your run!`,
      `What's up, ${input.userName}? Ready to jog your memory on how awesome running is?`
    ];
    // Ensure a greeting is always returned
    return puns[Math.floor(Math.random() * puns.length)] || `Hello ${input.userName}, have a great run!`;
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

  Your response MUST be in JSON format, adhering to the defined output schema.

  Tasks to perform:
  1. Generate a personalized greeting: Use the 'generateWorkoutPunGreeting' tool. The user's name is {{{userName}}}.
  2. Provide local weather: The detailed weather string from the service is '{{{weather}}}'. Create a user-friendly summary for this. For example, if the input is "Clear sky, Temperature: 23°C. Wind: 5.4 km/h. Humidity: 60%.", you could output "Currently, it's a clear day with 23°C in {{location}}." If the input '{{{weather}}}' indicates an error or unavailability (e.g., "Could not retrieve weather...", "Weather service unavailable"), then your output for weather should clearly state that weather information is unavailable for {{location}} right now. The user's preferred temperature unit is '{{{weatherUnit}}}' for your reference if you mention temperature.
  3. Display scheduled workout: The workout for today is '{{{workout}}}'. Include this in the output.
  4. Summarize and prioritize news: Use the 'summarizeNews' tool to get the top 5 running news stories.
     - The articles to process are available in the 'newsStories' input field.
     - Consider the user's runningLevel: '{{{runningLevel}}}', trainingPlanType: '{{{trainingPlanType}}}', and raceDistance: '{{{raceDistance}}}' for relevance when the tool processes the news.
  5. Plan end notification: If the user's training plan has ended (this information might be implicitly part of the workout or overall context, if not directly passed, use your best judgment or await explicit instruction if a specific "plan_ended_flag" becomes available), include a 'planEndNotification' message encouraging them to update their profile. If no plan end is indicated, omit this field.

  User details available for your context and for tool usage:
  - Name: {{{userName}}}
  - Location: {{{location}}}
  - Running Level: {{{runningLevel}}}
  - Training Plan Type: {{{trainingPlanType}}}
  - Race Distance: {{{raceDistance}}}
  - Today's Workout: {{{workout}}}
  - Detailed Weather String (from service): {{{weather}}}
  - Preferred Weather Unit: {{{weatherUnit}}}
  - News Stories (for the summarizeNewsTool): {{{newsStories}}}

  Ensure the final output strictly follows the JSON schema for 'CustomizeNewsletterOutputSchema'.
`,
});

const customizeNewsletterFlow = ai.defineFlow(
  {
    name: 'customizeNewsletterFlow',
    inputSchema: CustomizeNewsletterInputSchema,
    outputSchema: CustomizeNewsletterOutputSchema,
  },
  async (input: CustomizeNewsletterInput) => {
    const {output} = await prompt(input);
    
    if (!output) {
      throw new Error('The customizeNewsletterFlow did not produce an output.');
    }
    return output;
  }
);
