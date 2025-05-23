"use client";

import { useEffect, useState } from "react";
import { summarizeNews, type SummarizeNewsOutput } from "@/ai/flows/newsletter-summarization";
import { mockArticles, type Article as MockArticleType } from "@/lib/mockNews";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Newspaper, ExternalLink } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function NewsSection() {
  const [news, setNews] = useState<SummarizeNewsOutput['topStories'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchNews() {
      setLoading(true);
      setError(null);
      try {
        // Ensure mockArticles match the expected input structure for summarizeNews
        const formattedArticles = mockArticles.map(article => ({
          title: article.title,
          url: article.url,
          content: article.content,
        }));
        const result = await summarizeNews({ articles: formattedArticles });
        // Sort by priority and take top 5
        const sortedStories = result.topStories
          .sort((a, b) => a.priority - b.priority)
          .slice(0, 5);
        setNews(sortedStories);
      } catch (err) {
        console.error("Error fetching news:", err);
        setError("Could not fetch the latest running news. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    fetchNews();
  }, []);

  if (loading) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center text-xl font-semibold">
            <Newspaper className="mr-2 h-6 w-6 text-primary" />
            Top Running News
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i}>
              <Skeleton className="h-5 w-3/4 mb-1" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6 mt-1" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center text-xl font-semibold">
            <Newspaper className="mr-2 h-6 w-6 text-primary" />
            Top Running News
          </CardTitle>
        </CardHeader>
        <CardContent>
           <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }


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
        {news && news.length > 0 ? (
          <ScrollArea className="h-[300px] pr-4"> {/* Added pr-4 for scrollbar spacing */}
            <ul className="space-y-4">
              {news.map((story, index) => (
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
        ) : (
          <p className="text-muted-foreground">No news stories available at the moment.</p>
        )}
      </CardContent>
    </Card>
  );
}
