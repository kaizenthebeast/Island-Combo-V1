import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import AnonAuthProvider from "@/helper/AnonAuthProvider";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

const siteName = "Island Combo";

const defaultTitle = `${siteName} – Shop Clothing, Electronics, Beauty & More`;
const defaultDescription =
  `Shop ${siteName} for clothing, electronics, beauty products, household essentials, kids' toys, jewelry, and more. Fast delivery across FSM.`;

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),

  title: {
    default: defaultTitle,
    template: `%s | ${siteName}`,
  },
  description: defaultDescription,
  keywords: [
    // broad
    "online shop FSM",
    "Micronesia online store",
    // top-level categories
    "clothing FSM",
    "electronics Micronesia",
    "beauty products",
    "household items",
    "kids toys",
    "furniture",
    "bags and accessories",
    // brand-specific subcategories that have search intent
    "Bath and Body Works FSM",
    "Siena Jewelry",
    "Kaselehlie Collection",
    "Island Fresh Line",
    "FSM Telcard",
    "infant formula Micronesia",
  ],

  alternates: { canonical: "/" },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  openGraph: {
    type: "website",
    siteName,
    title: defaultTitle,
    description: defaultDescription,
    url: defaultUrl,
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: `${siteName} – Online Store`,
      },
    ],
    locale: "en_US",
  },



  applicationName: siteName,
  appleWebApp: {
    capable: true,
    title: siteName,
    statusBarStyle: "default",
  },


};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.className} antialiased min-h-svh w-full`}>
        <AnonAuthProvider>
          {children}
          <Toaster />
        </AnonAuthProvider>
      </body>
    </html>
  );
}