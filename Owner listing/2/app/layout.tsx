import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./components/Providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Student Apartments Budapest | AI-Powered Search",
    template: "%s | Student Apartments Budapest"
  },
  description: "Find your perfect student apartment in Budapest with AI-powered matching. Search thousands of verified listings with intelligent recommendations based on your preferences.",
  keywords: ["student apartments", "Budapest", "rental", "housing", "university", "dormitory", "shared apartment", "AI search"],
  authors: [{ name: "Student Apartments Team" }],
  creator: "Student Apartments",
  publisher: "Student Apartments",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://student-apartments-budapest.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://student-apartments-budapest.com',
    title: 'Student Apartments Budapest | AI-Powered Search',
    description: 'Find your perfect student apartment in Budapest with AI-powered matching and personalized recommendations.',
    siteName: 'Student Apartments Budapest',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Student Apartments Budapest - AI-Powered Apartment Search',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Student Apartments Budapest | AI-Powered Search',
    description: 'Find your perfect student apartment in Budapest with AI-powered matching.',
    images: ['/og-image.jpg'],
    creator: '@studentapartments',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-site-verification-code',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#f97316" />
      </head>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}