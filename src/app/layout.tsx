import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";
import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "@/components/ui/sonner";
import { VercelAnalytics } from "@/components/vercel-analytics";

export const metadata: Metadata = {
  title: "Shared Contact Groups",
  description: "Create and manage shared contact groups for events and gatherings",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <QueryProvider>
          <AuthProvider>
            {children}
            <Toaster />
            <VercelAnalytics />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
