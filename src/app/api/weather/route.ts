import { getFunctions, httpsCallable } from 'firebase/functions';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { location, unit } = await request.json();

    if (!location) {
      return NextResponse.json(
        { error: 'Location is required' },
        { status: 400 }
      );
    }

    // Initialize Firebase Functions
    const functions = getFunctions();
    const getWeatherData = httpsCallable(functions, 'weather-getData');

    // Call the Cloud Function
    const result = await getWeatherData({ location, unit });

    return NextResponse.json(result.data);
  } catch (error: any) {
    console.error('[Weather API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch weather data' },
      { status: 500 }
    );
  }
} 