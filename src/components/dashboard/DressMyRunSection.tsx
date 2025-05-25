
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Shirt, // Main section icon & for shirt items
  Sun,   // For visor, sunglasses
  Wind,  // For jackets, windbreakers
  CloudRain, // For rain-jackets
  Footprints, // For lower body wear, shoes, socks
  Glasses, // Specifically for sunglasses
  Hand,  // For gloves, mittens
  UserCircle, // For hats, headbands, general headwear
  CheckSquare, // For generic accessories
  HelpCircle // Fallback for unknown categories
} from "lucide-react"; 
import type { DressMyRunItem } from "@/ai/flows/customize-newsletter-content";

interface DressMyRunSectionProps {
  suggestion: DressMyRunItem[] | null | undefined | string; // Allow string for defensive check
}

const categoryToIconMap: Record<string, React.ElementType> = {
  "hat": UserCircle,
  "visor": Sun,
  "sunglasses": Glasses,
  "headband": UserCircle,
  "shirt": Shirt,
  "tank-top": Shirt, // Using Shirt as a general top
  "long-sleeve": Shirt, // Using Shirt as a general top
  "base-layer": Shirt, // Using Shirt as a general top
  "mid-layer": Shirt, // Using Shirt as a general top
  "jacket": Wind, // General jacket
  "vest": Shirt, // No specific vest icon, using Shirt as upper body garment
  "windbreaker": Wind,
  "rain-jacket": CloudRain,
  "shorts": Footprints, // Representing lower body wear
  "capris": Footprints, // Representing lower body wear
  "tights": Footprints, // Representing lower body wear
  "pants": Footprints, // Representing lower body wear
  "gloves": Hand,
  "mittens": Hand,
  "socks": Footprints, // Representing footwear related
  "shoes": Footprints, // Representing footwear
  "gaiter": UserCircle, // Often neck/headwear
  "balaclava": UserCircle, // Headwear
  "accessory": CheckSquare, // Generic accessory
};

const getIconForCategory = (category: string): React.ElementType => {
  const lowerCategory = category.toLowerCase().trim().replace('-', ' '); // Normalize hyphens too
  
  // Direct match
  if (categoryToIconMap[lowerCategory]) {
    return categoryToIconMap[lowerCategory];
  }

  // Handle cases where category might be "long sleeve shirt" vs "long-sleeve"
  if (lowerCategory.includes("shirt") || lowerCategory.includes("top")) return Shirt;
  if (lowerCategory.includes("short") || lowerCategory.includes("pant") || lowerCategory.includes("tight")) return Footprints;
  if (lowerCategory.includes("jacket")) return Wind;
  if (lowerCategory.includes("hat") || lowerCategory.includes("cap") || lowerCategory.includes("beanie") || lowerCategory.includes("head")) return UserCircle;


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
            Clothing suggestions are in an unexpected format.
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
