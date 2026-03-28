import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Offers",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
