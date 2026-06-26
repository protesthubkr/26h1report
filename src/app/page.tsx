import { redirect } from "next/navigation";

export const dynamic = "force-static";

export default function Home() {
  redirect("/agenda-2026-h1");
}
