
import { config } from 'dotenv';
config();

// Removed: import '@/ai/flows/newsletter-summarization.ts'; // Assuming this was old RSS related
// Removed: import '@/ai/flows/summarize-running-news.ts'; // Assuming this was old RSS related
import '@/ai/flows/workout-pun-generator.ts';
// Removed: import '@/ai/flows/generate-running-pun.ts'; 
import '@/ai/flows/customize-newsletter-content.ts';
import '@/ai/tools/fetch-google-running-news-tool.ts'; // Ensure tools are loaded if they define flows or are part of one.
// Typically tools are defined and used within flow files, so explicit import here might only be for standalone tool testing via Genkit dev UI if it doesn't auto-discover.
// If fetch-google-running-news-tool.ts only defines a tool used by customize-newsletter-content.ts, this import might not be strictly necessary for the app to run,
// but helps ensure Genkit is aware of the tool during development if you're inspecting tools.
