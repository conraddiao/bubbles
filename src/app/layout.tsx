import type { Metadata } from "next";
import { Fraunces, Gabarito } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";
import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "@/components/ui/sonner";
import { VercelAnalytics } from "@/components/vercel-analytics";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const gabarito = Gabarito({
  subsets: ["latin"],
  variable: "--font-gabarito",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bubbles — Shared Contact Groups",
  description: "Create and manage shared contact groups for events and gatherings",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${fraunces.variable} ${gabarito.variable} antialiased`}>
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
