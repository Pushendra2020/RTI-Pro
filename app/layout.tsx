import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Saathi | RTI citizen assistant",
  description: "Describe what you need from the government. Saathi helps find the right authority and prepare an RTI request.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
