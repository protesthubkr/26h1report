"use client";

import Link from "next/link";
import { useMemo, useRef, useState, type TouchEvent } from "react";

export type PublicAgendaData = {
  agendas: PublicAgenda[];
  defaultAgendaId: string;
  featuredIssues: FeaturedIssue[];
  generatedAt: string;
  source: {
    graphGeneratedAt?: string;
    path: string;
  };
};

type PublicAgenda = {
  accent: string;
  bridgeAgendaIds: string[];
  closing: {
    summary: string;
    takeaways: string[];
    title: string;
  };
  coreQuestion: string;
  dateRange: DateRange;
  id: string;
  issueCount: number;
  organizationCount: number;
  organizations: string[];
  phases: PublicAgendaPhase[];
  secondaryAccent: string;
  shortTitle: string;
  sourceAgendaLabels: string[];
  status: "draft" | "ready" | "supporting";
  statementCount: number;
  subtitle: string;
  title: string;
  topActions: CountedValue[];
  topKeywords: CountedValue[];
};

type PublicAgendaPhase = {
  dateRange: DateRange;
  hiddenKeywords: string[];
  id: string;
  issueCount: number;
  issues: PublicIssue[];
  organizations: string[];
  statementCount: number;
  summary: string;
  title: string;
  transitionToNext?: string;
};

type PublicIssue = {
  actionType: string;
  date: string;
  dateLabel: string;
  endDate: string;
  id: string;
  keywords: string[];
  leadSentence: string;
  leafCount: number;
  organizationLabel: string;
  organizations: string[];
  sourceUrls: string[];
  statementCount: number;
  statements: PublicStatement[];
  title: string;
};

type FeaturedIssue = PublicIssue & {
  agendaId: string;
  agendaTitle: string;
  phaseId: string;
  phaseTitle: string;
};

type PublicStatement = {
  date: string;
  organization: string;
  sentence: string;
  sourceKey: string;
  sourceType: string;
  url: string;
};

type CountedValue = {
  count: number;
  label: string;
};

type DateRange = {
  end: string;
  label: string;
  start: string;
};

type StorySlide =
  | {
      kind: "agenda-intro";
      agenda: PublicAgenda;
    }
  | {
      kind: "phase";
      agenda: PublicAgenda;
      phase: PublicAgendaPhase;
      phaseIndex: number;
    }
  | {
      kind: "issue";
      agenda: PublicAgenda;
      issue: PublicIssue;
      phase: PublicAgendaPhase;
    }
  | {
      kind: "transition";
      agenda: PublicAgenda;
      phase: PublicAgendaPhase;
    }
  | {
      kind: "closing";
      agenda: PublicAgenda;
    };

type ReaderState =
  | {
      mode: "review";
      reviewIndex: number;
      storyIndex: 0;
    }
  | {
      mode: "agenda-select";
      reviewIndex: number;
      storyIndex: 0;
    }
  | {
      agendaId: string;
      mode: "story";
      reviewIndex: number;
      storyIndex: number;
    };

const reviewSlideCount = 5;
const maxIssueSlidesPerPhase = 4;

export function AgendaReport({ data }: { data: PublicAgendaData }) {
  const reviewIssues = useMemo(() => pickReviewIssues(data.featuredIssues), [data]);
  const [state, setState] = useState<ReaderState>({
    mode: "review",
    reviewIndex: 0,
    storyIndex: 0,
  });
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const activeAgenda =
    state.mode === "story"
      ? data.agendas.find((agenda) => agenda.id === state.agendaId) ?? data.agendas[0]
      : data.agendas.find((agenda) => agenda.id === data.defaultAgendaId) ?? data.agendas[0];
  const storySlides = useMemo(() => buildStorySlides(activeAgenda), [activeAgenda]);
  const reviewIssue = reviewIssues[state.reviewIndex] ?? reviewIssues[0];
  const storySlide = storySlides[state.mode === "story" ? state.storyIndex : 0];
  const progress = getProgress(state, reviewIssues.length, storySlides.length);

  function goNext() {
    setState((current) => {
      if (current.mode === "review") {
        if (current.reviewIndex < reviewIssues.length - 1) {
          return { ...current, reviewIndex: current.reviewIndex + 1 };
        }
        return { ...current, mode: "agenda-select" };
      }

      if (current.mode === "agenda-select") return current;

      if (current.storyIndex < storySlides.length - 1) {
        return { ...current, storyIndex: current.storyIndex + 1 };
      }
      return current;
    });
  }

  function goBack() {
    setState((current) => {
      if (current.mode === "review") {
        return {
          ...current,
          reviewIndex: Math.max(0, current.reviewIndex - 1),
        };
      }

      if (current.mode === "agenda-select") {
        return {
          mode: "review",
          reviewIndex: reviewIssues.length - 1,
          storyIndex: 0,
        };
      }

      if (current.storyIndex > 0) {
        return { ...current, storyIndex: current.storyIndex - 1 };
      }

      return {
        mode: "agenda-select",
        reviewIndex: current.reviewIndex,
        storyIndex: 0,
      };
    });
  }

  function selectAgenda(agenda: PublicAgenda) {
    setState((current) => ({
      agendaId: agenda.id,
      mode: "story",
      reviewIndex: current.reviewIndex,
      storyIndex: 0,
    }));
  }

  const canGoNext =
    state.mode === "review" ||
    (state.mode === "story" && state.storyIndex < storySlides.length - 1);
  const canGoBack =
    state.mode === "agenda-select" ||
    (state.mode === "review" && state.reviewIndex > 0) ||
    state.mode === "story";

  function handleTouchStart(event: TouchEvent<HTMLElement>) {
    const touch = event.changedTouches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  }

  function handleTouchEnd(event: TouchEvent<HTMLElement>) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;

    const touch = event.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy) * 1.4) return;

    if (dx < 0 && canGoNext) goNext();
    if (dx > 0 && canGoBack) goBack();
  }

  return (
    <main className="h-screen overflow-hidden bg-[#070707] text-[#f1f0e8]">
      <TopBar progress={progress} />
      <section className="relative mx-auto flex h-[calc(100vh-56px)] max-w-[1600px] flex-col px-8 py-6 max-sm:h-[calc(100svh-48px)] max-sm:px-3 max-sm:py-3">
        <ProgressRule progress={progress.percent} />

        <div
          className="relative flex min-h-0 flex-1 items-stretch border border-[#2a2a25] bg-[#0b0b0a]"
          onTouchEnd={handleTouchEnd}
          onTouchStart={handleTouchStart}
        >
          <AmbientLines />
          {state.mode === "review" && reviewIssue ? (
            <ReviewPage issue={reviewIssue} index={state.reviewIndex} total={reviewIssues.length} />
          ) : null}

          {state.mode === "agenda-select" ? (
            <AgendaSelectPage agendas={data.agendas} onSelect={selectAgenda} />
          ) : null}

          {state.mode === "story" && storySlide ? <StoryPage slide={storySlide} /> : null}
        </div>

        <BottomControls
          canGoBack={canGoBack}
          canGoNext={canGoNext}
          mode={state.mode}
          onBack={goBack}
          onNext={goNext}
          progressLabel={progress.label}
        />
      </section>
    </main>
  );
}

function TopBar({ progress }: { progress: { label: string } }) {
  return (
    <header className="relative z-20 h-14 border-b border-[#272722] bg-[#070707] px-5 max-sm:h-12 max-sm:px-3">
      <div className="mx-auto flex h-full max-w-[1600px] items-center justify-between gap-4">
        <Link className="text-[14px] font-black tracking-normal text-[#f1f0e8] max-sm:text-[13px]" href="/agenda-2026-h1">
          2026 H1 Agenda Report
        </Link>
        <div className="flex items-center gap-4">
          <span className="hidden font-mono text-[11px] font-bold text-[#8d8d82] sm:block">
            {progress.label}
          </span>
          <nav className="flex items-center gap-2 text-[11px] font-bold max-sm:hidden">
            <Link className="border border-[#393932] px-3 py-2 text-[#d8d7ce]" href="/observatory">
              Observatory
            </Link>
            <Link className="border border-[#393932] px-3 py-2 text-[#d8d7ce]" href="/g6">
              Graph
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}

function ProgressRule({ progress }: { progress: number }) {
  return (
    <div className="mb-4 h-px bg-[#25251f]">
      <div
        className="h-px bg-[#e6e1d4] transition-[width] duration-500"
        style={{ width: `${Math.round(progress * 100)}%` }}
      />
    </div>
  );
}

function ReviewPage({
  index,
  issue,
  total,
}: {
  index: number;
  issue: FeaturedIssue;
  total: number;
}) {
  return (
    <article className="relative grid min-h-[680px] w-full grid-cols-[minmax(0,1fr)_320px] max-lg:grid-cols-1 max-sm:min-h-0">
      <section className="flex min-h-0 flex-col justify-between p-12 max-lg:min-h-[620px] max-sm:min-h-0 max-sm:p-5">
        <div>
          <SmallMeta>
            회고 {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </SmallMeta>
          <h1 className="mt-10 max-w-[980px] text-[clamp(30px,4.2vw,62px)] font-black leading-[1.07] tracking-normal text-[#f5f2e8] max-sm:mt-7 max-sm:text-[30px]">
            {shorten(issue.title, 34)}
          </h1>
        </div>

        <div className="max-w-[860px]">
          <p className="border-l-4 border-[#d8d0bd] pl-6 text-[clamp(18px,2vw,28px)] font-bold leading-[1.55] text-[#ece8dd] max-sm:pl-4 max-sm:text-[18px] max-sm:leading-8">
            {shorten(issue.leadSentence, 68)}
          </p>
        </div>
      </section>

      <aside className="flex flex-col justify-between border-l border-[#2a2a25] p-8 max-lg:border-l-0 max-lg:border-t max-md:hidden max-sm:p-6">
        <div>
          <SmallMeta>{issue.dateLabel}</SmallMeta>
          <p className="mt-5 text-[18px] font-black text-[#f5f2e8]">{issue.actionType}</p>
          <p className="mt-3 text-[14px] leading-6 text-[#a9a79c]">
            {issue.agendaTitle}
          </p>
        </div>
        <p className="mt-12 text-[13px] leading-6 text-[#858379]">
          먼저 사건을 한 장씩 봅니다. 선택은 아직 없습니다. 다음 장면에서만
          어젠다를 고릅니다.
        </p>
      </aside>
    </article>
  );
}

function AgendaSelectPage({
  agendas,
  onSelect,
}: {
  agendas: PublicAgenda[];
  onSelect: (agenda: PublicAgenda) => void;
}) {
  return (
    <article className="relative flex min-h-[680px] w-full flex-col p-12 max-sm:min-h-0 max-sm:p-5">
      <SmallMeta>어젠다 선택 · 유일한 분기점</SmallMeta>
      <h1 className="mt-10 max-w-[980px] text-[clamp(38px,6vw,90px)] font-black leading-[0.98] tracking-normal text-[#f5f2e8] max-sm:mt-6 max-sm:text-[34px]">
        어떤 흐름으로 읽을까요?
      </h1>
      <p className="mt-7 max-w-[740px] text-[18px] leading-8 text-[#aaa89e] max-sm:hidden">
        여기서만 갈라집니다. 하나를 고르면 이후에는 다시 한 장씩 순서대로
        넘어갑니다.
      </p>

      <div className="mt-auto grid grid-cols-3 gap-px border border-[#2f2f28] bg-[#2f2f28] max-xl:grid-cols-2 max-md:grid-cols-1 max-sm:mt-6 max-sm:max-h-[58svh] max-sm:overflow-y-auto">
        {agendas.map((agenda, index) => (
          <button
            className="group min-h-[170px] bg-[#0f0f0d] p-6 text-left transition hover:bg-[#171713] max-sm:min-h-[86px] max-sm:p-4"
            key={agenda.id}
            onClick={() => onSelect(agenda)}
            type="button"
          >
            <span className="font-mono text-[11px] font-black text-[#77746a]">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span
              className="mt-5 block h-1 w-12 transition group-hover:w-20 max-sm:mt-3 max-sm:w-10"
              style={{ backgroundColor: agenda.accent }}
            />
            <strong className="mt-5 block text-[22px] leading-tight text-[#f5f2e8] max-sm:mt-3 max-sm:text-[17px]">
              {agenda.title}
            </strong>
            <span className="mt-3 block text-[13px] leading-5 text-[#908e84] max-sm:hidden">
              {agenda.subtitle}
            </span>
          </button>
        ))}
      </div>
    </article>
  );
}

function StoryPage({ slide }: { slide: StorySlide }) {
  if (slide.kind === "agenda-intro") return <AgendaIntro slide={slide} />;
  if (slide.kind === "phase") return <PhaseIntro slide={slide} />;
  if (slide.kind === "transition") return <TransitionSlide slide={slide} />;
  if (slide.kind === "closing") return <ClosingSlide slide={slide} />;
  return <IssueSlide slide={slide} />;
}

function AgendaIntro({ slide }: { slide: Extract<StorySlide, { kind: "agenda-intro" }> }) {
  const { agenda } = slide;

  return (
    <article className="relative flex min-h-[680px] w-full flex-col justify-between p-12 max-sm:min-h-0 max-sm:p-5">
      <div>
        <SmallMeta>선택한 어젠다 · {agenda.dateRange.label}</SmallMeta>
        <h1 className="mt-10 max-w-[1100px] text-[clamp(40px,6.4vw,96px)] font-black leading-[0.98] tracking-normal text-[#f5f2e8] max-sm:mt-7 max-sm:text-[35px]">
          {agenda.coreQuestion}
        </h1>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_280px] gap-10 max-lg:grid-cols-1">
        <p className="max-w-[860px] border-l-4 border-[#d8d0bd] pl-6 text-[clamp(19px,2vw,30px)] font-bold leading-[1.5] text-[#ece8dd] max-sm:pl-4 max-sm:text-[19px] max-sm:leading-8">
          {agenda.subtitle}. 이제부터는 선택 없이, 이 흐름을 따라갑니다.
        </p>
        <div className="grid grid-cols-3 border-y border-[#33332c] text-center max-lg:max-w-[520px] max-sm:hidden">
          <Metric label="사건" value={agenda.issueCount} />
          <Metric label="발언" value={agenda.statementCount} />
          <Metric label="단체" value={agenda.organizationCount} />
        </div>
      </div>
    </article>
  );
}

function PhaseIntro({ slide }: { slide: Extract<StorySlide, { kind: "phase" }> }) {
  const { agenda, phase, phaseIndex } = slide;

  return (
    <article className="relative grid min-h-[680px] w-full grid-cols-[minmax(0,1fr)_340px] max-lg:grid-cols-1 max-sm:min-h-0">
      <section className="flex flex-col justify-between p-12 max-sm:min-h-0 max-sm:p-5">
        <div>
          <SmallMeta>
            국면 {phaseIndex + 1} · {phase.dateRange.label}
          </SmallMeta>
          <h1 className="mt-10 max-w-[980px] text-[clamp(42px,7vw,104px)] font-black leading-[0.96] tracking-normal text-[#f5f2e8] max-sm:mt-7 max-sm:text-[38px]">
            {phase.title}
          </h1>
        </div>
        <p className="max-w-[840px] text-[clamp(20px,2.2vw,32px)] font-bold leading-[1.48] text-[#ece8dd] max-sm:text-[20px] max-sm:leading-8">
          {phase.summary}
        </p>
      </section>
      <aside className="border-l border-[#2a2a25] p-8 max-lg:border-l-0 max-lg:border-t max-md:hidden max-sm:p-6">
        <span
          className="block h-1 w-20"
          style={{ backgroundColor: agenda.accent }}
        />
        <p className="mt-6 text-[15px] leading-7 text-[#a9a79c]">
          이 국면에는 {phase.issueCount}개 사건과 {phase.statementCount}개 대표발언이
          배치되어 있습니다.
        </p>
      </aside>
    </article>
  );
}

function IssueSlide({ slide }: { slide: Extract<StorySlide, { kind: "issue" }> }) {
  const { agenda, issue, phase } = slide;
  const statement = issue.statements[0];

  return (
    <article className="relative grid min-h-[680px] w-full grid-cols-[minmax(0,1fr)_360px] max-lg:grid-cols-1 max-sm:min-h-0">
      <section className="flex flex-col justify-between p-12 max-sm:min-h-0 max-sm:p-5">
        <div>
          <SmallMeta>
            {phase.title} · {issue.dateLabel} · {issue.actionType}
          </SmallMeta>
          <h1 className="mt-10 max-w-[980px] text-[clamp(32px,4.8vw,72px)] font-black leading-[1.06] tracking-normal text-[#f5f2e8] max-sm:mt-7 max-sm:text-[30px]">
            {shorten(issue.title, 36)}
          </h1>
        </div>
        <p className="max-w-[860px] border-l-4 pl-6 text-[clamp(18px,2vw,28px)] font-bold leading-[1.55] text-[#ece8dd] max-sm:pl-4 max-sm:text-[18px] max-sm:leading-8" style={{ borderColor: agenda.accent }}>
          {shorten(issue.leadSentence, 72)}
        </p>
      </section>

      <aside className="flex flex-col justify-between border-l border-[#2a2a25] p-8 max-lg:border-l-0 max-lg:border-t max-md:hidden max-sm:p-6">
        <div>
          <SmallMeta>대표 발언</SmallMeta>
          {statement ? (
            <div className="mt-6">
              <p className="text-[20px] font-black text-[#f5f2e8]">
                {statement.organization}
              </p>
              <p className="mt-4 text-[16px] font-semibold leading-7 text-[#cfcbbd]">
                {shorten(statement.sentence, 120)}
              </p>
            </div>
          ) : (
            <p className="mt-6 text-[15px] text-[#a9a79c]">대표 발언 없음</p>
          )}
        </div>
        <div className="mt-10">
          <p className="text-[13px] leading-6 text-[#858379]">
            {issue.organizationLabel} · {issue.statementCount}개 발언
          </p>
          {issue.sourceUrls[0] ? (
            <a
              className="mt-4 inline-block border border-[#393932] px-4 py-3 text-[12px] font-black text-[#f1f0e8]"
              href={issue.sourceUrls[0]}
              rel="noreferrer"
              target="_blank"
            >
              원문
            </a>
          ) : null}
        </div>
      </aside>
    </article>
  );
}

function TransitionSlide({ slide }: { slide: Extract<StorySlide, { kind: "transition" }> }) {
  const { agenda, phase } = slide;

  return (
    <article className="relative flex min-h-[680px] w-full items-center p-12 max-sm:min-h-0 max-sm:p-5">
      <div className="max-w-[1040px]">
        <SmallMeta>전환</SmallMeta>
        <h1 className="mt-10 text-[clamp(38px,6vw,92px)] font-black leading-[1.04] tracking-normal text-[#f5f2e8] max-sm:mt-7 max-sm:text-[32px]">
          {phase.transitionToNext}
        </h1>
        <span
          className="mt-12 block h-1 w-32"
          style={{ backgroundColor: agenda.accent }}
        />
      </div>
    </article>
  );
}

function ClosingSlide({ slide }: { slide: Extract<StorySlide, { kind: "closing" }> }) {
  const { agenda } = slide;

  return (
    <article className="relative flex min-h-[680px] w-full flex-col justify-between p-12 max-sm:min-h-0 max-sm:p-5">
      <div>
        <SmallMeta>정리</SmallMeta>
        <h1 className="mt-10 max-w-[1080px] text-[clamp(40px,6.3vw,96px)] font-black leading-[0.98] tracking-normal text-[#f5f2e8] max-sm:mt-7 max-sm:text-[34px]">
          {agenda.closing.title}
        </h1>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_360px] gap-10 max-lg:grid-cols-1">
        <p className="max-w-[860px] text-[clamp(19px,2vw,30px)] font-bold leading-[1.55] text-[#ece8dd] max-sm:text-[19px] max-sm:leading-8">
          {agenda.closing.summary}
        </p>
        <div className="space-y-4 max-sm:hidden">
          {agenda.closing.takeaways.map((takeaway, index) => (
            <div className="border-t border-[#393932] pt-4" key={takeaway}>
              <span className="font-mono text-[11px] font-black text-[#858379]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <p className="mt-2 text-[18px] font-black text-[#f5f2e8]">{takeaway}</p>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

function BottomControls({
  canGoBack,
  canGoNext,
  mode,
  onBack,
  onNext,
  progressLabel,
}: {
  canGoBack: boolean;
  canGoNext: boolean;
  mode: ReaderState["mode"];
  onBack: () => void;
  onNext: () => void;
  progressLabel: string;
}) {
  return (
    <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-4 max-sm:mt-3 max-sm:grid-cols-2 max-sm:gap-2 max-sm:pb-[env(safe-area-inset-bottom)]">
      <button
        className="min-w-28 border border-[#393932] px-5 py-3 text-[13px] font-black text-[#f1f0e8] disabled:opacity-30 max-sm:min-h-14 max-sm:w-full max-sm:px-4 max-sm:text-[15px]"
        disabled={!canGoBack}
        onClick={onBack}
        type="button"
      >
        이전
      </button>
      <p className="font-mono text-[11px] font-black text-[#858379] max-sm:col-span-2 max-sm:row-start-2 max-sm:text-center">
        <span className="max-sm:hidden">{progressLabel}</span>
        <span className="hidden max-sm:inline">좌우로 스와이프 · {progressLabel}</span>
      </p>
      {mode === "agenda-select" ? (
        <span className="min-w-28 text-right text-[12px] font-bold text-[#858379] max-sm:min-h-14 max-sm:pt-4 max-sm:text-center">
          선택 필요
        </span>
      ) : (
        <button
          className="min-w-28 bg-[#e6e1d4] px-5 py-3 text-[13px] font-black text-[#080808] disabled:opacity-30 max-sm:min-h-14 max-sm:w-full max-sm:px-4 max-sm:text-[15px]"
          disabled={!canGoNext}
          onClick={onNext}
          type="button"
        >
          다음
        </button>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-r border-[#33332c] px-2 py-4 last:border-r-0">
      <strong className="block text-[24px] leading-none text-[#f5f2e8]">{value}</strong>
      <span className="mt-1 block text-[11px] font-bold text-[#858379]">{label}</span>
    </div>
  );
}

function SmallMeta({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[12px] font-black uppercase tracking-[0.14em] text-[#858379]">
      {children}
    </p>
  );
}

function AmbientLines() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 opacity-[0.17]"
      style={{
        background:
          "linear-gradient(90deg, transparent 0, transparent calc(50% - 1px), #6f6b60 calc(50% - 1px), #6f6b60 50%, transparent 50%), linear-gradient(0deg, transparent 0, transparent calc(100% - 96px), #6f6b60 calc(100% - 96px), #6f6b60 calc(100% - 95px), transparent calc(100% - 95px))",
      }}
    />
  );
}

function buildStorySlides(agenda: PublicAgenda): StorySlide[] {
  const slides: StorySlide[] = [{ kind: "agenda-intro", agenda }];

  for (const [phaseIndex, phase] of agenda.phases.entries()) {
    slides.push({ kind: "phase", agenda, phase, phaseIndex });
    for (const issue of phase.issues.slice(0, maxIssueSlidesPerPhase)) {
      slides.push({ kind: "issue", agenda, issue, phase });
    }
    if (phase.transitionToNext) {
      slides.push({ kind: "transition", agenda, phase });
    }
  }

  slides.push({ kind: "closing", agenda });
  return slides;
}

function pickReviewIssues(issues: FeaturedIssue[]) {
  const byAgenda = new Map<string, FeaturedIssue>();
  const seenTitles = new Set<string>();
  for (const issue of issues) {
    const titleKey = issue.title.replace(/\s+/g, " ").trim();
    if (seenTitles.has(titleKey)) continue;
    seenTitles.add(titleKey);
    if (!byAgenda.has(issue.agendaId)) byAgenda.set(issue.agendaId, issue);
  }
  return [...byAgenda.values()].slice(0, reviewSlideCount);
}

function getProgress(
  state: ReaderState,
  reviewCount: number,
  storyCount: number,
) {
  if (state.mode === "review") {
    return {
      label: `회고 ${state.reviewIndex + 1}/${reviewCount}`,
      percent: reviewCount ? (state.reviewIndex + 1) / (reviewCount + 2 + storyCount) : 0,
    };
  }

  if (state.mode === "agenda-select") {
    return {
      label: "어젠다 선택",
      percent: reviewCount / (reviewCount + 2 + storyCount),
    };
  }

  return {
    label: `본문 ${state.storyIndex + 1}/${storyCount}`,
    percent: (reviewCount + 1 + state.storyIndex + 1) / (reviewCount + 1 + storyCount),
  };
}

function shorten(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1).trim()}…`;
}
