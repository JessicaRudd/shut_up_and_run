
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shirt } from "lucide-react"; 

interface DressMyRunSectionProps {
  suggestion: string | null | undefined;
}

export function DressMyRunSection({ suggestion }: DressMyRunSectionProps) {
  if (!suggestion) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center text-xl font-semibold">
            <Shirt className="mr-2 h-6 w-6 text-primary" />
            Dress Your Run
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Clothing suggestion will appear here once available.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center text-xl font-semibold">
          <Shirt className="mr-2 h-6 w-6 text-primary" />
          Dress Your Run
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-lg">{suggestion}</p>
      </CardContent>
    </Card>
  );
}
