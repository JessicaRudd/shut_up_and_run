import { db } from './config';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';

export const userProfileService = {
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        return userDoc.data() as UserProfile;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  },

  async createUserProfile(userId: string, profile: UserProfile): Promise<void> {
    try {
      await setDoc(doc(db, 'users', userId), profile);
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
  },

  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, updates);
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  },

  async updateTrainingPlan(userId: string, trainingPlan: any): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { trainingPlan });
    } catch (error) {
      console.error('Error updating training plan:', error);
      throw error;
    }
  },

  async updateNewsletterPreferences(userId: string, preferences: any): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { newsletterPreferences: preferences });
    } catch (error) {
      console.error('Error updating newsletter preferences:', error);
      throw error;
    }
  }
}; 