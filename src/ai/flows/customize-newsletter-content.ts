
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
import type { DailyForecastData as LibDailyForecastData, HourlyWeatherData as LibHourlyWeatherData, NewsSearchCategory } from '@/lib/types';
import { fetchGoogleRunningNewsTool } from '@/ai/tools/fetch-google-running-news-tool';

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

const newsSearchCategoryValues = [
  "geographic_area", "track_road_trail", "running_tech", 
  "running_apparel", "marathon_majors", "nutrition", "training"
] as [NewsSearchCategory, ...NewsSearchCategory[]];


const CustomizeNewsletterInputSchema = z.object({
  userName: z.string().describe('The name of the user.'),
  location: z.string().describe('The location of the user for weather and potentially geographic news search.'),
  runningLevel: z.string().describe('The running level of the user (e.g., beginner, intermediate, advanced).'),
  trainingPlanType: z.string().describe('The type of training plan the user is following (e.g., 5k, 10k, half marathon, marathon).'),
  raceDistance: z.string().describe('The race distance the user is training for (derived from training plan).'),
  workout: z.string().describe('The workout scheduled for the user for the current day.'),
  weather: z.union([
    DailyForecastDataSchema,
    z.object({ error: z.string() }).describe("An object containing an error message if weather data retrieval failed.")
  ]).describe("The structured daily weather forecast for the user's location, or an error object if retrieval failed."),
  weatherUnit: z.enum(["C", "F"]).describe("The user's preferred weather unit (Celsius or Fahrenheit)."),
  newsSearchPreferences: z.array(z.enum(newsSearchCategoryValues)).optional().describe("User's preferred categories for news search. Can be empty or undefined if no preferences are set."),
});
export type CustomizeNewsletterInput = z.infer<typeof CustomizeNewsletterInputSchema>;

const DressMyRunItemSchema = z.object({
  item: z.string().describe("The specific clothing item recommended, e.g., 'Lightweight, moisture-wicking t-shirt' or 'Sunglasses'."),
  category: z.string().describe("The general category of the clothing item. Examples: 'hat', 'shirt', 'shorts', 'jacket', 'sunglasses', 'gloves', 'accessory'. Aim for one of these: hat, visor, sunglasses, headband, shirt, tank-top, long-sleeve, base-layer, mid-layer, jacket, vest, windbreaker, rain-jacket, shorts, capris, tights, pants, gloves, mittens, socks, shoes, gaiter, balaclava, accessory."),
});
export type DressMyRunItem = z.infer<typeof DressMyRunItemSchema>;
export type DressMyRunItemCategory = DressMyRunItem['category']; // For use in UI if needed


const CustomizeNewsletterOutputSchema = z.object({
  greeting: z.string().describe('A friendly greeting with a running-related pun.'),
  weather: z.string().describe("A user-friendly summary of the day's local weather forecast, including a recommendation for the best time to run based on the provided hourly data. If weather data is unavailable or an error occurred, this should state so clearly and include the specific error message."),
  workout: z.string().describe('The workout scheduled for the user for the current day.'),
  topStories: z
    .array(
      z.object({
        title: z.string().describe('The title of the summarized article.'),
        summary: z.string().describe('A concise summary of the article snippet from the search result. If the original snippet is short, the summary might be very similar to it.'),
        url: z.string().url().describe('The URL of the article.'),
        priority: z
          .number()
          .int()
          .min(1)
          .max(5)
          .describe('The priority of the article (1 is highest).'),
      })
    )
    .max(5) 
    .describe('An array of the top 5 summarized and prioritized news stories from Google Search. If no news stories were found or an error occurred with the news tool, this MUST be an empty array.'),
  planEndNotification: z.string().optional().describe('A message to update the user profile when the plan ends.'),
  dressMyRunSuggestion: z.array(DressMyRunItemSchema).describe('A DETAILED, ITEMIZED list of clothing recommendations based on weather at the recommended run time. Each item must be an object with "item" (string) and "category" (string, e.g., "shirt", "hat"). If weather is unavailable, this should be an empty array.'),
});
export type CustomizeNewsletterOutput = z.infer<typeof CustomizeNewsletterOutputSchema>;


const generateGreetingTool = ai.defineTool({
  name: 'generateWorkoutPunGreeting',
  description: 'Generates a personalized greeting with a running-related pun for the specified user.',
  inputSchema: z.object({
    userName: z.string().describe('The name of the user.'),
  }),
  outputSchema: z.string().describe('The personalized greeting string, including a pun.'),
  async handler(input) {
    console.log("[generateGreetingTool] Received input:", input);
    const puns = [
      "ready to hit the pavement?",
      "time to make some tracks!",
      "set for a new personal best today?",
      "going the distance, one step at a time!",
      "chasing that runner's high?"
    ];
    const randomPun = puns[Math.floor(Math.random() * puns.length)];
    const greeting = `Hey ${input.userName}, ${randomPun}`;
    console.log("[generateGreetingTool] Generated greeting:", greeting);
    return greeting;
  },
});

export async function customizeNewsletter(input: CustomizeNewsletterInput): Promise<CustomizeNewsletterOutput> {
  return customizeNewsletterFlow(input);
}

const prompt = ai.definePrompt({
  name: 'customizeNewsletterPrompt',
  input: {schema: CustomizeNewsletterInputSchema},
  output: {schema: CustomizeNewsletterOutputSchema},
  tools: [
    generateGreetingTool, 
    fetchGoogleRunningNewsTool 
  ],
  prompt: `You are a personalized newsletter generator for runners for Shut Up and Run. You will generate a newsletter based on the user's preferences, training plan, and daily weather forecast.

  Your response MUST be in JSON format, adhering to the defined output schema. 
  The 'topStories' field must contain exactly 5 articles if news is found, otherwise an empty array.
  If the 'fetchGoogleRunningNewsTool' returns an error or no articles, then the 'topStories' field in your JSON output MUST be an empty array ([]). Do not invent news stories.

  Tasks to perform:
  1. Generate a personalized greeting: Use the 'generateWorkoutPunGreeting' tool. The user's name is {{{userName}}}.

  2. Provide local weather forecast and running recommendation:
     - The input 'weather' ({{{weather}}}) contains structured daily forecast data for {{{location}}} or an error object.
     - If '{{{weather.error}}}' exists in the input 'weather' object (e.g., { "error": "City not found" } ), your output for the 'weather' field MUST BE EXACTLY: "Weather forecast for {{{location}}} is currently unavailable: {{{weather.error}}}". Do not add any other text or summarization to this 'weather' field if an error is present. In this error case, the 'dressMyRunSuggestion' field should be an empty array.
     - Otherwise (if '{{{weather.hourly}}}' exists and '{{{weather.error}}}' does not):
       - For the 'weather' output field, construct a single informative paragraph following these steps:
       - Step 1: Present the overall daily forecast summary in a narrative style. Start with "Today in {{{weather.locationName}}} ({{{weather.date}}}), expect {{{weather.overallDescription}}}." Then seamlessly include the high of {{{weather.tempMax}}}{{{weatherUnit}}} and low of {{{weather.tempMin}}}{{{weatherUnit}}}. Mention sunrise at {{{weather.sunrise}}} and sunset at {{{weather.sunset}}}, and an average humidity of {{{weather.humidityAvg}}}%. Do NOT use explicit labels like 'Location:', 'Date:', 'General description:', etc. The output should be a flowing sentence. Example: "Today in Atlanta (Sunday, May 25th), expect light rain and broken clouds. The high will be 77F and the low 74F. Sunrise is at 6:30 AM, sunset at 8:38 PM, with an average humidity of 72%."
       - Step 2: Analyze the '{{{weather.hourly}}}' data (which includes 'time', 'temp', 'feelsLike', 'description', 'pop' for precipitation chance, and 'windSpeed') to recommend the BEST time of day to run.
       - Step 3: Your recommendation should be specific (e.g., "around 7 AM" or "between 4 PM and 6 PM").
       - Step 4: Clearly explain your recommendation, considering factors like moderate temperatures (not too hot/cold), low chance of precipitation ('pop'), and moderate wind. Prioritize avoiding rain and extreme temperatures.
       - Combine the summary (Step 1) and the recommendation with explanation (Steps 2-4) into a single, coherent paragraph for the 'weather' output field.

  3. Display scheduled workout: The workout for today is '{{{workout}}}'. Include this in the output.

  4. Fetch, summarize, and prioritize news: Use the 'fetchGoogleRunningNewsTool' to get running news stories.
     - Pass the user's 'newsSearchPreferences' ({{{newsSearchPreferences}}}) and 'location' ({{{location}}}) to the tool.
     - The tool will return a list of articles with titles, links, and snippets, or an error if fetching failed.
     - From the articles returned by the tool, select up to 5 of the most relevant and interesting stories for the user.
     - For each selected story, provide a concise summary based on its snippet.
     - Assign a priority (1=highest) to each selected story.
     - CRITICAL: If the 'fetchGoogleRunningNewsTool' returns an error or its 'articles' array is empty, the 'topStories' field in your JSON output MUST be an empty array ([]). Do NOT generate placeholder or fake news.

  5. Plan end notification: If the user's training plan has ended (indicated by the workout text), include a 'planEndNotification' message. Omit if no plan end is indicated.

  6. Generate "Dress Your Run" suggestion for the 'dressMyRunSuggestion' field:
     - This field MUST be a JSON array of objects. Each object MUST have "item" (string, e.g., "Lightweight t-shirt") and "category" (string, from predefined list like "shirt", "hat", "jacket", "shorts", "sunglasses", "gloves", etc. Use common, general categories from this list: hat, visor, sunglasses, headband, shirt, tank-top, long-sleeve, base-layer, mid-layer, jacket, vest, windbreaker, rain-jacket, shorts, capris, tights, pants, gloves, mittens, socks, shoes, gaiter, balaclava, accessory).
     - If weather forecast was unavailable ('{{{weather.error}}}' present), 'dressMyRunSuggestion' MUST BE an empty array [].
     - Otherwise, based on weather at the 'best time to run' you identified, provide a DETAILED, ITEMIZED list of clothing recommendations.
     - Consider temperature, 'feelsLike', precipitation 'pop', 'windSpeed', and general description ('sunny', 'cloudy').

  User details for context and tool usage:
  - User Name: {{{userName}}}
  - Location: {{{location}}}
  - Running Level: {{{runningLevel}}}
  - Training Plan Type: {{{trainingPlanType}}}
  - Race Distance: {{{raceDistance}}}
  - Today's Workout: {{{workout}}}
  - Preferred Weather Unit: {{{weatherUnit}}}
  - Structured Weather Data or Error: {{{weather}}}
  - News Search Preferences: {{{newsSearchPreferences}}}

  Ensure the final output strictly follows the JSON schema for 'CustomizeNewsletterOutputSchema'.
`,
});

const customizeNewsletterFlow = ai.defineFlow(
  {
    name: 'customizeNewsletterFlow',
    inputSchema: CustomizeNewsletterInputSchema,
    outputSchema: CustomizeNewsletterOutputSchema,
  },
  async (input: CustomizeNewsletterInput): Promise<CustomizeNewsletterOutput> => {
    console.log("[customizeNewsletterFlow] Input received by the flow:", JSON.stringify(input, null, 2));
    const {output} = await prompt(input);

    if (!output) {
      console.error("[customizeNewsletterFlow] AI prompt did not produce any output for input:", JSON.stringify(input, null, 2));
      
      const fallbackGreeting = `Hello ${input.userName}, your personalized newsletter could not be generated by the AI at this time.`;
      let fallbackWeather: string;
      const weatherInput = input.weather; 
      const weatherHasError = typeof weatherInput === 'object' && weatherInput && 'error' in weatherInput && typeof weatherInput.error === 'string' && weatherInput.error.length > 0;

      if (weatherHasError) {
        fallbackWeather = `Weather forecast for ${input.location} is currently unavailable: ${weatherInput.error}`;
      } else {
        fallbackWeather = `Could not generate weather summary and running recommendation for ${input.location} at this time due to an AI processing issue.`;
      }
      const fallbackWorkout = input.workout || "No workout information available.";
      
      const fallbackResult: CustomizeNewsletterOutput = {
        greeting: fallbackGreeting,
        weather: fallbackWeather,
        workout: fallbackWorkout,
        topStories: [], 
        planEndNotification: undefined,
        dressMyRunSuggestion: [], 
      };
      console.log("[customizeNewsletterFlow] Returning fallback due to no AI output:", fallbackResult);
      return fallbackResult;
    }
    console.log("[customizeNewsletterFlow] AI prompt produced output:", JSON.stringify(output, null, 2));


    // Safeguard for topStories
    if (!Array.isArray(output.topStories)) { 
        console.warn("[customizeNewsletterFlow] AI output for topStories was not an array or was missing. Defaulting to empty array. Received:", output.topStories);
        output.topStories = [];
    } else { 
        output.topStories = output.topStories.filter(story =>
            typeof story === 'object' && story !== null &&
            typeof story.title === 'string' &&
            typeof story.summary === 'string' &&
            typeof story.url === 'string' && 
            typeof story.priority === 'number'
        ).slice(0, 5); 
    }
    
    // Safeguard for dressMyRunSuggestion
    if (!Array.isArray(output.dressMyRunSuggestion)) {
        console.warn("[customizeNewsletterFlow] AI output for dressMyRunSuggestion was not an array. Received:", output.dressMyRunSuggestion, "Defaulting to empty array.");
        output.dressMyRunSuggestion = [];
    } else {
        output.dressMyRunSuggestion = output.dressMyRunSuggestion.filter(item =>
            typeof item === 'object' && item !== null &&
            'item'in item && typeof item.item === 'string' &&
            'category' in item && typeof item.category === 'string'
        );
    }
    
    // Ensure dressMyRunSuggestion is empty if weather had an error, even if AI hallucinates it
    const weatherInput = input.weather;
    const weatherHasError = typeof weatherInput === 'object' && weatherInput && 'error' in weatherInput && typeof weatherInput.error === 'string' && weatherInput.error.length > 0;
    if (weatherHasError && output.dressMyRunSuggestion.length > 0) {
        console.warn("[customizeNewsletterFlow] Weather had an error, but AI generated dressMyRunSuggestion. Overriding to empty array.");
        output.dressMyRunSuggestion = [];
    }

    // Prevent fake news if input news was empty
    const newsToolInput = await fetchGoogleRunningNewsTool({ userLocation: input.location, searchCategories: input.newsSearchPreferences });
    if ((!newsToolInput.articles || newsToolInput.articles.length === 0) && output.topStories.length > 0) {
      console.warn("[customizeNewsletterFlow] News tool returned no articles, but AI generated topStories. Overriding to empty array.");
      output.topStories = [];
    }
    
    console.log("[customizeNewsletterFlow] Returning processed output:", JSON.stringify(output, null, 2));
    return output;
  }
);

