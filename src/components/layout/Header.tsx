
"use client";

import Link from "next/link";
import { Zap, CalendarDays, MessageSquareText } from "lucide-react"; 
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <Zap className="h-6 w-6 text-primary" />
          <span className="font-bold sm:inline-block">
            Shut Up and Run
          </span>
        </Link>
        <nav className="flex items-center gap-4 text-sm lg:gap-6 flex-grow">
          <Link
            href="/"
            className={cn(
              "transition-colors hover:text-foreground/80",
              pathname === "/" ? "text-foreground font-medium" : "text-foreground/60"
            )}
          >
            Dashboard
          </Link>
          <Link
            href="/training-plan"
            className={cn(
              "transition-colors hover:text-foreground/80 flex items-center gap-1",
              pathname === "/training-plan" ? "text-foreground font-medium" : "text-foreground/60"
            )}
          >
            <CalendarDays className="h-4 w-4" />
            Training Plan
          </Link>
          <Link
            href="/profile"
            className={cn(
              "transition-colors hover:text-foreground/80",
              pathname === "/profile" ? "text-foreground font-medium" : "text-foreground/60"
            )}
          >
            Profile
          </Link>
          <Link
            href="/feedback"
            className={cn(
              "transition-colors hover:text-foreground/80 flex items-center gap-1",
              pathname === "/feedback" ? "text-foreground font-medium" : "text-foreground/60"
            )}
          >
            <MessageSquareText className="h-4 w-4" />
            Feedback
          </Link>
        </nav>
        <div className="flex items-center">
          <Button 
            asChild 
            variant="default" 
            size="sm" 
            className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
          >
            <Link href="https://buymeacoffee.com/h9aq9muuyz" target="_blank" rel="noopener noreferrer">
              Buy Me A Coffee
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
