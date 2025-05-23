# **App Name**: Shut Up and Run

## Core Features:

- User Profile: User registration with preferences (name, location, running level, training plan type, race distance)
- Newsletter Generator: AI powered daily, customized newsletter generation that pulls in relevant information and inserts in appropriate sections (friendly greeting with a running related pun, local weather from the weather API, workout scheduled for that day from training plan, top 5 news stories from running sources - use LLM tool for selecting/prioritizing from available articles).
- Dashboard: User dashboard to display newsletter content
- Training Plan Generator: Algorithm to generate the multi-week training plan (5k, 10k, half marathon, marathon, 50k+), incorporating rest days, cross-training suggestions, and tailored to the user's running level.
- Workout scheduler: Workout Scheduler that calculates the scheduled workout each day and cross references it with the newsletter
- Preference Management: User preference management (the user should also be able to update their preferences at any time and the training plan and newsletter will update accordingly).
- Plan-end notification: End of Plan Notifications: Display messages in newsletter to update their profile when the plan ends.
- Newsletter Delivery: Newsletter delivery via email, text link, google chat message link (whatever is user preference)

## Style Guidelines:

- Primary color: A vivid, energetic orange (#FF7700), reminiscent of a sunrise during a run.
- Background color: A very light, warm gray (#F2F0EE), to provide a calming backdrop that won't distract from the content.
- Accent color: A vibrant, complementary yellow (#FFD700) for highlights and calls to action, suggesting progress and achievement.
- Clean and highly readable sans-serif font for body text.
- Use simple and modern icons related to running and weather conditions.
- Clean and organized layout with clear sections for weather, workout, and news.
- Subtle animations for loading and refreshing content.