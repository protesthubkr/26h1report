import type { Metadata } from "next";
import { AgendaReport } from "./agenda-report";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "2026 상반기 의제 리포트",
  description:
    "상반기 주요 사안을 어젠다별 국면, 대표 발언, 행동 흐름으로 읽는 공개 리포트.",
};

export default function Agenda2026H1Page() {
  return <AgendaReport />;
}
