import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  agendaPageSlugs,
  agendaPageThemes,
  type AgendaPageSlug,
} from "../agenda-page-themes";
import { StopTheTrainIntro } from "./stop-the-train-intro";

type AgendaPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return agendaPageSlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: AgendaPageProps): Promise<Metadata> {
  const { slug } = await params;
  if (!isAgendaPageSlug(slug)) return {};

  return {
    title: `${agendaPageThemes[slug].label} | 2026 상반기 의제 리포트`,
  };
}

export default async function AgendaDetailPage({ params }: AgendaPageProps) {
  const { slug } = await params;
  if (!isAgendaPageSlug(slug)) notFound();

  const theme = agendaPageThemes[slug];

  return (
    <main
      aria-label={theme.label}
      className="agenda-detail-page relative h-[100dvh] max-h-[100dvh] min-h-[100dvh] w-full overflow-hidden"
      style={{ backgroundColor: theme.backgroundColor }}
    >
      {slug === "stop-the-train" ? <StopTheTrainIntro /> : null}
    </main>
  );
}

function isAgendaPageSlug(slug: string): slug is AgendaPageSlug {
  return slug in agendaPageThemes;
}
