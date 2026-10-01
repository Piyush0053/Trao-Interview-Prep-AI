import type { Metadata } from "next";
import "./globals.css";
import Navbar from "../components/Navbar";

export const metadata: Metadata = {
  title: "Trao AI Interview Prep",
  description: "AI-Powered Interview Preparation Kit Generator",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="relative">
        <div className="ambient-glow" />
        <div className="ambient-glow-secondary" />
        <Navbar />
        
        <main className="pt-24 min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
