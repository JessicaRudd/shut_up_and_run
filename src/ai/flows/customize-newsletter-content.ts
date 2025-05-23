
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
import type { DailyForecastData as LibDailyForecastData, HourlyWeatherData as LibHourlyWeatherData } from '@/lib/types';

// Zod schema for HourlyWeatherData (mirroring lib/types)
const HourlyWeatherDataSchema = z.object({
  time: z.string().describe("Time of the forecast segment, e.g., '9:00 AM'"),
  temp: z.number().describe("Temperature for this segment."),
  feelsLike: z.number().describe("Feels like temperature for this segment."),
  description: z.string().describe("Weather description, e.g., 'Light Rain'"),
  pop: z.number().min(0).max(100).describe("Probability of precipitation (0-100%)."),
  windSpeed: z.number().describe("Wind speed in user's preferred unit."),
  windGust: z.number().optional().describe("Wind gust speed."),
  icon: z.string().describe("Weather icon code."),
});
export type HourlyWeatherData = z.infer<typeof HourlyWeatherDataSchema>;


// Zod schema for DailyForecastData (mirroring lib/types)
const DailyForecastDataSchema = z.object({
  locationName: z.string().describe("Name of the location, e.g., 'London'"),
  date: z.string().describe("Date of the forecast, e.g., 'Tuesday, July 30th'"),
  overallDescription: z.string().describe("A general summary of the day's weather, e.g., 'Cloudy with periods of rain, clearing later.'"),
  tempMin: z.number().describe("Minimum temperature for the day."),
  tempMax: z.number().describe("Maximum temperature for the day."),
  sunrise: z.string().describe("Sunrise time, e.g., '6:00 AM'"),
  sunset: z.string().describe("Sunset time, e.g., '8:30 PM'"),
  humidityAvg: z.number().describe("Average humidity for the day (percentage)."),
  windAvg: z.number().describe("Average wind speed for the day (in user's preferred unit)."),
  hourly: z.array(HourlyWeatherDataSchema).describe("Array of hourly (or 3-hourly) forecast segments for the day."),
  error: z.string().optional().describe("Error message if fetching forecast failed."),
});
export type DailyForecastData = z.infer<typeof DailyForecastDataSchema>;


const CustomizeNewsletterInputSchema = z.object({
  userName: z.string().describe('The name of the user.'),
  location: z.string().describe('The location of the user.'), // Retained for context, even if weather object has it
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
  weather: z.union([
    DailyForecastDataSchema,
    z.object({ error: z.string() }).describe("An object containing an error message if weather data retrieval failed.")
  ]).describe("The structured daily weather forecast for the user's location, or an error object if retrieval failed."),
  weatherUnit: z.enum(["C", "F"]).describe("The user's preferred weather unit (Celsius or Fahrenheit). This is for the AI's reference to ensure the output language uses the correct unit symbol if temperature is mentioned."),
});
export type CustomizeNewsletterInput = z.infer<typeof CustomizeNewsletterInputSchema>;

const CustomizeNewsletterOutputSchema = z.object({
  greeting: z.string().describe('A friendly greeting with a running-related pun.'),
  weather: z.string().describe("A user-friendly summary of the day's local weather forecast, including a recommendation for the best time to run based on the provided hourly data. If weather data is unavailable or an error occurred, this should state so clearly and include the specific error message."),
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
      if (!input.articles || input.articles.length === 0) {
        return [];
      }
      // Placeholder summarization and prioritization - LLM will do the real work via prompt
      return input.articles.slice(0, 5).map((article, index) => ({
        title: article.title,
        summary: `Summary for ${input.runningLevel} runner targeting ${input.raceDistance}: ${article.content.substring(0, Math.min(100, article.content.length))}...`,
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
    // Placeholder pun generation - LLM will do the real work via prompt
    const puns = [
      `Ready to hit the ground running, ${input.userName}? Hope your day is a marathon, not a sprint!`,
      `Time to lace up, ${input.userName}! May your run be swift and your coffee strong.`,
      `${input.userName}, let's make today legen-dairy with a great run!`,
    ];
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
  prompt: `You are a personalized newsletter generator for runners for Shut Up and Run. You will generate a newsletter based on the user's preferences, training plan, and daily weather forecast.

  Your response MUST be in JSON format, adhering to the defined output schema.

  Tasks to perform:
  1. Generate a personalized greeting: Use the 'generateWorkoutPunGreeting' tool. The user's name is {{{userName}}}.
  
  2. Provide local weather forecast and running recommendation:
     - The input 'weather' ({{{weather}}}) contains structured daily forecast data for {{{location}}} or an error object.
     - If '{{{weather.error}}}' exists, your output for the 'weather' field MUST BE EXACTLY: "Weather forecast for {{{location}}} is currently unavailable: {{{weather.error}}}". Do not add any other text or summarization to this 'weather' field if an error is present in the input 'weather' object.
     - Otherwise (if '{{{weather.hourly}}}' exists and '{{{weather.error}}}' does not):
       - Create a user-friendly summary of the day's forecast based on '{{{weather.overallDescription}}}', '{{{weather.tempMin}}}', '{{{weather.tempMax}}}', '{{{weather.sunrise}}}', '{{{weather.sunset}}}', '{{{weather.humidityAvg}}}'. Mention temperatures with the user's preferred unit ('{{{weatherUnit}}}').
       - Analyze the '{{{weather.hourly}}}' data (time, temp, feelsLike, description, pop, windSpeed) to recommend the BEST time of day to run. 
       - Your recommendation should be specific (e.g., "around 7 AM" or "between 4 PM and 6 PM").
       - Explain your recommendation (e.g., "to take advantage of cooler temperatures before the afternoon heat," or "to avoid the expected rain showers around noon and high winds in the evening").
       - Consider factors like temperature (not too hot/cold), low chance of precipitation (pop), and moderate wind. Prioritize avoiding rain and extreme temperatures.
       - Combine the forecast summary and the running recommendation into a single, informative paragraph for the 'weather' output field.
       Example for good weather: "Today in {{{weather.locationName}}} ({{{weather.date}}}): {{{weather.overallDescription}}} Expect a high of {{{weather.tempMax}}}{{{weatherUnit}}} and a low of {{{weather.tempMin}}}{{{weatherUnit}}}. Sunrise is at {{{weather.sunrise}}} and sunset at {{{weather.sunset}}}. Average humidity will be around {{{weather.humidityAvg}}}%. The best time for your run looks to be around 8 AM when temperatures are pleasant (around {{{weather.hourly.[2].temp}}}{{{weatherUnit}}}) and before the chance of showers increases later in the day." (Note: hourly.[2] is just an example, you need to pick the best slot based on the data).

  3. Display scheduled workout: The workout for today is '{{{workout}}}'. Include this in the output.
  
  4. Summarize and prioritize news: Use the 'summarizeNews' tool to get the top 5 running news stories.
     - The articles to process are available in the 'newsStories' input field.
     - Consider the user's runningLevel: '{{{runningLevel}}}', trainingPlanType: '{{{trainingPlanType}}}', and raceDistance: '{{{raceDistance}}}' for relevance.
  
  5. Plan end notification: If the user's training plan has ended (this information might be implicitly part of the workout or overall context), include a 'planEndNotification' message encouraging them to update their profile. Omit if no plan end is indicated.

  User details for context and tool usage:
  - Name: {{{userName}}}
  - Location: {{{location}}}
  - Running Level: {{{runningLevel}}}
  - Training Plan Type: {{{trainingPlanType}}}
  - Race Distance: {{{raceDistance}}}
  - Today's Workout: {{{workout}}}
  - Preferred Weather Unit: {{{weatherUnit}}}
  - Structured Weather Data or Error: {{{weather}}}
  - News Stories (for summarizeNewsTool): {{{newsStories}}}

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
    const {output} = await prompt(input); // The LLM will use the tools as needed.
    
    if (!output) {
      // Fallback in case the LLM fails to produce an output matching the schema
      console.error("AI prompt did not produce expected output for input:", JSON.stringify(input, null, 2));
      
      // Construct a minimal valid output
      const fallbackGreeting = `Hello ${input.userName}, have a great run!`;
      
      let fallbackWeather: string;
      if (typeof input.weather === 'object' && input.weather && 'error' in input.weather && typeof input.weather.error === 'string') {
        fallbackWeather = `Weather forecast for ${input.location} is currently unavailable: ${input.weather.error}`;
      } else {
        fallbackWeather = `Weather information for ${input.location} is currently being processed.`;
      }
      
      const fallbackWorkout = input.workout || "No workout information available.";
      
      return {
        greeting: fallbackGreeting,
        weather: fallbackWeather,
        workout: fallbackWorkout,
        topStories: [], // Can't generate news without AI
        planEndNotification: undefined, 
      };
    }
    return output;
  }
);

