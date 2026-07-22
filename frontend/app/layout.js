import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "AeroVigil - Urban Air Quality Intelligence Platform",
  description: "AI-powered urban air quality intelligence mapping source attribution, hyperlocal 24-72h forecasting, municipal enforcement prioritization, and citizen vulnerability alerts.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full bg-zinc-950">
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-full flex flex-col font-sans bg-zinc-950 text-zinc-100 antialiased`}>
        {children}
      </body>
    </html>
  );
}
