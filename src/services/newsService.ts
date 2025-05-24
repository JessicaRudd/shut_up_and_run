// src/services/newsService.ts
'use server';

import Parser from 'rss-parser';
import type { NewsArticleAIInput } from '@/lib/constants';

// Define the structure of items we expect from rss-parser
interface ParsedRSSItem {
  title?: string;
  link?: string;
  contentSnippet?: string; // Often a short summary
  content?: string;        // Sometimes more detailed content
  isoDate?: string;
  pubDate?: string;
}

export async function fetchAndParseRSSFeeds(feedUrls: string[]): Promise<NewsArticleAIInput[]> {
  const parser = new Parser<Record<string, any>, ParsedRSSItem>({
    customFields: {
      item: ['contentSnippet', 'content:encoded', 'pubDate'], // Ensure we attempt to get these
    }
  });
  
  const articles: NewsArticleAIInput[] = [];
  const MAX_ARTICLES_PER_FEED = 5; // Limit articles per feed to keep total manageable
  const MAX_TOTAL_ARTICLES = 25; // Overall limit for articles sent to AI

  console.log('[NewsService] Starting to fetch RSS feeds:', feedUrls);

  for (const url of feedUrls) {
    if (articles.length >= MAX_TOTAL_ARTICLES) {
      console.log('[NewsService] Reached max total articles limit.');
      break;
    }
    try {
      console.log(`[NewsService] Fetching feed: ${url}`);
      const feed = await parser.parseURL(url);
      console.log(`[NewsService] Successfully fetched and parsed: ${feed.title} (Items: ${feed.items.length})`);
      
      let articlesFromThisFeed = 0;
      for (const item of feed.items) {
        if (articles.length >= MAX_TOTAL_ARTICLES || articlesFromThisFeed >= MAX_ARTICLES_PER_FEED) {
          break;
        }
        
        if (item.title && item.link) {
          // Prefer 'content' (often full or more detailed), fallback to 'contentSnippet', then a very short default.
          const content = item.content || item.contentSnippet || 'No content snippet available.';
          
          articles.push({
            title: item.title,
            url: item.link,
            content: content.substring(0, 1000), // Truncate content to avoid overly long inputs to AI
          });
          articlesFromThisFeed++;
        }
      }
    } catch (error: any) {
      console.error(`[NewsService] Error fetching or parsing RSS feed ${url}:`, error.message);
      // Continue to next feed even if one fails
    }
  }

  console.log(`[NewsService] Total articles fetched: ${articles.length}`);
  return articles;
}
