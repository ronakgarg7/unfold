import type { Metadata, Viewport } from "next";
import "@fontsource/caveat/500.css";
import "@fontsource/caveat/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "unfold — a journal house",
  description: "A pop-up book of rooms, drawn in blue ink.",
};

export const viewport: Viewport = {
  themeColor: "#ecebe7",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
