"use client";

import type { CustomizeNewsletterOutput } from "@/ai/flows/customize-newsletter-content"; // Adjusted type
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Newspaper, ExternalLink } from "lucide-react";

interface NewsSectionProps {
  topStories: CustomizeNewsletterOutput['topStories'] | null;
}

export function NewsSection({ topStories }: NewsSectionProps) {
  if (!topStories || topStories.length === 0) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center text-xl font-semibold">
            <Newspaper className="mr-2 h-6 w-6 text-primary" />
            Top Running News
          </CardTitle>
          <CardDescription>Curated just for you.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No news stories available at the moment, or still loading.</p>
        </CardContent>
      </Card>
    );
  }
  
  // Sort by priority if not already sorted (assuming lower is better)
  const sortedStories = [...topStories].sort((a, b) => a.priority - b.priority);

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center text-xl font-semibold">
          <Newspaper className="mr-2 h-6 w-6 text-primary" />
          Top Running News
        </CardTitle>
        <CardDescription>Curated just for you.</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          <ul className="space-y-4">
            {sortedStories.map((story, index) => (
              <li key={index} className="pb-3 border-b border-border last:border-b-0">
                <a
                  href={story.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group"
                >
                  <h3 className="font-semibold text-md group-hover:text-primary group-hover:underline flex items-center">
                    {story.title}
                    <ExternalLink className="ml-1 h-3 w-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                  </h3>
                </a>
                <p className="text-sm text-muted-foreground mt-1">{story.summary}</p>
              </li>
            ))}
          </ul>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
