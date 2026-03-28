import type { Metadata } from "next";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";

import "./globals.css";

export const metadata: Metadata = {
  title: "Verge | Smart Traffic Optimization",
  description:
    "AI-driven urban traffic management optimizing signal timings dynamically.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full antialiased font-sans">
      <body className="min-h-full flex flex-col selection:bg-foreground selection:text-background">
        {children}
      </body>
    </html>
  );
}
