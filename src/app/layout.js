import { Geist, Geist_Mono } from "next/font/google";
import { MonteCarlo } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const monteCarlo = MonteCarlo({
  variable: "--font-fam-1",
  weight: "400",
  subsets: ["latin"],
});

export const metadata = {
  title: "Kaha Chalein?",
  description: "Let's decide where to eat together!",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} ${monteCarlo.variable}`}>
        {children}
      </body>
    </html>
  );
}
