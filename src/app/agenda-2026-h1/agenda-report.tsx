"use client";

import Link from "next/link";
import { useMemo, useRef, useState, type CSSProperties, type TouchEvent } from "react";

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

type OpeningEvent = {
  accent: string;
  agendaTitle: string;
  dateLabel: string;
  description: string;
  impactLabel: string;
  phaseTitle: string;
  title: string;
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

const reviewSlideCount = 1;
const maxIssueSlidesPerPhase = 4;

export function AgendaReport({ data }: { data: PublicAgendaData }) {
  const openingEvents = useMemo(() => pickOpeningEvents(data), [data]);
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
  const storySlide = storySlides[state.mode === "story" ? state.storyIndex : 0];
  const progress = getProgress(state, reviewSlideCount, storySlides.length);

  function goNext() {
    setState((current) => {
      if (current.mode === "review") {
        if (current.reviewIndex < reviewSlideCount - 1) {
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
          reviewIndex: reviewSlideCount - 1,
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
    if (state.mode === "review") return;

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
        <div
          className="relative flex min-h-0 flex-1 items-stretch overflow-hidden bg-[#090908]"
          onTouchEnd={handleTouchEnd}
          onTouchStart={handleTouchStart}
        >
          {state.mode === "review" ? (
            <OpeningCardScrollPage events={openingEvents} onNext={goNext} />
          ) : null}

          {state.mode === "agenda-select" ? (
            <AgendaSelectPage agendas={data.agendas} onSelect={selectAgenda} />
          ) : null}

          {state.mode === "story" && storySlide ? <StoryPage slide={storySlide} /> : null}
        </div>

        {state.mode !== "review" ? (
          <BottomControls
            canGoBack={canGoBack}
            canGoNext={canGoNext}
            mode={state.mode}
            onBack={goBack}
            onNext={goNext}
            progressLabel={progress.label}
          />
        ) : null}
      </section>
    </main>
  );
}

function TopBar({ progress }: { progress: { label: string } }) {
  return (
    <header className="relative z-20 h-14 bg-[#070707] px-5 max-sm:h-12 max-sm:px-3">
      <div className="mx-auto flex h-full max-w-[1600px] items-center justify-between gap-4">
        <Link className="text-[14px] font-black tracking-normal text-[#f1f0e8] max-sm:text-[13px]" href="/agenda-2026-h1">
          2026 H1 Agenda Report
        </Link>
        <span className="hidden font-mono text-[11px] font-bold text-[#8d8d82] sm:block">
          {progress.label}
        </span>
      </div>
    </header>
  );
}

function OpeningCardScrollPage({
  events,
  onNext,
}: {
  events: OpeningEvent[];
  onNext: () => void;
}) {
  return (
    <article className="relative h-full w-full overflow-hidden bg-black">
      <div className="opening-scroll-snap h-full overflow-y-auto">
        <section className="opening-snap-card flex min-h-full flex-col justify-between px-12 py-14 max-sm:px-5 max-sm:py-8">
          <div className="opening-rise max-w-[1120px]">
            <h1 className="max-w-[980px] text-[clamp(42px,7vw,104px)] font-black leading-[0.98] tracking-normal text-[#f8f5ec] max-sm:text-[38px]">
              다사다난했던 2026년 상반기,
              <br />
              안녕하셨나요?
            </h1>
          </div>
          <div className="max-w-[720px]">
            <SmallMeta>상반기 주요 사건</SmallMeta>
            <p className="mt-5 text-[clamp(18px,2vw,30px)] font-bold leading-[1.5] text-[#d8d3c7] max-sm:text-[19px] max-sm:leading-8">
              한 장씩 내려가며, 올해 상반기를 흔든 장면들을 먼저 훑어봅니다.
            </p>
          </div>
        </section>

        {events.map((event, index) => (
          <section
            className="opening-snap-card grid min-h-full grid-cols-[minmax(280px,0.86fr)_minmax(0,1fr)] gap-10 px-12 py-10 max-lg:grid-cols-1 max-lg:gap-7 max-sm:px-5 max-sm:py-6"
            key={`${event.title}-${index}`}
          >
            <div
              className="opening-image-placeholder relative min-h-[420px] overflow-hidden bg-[#141411] max-lg:min-h-[260px] max-sm:min-h-[220px]"
              style={{ "--event-accent": event.accent } as CSSProperties}
            >
              <span className="absolute left-6 top-6 font-mono text-[11px] font-black uppercase tracking-[0.16em] text-[#77746a]">
                image placeholder
              </span>
              <span className="absolute bottom-6 left-6 font-mono text-[12px] font-black text-[#aaa69a]">
                {String(index + 1).padStart(2, "0")}
              </span>
            </div>

            <div className="flex min-h-0 flex-col justify-center">
              <SmallMeta>
                {event.dateLabel} · {event.impactLabel}
              </SmallMeta>
              <h2 className="mt-8 max-w-[920px] text-[clamp(34px,5vw,76px)] font-black leading-[1.03] tracking-normal text-[#f5f2e8] max-sm:mt-6 max-sm:text-[32px]">
                {event.title}
              </h2>
              <p className="mt-8 max-w-[760px] text-[clamp(17px,1.8vw,26px)] font-bold leading-[1.58] text-[#d7d1c5] max-sm:mt-6 max-sm:text-[18px] max-sm:leading-8">
                {shorten(event.description, 140)}
              </p>
              <p className="mt-9 max-w-[720px] text-[13px] font-bold leading-6 text-[#7e7a70]">
                {event.agendaTitle} · {event.phaseTitle}
              </p>
            </div>
          </section>
        ))}

        <section className="opening-snap-card flex min-h-full flex-col justify-center px-12 py-14 max-sm:px-5 max-sm:py-8">
          <div className="max-w-[980px]">
            <h2 className="text-[clamp(42px,7vw,104px)] font-black leading-[0.98] tracking-normal text-[#f8f5ec] max-sm:text-[38px]">
              좀더 들여다볼까요?
            </h2>
            <p className="mt-8 max-w-[720px] text-[clamp(18px,2vw,28px)] font-bold leading-[1.55] text-[#d8d3c7] max-sm:text-[19px] max-sm:leading-8">
              이제 이 사건들이 어떤 어젠다의 흐름으로 이어졌는지 골라볼 차례입니다.
            </p>
            <button
              className="mt-12 bg-[#e6e1d4] px-7 py-4 text-[15px] font-black text-[#080808] transition hover:bg-[#f4efe3] max-sm:min-h-14 max-sm:w-full"
              onClick={onNext}
              type="button"
            >
              다음으로
            </button>
          </div>
        </section>
      </div>
    </article>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function OpeningReviewPage({ events }: { events: OpeningEvent[] }) {
  return (
    <article className="relative flex min-h-[680px] w-full flex-col justify-between overflow-hidden bg-black p-12 max-sm:min-h-0 max-sm:p-5">
      <div className="opening-rise max-w-[1120px]">
        <h1 className="max-w-[980px] text-[clamp(42px,7vw,104px)] font-black leading-[0.98] tracking-normal text-[#f8f5ec] max-sm:text-[38px]">
          다사다난했던 2026년 상반기,
          <br />
          안녕하셨나요?
        </h1>
      </div>

      <section className="mt-10 min-h-0 max-sm:mt-6">
        <div className="mb-4 flex items-end justify-between gap-6 max-sm:mb-3">
          <SmallMeta>상반기 주요 사건</SmallMeta>
          <span className="font-mono text-[11px] font-black text-[#6e6b62]">
            임팩트 순
          </span>
        </div>

        <ol className="max-h-[43vh] overflow-y-auto border-t border-[#292722] max-sm:max-h-[49svh]">
          {events.map((event, index) => (
            <li
              className="opening-event-rise grid grid-cols-[56px_minmax(0,150px)_minmax(0,1fr)] items-start gap-4 border-b border-[#24231f] py-3 opacity-0 max-md:grid-cols-[44px_minmax(0,1fr)] max-sm:gap-3 max-sm:py-3"
              key={`${event.title}-${index}`}
              style={{ animationDelay: `${720 + index * 115}ms` }}
            >
              <span className="font-mono text-[12px] font-black text-[#77746a]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="max-md:order-3 max-md:col-span-2 max-md:ml-[56px] max-sm:ml-[44px]">
                <span
                  className="mb-2 block h-[3px] w-9"
                  style={{ backgroundColor: event.accent }}
                />
                <p className="text-[12px] font-black leading-5 text-[#9b978d]">
                  {event.dateLabel} · {event.impactLabel}
                </p>
              </div>
              <div className="min-w-0">
                <h2 className="text-[19px] font-black leading-snug text-[#f5f2e8] max-sm:text-[17px]">
                  {event.title}
                </h2>
                <p className="mt-1 max-w-[860px] text-[13px] font-semibold leading-5 text-[#9c998f] max-sm:hidden">
                  {shorten(event.description, 92)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </article>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

const openingEventSpecs = [
  {
    impactLabel: "정치개혁",
    match: ["2026 지방선거제도 개정 합의"],
    title: "지방선거제도 개정과 정치개혁 요구",
  },
  {
    impactLabel: "선거관리",
    match: ["2026-06-03 서울 투표지 개표 오류"],
    title: "6·3 지방선거 관리 부실과 선관위 책임론",
  },
  {
    impactLabel: "노동안전",
    match: ["김충현 노동자 사망 1주기"],
    title: "김충현 노동자 사망 1주기와 발전소 직접고용 요구",
  },
  {
    impactLabel: "집단해고",
    match: ["한국지엠-우진물류"],
    title: "한국GM 세종물류센터 120명 집단해고",
  },
  {
    impactLabel: "공공안전",
    match: ["2026-04-20 경남 진주 CU 물류센터"],
    title: "경남 진주 CU 물류센터 화물노동자 사망",
  },
  {
    impactLabel: "장애인권",
    match: ["인천 색동원 집단 성폭력 사건"],
    title: "인천 색동원 집단 성폭력 사건",
  },
  {
    impactLabel: "반전평화",
    match: ["호르무즈 해협 군사작전 참여 반대"],
    title: "호르무즈 해협 군사작전 참여 반대",
  },
  {
    impactLabel: "팔레스타인",
    match: ["구호선 '키리아코스 X'"],
    title: "가자 구호선 나포와 한국 활동가 억류",
  },
  {
    impactLabel: "평등",
    match: ["오세훈 시장 발언"],
    title: "성소수자·장애인 차별 발언과 평등 요구",
  },
  {
    impactLabel: "기후·핵발전",
    match: ["후쿠시마 핵발전소 폭발 사고"],
    title: "후쿠시마 15주기와 신규핵발전 논란",
  },
  {
    impactLabel: "주거권",
    match: ["용산국제업무지구 개발 계획 철회"],
    title: "용산국제업무지구와 서울 개발 공약",
  },
] satisfies Array<{
  impactLabel: string;
  match: string[];
  title: string;
}>;

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

function pickOpeningEvents(data: PublicAgendaData): OpeningEvent[] {
  const indexedIssues: Array<{
    agenda: PublicAgenda;
    issue: PublicIssue;
    phase: PublicAgendaPhase;
  }> = [];

  for (const agenda of data.agendas) {
    for (const phase of agenda.phases) {
      for (const issue of phase.issues) {
        indexedIssues.push({ agenda, issue, phase });
      }
    }
  }

  const usedIssueIds = new Set<string>();
  return openingEventSpecs
    .map((spec) => {
      const match = indexedIssues.find(({ issue }) => {
        if (usedIssueIds.has(issue.id)) return false;
        return spec.match.some((needle) => issue.title.includes(needle));
      });

      if (!match) return null;
      usedIssueIds.add(match.issue.id);

      return {
        accent: match.agenda.accent,
        agendaTitle: match.agenda.title,
        dateLabel: match.issue.dateLabel,
        description: match.issue.leadSentence,
        impactLabel: spec.impactLabel,
        phaseTitle: match.phase.title,
        title: spec.title,
      };
    })
    .filter((event): event is OpeningEvent => event !== null);
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
