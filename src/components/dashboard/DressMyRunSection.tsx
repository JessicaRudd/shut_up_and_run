
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Shirt, Thermometer, Sun, Wind, CloudRain, Snowflake, Sparkles, ChevronsRight, Footprints, Glasses, Hand,
  CheckSquare, HelpCircle // HelpCircle for unknown, CheckSquare as generic accessory
} from "lucide-react"; 
import type { DressMyRunItem, DressMyRunItemCategory } from "@/ai/flows/customize-newsletter-content";

interface DressMyRunSectionProps {
  suggestion: DressMyRunItem[] | null | undefined;
}

const categoryToIconMap: Record<DressMyRunItemCategory, React.ElementType> = {
  "hat": Sparkles, // Using Sparkles as a generic headwear icon, can be more specific if needed
  "visor": Sparkles,
  "sunglasses": Glasses,
  "headband": Sparkles,
  "shirt": Shirt,
  "tank-top": Shirt, // Could use a different icon if available or a custom SVG
  "long-sleeve": Shirt,
  "base-layer": Shirt,
  "mid-layer": Shirt, // Or a jacket icon if more appropriate for "mid-layer jacket"
  "jacket": Wind, // Generic jacket, could be Thermometer for warmth
  "vest": Shirt, // Or a specific vest icon
  "windbreaker": Wind,
  "rain-jacket": CloudRain,
  "shorts": Footprints, // Representing lower body wear
  "capris": Footprints,
  "tights": Footprints,
  "pants": Footprints,
  "gloves": Hand,
  "mittens": Hand,
  "socks": Footprints, // Or a specific sock icon
  "shoes": Footprints, // Though shoes are usually assumed
  "gaiter": Sparkles, // Or Thermometer if for warmth
  "balaclava": Sparkles, // Or Thermometer
  "accessory": CheckSquare, // Generic accessory
};

const getIconForCategory = (category: DressMyRunItemCategory): React.ElementType => {
  return categoryToIconMap[category] || HelpCircle;
};

export function DressMyRunSection({ suggestion }: DressMyRunSectionProps) {
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
              : "No specific clothing suggestions available at this time. This could be due to unavailable weather data."
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

