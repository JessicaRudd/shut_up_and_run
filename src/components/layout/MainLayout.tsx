import type { ReactNode } from "react";
import { Header } from "./Header";
import { Toaster } from "@/components/ui/toaster";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 container mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
      <Toaster />
    </div>
  );
}
