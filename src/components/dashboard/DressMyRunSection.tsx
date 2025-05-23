
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Shirt, Thermometer, Sun, Wind, CloudRain, Snowflake, Sparkles, ChevronsRight, Footprints, Glasses, Hand,
  CheckSquare, HelpCircle // HelpCircle for unknown, CheckSquare as generic accessory
} from "lucide-react"; 
import type { DressMyRunItem, DressMyRunItemCategory } from "@/ai/flows/customize-newsletter-content";

interface DressMyRunSectionProps {
  suggestion: DressMyRunItem[] | null | undefined | string; // Allow string for defensive check
}

const categoryToIconMap: Record<string, React.ElementType> = { // Use string for key
  "hat": Sparkles, 
  "visor": Sparkles, // Could be same as hat or more specific like a sun icon variant
  "sunglasses": Glasses,
  "headband": Sparkles, // Similar to hat
  "shirt": Shirt,
  "tank-top": Shirt, 
  "long-sleeve": Shirt,
  "base-layer": Shirt, 
  "mid-layer": Shirt, 
  "jacket": Wind, // Generic jacket icon, or Thermometer if for warmth
  "vest": Shirt, // Consider a specific vest icon if available or needed
  "windbreaker": Wind,
  "rain-jacket": CloudRain,
  "shorts": Footprints, // Representing lower body wear
  "capris": Footprints,
  "tights": Footprints,
  "pants": Footprints,
  "gloves": Hand,
  "mittens": Hand,
  "socks": Footprints, 
  "shoes": Footprints, 
  "gaiter": Sparkles, // Or Thermometer for warmth
  "balaclava": Sparkles, // Or Thermometer for warmth
  "accessory": CheckSquare, 
};

const getIconForCategory = (category: string): React.ElementType => { // Category is now string
  const lowerCategory = category.toLowerCase().trim();
  return categoryToIconMap[lowerCategory] || HelpCircle; // Default to HelpCircle if no match
};

export function DressMyRunSection({ suggestion }: DressMyRunSectionProps) {
  if (typeof suggestion === 'string') {
    // Defensive check: if suggestion is a string, the AI/flow didn't produce the expected array.
    return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center text-xl font-semibold">
            <Shirt className="mr-2 h-6 w-6 text-primary" />
            Dress Your Run
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Clothing suggestions are in an unexpected format. AI might have provided a plain string.
          </p>
          <p className="text-sm mt-2">Raw suggestion: {suggestion}</p>
        </CardContent>
      </Card>
    );
  }

  if (!suggestion || suggestion.length === 0) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center text-xl font-semibold">
            <Shirt className="mr-2 h-6 w-6 text-primary" />
            Dress Your Run
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {suggestion === null 
              ? "Clothing suggestion is being generated..." 
              : "No specific clothing suggestions available at this time. This could be due to unavailable weather data or the AI not providing details."
            }
          </p>
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
        <ul className="space-y-3">
          {suggestion.map((clothingItem, index) => {
            if (typeof clothingItem !== 'object' || !clothingItem || typeof clothingItem.item !== 'string' || typeof clothingItem.category !== 'string') {
              // Skip malformed items within the array
              return (
                <li key={`malformed-${index}`} className="flex items-center text-base text-destructive">
                  <HelpCircle className="mr-3 h-5 w-5 text-destructive shrink-0" />
                  <span>Malformed clothing item data.</span>
                </li>
              );
            }
            const IconComponent = getIconForCategory(clothingItem.category);
            return (
              <li key={index} className="flex items-center text-base">
                <IconComponent className="mr-3 h-5 w-5 text-primary shrink-0" />
                <span>{clothingItem.item}</span>
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-muted-foreground italic pt-3">
          Based on conditions around the recommended run time.
        </p>
      </CardContent>
    </Card>
  );
}

    