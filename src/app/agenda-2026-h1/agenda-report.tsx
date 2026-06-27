"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type TouchEvent,
} from "react";

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

type OpeningSource = {
  label: string;
  url: string;
};

type OpeningCard = {
  accent: string;
  dateLabel: string;
  imageSrc?: string;
  imageLabel?: string;
  kind?: "intro" | "section" | "story" | "closing";
  lines: string[];
  mediaKind?: "youtube";
  sources?: OpeningSource[];
  title: string;
};

type OpeningAgendaChoice = {
  agendaId: string;
  imageSrc: string;
  label: string;
};

type OpeningBackground = {
  current: string;
  end: string;
  start: string;
  tone: "light" | "dark";
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
            <OpeningCardScrollPage
              agendas={data.agendas}
              cards={openingStoryCards}
              onSelectAgenda={selectAgenda}
            />
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
  agendas,
  cards,
  onSelectAgenda,
}: {
  agendas: PublicAgenda[];
  cards: OpeningCard[];
  onSelectAgenda: (agenda: PublicAgenda) => void;
}) {
  const stageRef = useRef<HTMLElement | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const scroller = scrollerRef.current;
    if (!stage || !scroller) return;

    let frame = 0;

    const updateBackground = () => {
      frame = 0;
      const progress = getOpeningScrollProgress(scroller);
      const background = getOpeningInterpolatedBackground(progress);
      stage.style.setProperty("--opening-stage-bg-top", background.top);
      stage.style.setProperty("--opening-stage-bg-bottom", background.bottom);
      updateOpeningCardFocus(scroller);
    };

    const requestUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateBackground);
    };

    updateBackground();
    scroller.addEventListener("scroll", requestUpdate, { passive: true });
    scroller.addEventListener("scrollend", updateBackground);
    window.addEventListener("resize", requestUpdate);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      scroller.removeEventListener("scroll", requestUpdate);
      scroller.removeEventListener("scrollend", updateBackground);
      window.removeEventListener("resize", requestUpdate);
    };
  }, []);

  return (
    <article
      className="opening-review-stage relative h-full w-full overflow-hidden"
      ref={stageRef}
      style={getOpeningStageStyle(0)}
    >
      <div className="opening-scroll-snap h-full overflow-y-auto" ref={scrollerRef}>
        {cards.map((card, index) => (
          <OpeningScrollCard
            agendas={agendas}
            card={card}
            index={index}
            key={`${card.title}-${index}`}
            onSelectAgenda={onSelectAgenda}
          />
        ))}
      </div>
    </article>
  );
}

function OpeningScrollCard({
  agendas,
  card,
  index,
  onSelectAgenda,
}: {
  agendas: PublicAgenda[];
  card: OpeningCard;
  index: number;
  onSelectAgenda: (agenda: PublicAgenda) => void;
}) {
  const cardRef = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(index === 0);
  const background = getOpeningBackground(index);
  const hasVisual = hasOpeningVisual(card);

  useEffect(() => {
    const element = cardRef.current;
    if (!element) return;
    const scrollRoot = element.closest(".opening-scroll-snap");

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(Boolean(entry?.isIntersecting && entry.intersectionRatio >= 0.18));
      },
      {
        root: scrollRoot,
        threshold: [0, 0.18],
      },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      className={getOpeningCardClassName(card)}
      data-tone={background.tone}
      data-visible={isVisible ? "true" : "false"}
      ref={cardRef}
      style={
        {
          "--event-accent": card.accent,
          "--opening-card-blur": index === 0 ? "0px" : "8px",
          "--opening-card-opacity": index === 0 ? 1 : 0.06,
          "--opening-card-scale": index === 0 ? 1 : 0.986,
          "--opening-bg-current": background.current,
          "--opening-bg-end": background.end,
          "--opening-bg-start": background.start,
        } as CSSProperties
      }
    >
      {card.kind === "closing" ? (
        <OpeningClosingBridge
          agendas={agendas}
          card={card}
          onSelectAgenda={onSelectAgenda}
        />
      ) : hasVisual ? (
        <div className={getOpeningMediaGroupClassName(card)}>
          <OpeningVisual card={card} index={index} />

          <div className={getOpeningCopyClassName(card)}>
            <div className="opening-card-content">
              {card.kind === "story" ? (
                <OpeningLines lines={card.lines} variant="story" />
              ) : (
                <>
                  <h1 className={getOpeningTitleClassName(card)}>
                    <OpeningTitleText title={card.title} />
                  </h1>
                  <OpeningLines lines={card.lines} />
                </>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className={getOpeningCopyClassName(card)}>
          <div className="opening-card-content">
            {card.kind === "story" ? (
              <OpeningLines lines={card.lines} variant="story" />
            ) : (
              <>
                <h1 className={getOpeningTitleClassName(card)}>
                  <OpeningTitleText title={card.title} />
                </h1>
                <OpeningLines lines={card.lines} />
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function OpeningClosingBridge({
  agendas,
  card,
  onSelectAgenda,
}: {
  agendas: PublicAgenda[];
  card: OpeningCard;
  onSelectAgenda: (agenda: PublicAgenda) => void;
}) {
  const choices = closingAgendaChoices
    .map((choice) => ({
      ...choice,
      agenda: agendas.find((agenda) => agenda.id === choice.agendaId),
    }))
    .filter(
      (choice): choice is OpeningAgendaChoice & { agenda: PublicAgenda } =>
        Boolean(choice.agenda),
    );

  return (
    <div className="opening-closing-shell relative flex min-h-full w-full items-center justify-center">
      <p className="opening-closing-copy absolute inset-x-0 mx-auto max-w-[760px] break-keep px-4 text-center text-[clamp(22px,3.4vw,46px)] font-black leading-[1.35] text-[#f6f2e8] max-sm:text-[24px]">
        {card.lines.map((line, index) => (
          <span className="block" key={`${line}-${index}`}>
            {line}
          </span>
        ))}
      </p>

      <div className="opening-choice-panel flex w-full max-w-[1180px] flex-col gap-7 max-sm:gap-4">
        <div className="opening-choice-header text-right text-[clamp(24px,3vw,48px)] font-black leading-none text-[#f6f2e8] max-sm:text-[23px]">
          희망은 어디에 있을까요?
        </div>

        <div className="opening-choice-grid grid w-full grid-cols-2 grid-rows-3 gap-4 max-sm:h-[68svh] max-sm:gap-2 sm:h-[min(66vh,640px)]">
          {choices.map((choice) => (
            <button
              className="group relative min-h-0 overflow-hidden bg-[#111] text-left"
              key={`${choice.agendaId}-${choice.label}`}
              onClick={() => onSelectAgenda(choice.agenda)}
              type="button"
            >
              <Image
                alt={choice.label}
                className="object-cover transition duration-500 group-hover:scale-[1.025]"
                fill
                sizes="(max-width: 768px) 50vw, 42vw"
                src={choice.imageSrc}
                unoptimized
              />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/82 via-black/48 to-transparent px-4 pb-4 pt-12 text-right text-[clamp(13px,1.3vw,19px)] font-black leading-none text-[#f7f2e8] max-sm:px-2.5 max-sm:pb-2.5 max-sm:pt-8 max-sm:text-[12px]">
                <span className="block truncate">{choice.label}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function OpeningVisual({ card, index }: { card: OpeningCard; index: number }) {
  const youtubeEmbedUrl = getYouTubeEmbedUrl(card);

  return (
    <figure className={youtubeEmbedUrl ? "opening-card-visual opening-video-figure" : "opening-card-visual"}>
      {card.imageSrc ? (
        <Image
          alt={card.imageLabel ?? card.title}
          className="h-auto max-h-[72vh] w-full object-contain"
          height={820}
          priority={index <= 2}
          sizes="(max-width: 1024px) 100vw, 56vw"
          src={card.imageSrc}
          unoptimized
          width={1200}
        />
      ) : youtubeEmbedUrl ? (
        <iframe
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          className="opening-video-frame bg-black"
          src={youtubeEmbedUrl}
          title={card.imageLabel ?? card.title}
        />
      ) : null}
      {card.sources?.length ? <OpeningSourceLinks sources={card.sources} /> : null}
    </figure>
  );
}

function OpeningLines({
  lines,
  variant = "body",
}: {
  lines: string[];
  variant?: "body" | "story";
}) {
  if (!lines.length) return null;

  const className =
    variant === "story"
      ? "max-w-[860px] break-keep font-black leading-[1.12] text-[#f5f2e8]"
      : "mt-8 max-w-[760px] break-keep text-[clamp(17px,1.8vw,26px)] font-bold leading-[1.58] text-[#d7d1c5] max-sm:mt-6 max-sm:text-[18px] max-sm:leading-8";
  const nonEmptyLines = lines.filter(Boolean);

  return (
    <p className={className}>
      {lines.map((line, index) => {
        if (!line) {
          return <span aria-hidden="true" className="block h-5" key={`space-${index}`} />;
        }

        const position = lines.slice(0, index + 1).filter(Boolean).length - 1;
        return (
          <span
            className={getOpeningLineClassName(variant, position, nonEmptyLines.length)}
            key={`${line}-${index}`}
          >
            {line}
          </span>
        );
      })}
    </p>
  );
}

function getOpeningLineClassName(
  variant: "body" | "story",
  index: number,
  total: number,
) {
  if (variant === "body") return "block";
  const marginClass = total > 1 && index > 0 ? "mt-2" : "";
  return `${marginClass} block text-[clamp(17px,1.45vw,24px)] leading-[1.74] text-[#e6e1d6] max-sm:text-[18px]`;
}

function OpeningTitleText({ title }: { title: string }) {
  return title.split("\n").map((line, index) => (
    <span className="block" key={`${line}-${index}`}>
      {line}
    </span>
  ));
}

function OpeningSourceLinks({ sources }: { sources: OpeningSource[] }) {
  return (
    <figcaption className="opening-source-links mt-3 flex flex-wrap justify-end gap-x-2 gap-y-1 text-right font-mono text-[11px] font-black text-[#858176]">
      <span>출처</span>
      {sources.map((source, index) => (
        <span key={`${source.label}-${source.url}`}>
          <a
            className="text-[#a8a397] underline-offset-4 transition hover:text-[#f1f0e8] hover:underline"
            href={source.url}
            rel="noreferrer"
            target="_blank"
          >
            {source.label}
          </a>
          {index < sources.length - 1 ? <span className="ml-2 text-[#555147]">·</span> : null}
        </span>
      ))}
    </figcaption>
  );
}

function getOpeningCardClassName(card: OpeningCard) {
  if (card.kind === "closing") {
    return "opening-snap-card flex min-h-full items-center justify-center px-8 py-8 max-sm:px-3 max-sm:py-3";
  }
  if (card.kind === "story" && card.mediaKind === "youtube") {
    return "opening-snap-card flex min-h-full items-center justify-center px-12 py-10 max-sm:px-3 max-sm:py-4";
  }
  if (card.kind === "story" && hasOpeningVisual(card)) {
    return "opening-snap-card flex min-h-full items-center justify-center px-12 py-10 max-sm:px-5 max-sm:py-6";
  }
  if (card.kind === "story") {
    return "opening-snap-card flex min-h-full flex-col justify-center px-12 py-14 max-sm:px-5 max-sm:py-8";
  }
  return "opening-snap-card flex min-h-full flex-col justify-center px-12 py-14 max-sm:px-5 max-sm:py-8";
}

function getOpeningMediaGroupClassName(card: OpeningCard) {
  const base =
    "opening-media-copy-group grid w-full max-w-[1320px] content-center items-center";

  if (card.mediaKind === "youtube") {
    return `${base} grid-cols-[minmax(320px,0.95fr)_minmax(0,0.78fr)] gap-10 max-lg:grid-cols-1 max-lg:gap-5 max-sm:gap-4`;
  }

  return `${base} grid-cols-[minmax(360px,1.08fr)_minmax(0,0.82fr)] gap-10 max-lg:grid-cols-1 max-lg:gap-6 max-sm:gap-5`;
}

function getOpeningBackground(index: number): OpeningBackground {
  const current = getOpeningBackgroundStep(index);

  return {
    current: current.color,
    end: current.color,
    start: current.color,
    tone: current.tone,
  };
}

function getOpeningStageStyle(index: number): CSSProperties {
  const background = getOpeningBackgroundStep(index);

  return {
    "--opening-stage-bg-bottom": background.color,
    "--opening-stage-bg-top": background.color,
  } as CSSProperties;
}

function getOpeningScrollProgress(scroller: HTMLDivElement) {
  const cards = Array.from(scroller.querySelectorAll<HTMLElement>(".opening-snap-card"));
  const scrollTop = scroller.scrollTop;
  if (!cards.length) return 0;

  for (let index = 0; index < cards.length - 1; index += 1) {
    const current = cards[index].offsetTop;
    const next = cards[index + 1].offsetTop;
    if (scrollTop >= current && scrollTop <= next) {
      const span = Math.max(1, next - current);
      return index + (scrollTop - current) / span;
    }
  }

  return cards.length - 1;
}

function updateOpeningCardFocus(scroller: HTMLDivElement) {
  const rootTop = scroller.getBoundingClientRect().top;
  const rootHeight = Math.max(1, scroller.clientHeight);
  const cards = Array.from(scroller.querySelectorAll<HTMLElement>(".opening-snap-card"));

  for (const card of cards) {
    const topDelta = card.getBoundingClientRect().top - rootTop;
    const distance = Math.abs(topDelta);
    const focusRange = rootHeight * (topDelta < 0 ? 0.1 : 0.34);
    const linearFocus = Math.max(0, Math.min(1, 1 - distance / focusRange));
    const focus = perceptualFadeFocus(linearFocus, topDelta < 0);
    card.style.setProperty("--opening-card-opacity", String(focus));
    card.style.setProperty("--opening-card-scale", String(0.986 + focus * 0.014));
    card.style.setProperty("--opening-card-blur", `${(1 - focus) * 8}px`);
  }
}

function perceptualFadeFocus(linearFocus: number, isLeaving: boolean) {
  const start = isLeaving ? 0.72 : 0.78;
  const gamma = isLeaving ? 9.5 : 7.2;
  const normalized = Math.max(0, Math.min(1, (linearFocus - start) / (1 - start)));

  return normalized ** gamma;
}

function getOpeningInterpolatedBackground(progress: number): {
  bottom: string;
  top: string;
} {
  const maxIndex = openingStoryCards.length - 1;
  const clamped = Math.max(0, Math.min(maxIndex, progress));

  if (clamped >= maxIndex - 0.18) {
    const amount = smoothStep((clamped - (maxIndex - 0.18)) / 0.18);
    const color = mixOklabColor("#050505", "#f7f5ef", amount);

    return {
      bottom: color,
      top: color,
    };
  }

  const baseIndex = Math.min(maxIndex, Math.floor(clamped));
  const nextIndex = Math.min(maxIndex, baseIndex + 1);
  const localProgress = clamped - baseIndex;
  const from = getOpeningBackgroundStep(baseIndex).color;
  const to = getOpeningBackgroundStep(nextIndex).color;
  const eased = smoothStep(localProgress);
  const spread = Math.sin(Math.PI * eased) * 0.22;

  return {
    bottom: mixOklabColor(from, to, Math.min(1, eased + spread)),
    top: mixOklabColor(from, to, Math.max(0, eased - spread)),
  };
}

function getOpeningBackgroundStep(index: number): {
  color: string;
  tone: OpeningBackground["tone"];
} {
  const screen = index + 1;

  if (screen === 1 || screen === 23) {
    return { color: "#f7f5ef", tone: "light" };
  }

  const darkeningProgress = Math.max(0, Math.min(1, (screen - 2) / 20));
  const color = mixOklabColorHex("#f1f0ea", "#050505", darkeningProgress);

  return { color, tone: getOpeningToneForColor(color) };
}

function smoothStep(value: number) {
  return value * value * (3 - 2 * value);
}

function mixOklabColor(from: string, to: string, amount: number) {
  const mixed = mixOklab(from, to, amount);

  return `rgb(${mixed[0]}, ${mixed[1]}, ${mixed[2]})`;
}

function mixOklabColorHex(from: string, to: string, amount: number) {
  return `#${mixOklab(from, to, amount)
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}

function mixOklab(from: string, to: string, amount: number) {
  const fromLab = rgbToOklab(parseHexColor(from));
  const toLab = rgbToOklab(parseHexColor(to));
  const lab = fromLab.map((channel, index) => channel + (toLab[index] - channel) * amount);

  return oklabToRgb(lab);
}

function rgbToOklab(rgb: number[]) {
  const [red, green, blue] = rgb.map(srgbToLinear);
  const l = Math.cbrt(0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue);
  const m = Math.cbrt(0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue);
  const s = Math.cbrt(0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue);

  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function oklabToRgb(lab: number[]) {
  const [lightness, a, b] = lab;
  const l = lightness + 0.3963377774 * a + 0.2158037573 * b;
  const m = lightness - 0.1055613458 * a - 0.0638541728 * b;
  const s = lightness - 0.0894841775 * a - 1.291485548 * b;
  const l3 = l ** 3;
  const m3 = m ** 3;
  const s3 = s ** 3;

  return [
    4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
    -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
    -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3,
  ].map(linearToSrgb);
}

function srgbToLinear(value: number) {
  const channel = value / 255;

  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(value: number) {
  const clamped = Math.max(0, Math.min(1, value));
  const channel =
    clamped <= 0.0031308
      ? 12.92 * clamped
      : 1.055 * clamped ** (1 / 2.4) - 0.055;

  return Math.round(channel * 255);
}

function getOpeningToneForColor(color: string): OpeningBackground["tone"] {
  const [red, green, blue] = parseHexColor(color);
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;

  return luminance > 0.5 ? "light" : "dark";
}

function parseHexColor(value: string) {
  const clean = value.replace("#", "");
  return [0, 2, 4].map((start) => parseInt(clean.slice(start, start + 2), 16));
}

function getOpeningCopyClassName(card: OpeningCard) {
  if (card.kind === "story" && hasOpeningVisual(card)) return "flex min-h-0 flex-col justify-center";
  return "max-w-[980px]";
}

function hasOpeningVisual(card: OpeningCard) {
  return Boolean(card.imageSrc || card.mediaKind === "youtube");
}

function getYouTubeEmbedUrl(card: OpeningCard) {
  if (card.mediaKind !== "youtube") return null;

  const sourceUrl = card.sources?.find((source) => source.label === "YouTube")?.url;
  const videoId = sourceUrl?.match(/(?:shorts\/|watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/)?.[1];
  return videoId
    ? `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1&controls=0&fs=0&iv_load_policy=3&disablekb=1`
    : null;
}


function getOpeningTitleClassName(card: OpeningCard) {
  if (card.kind === "intro") {
    return "mt-8 max-w-[900px] break-keep text-[clamp(34px,5.4vw,78px)] font-black leading-[1.16] tracking-normal text-[#f8f5ec] max-sm:text-[32px]";
  }
  if (card.kind === "closing") {
    return "mt-8 max-w-[980px] break-keep text-[clamp(42px,7vw,104px)] font-black leading-[0.98] tracking-normal text-[#f8f5ec] max-sm:text-[38px]";
  }
  if (card.kind === "section") {
    return "mt-8 max-w-[920px] break-keep text-[clamp(38px,6vw,86px)] font-black leading-[1.16] tracking-normal text-[#f5f2e8] max-sm:text-[34px]";
  }
  return "mt-8 max-w-[920px] break-keep text-[clamp(32px,4.35vw,66px)] font-black leading-[1.04] tracking-normal text-[#f5f2e8] max-sm:mt-6 max-sm:text-[32px]";
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

const closingAgendaChoices: OpeningAgendaChoice[] = [
  {
    agendaId: "election-democracy",
    imageSrc: "/oh-win.jpg",
    label: "선거와 민주주의",
  },
  {
    agendaId: "disability-rights",
    imageSrc: "/junjang.jpg",
    label: "왜 그들은 열차를 세웠을까",
  },
  {
    agendaId: "rights-equality",
    imageSrc: "/queer.jpg",
    label: "서울시청과 퀴어퍼레이드",
  },
  {
    agendaId: "labor-safety",
    imageSrc: "/coupang.jpg",
    label: "일하다 죽지 않을 권리",
  },
  {
    agendaId: "rights-equality",
    imageSrc: "/jang.jpg",
    label: "여성 살해",
  },
  {
    agendaId: "peace-palestine",
    imageSrc: "/haecho.webp",
    label: "전쟁과 평화: 해초의 여권",
  },
];

const openingStoryCards: OpeningCard[] = [
  {
    accent: "#f1f0e8",
    dateLabel: "상반기 회고",
    kind: "intro",
    lines: [
      "벌써 7월이네요.",
      "2026년 상반기는 참 다사다난했습니다.",
      "",
      "어떤 일이 있었는지",
      "한번 돌아볼까요?",
    ],
    title: "2026년 상반기,\n안녕하셨나요?",
  },
  {
    accent: "#c8b27a",
    dateLabel: "6월 3일",
    imageLabel: "오세훈 당선 사진",
    imageSrc: "/oh-win.jpg",
    kind: "story",
    lines: ["우선, 오세훈 시장님 당선 축하드립니다."],
    title: "지방선거를 치렀습니다.",
  },
  {
    accent: "#c8b27a",
    dateLabel: "지방선거",
    imageLabel: '오세훈 "정원오 토론하자"',
    imageSrc: "/oh-debate.png",
    kind: "story",
    lines: ["참 조용한 선거였네요."],
    sources: [
      {
        label: "KBS",
        url: "https://news.kbs.co.kr/news/pc/view/view.do?ncd=8561049",
      },
    ],
    title: "조용한 선거",
  },
  {
    accent: "#c8b27a",
    dateLabel: "지방선거",
    imageLabel: "서울시장 후보 TV토론",
    kind: "story",
    lines: [
      "TV토론이 한 번밖에 없어서 좀 아쉽긴 했지만, 어쩌겠습니까.",
      "앞으로 4년간 잘 부탁드립니다.",
    ],
    sources: [
      {
        label: "연합뉴스",
        url: "https://www.yna.co.kr/view/PYH20260528238300013",
      },
      {
        label: "서울신문",
        url: "https://m.go.seoul.co.kr/news/politics/presidential-election-2025/2025/05/20/20250520006005?cp=go",
      },
    ],
    title: "한 번의 토론",
  },
  {
    accent: "#a7b0ff",
    dateLabel: "지방선거 이후",
    imageLabel: "서울광장 퀴어퍼레이드 관련 발언",
    kind: "story",
    lines: ["당분간 서울광장에서 열리는 퀴어퍼레이드,"],
    mediaKind: "youtube",
    sources: [
      {
        label: "YouTube",
        url: "https://youtube.com/shorts/5Fx6ewt3UXE?si=yMbU8nhOJwTXSCZS",
      },
    ],
    title: "서울광장",
  },
  {
    accent: "#a7b0ff",
    dateLabel: "지방선거 이후",
    imageLabel: "전장연 시위 관련 발언",
    kind: "story",
    lines: ["전장연의 시위는 보기 어렵겠네요."],
    mediaKind: "youtube",
    sources: [
      {
        label: "YouTube",
        url: "https://youtube.com/shorts/9a6d8xPhl8E?si=6bEyXMyn3qvx4hKS",
      },
    ],
    title: "전장연",
  },
  {
    accent: "#b84d47",
    dateLabel: "노동안전·공공안전",
    kind: "section",
    lines: [],
    title: "비극적인 사고도 많았습니다.",
  },
  {
    accent: "#b84d47",
    dateLabel: "공공안전",
    imageLabel: "서울 서소문 고가도로 붕괴사고",
    imageSrc: "/seosomun.webp",
    kind: "story",
    lines: ["서울 서소문 고가도로 붕괴사고,"],
    sources: [
      {
        label: "한겨레",
        url: "https://www.hani.co.kr/arti/society/society_general/1260610.html",
      },
    ],
    title: "서소문 붕괴사고",
  },
  {
    accent: "#b84d47",
    dateLabel: "노동안전",
    imageLabel: "한화에어로스페이스 폭발사고",
    imageSrc: "/hanwha.jpg",
    kind: "story",
    lines: ["한화에어로스페이스 폭발사고,"],
    sources: [
      {
        label: "연합뉴스",
        url: "https://www.yna.co.kr/view/AKR20260602113251063",
      },
    ],
    title: "한화에어로스페이스",
  },
  {
    accent: "#b84d47",
    dateLabel: "노동안전",
    imageLabel: "쿠팡 노동자 사망 관련 보도",
    imageSrc: "/coupang.jpg",
    kind: "story",
    lines: ["쿠팡 노동자 사망사고."],
    sources: [
      {
        label: "매일노동뉴스",
        url: "https://www.labortoday.co.kr/news/articleView.html?idxno=234105",
      },
    ],
    title: "쿠팡",
  },
  {
    accent: "#d99b50",
    dateLabel: "산재와 원청 책임",
    kind: "section",
    lines: [
      "잇따르는 산재 사고는",
      "안전한 근로 환경에 대한 관심으로 이어졌습니다.",
    ],
    title: "안전의 책임",
  },
  {
    accent: "#d99b50",
    dateLabel: "원청 교섭",
    imageLabel: "노란봉투법과 원청 책임",
    imageSrc: "/nobong.jpg",
    kind: "story",
    lines: [
      "노동 환경의 안전 관리 주체는 누구인가,",
      "11년 만에 통과한 노란봉투법으로",
      "하청업체 직원의 사망에 대해 원청업체의 책임을 물을 수 있게 되었습니다.",
    ],
    sources: [
      {
        label: "우먼타임스",
        url: "https://www.womentimes.co.kr/news/articleView.html?idxno=58576",
      },
    ],
    title: "노란봉투법",
  },
  {
    accent: "#d99b50",
    dateLabel: "노란봉투법 이후",
    imageLabel: "노란봉투법 책임 회피 설명서",
    kind: "story",
    lines: [
      "노란봉투법 발의 얼마 후,",
      "경기도는 산하 기관에 \"노란봉투법 회피 매뉴얼\"을 배포했습니다.",
      "민주노총은 실질적인 원청 교섭권 행사가 이뤄지지 않고 있다며,",
      "7월 15일 총파업을 예고한 상황입니다.",
    ],
    sources: [
      {
        label: "민주노총",
        url: "https://nodong.org/statement/7933755",
      },
    ],
    title: "책임 회피와 총파업",
  },
  {
    accent: "#d97997",
    dateLabel: "여성 살해",
    kind: "section",
    lines: [],
    title: "젠더 문제는 좀 나아졌나요?",
  },
  {
    accent: "#d97997",
    dateLabel: "여성 살해",
    imageLabel: "광주 장윤기 살인 사건",
    imageSrc: "/jang.jpg",
    kind: "story",
    lines: ["광주 장윤기 살인 사건,"],
    sources: [
      {
        label: "법률신문",
        url: "https://www.lawtimes.co.kr/news/articleView.html?idxno=221491",
      },
    ],
    title: "광주",
  },
  {
    accent: "#d97997",
    dateLabel: "여성 살해",
    imageLabel: "남양주 스토킹 살인 사건",
    kind: "story",
    lines: ["남양주 스토킹 살인 사건,"],
    mediaKind: "youtube",
    sources: [
      {
        label: "YouTube",
        url: "https://www.youtube.com/shorts/boIZOM5Q87Q",
      },
    ],
    title: "남양주",
  },
  {
    accent: "#d97997",
    dateLabel: "여성 살해",
    imageLabel: "안산 성폭행 고소 피해자 사망 사건",
    kind: "story",
    lines: [
      "안산 성폭행 고소 피해자 사망 사건 등",
      "성폭력 사망 사건이 잇따랐습니다.",
    ],
    mediaKind: "youtube",
    sources: [
      {
        label: "YouTube",
        url: "https://www.youtube.com/shorts/5CKwGI75mZ0",
      },
    ],
    title: "안산",
  },
  {
    accent: "#d97997",
    dateLabel: "동의 없는 성폭력",
    imageLabel: "성폭력 재판소원 관련 보도",
    imageSrc: "/court.jpg",
    kind: "story",
    lines: ["헌법재판소에는 '동의 없는 성폭력'에 선고된 무죄 판결을 취소해달라는 취지의 재판소원이 오른 상황입니다."],
    sources: [
      {
        label: "다음",
        url: "https://v.daum.net/v/yWucOXXSD0",
      },
    ],
    title: "재판소원",
  },
  {
    accent: "#d97997",
    dateLabel: "동의 없는 성폭력",
    kind: "story",
    lines: [
      "해당 헌법소원 청구인은 2022년 유사강간 상황에서 '75차례' 이상 거부 의사를 밝혔지만, 1심, 2심 법원은 무죄 판결을 내렸습니다.",
      "75차례의 거부는 동의 없음의 증거가 되기에 충분하지 않았을까요?",
    ],
    title: "75차례의 거부",
  },
  {
    accent: "#7b8dd8",
    dateLabel: "반전평화",
    kind: "section",
    lines: [],
    title: "매일이 전쟁입니다.",
  },
  {
    accent: "#7b8dd8",
    dateLabel: "호르무즈 해협",
    imageLabel: "호르무즈 해협과 나무호 피격 사건",
    imageSrc: "/namu.webp",
    kind: "story",
    lines: [
      "미국-이란의 갈등 심화 국면에서",
      "호르무즈 해협에서는 한국 선박이 피격당했고,",
    ],
    sources: [
      {
        label: "굿뉴스1",
        url: "https://www.goodnews1.com/news/articleView.html?idxno=457810",
      },
    ],
    title: "호르무즈 해협",
  },
  {
    accent: "#7b8dd8",
    dateLabel: "팔레스타인",
    imageLabel: "팔레스타인 가자지구 관련 보도",
    imageSrc: "/palestine.jpg",
    kind: "story",
    lines: [
      "팔레스타인에서는",
      "7만명이 넘는 민간인이 공습으로 사망했습니다.",
    ],
    sources: [
      {
        label: "가톨릭평화신문",
        url: "https://news.cpbc.co.kr/article/279686",
      },
    ],
    title: "가자",
  },
  {
    accent: "#f1f0e8",
    dateLabel: "다음",
    kind: "closing",
    lines: ["돌아보니 무척 암울한 상반기였네요.", "이런 현실은 바뀔 수 있을까요?"],
    title: "좀더 들여다볼까요?",
  },
];

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

function getProgress(
  state: ReaderState,
  reviewCount: number,
  storyCount: number,
) {
  if (state.mode === "review") {
    return {
      label: "상반기 회고",
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
