import type { Metadata } from "next";
import "./globals.css";
import Navbar from "../components/Navbar";

export const metadata: Metadata = {
  title: "Trao AI — Interview Prep Kit",
  description: "AI-Powered Interview Preparation Kit Generator. Paste a job description and get a personalised multi-day prep plan.",
  keywords: ["interview prep", "AI", "job description", "technical interview", "flashcards"],
  openGraph: {
    title: "Trao AI — Interview Prep Kit",
    description: "Turn any job description into a personalised interview preparation kit in minutes.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="relative bg-background min-h-screen text-textMain">
        {/* Ambient background glows */}
        <div className="ambient-teal" aria-hidden="true" />
        <div className="ambient-blue"  aria-hidden="true" />

        {/* Top navigation */}
        <Navbar />

        {/* Main content — padded for fixed navbar */}
        <main className="pt-14 min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
