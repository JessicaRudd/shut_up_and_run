
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
  dressMyRunSuggestion: z.string().describe('A detailed, itemized recommendation for what to wear for the run based on weather at the recommended run time. Should list specific items like "hat, sunglasses, t-shirt, shorts".'),
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
      // Enhanced placeholder handler
      const relevantArticles = input.articles.filter(article => 
        article.title.toLowerCase().includes(input.raceDistance.toLowerCase()) || 
        article.content.toLowerCase().includes(input.runningLevel.toLowerCase())
      );
      const articlesToSummarize = relevantArticles.length > 0 ? relevantArticles : input.articles;

      return articlesToSummarize.slice(0, 5).map((article, index) => ({
        title: article.title,
        summary: `Summary of "${article.title.substring(0,30)}..." considering ${input.runningLevel} level for ${input.raceDistance}.`,
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
    const puns = [
      "ready to hit the pavement?",
      "time to make some tracks!",
      "set for a new personal best today?",
      "going the distance, one step at a time!",
      "chasing that runner's high?"
    ];
    const randomPun = puns[Math.floor(Math.random() * puns.length)];
    return `Hey ${input.userName}, ${randomPun}`;
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
     - If '{{{weather.error}}}' exists in the input 'weather' object, your output for the 'weather' field MUST BE EXACTLY: "Weather forecast for {{{location}}} is currently unavailable: {{{weather.error}}}". Do not add any other text or summarization to this 'weather' field if an error is present. In this error case, the 'dressMyRunSuggestion' field should also indicate unavailability due to weather.
     - Otherwise (if '{{{weather.hourly}}}' exists and '{{{weather.error}}}' does not):
       - For the 'weather' output field, construct a single informative paragraph. 
       - Step 1: Present the overall daily forecast summary. This should include:
         - Location: '{{{weather.locationName}}}'
         - Date: '{{{weather.date}}}'
         - General description: '{{{weather.overallDescription}}}'
         - High and low temperatures: '{{{weather.tempMax}}}{{{weatherUnit}}}' and '{{{weather.tempMin}}}{{{weatherUnit}}}'
         - Sunrise and sunset times: '{{{weather.sunrise}}}' and '{{{weather.sunset}}}'
         - Average humidity: '{{{weather.humidityAvg}}}%'
       - Step 2: Analyze the '{{{weather.hourly}}}' data (which includes 'time', 'temp', 'feelsLike', 'description', 'pop' for precipitation chance, and 'windSpeed') to recommend the BEST time of day to run.
       - Step 3: Your recommendation should be specific (e.g., "around 7 AM" or "between 4 PM and 6 PM").
       - Step 4: Clearly explain your recommendation, considering factors like moderate temperatures (not too hot/cold), low chance of precipitation ('pop'), and moderate wind. Prioritize avoiding rain and extreme temperatures.
       - Combine the summary (Step 1) and the recommendation with explanation (Steps 2-4) into the single paragraph for the 'weather' output field.
       Example for good weather: "Today in {{{weather.locationName}}} ({{{weather.date}}}): {{{weather.overallDescription}}} Expect a high of {{{weather.tempMax}}}{{{weatherUnit}}} and a low of {{{weather.tempMin}}}{{{weatherUnit}}}. Sunrise is at {{{weather.sunrise}}} and sunset at {{{weather.sunset}}}. Average humidity will be around {{{weather.humidityAvg}}}%. The best time for your run looks to be around 8 AM when temperatures are pleasant (around {{{weather.hourly.[2].temp}}}{{{weatherUnit}}}) and before the chance of showers increases later in the day." (Note: hourly.[2] is just an example, you need to pick the best slot based on the data).

  3. Display scheduled workout: The workout for today is '{{{workout}}}'. Include this in the output.
  
  4. Summarize and prioritize news: Use the 'summarizeNews' tool to get the top 5 running news stories.
     - The articles to process are available in the 'newsStories' input field.
     - Consider the user's runningLevel: '{{{runningLevel}}}', trainingPlanType: '{{{trainingPlanType}}}', and raceDistance: '{{{raceDistance}}}' for relevance.
  
  5. Plan end notification: If the user's training plan has ended (this information might be implicitly part of the workout or overall context), include a 'planEndNotification' message encouraging them to update their profile. Omit if no plan end is indicated.

  6. Generate "Dress Your Run" suggestion:
     - Act as an expert running coach providing detailed clothing advice.
     - If the weather forecast was unavailable (i.e., '{{{weather.error}}}' was present in the weather input), output "Clothing recommendations are unavailable because the weather forecast could not be retrieved." for the 'dressMyRunSuggestion' field.
     - Otherwise, based on the specific weather conditions (temperature, 'feelsLike' temperature, precipitation chance 'pop', wind speed, and general description like 'sunny', 'cloudy') expected around the 'best time to run' you previously identified when generating the 'weather' field, provide a DETAILED, ITEMIZED clothing recommendation.
     - You must suggest specific types of clothing items. For example: "For your run around 7 AM (feels like 10{{{weatherUnit}}}, partly cloudy, 10% chance of rain, 5 mph wind):
        - Top: Lightweight, moisture-wicking long-sleeve shirt.
        - Bottoms: Running tights or leggings.
        - Head: Light beanie or headband.
        - Hands: Light gloves.
        - Optional: A light, packable windbreaker if you are sensitive to wind."
     - Consider different temperature ranges to guide your suggestions:
        - Hot (>25°C / 77°F): Suggest items like a tank top or very light short-sleeve shirt, light shorts, sunglasses, sun-protective hat/visor.
        - Warm (15-25°C / 59-77°F): Suggest items like a short-sleeve t-shirt, shorts or capris. Maybe a light vest if windy.
        - Mild/Cool (5-15°C / 41-59°F): Suggest items like a long-sleeve base layer, possibly a light jacket or vest (especially if windy/rainy), tights or running pants. Light gloves/headband for cooler end.
        - Cold (-5 to 5°C / 23-41°F): Suggest items like a thermal base layer, an insulating mid-layer (fleece/light jacket), possibly a wind/water-resistant outer shell, thermal tights, hat covering ears, gloves/mittens.
        - Very Cold (< -5°C / < 23°F): Suggest multiple layers (wicking base, insulating mid, protective outer), warm hat, neck gaiter/balaclava, warm gloves/mittens, windproof thermal tights.
     - Always consider 'pop' (chance of precipitation): if high, suggest a water-resistant or waterproof jacket appropriate for the temperature.
     - Always consider 'windSpeed': if high, suggest a windbreaker or wind-resistant layer.
     - If sunny, even if cool, suggest sunglasses.
     - Keep the suggestion concise but ensure it's a list of specific items. The output should be a single string, use newlines for itemization if helpful for readability in the final display.

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
    const {output} = await prompt(input); 
    
    if (!output) {
      console.error("AI prompt did not produce expected output for input:", JSON.stringify(input, null, 2));
      
      const fallbackGreeting = `Hello ${input.userName}, have a great run!`;
      let fallbackWeather: string;
      let fallbackDressSuggestion = "Clothing recommendations are currently unavailable.";

      // Check if input.weather itself is an error object or DailyForecastData with an error property
      const weatherHasError = typeof input.weather === 'object' && input.weather && 'error' in input.weather && typeof input.weather.error === 'string' && input.weather.error.length > 0;

      if (weatherHasError) {
        fallbackWeather = `Weather forecast for ${input.location} is currently unavailable: ${input.weather.error}`;
        fallbackDressSuggestion = `Clothing recommendations are unavailable because the weather forecast could not be retrieved: ${input.weather.error}`;
      } else {
        // Weather data was good, but AI failed.
        fallbackWeather = `Could not generate weather summary for ${input.location} at this time. Please try again later.`;
        // Dress suggestion also reflects AI failure with good weather data
        fallbackDressSuggestion = `Could not generate clothing recommendations for ${input.location} at this time. Please try again later.`;
      }
      
      const fallbackWorkout = input.workout || "No workout information available.";
      
      return {
        greeting: fallbackGreeting,
        weather: fallbackWeather,
        workout: fallbackWorkout,
        topStories: [], 
        planEndNotification: undefined, 
        dressMyRunSuggestion: fallbackDressSuggestion,
      };
    }
    return output;
  }
);

