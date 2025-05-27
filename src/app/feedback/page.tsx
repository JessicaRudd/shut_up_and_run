"use client";

import { FeedbackForm } from "@/components/forms/FeedbackForm";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function FeedbackPage() {
  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-3xl font-bold">Submit Feedback</CardTitle>
            <CardDescription>
              We value your input! Please let us know if you have any feedback, feature requests, or bug reports.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FeedbackForm />
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

export const dynamic = "force-dynamic";
