
// src/services/newsService.ts
'use server';

import Parser from 'rss-parser';
import type { NewsArticleAIInput } from '@/lib/constants';

// Define the structure of items we expect from rss-parser
interface ParsedRSSItem {
  title?: string;
  link?: string;
  contentSnippet?: string; // Often a short summary from <description>
  content?: string;        // Full content if available from <content:encoded>
  'content:encoded'?: string; // Another common field for full content
  isoDate?: string;
  pubDate?: string;
}

export async function fetchAndParseRSSFeeds(feedUrls: string[]): Promise<NewsArticleAIInput[]> {
  const parser = new Parser<Record<string, any>, ParsedRSSItem>({
    customFields: {
      item: ['contentSnippet', 'content', 'content:encoded', 'pubDate', 'dc:creator'], 
    }
  });
  
  const articles: NewsArticleAIInput[] = [];
  const MAX_ARTICLES_PER_FEED = 5; 
  const MAX_TOTAL_ARTICLES = 30; 

  console.log('[NewsService] Starting to fetch RSS feeds:', feedUrls);

  for (const url of feedUrls) {
    if (articles.length >= MAX_TOTAL_ARTICLES) {
      console.log('[NewsService] Reached max total articles limit.');
      break;
    }
    try {
      console.log(`[NewsService] Fetching feed: ${url}`);
      const feed = await parser.parseURL(url);
      console.log(`[NewsService] Successfully fetched and parsed: ${feed.title || 'Untitled Feed'} (Found ${feed.items.length} items)`);
      
      let articlesFromThisFeed = 0;
      for (const item of feed.items) {
        if (articles.length >= MAX_TOTAL_ARTICLES || articlesFromThisFeed >= MAX_ARTICLES_PER_FEED) {
          break;
        }
        
        if (item.title && item.link) {
          // Prioritize more complete content fields, then snippet
          const itemContent = item['content:encoded'] || item.content || item.contentSnippet || 'No content snippet available.';
          
          // Basic sanitization: remove HTML tags for AI processing if it's a snippet
          const plainTextContent = itemContent.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
          
          articles.push({
            title: item.title.trim(),
            url: item.link,
            // Truncate content to avoid overly long inputs to AI, ensuring it's a reasonable snippet
            content: plainTextContent.substring(0, 500), 
          });
          articlesFromThisFeed++;
        } else {
          if (!item.title) console.warn(`[NewsService] Feed item in ${url} missing title.`);
          if (!item.link) console.warn(`[NewsService] Feed item in ${url} (title: ${item.title || 'N/A'}) missing link.`);
        }
      }
      console.log(`[NewsService] Added ${articlesFromThisFeed} articles from ${url}. Total articles now: ${articles.length}`);
    } catch (error: any) {
      console.error(`[NewsService] Error fetching or parsing RSS feed ${url}:`, error.message);
      if (error.message && error.message.includes('Invalid XML')) {
        console.warn(`[NewsService] Feed ${url} might have invalid XML structure.`);
      }
      // Continue to next feed even if one fails
    }
  }

  console.log(`[NewsService] Total articles fetched and processed for AI: ${articles.length}`);
  return articles;
}
