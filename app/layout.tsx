import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import FirebaseSync from "@/components/FirebaseSync"; // [NEW]

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TEH RAJA - The Premium Tea Experience",
  description: "Authentic premium tea shop with smart recommendation system.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#D4AF37" />
      </head>
      <body
        className={`${inter.variable} ${playfair.variable} antialiased`}
      >
        <FirebaseSync /> {/* [NEW] Realtime Sync & Audio */}
        {children}
      </body>
    </html>
  );
}
