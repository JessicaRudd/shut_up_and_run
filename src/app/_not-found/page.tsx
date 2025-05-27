"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <Card className="w-full max-w-lg text-center shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Page Not Found</CardTitle>
          <CardDescription>
            Sorry, we couldn't find the page you're looking for.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/">Return Home</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export const dynamic = "force-dynamic"; 