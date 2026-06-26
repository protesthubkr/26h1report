import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "2026 상반기 의제 리포트",
  description: "A focused public report for the first half of 2026 agenda flow.",
};

export default function ObservatoryPage() {
  redirect("/agenda-2026-h1");
}
