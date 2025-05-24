
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
  location: z.string().describe('The location of the user.'),
  runningLevel: z.string().describe('The running level of the user (e.g., beginner, intermediate, advanced).'),
  trainingPlanType: z.string().describe('The type of training plan the user is following (e.g., 5k, 10k, half marathon, marathon).'),
  raceDistance: z.string().describe('The race distance the user is training for (derived from training plan).'),
  workout: z.string().describe('The workout scheduled for the user for the current day.'),
  newsStories: z
    .array(
      z.object({
        title: z.string().describe('The title of the news story.'),
        url: z.string().url().describe('The URL of the news story.'),
        content: z.string().describe('The content or snippet of the news story from RSS. This may not be the full article.'),
      })
    )
    .describe('An array of running-related news stories, potentially with snippets instead of full content.'),
  weather: z.union([
    DailyForecastDataSchema,
    z.object({ error: z.string() }).describe("An object containing an error message if weather data retrieval failed.")
  ]).describe("The structured daily weather forecast for the user's location, or an error object if retrieval failed."),
  weatherUnit: z.enum(["C", "F"]).describe("The user's preferred weather unit (Celsius or Fahrenheit). This is for the AI's reference to ensure the output language uses the correct unit symbol if temperature is mentioned."),
});
export type CustomizeNewsletterInput = z.infer<typeof CustomizeNewsletterInputSchema>;

const DressMyRunItemSchema = z.object({
  item: z.string().describe("The specific clothing item recommended, e.g., 'Lightweight, moisture-wicking t-shirt' or 'Sunglasses'."),
  category: z.string().describe("The general category of the clothing item. Examples: 'hat', 'shirt', 'shorts', 'jacket', 'sunglasses', 'gloves', 'accessory'. Aim for one of these: hat, visor, sunglasses, headband, shirt, tank-top, long-sleeve, base-layer, mid-layer, jacket, vest, windbreaker, rain-jacket, shorts, capris, tights, pants, gloves, mittens, socks, shoes, gaiter, balaclava, accessory."),
});
export type DressMyRunItem = z.infer<typeof DressMyRunItemSchema>;

const CustomizeNewsletterOutputSchema = z.object({
  greeting: z.string().describe('A friendly greeting with a running-related pun.'),
  weather: z.string().describe("A user-friendly summary of the day's local weather forecast, including a recommendation for the best time to run based on the provided hourly data. If weather data is unavailable or an error occurred, this should state so clearly and include the specific error message."),
  workout: z.string().describe('The workout scheduled for the user for the current day.'),
  topStories: z
    .array(
      z.object({
        title: z.string().describe('The title of the summarized article.'),
        summary: z.string().describe('A concise summary of the article snippet. If the original content is short, the summary might be very similar to it.'),
        url: z.string().url().describe('The URL of the article.'),
        priority: z
          .number()
          .int()
          .min(1)
          .max(5)
          .describe('The priority of the article (1 is highest).'),
      })
    )
    .max(5) // Ensure the output array has at most 5 stories
    .describe('An array of the top 5 summarized and prioritized news stories. If no news stories were provided or none are relevant, this should be an empty array.'),
  planEndNotification: z.string().optional().describe('A message to update the user profile when the plan ends.'),
  dressMyRunSuggestion: z.array(DressMyRunItemSchema).describe('A DETAILED, ITEMIZED list of clothing recommendations based on weather at the recommended run time. Each item must be an object with "item" (string) and "category" (string, e.g., "shirt", "hat"). If weather is unavailable, this should be an empty array.'),
});
export type CustomizeNewsletterOutput = z.infer<typeof CustomizeNewsletterOutputSchema>;


const summarizeNewsTool = ai.defineTool({
    name: 'summarizeAndPrioritizeNews',
    description: 'Processes a list of running news article snippets/descriptions from RSS feeds. Selects up to 5 of the most relevant articles for the user, prioritizes them (1=highest), and provides a concise summary for each based on the provided snippet. If a snippet is already short and concise, the summary may be very similar or identical to the snippet.',
    inputSchema: z.object({
      articles: z
        .array(
          z.object({
            title: z.string().describe('The title of the article.'),
            url: z.string().url().describe('The URL of the article.'),
            content: z.string().describe('The snippet/description of the article from RSS. This may not be the full article text.'),
          })
        )
        .describe('An array of running-related news articles, potentially with snippets instead of full content.'),
      userContext: z.object({
        runningLevel: z.string().describe('The running level of the user.'),
        trainingPlanType: z.string().describe('The type of training plan the user is following.'),
        raceDistance: z.string().describe('The race distance the user is training for.'),
      }).describe("User's running context for relevance assessment."),
    }),
    outputSchema: z.array(
      z.object({
        title: z.string().describe('The title of the summarized article.'),
        summary: z.string().describe('A concise summary of the article snippet. If the original content is short, the summary might be very similar to it.'),
        url: z.string().url().describe('The URL of the article.'),
        priority: z.number().int().min(1).max(5).describe('The priority of the article (1 is highest).'),
      })
    ).max(5).describe("An array of top 5 summarized news stories. Returns an empty array if no relevant articles are found or input is empty."),
    async handler(input) { 
      if (!input.articles || input.articles.length === 0) {
        return [];
      }
      
      const { articles, userContext } = input;
      const { runningLevel, raceDistance, trainingPlanType } = userContext;

      // Create a combined relevance string for matching against article content
      const relevanceKeywords = [
        raceDistance.toLowerCase(), 
        runningLevel.toLowerCase(), 
        trainingPlanType.toLowerCase(),
        "running", "race", "marathon", "training" // General keywords
      ].filter(Boolean).join(" ");

      // Score articles based on keyword occurrences in title and content
      const scoredArticles = articles.map(article => {
        const lowerTitle = article.title.toLowerCase();
        const lowerContent = article.content.toLowerCase();
        let score = 0;
        
        if (relevanceKeywords) {
            relevanceKeywords.split(" ").forEach(keyword => {
                if (keyword && lowerTitle.includes(keyword)) score += 2; // Higher weight for title match
                if (keyword && lowerContent.includes(keyword)) score += 1;
            });
        }
        // Bonus for "official", "results", "guide", "tips"
        if (lowerTitle.includes("official") || lowerContent.includes("official")) score +=1;
        if (lowerTitle.includes("results") || lowerContent.includes("results")) score +=1;
        if (lowerTitle.includes("guide") || lowerContent.includes("guide")) score +=1;
        if (lowerTitle.includes("tips") || lowerContent.includes("tips")) score +=1;
        
        // Small penalty for very short content if title is also short
        if (article.content.length < 50 && article.title.length < 30) score -=1;

        return { ...article, score };
      });

      // Sort by score (descending), then by original order (as a tie-breaker)
      const sortedArticles = scoredArticles.sort((a, b) => b.score - a.score);
      
      const top5Articles = sortedArticles.slice(0, 5);

      return top5Articles.map((article, index) => {
        let summary = article.content;
        // Ensure summary is concise but informative enough
        if (summary.length > 250) { 
          summary = summary.substring(0, 247) + "...";
        } else if (summary.length < 30 && article.title.length > summary.length) { 
            summary = `Read more about: "${article.title}". Original content was very short.`;
        } else if (summary.length < 30) {
             summary = "Brief update. Click link for more details.";
        }


        return {
          title: article.title,
          summary: summary,
          url: article.url,
          priority: index + 1, // Priority based on sorted order
        };
      });
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

  Your response MUST be in JSON format, adhering to the defined output schema. If newsStories input is empty or no relevant stories are found by the summarizeAndPrioritizeNews tool, the 'topStories' field in the output should be an empty array. The 'topStories' field must contain a maximum of 5 articles.

  Tasks to perform:
  1. Generate a personalized greeting: Use the 'generateWorkoutPunGreeting' tool. The user's name is {{{userName}}}.
  
  2. Provide local weather forecast and running recommendation:
     - The input 'weather' ({{{weather}}}) contains structured daily forecast data for {{{location}}} or an error object.
     - If '{{{weather.error}}}' exists in the input 'weather' object, your output for the 'weather' field MUST BE EXACTLY: "Weather forecast for {{{location}}} is currently unavailable: {{{weather.error}}}". Do not add any other text or summarization to this 'weather' field if an error is present. In this error case, the 'dressMyRunSuggestion' field should be an empty array.
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
  
  4. Summarize and prioritize news: Use the 'summarizeAndPrioritizeNews' tool to get the top 5 running news stories.
     - The articles to process are available in the 'newsStories' input field. These articles contain snippets or descriptions from RSS feeds, not necessarily full content. The tool should summarize these snippets.
     - Pass the user's context (runningLevel: '{{{runningLevel}}}', trainingPlanType: '{{{trainingPlanType}}}', raceDistance: '{{{raceDistance}}}') to the tool for relevance assessment.
     - If 'newsStories' is empty or the tool finds no relevant articles, 'topStories' in the output must be an empty array. Ensure no more than 5 stories are returned.
  
  5. Plan end notification: If the user's training plan has ended (this information might be implicitly part of the workout or overall context), include a 'planEndNotification' message encouraging them to update their profile. Omit if no plan end is indicated.

  6. Generate "Dress Your Run" suggestion for the 'dressMyRunSuggestion' field:
     - This field MUST be a JSON array of objects. Each object MUST have two keys: "item" (a string, e.g., "Lightweight, moisture-wicking t-shirt") and "category" (a string).
     - For the 'category' field, try to use one of these: "hat", "visor", "sunglasses", "headband", "shirt", "tank-top", "long-sleeve", "base-layer", "mid-layer", "jacket", "vest", "windbreaker", "rain-jacket", "shorts", "capris", "tights", "pants", "gloves", "mittens", "socks", "shoes", "gaiter", "balaclava", "accessory". If none of these fit perfectly, use a reasonable, concise category name.
     - Act as an expert running coach providing detailed clothing advice.
     - If the weather forecast was unavailable (i.e., '{{{weather.error}}}' was present in the weather input), the 'dressMyRunSuggestion' field MUST BE an empty array [].
     - Otherwise, based on the specific weather conditions (temperature, 'feelsLike' temperature, precipitation chance 'pop', wind speed, and general description like 'sunny', 'cloudy') expected around the 'best time to run' you previously identified when generating the 'weather' field, provide a DETAILED, ITEMIZED list of clothing recommendations.
     - Example item object: { "item": "Moisture-wicking short-sleeve shirt", "category": "shirt" }
     - Example full array output for 'dressMyRunSuggestion' for a cool morning:
       [
         { "item": "Lightweight beanie or headband", "category": "headband" },
         { "item": "Moisture-wicking long-sleeve shirt", "category": "long-sleeve" },
         { "item": "Running tights or leggings", "category": "tights" },
         { "item": "Light gloves", "category": "gloves" },
         { "item": "Possibly a light, packable windbreaker", "category": "windbreaker" }
       ]
     - Consider different temperature ranges to guide your suggestions:
        - Hot (>25°C / 77°F): Suggest items like a tank top or very light short-sleeve shirt, light shorts, sunglasses, sun-protective hat/visor. Categories: "tank-top", "shorts", "sunglasses", "hat", "visor".
        - Warm (15-25°C / 59-77°F): Suggest items like a short-sleeve t-shirt, shorts or capris. Maybe a light vest if windy. Categories: "shirt", "shorts", "capris", "vest".
        - Mild/Cool (5-15°C / 41-59°F): Suggest items like a long-sleeve base layer, possibly a light jacket or vest (especially if windy/rainy), tights or running pants. Light gloves/headband for cooler end. Categories: "long-sleeve", "base-layer", "jacket", "vest", "tights", "pants", "gloves", "headband".
        - Cold (-5 to 5°C / 23-41°F): Suggest items like a thermal base layer, an insulating mid-layer (fleece/light jacket), possibly a wind/water-resistant outer shell, thermal tights, hat covering ears, gloves/mittens. Categories: "base-layer", "mid-layer", "jacket", "tights", "hat", "gloves", "mittens".
        - Very Cold (< -5°C / < 23°F): Suggest multiple layers (wicking base, insulating mid, protective outer), warm hat, neck gaiter/balaclava, warm gloves/mittens, windproof thermal tights. Categories: "base-layer", "mid-layer", "jacket", "hat", "gaiter", "balaclava", "gloves", "mittens", "tights".
     - Always consider 'pop' (chance of precipitation): if high, suggest a "rain-jacket" appropriate for the temperature.
     - Always consider 'windSpeed': if high, suggest a "windbreaker" or wind-resistant layer.
     - If sunny, even if cool, suggest "sunglasses".

  User details for context and tool usage:
  - User Name: {{{userName}}}
  - Location: {{{location}}}
  - Running Level: {{{runningLevel}}}
  - Training Plan Type: {{{trainingPlanType}}}
  - Race Distance: {{{raceDistance}}}
  - Today's Workout: {{{workout}}}
  - Preferred Weather Unit: {{{weatherUnit}}}
  - Structured Weather Data or Error: {{{weather}}}
  - News Stories (for summarizeAndPrioritizeNews tool, these are snippets from RSS): {{{newsStories}}}

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
      
      const weatherInput = input.weather; // Alias for clarity
      const weatherHasError = typeof weatherInput === 'object' && weatherInput && 'error' in weatherInput && typeof weatherInput.error === 'string' && weatherInput.error.length > 0;

      if (weatherHasError) {
        // Directly use the error string from the weather input if it exists
        fallbackWeather = `Weather forecast for ${input.location} is currently unavailable: ${weatherInput.error}`;
      } else {
        fallbackWeather = `Could not generate weather summary for ${input.location} at this time. Please try again later.`;
      }
      
      const fallbackWorkout = input.workout || "No workout information available.";
      
      return {
        greeting: fallbackGreeting,
        weather: fallbackWeather,
        workout: fallbackWorkout,
        topStories: [], 
        planEndNotification: undefined, 
        dressMyRunSuggestion: [], 
      };
    }

    // Defensive check for dressMyRunSuggestion structure
    if (!Array.isArray(output.dressMyRunSuggestion)) {
        console.warn("AI output for dressMyRunSuggestion was not an array, attempting to correct. Received:", output.dressMyRunSuggestion);
        if (typeof output.dressMyRunSuggestion === 'string') {
            // AI might have hallucinated a string despite instructions
            try {
                const parsedSuggestion = JSON.parse(output.dressMyRunSuggestion as string);
                if (Array.isArray(parsedSuggestion)) {
                    // Further validate structure of parsed array items
                    output.dressMyRunSuggestion = parsedSuggestion.filter(item => 
                        typeof item === 'object' && item !== null && 
                        'item' in item && typeof item.item === 'string' &&
                        'category' in item && typeof item.category === 'string'
                    );
                } else {
                    output.dressMyRunSuggestion = []; // Parsed but not an array
                }
            } catch (e) {
                console.error("Could not parse string dressMyRunSuggestion from AI into array:", e);
                output.dressMyRunSuggestion = []; // Parsing failed
            }
        } else {
             output.dressMyRunSuggestion = []; // Not a string, not an array, default to empty
        }
    } else {
        // Ensure items in the array are correctly structured
        output.dressMyRunSuggestion = output.dressMyRunSuggestion.filter(item => 
            typeof item === 'object' && item !== null && 
            'item' in item && typeof item.item === 'string' &&
            'category' in item && typeof item.category === 'string'
        );
    }

    // Ensure topStories is an array and items are structured correctly
    if (!Array.isArray(output.topStories)) {
        console.warn("AI output for topStories was not an array. Defaulting to empty array. Received:", output.topStories);
        output.topStories = [];
    } else {
        output.topStories = output.topStories.filter(story => 
            typeof story === 'object' && story !== null &&
            typeof story.title === 'string' &&
            typeof story.summary === 'string' &&
            typeof story.url === 'string' &&
            typeof story.priority === 'number'
        ).slice(0, 5); // Ensure max 5 stories
    }
    
    if (output.topStories.length < 5 && input.newsStories.length > output.topStories.length) {
        // If AI returned fewer than 5 stories but more were available in the input, this might indicate a tool issue or overly strict filtering by AI.
        // For now, we trust the tool's output as filtered by the AI.
        // A more advanced strategy could involve directly taking more from input.newsStories if the tool underperforms.
        console.log(`AI returned ${output.topStories.length} stories, though ${input.newsStories.length} were provided as input to the tool.`);
    }


    return output;
  }
);
