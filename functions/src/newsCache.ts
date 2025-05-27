import * as functions from 'firebase-functions';
import { db } from './lib/firebase/admin';
import axios from 'axios';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import type { NewsArticle } from './types';

const secretManager = new SecretManagerServiceClient();

async function getSecret(secretName: string): Promise<string> {
  const [version] = await secretManager.accessSecretVersion({
    name: `projects/shut-up-and-run/secrets/${secretName}/versions/latest`,
  });
  return version.payload?.data?.toString() || '';
}

interface NewsCacheData {
  articles: NewsArticle[];
  timestamp: FirebaseFirestore.Timestamp;
}

export async function fetchNewsData(categories: string[], location?: string): Promise<NewsArticle[]> {
  // Check cache first
  const cacheKey = `${categories.sort().join('_')}_${location || 'global'}`;
  const cacheRef = db.collection('newsCache').doc(cacheKey);
  const cacheDoc = await cacheRef.get();
  if (cacheDoc.exists) {
    const cachedData = cacheDoc.data() as NewsCacheData;
    const cacheTime = cachedData.timestamp.toDate();
    const now = new Date();
    // Cache is valid for 30 minutes
    if (now.getTime() - cacheTime.getTime() < 1800000) {
      return cachedData.articles;
    }
  }
  // Get API credentials from Secret Manager
  const [apiKey, searchEngineId] = await Promise.all([
    getSecret('GOOGLE_SEARCH_API_KEY'),
    getSecret('GOOGLE_SEARCH_CX')
  ]);
  const searchPromises = categories.map(async (category: string) => {
    const query = `${category} running news ${location ? `in ${location}` : ''}`;
    const response = await axios.get(
      `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}`
    );
    return response.data.items?.map((item: any) => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet
    })) || [];
  });
  const results = await Promise.all(searchPromises);
  const articles = results.flat().slice(0, 10); // Limit to 10 articles total
  // Update cache
  await cacheRef.set({
    articles,
    timestamp: new Date()
  });
  return articles;
}

export const getNewsData = functions.https.onCall(async (request) => {
  const { categories, location } = request.data as { categories: string[]; location?: string };
  const context = request.auth;

  if (!context) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  try {
    return await fetchNewsData(categories, location);
  } catch (error) {
    console.error('Error fetching news data:', error);
    throw new functions.https.HttpsError('internal', 'Failed to fetch news data');
  }
}); 