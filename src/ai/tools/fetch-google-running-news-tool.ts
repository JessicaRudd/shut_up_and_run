'use server';
/**
 * @fileOverview A Genkit tool to fetch running news using Google Custom Search API.
 *
 * - fetchGoogleRunningNews - A function that uses the tool to get news.
 * - FetchGoogleRunningNewsInput - The input type for the tool.
 * - FetchGoogleRunningNewsOutput - The return type for the tool.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import axios from 'axios';
import type { NewsSearchCategory } from '@/lib/types';

const FetchGoogleRunningNewsInputSchema = z.object({
  userLocation: z.string().optional().describe("The user's location (e.g., city, region) for geographic news search. Can be omitted if not relevant or 'geographic_area' preference not selected."),
  searchCategories: z.array(z.string()).optional().describe("An array of news search preference categories selected by the user (e.g., ['running_tech', 'nutrition']). If empty or not provided, a general running news search will be performed."),
});
export type FetchGoogleRunningNewsInput = z.infer<typeof FetchGoogleRunningNewsInputSchema>;

const NewsArticleSchema = z.object({
  title: z.string().describe('The title of the news article.'),
  link: z.string().url().describe('The direct URL to the news article.'),
  snippet: z.string().describe('A short summary or snippet of the article content from the search result.'),
});
export type NewsArticle = z.infer<typeof NewsArticleSchema>;

const FetchGoogleRunningNewsOutputSchema = z.object({
  articles: z.array(NewsArticleSchema).describe("An array of fetched news articles, up to 5-10 results. Can be empty if no relevant results are found or if an error occurs."),
  error: z.string().optional().describe("An error message if the search operation failed."),
});
export type FetchGoogleRunningNewsOutput = z.infer<typeof FetchGoogleRunningNewsOutputSchema>;


// This is the actual tool definition
const fetchGoogleRunningNewsTool = ai.defineTool(
  {
    name: 'fetchGoogleRunningNewsTool',
    description: 'Fetches top running-related news articles from Google Search based on user preferences (categories, location) within the last 7 days. Returns a list of articles with titles, links, and snippets.',
    inputSchema: FetchGoogleRunningNewsInputSchema,
    outputSchema: FetchGoogleRunningNewsOutputSchema,
  },
  async (input) => {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const cx = process.env.GOOGLE_SEARCH_CX;

    if (!apiKey || !cx) {
      console.error("[fetchGoogleRunningNewsTool] Google Search API key or CX is not configured in .env file.");
      return { articles: [], error: "News service (Google Search) is not configured. API key or CX missing." };
    }

    let query = "running news";
    const searchKeywords: string[] = [];

    if (input.searchCategories && input.searchCategories.length > 0) {
      input.searchCategories.forEach(category => {
        switch (category as NewsSearchCategory) {
          case "geographic_area":
            if (input.userLocation) {
              searchKeywords.push(`in ${input.userLocation}`);
            }
            break;
          case "track_road_trail":
            searchKeywords.push("track running OR road running OR trail running");
            break;
          case "running_tech":
            searchKeywords.push("running technology OR running gadgets OR running watches OR running apps");
            break;
          case "running_apparel":
            searchKeywords.push("running shoes OR running apparel OR running gear");
            break;
          case "marathon_majors":
            searchKeywords.push("marathon majors OR Boston Marathon OR London Marathon OR Berlin Marathon OR Chicago Marathon OR New York City Marathon OR Tokyo Marathon");
            break;
          case "nutrition":
            searchKeywords.push("running nutrition OR runner hydration OR sports diet");
            break;
          case "training":
            searchKeywords.push("running training tips OR marathon training OR 5k training OR running workouts");
            break;
          default:
            searchKeywords.push(category); 
        }
      });
    }
    
    if (searchKeywords.length > 0) {
      query += ` ${searchKeywords.join(" OR ")}`;
    }

    const dateRestrict = "w1"; // Last 7 days

    try {
      console.log(`[fetchGoogleRunningNewsTool] Performing Google Search with query: "${query}", dateRestrict: "${dateRestrict}"`);
      const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
        params: {
          key: apiKey,
          cx: cx,
          q: query,
          num: 10, 
          dateRestrict: dateRestrict, 
        },
        headers: { 'User-Agent': 'ShutUpAndRunApp/1.0 (GenkitTool)' },
      });

      if (response.data && response.data.items) {
        console.log("[fetchGoogleRunningNewsTool] Raw Google Search API response data:", JSON.stringify(response.data, null, 2)); // Log raw response
        console.log(`[fetchGoogleRunningNewsTool] Google Search API returned ${response.data.items.length} raw items.`);
        const articles: NewsArticle[] = response.data.items.map((item: any) => ({
          title: item.title,
          link: item.link,
          snippet: item.snippet,
        })).filter((article: NewsArticle) => 
          article.link && 
          article.title && 
          article.snippet && 
          /^https?:\/\//i.test(article.link) // Ensure link starts with http/https
        );
        
        console.log("[fetchGoogleRunningNewsTool] Filtered articles array:", JSON.stringify(articles, null, 2)); // Log filtered articles
        console.log(`[fetchGoogleRunningNewsTool] Found ${articles.length} valid articles after filtering.`);
        return { articles };
      } else {
        console.log('[fetchGoogleRunningNewsTool] No items found in Google Search response.');
        return { articles: [], error: "No relevant news found for the selected preferences from Google Search." };
      }
    } catch (error: any) {
      console.error('[fetchGoogleRunningNewsTool] Error calling Google Search API:', error.response?.data?.error?.message || error.message);
      let errorMessage = "Failed to fetch news from Google Search.";
      if (error.response?.data?.error?.message) {
        errorMessage += ` Details: ${error.response.data.error.message}`;
      }
      return { articles: [], error: errorMessage };
    }
  }
);

export { fetchGoogleRunningNewsTool };
    