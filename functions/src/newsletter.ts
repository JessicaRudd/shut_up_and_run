import * as functions from 'firebase-functions';
import { db } from './lib/firebase/admin';
import { fetchWeatherData } from './weatherCache';
import { fetchNewsData } from './newsCache';
import type { UserProfile, NewsletterContent } from './types';

interface NewsletterDelivery {
  email?: string;
  googleChat?: string;
}

export const generateAndDeliverNewsletter = functions.scheduler
  .onSchedule('0 0 * * *', async (event) => {
    try {
      // Get all users
      const usersSnapshot = await db.collection('users').get();
      
      for (const userDoc of usersSnapshot.docs) {
        const userProfile = userDoc.data() as UserProfile;
        const userId = userDoc.id;
        
        try {
          // Get user's timezone
          const userTimezone = userProfile.timezone || 'America/New_York';
          const userTime = new Date().toLocaleString('en-US', { timeZone: userTimezone });
          const userHour = new Date(userTime).getHours();
          
          // Only generate newsletter if it's after midnight in user's timezone
          if (userHour < 0 || userHour > 6) {
            console.log(`Skipping newsletter for user ${userId} - not after midnight in their timezone`);
            continue;
          }

          // Gather data
          const weatherData = await fetchWeatherData(userProfile.location);
          const newsData = await fetchNewsData(userProfile.newsSearchPreferences || [], userProfile.location);

          // Generate newsletter content
          const newsletterContent: NewsletterContent = {
            greeting: `Hey ${userProfile.name}, let's get ready to tackle those trails! Remember, every run is a step in the right direction.`,
            weather: `Today in ${weatherData.locationName} (${weatherData.date}), expect ${weatherData.overallDescription}. The high will be ${weatherData.tempMax}${userProfile.weatherUnit || 'F'} and the low ${weatherData.tempMin}${userProfile.weatherUnit || 'F'}. Sunrise is at ${weatherData.sunrise}, sunset at ${weatherData.sunset}, with an average humidity of ${weatherData.humidityAvg}%.`,
            workout: userProfile.trainingPlan?.currentWorkout || 'No workout scheduled for today.',
            topStories: newsData.map(article => ({
              title: article.title,
              summary: article.snippet,
              url: article.link,
              priority: 1 // Default priority
            })),
            planEndNotification: userProfile.raceDate && new Date(userProfile.raceDate) <= new Date() 
              ? `Your ${userProfile.trainingPlanType} training plan has ended. Consider updating your profile with a new training goal!`
              : 'Your training plan is still active. Keep up the great work!',
            dressMyRunSuggestion: [] // TODO: Implement dress my run suggestions based on weather
          };

          // Store newsletter in Firestore
          await db.collection('newsletters').add({
            userId,
            content: newsletterContent,
            generatedAt: new Date(),
            delivered: false
          });

          // Deliver newsletter based on user preferences
          const delivery: NewsletterDelivery = {};
          
          if (userProfile.newsletterDelivery?.email) {
            // TODO: Implement email delivery using SendGrid or similar
            delivery.email = userProfile.newsletterDelivery.email;
          }
          
          if (userProfile.newsletterDelivery?.googleChat) {
            // TODO: Implement Google Chat delivery
            delivery.googleChat = userProfile.newsletterDelivery.googleChat;
          }

          // Update delivery status
          if (Object.keys(delivery).length > 0) {
            await db.collection('newsletters').doc(userId).update({
              delivered: true,
              deliveryInfo: delivery
            });
          }

        } catch (error) {
          console.error(`Error processing newsletter for user ${userId}:`, error);
          // Continue with next user
          continue;
        }
      }
    } catch (error) {
      console.error('Error in newsletter generation:', error);
      throw error;
    }
  }); 