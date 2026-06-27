"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
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
  copyAlign?: "mobile-center";
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
  transitionTheme: OpeningTransitionTheme;
};

type OpeningTransitionTheme =
  | "disabled"
  | "election"
  | "gender"
  | "labor"
  | "palestine"
  | "pride";

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

const OPENING_LAST_CARD_SCROLL_MS = 2200;
const OPENING_LONG_PRESS_SCROLL_MS = 2800;
const OPENING_CHOICE_REVEAL_DELAY_MS = 4800;

export function AgendaReport({ data }: { data: PublicAgendaData }) {
  const [hasExitedOpening, setHasExitedOpening] = useState(false);
  const [selectedTransitionTheme, setSelectedTransitionTheme] =
    useState<OpeningTransitionTheme>("election");

  return (
    <main className="h-[100dvh] overflow-hidden bg-transparent text-[#f1f0e8]">
      <section className="relative flex h-full min-h-0 flex-col">
        <div className="relative flex min-h-0 flex-1 items-stretch overflow-hidden bg-[#090908]">
          {hasExitedOpening ? (
            <AgendaWorkSurface theme={selectedTransitionTheme} />
          ) : (
            <OpeningCardScrollPage
              agendas={data.agendas}
              cards={openingStoryCards}
              onSelectAgenda={(choice) => {
                setSelectedTransitionTheme(choice.transitionTheme);
                setHasExitedOpening(true);
              }}
            />
          )}
        </div>
      </section>
    </main>
  );
}

function AgendaWorkSurface({ theme }: { theme: OpeningTransitionTheme }) {
  return <article aria-label="어젠다 작업면" className="agenda-work-surface h-full w-full" data-theme={theme} />;
}

function OpeningCardScrollPage({
  agendas,
  cards,
  onSelectAgenda,
}: {
  agendas: PublicAgenda[];
  cards: OpeningCard[];
  onSelectAgenda: (choice: OpeningAgendaChoice & { agenda: PublicAgenda }) => void;
}) {
  const stageRef = useRef<HTMLElement | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const scrollAnimationFrameRef = useRef<number | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const topButtonRevealTimerRef = useRef<number | null>(null);
  const didLongPressRef = useRef(false);
  const isPgDnHiddenRef = useRef(false);
  const isPgDnHintVisibleRef = useRef(true);
  const isFinalCardSettledRef = useRef(false);
  const isFinalScrollTransitioningRef = useRef(false);
  const [isPgDnHidden, setIsPgDnHidden] = useState(false);
  const [isPgDnHintVisible, setIsPgDnHintVisible] = useState(true);
  const [isFinalCardSettled, setIsFinalCardSettled] = useState(false);
  const [isFinalScrollTransitioning, setIsFinalScrollTransitioning] = useState(false);
  const [isTopButtonReady, setIsTopButtonReady] = useState(false);

  const updateFloatingNavigation = useCallback((scroller: HTMLDivElement) => {
    const snapCards = Array.from(
      scroller.querySelectorAll<HTMLElement>(".opening-snap-card"),
    );
    const lastCard = snapCards.at(-1);
    if (!lastCard) return;

    const isFinalTransitioning = isFinalScrollTransitioningRef.current;
    const shouldHide =
      isFinalTransitioning ||
      scroller.scrollTop >= lastCard.offsetTop - scroller.clientHeight * 0.28;
    const shouldShowPgDnHint =
      !shouldHide && scroller.scrollTop <= scroller.clientHeight * 0.12;
    const shouldSettle =
      !isFinalTransitioning && Math.abs(scroller.scrollTop - lastCard.offsetTop) <= 2;

    if (shouldHide !== isPgDnHiddenRef.current) {
      isPgDnHiddenRef.current = shouldHide;
      setIsPgDnHidden(shouldHide);
    }

    if (shouldShowPgDnHint !== isPgDnHintVisibleRef.current) {
      isPgDnHintVisibleRef.current = shouldShowPgDnHint;
      setIsPgDnHintVisible(shouldShowPgDnHint);
    }

    if (shouldSettle === isFinalCardSettledRef.current) return;

    isFinalCardSettledRef.current = shouldSettle;
    setIsFinalCardSettled(shouldSettle);

    if (!shouldSettle) {
      clearTopButtonRevealTimer();
      setIsTopButtonReady(false);
    }
  }, []);

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
      updateFloatingNavigation(scroller);
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
      if (scrollAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollAnimationFrameRef.current);
        scrollAnimationFrameRef.current = null;
      }
      isFinalScrollTransitioningRef.current = false;
      scroller.classList.remove("opening-scroll-snap-manual");
      scroller.removeEventListener("scroll", requestUpdate);
      scroller.removeEventListener("scrollend", updateBackground);
      window.removeEventListener("resize", requestUpdate);
    };
  }, [updateFloatingNavigation]);

  useEffect(() => {
    if (!isFinalCardSettled) return;

    const shouldReduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(
      () => {
        setIsTopButtonReady(true);
        if (topButtonRevealTimerRef.current === timer) {
          topButtonRevealTimerRef.current = null;
        }
      },
      shouldReduceMotion ? 0 : OPENING_CHOICE_REVEAL_DELAY_MS,
    );
    topButtonRevealTimerRef.current = timer;

    return () => {
      window.clearTimeout(timer);
      if (topButtonRevealTimerRef.current === timer) {
        topButtonRevealTimerRef.current = null;
      }
    };
  }, [isFinalCardSettled]);

  function clearLongPressTimer() {
    if (longPressTimerRef.current === null) return;
    window.clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
  }

  function clearTopButtonRevealTimer() {
    if (topButtonRevealTimerRef.current === null) return;
    window.clearTimeout(topButtonRevealTimerRef.current);
    topButtonRevealTimerRef.current = null;
  }

  function cancelOpeningScrollAnimation(scroller = scrollerRef.current) {
    if (scrollAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(scrollAnimationFrameRef.current);
      scrollAnimationFrameRef.current = null;
    }

    setFinalScrollTransitioning(false);
    scroller?.classList.remove("opening-scroll-snap-manual");
  }

  function setFinalScrollTransitioning(nextValue: boolean) {
    if (nextValue === isFinalScrollTransitioningRef.current) return;

    isFinalScrollTransitioningRef.current = nextValue;
    setIsFinalScrollTransitioning(nextValue);
  }

  function getMaxScrollTop(scroller: HTMLDivElement) {
    return Math.max(0, scroller.scrollHeight - scroller.clientHeight);
  }

  function animateOpeningScrollTo(
    scroller: HTMLDivElement,
    targetTop: number,
    durationMs: number,
    options: { usePageTransition?: boolean } = {},
  ) {
    cancelOpeningScrollAnimation(scroller);

    const startTop = scroller.scrollTop;
    const finalTop = Math.max(0, Math.min(getMaxScrollTop(scroller), targetTop));
    const isFinalTarget = finalTop >= getMaxScrollTop(scroller) - 2;
    const usePageTransition = options.usePageTransition ?? isFinalTarget;

    if (Math.abs(finalTop - startTop) < 1) {
      scroller.scrollTop = finalTop;
      updateOpeningCardFocus(scroller);
      updateFloatingNavigation(scroller);
      return;
    }

    const startedAt = performance.now();
    if (usePageTransition) {
      setFinalScrollTransitioning(true);
      isPgDnHiddenRef.current = true;
      isPgDnHintVisibleRef.current = false;
      isFinalCardSettledRef.current = false;
      setIsPgDnHidden(true);
      setIsPgDnHintVisible(false);
      setIsFinalCardSettled(false);
      setIsTopButtonReady(false);
    }
    scroller.classList.add("opening-scroll-snap-manual");

    const step = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / durationMs);
      const easedProgress = easeOpeningFinalScroll(progress);
      scroller.scrollTop = startTop + (finalTop - startTop) * easedProgress;

      if (progress < 1) {
        scrollAnimationFrameRef.current = window.requestAnimationFrame(step);
        return;
      }

      scroller.scrollTop = finalTop;
      scrollAnimationFrameRef.current = null;
      setFinalScrollTransitioning(false);
      scroller.classList.remove("opening-scroll-snap-manual");
      updateOpeningCardFocus(scroller);
      updateFloatingNavigation(scroller);
    };

    scrollAnimationFrameRef.current = window.requestAnimationFrame(step);
  }

  function scrollToNextCard() {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const snapCards = Array.from(
      scroller.querySelectorAll<HTMLElement>(".opening-snap-card"),
    );
    const currentTop = scroller.scrollTop;
    const nextCard = snapCards.find((snapCard) => snapCard.offsetTop > currentTop + 24);
    const targetTop = nextCard
      ? nextCard.offsetTop
      : getMaxScrollTop(scroller);

    if (targetTop >= getMaxScrollTop(scroller) - 2) {
      animateOpeningScrollTo(scroller, targetTop, OPENING_LAST_CARD_SCROLL_MS);
      return;
    }

    cancelOpeningScrollAnimation(scroller);
    scroller.scrollTo({
      behavior: "smooth",
      top: targetTop,
    });
  }

  function scrollToLastCard() {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    animateOpeningScrollTo(scroller, getMaxScrollTop(scroller), OPENING_LAST_CARD_SCROLL_MS, {
      usePageTransition: false,
    });
  }

  function scrollToFirstCard() {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    isFinalCardSettledRef.current = false;
    setIsFinalCardSettled(false);
    setIsTopButtonReady(false);
    animateOpeningScrollTo(scroller, 0, OPENING_LONG_PRESS_SCROLL_MS, {
      usePageTransition: true,
    });
  }

  function handlePgDnPointerDown() {
    didLongPressRef.current = false;
    clearLongPressTimer();
    longPressTimerRef.current = window.setTimeout(() => {
      didLongPressRef.current = true;
      scrollToLastCard();
      clearLongPressTimer();
    }, 620);
  }

  function handlePgDnPointerEnd() {
    clearLongPressTimer();
  }

  function handlePgDnClick() {
    if (didLongPressRef.current) {
      didLongPressRef.current = false;
      return;
    }

    scrollToNextCard();
  }

  const isTopButtonVisible = isFinalCardSettled && isTopButtonReady;

  return (
    <article
      className="opening-review-stage relative h-full w-full overflow-hidden"
      data-final-transitioning={isFinalScrollTransitioning ? "true" : "false"}
      ref={stageRef}
      style={getOpeningStageStyle(0)}
    >
      <div className="opening-scroll-snap h-full overflow-y-auto" ref={scrollerRef}>
        {cards.map((card, index) => (
          <OpeningScrollCard
            agendas={agendas}
            card={card}
            index={index}
            isFinalCardSettled={isFinalCardSettled}
            key={`${card.title}-${index}`}
            onSelectAgenda={onSelectAgenda}
          />
        ))}
      </div>
      <span
        aria-hidden="true"
        className={`opening-pgdn-hint${isPgDnHidden || !isPgDnHintVisible ? " opening-pgdn-hint-hidden" : ""}`}
      >
        <span>꾹 누르면</span>
        <span>마지막으로</span>
      </span>
      <button
        aria-label="다음 카드로 내려가기. 길게 누르면 마지막으로 이동"
        aria-hidden={isPgDnHidden}
        className={`opening-pgdn-button${isPgDnHidden ? " opening-pgdn-button-hidden" : ""}`}
        disabled={isPgDnHidden}
        onClick={handlePgDnClick}
        onPointerCancel={handlePgDnPointerEnd}
        onPointerDown={handlePgDnPointerDown}
        onPointerLeave={handlePgDnPointerEnd}
        onPointerUp={handlePgDnPointerEnd}
        type="button"
      >
        <Image
          alt=""
          aria-hidden="true"
          className="opening-pgdn-icon"
          height={512}
          src="/arrow.png"
          unoptimized
          width={512}
        />
      </button>
      <button
        aria-label="처음 카드로 돌아가기"
        aria-hidden={!isTopButtonVisible}
        className={`opening-top-button${!isTopButtonVisible ? " opening-top-button-hidden" : ""}`}
        disabled={!isTopButtonVisible}
        onClick={scrollToFirstCard}
        type="button"
      >
        <Image
          alt=""
          aria-hidden="true"
          className="opening-top-icon"
          height={512}
          src="/arrow.png"
          unoptimized
          width={512}
        />
      </button>
    </article>
  );
}

function OpeningScrollCard({
  agendas,
  card,
  index,
  isFinalCardSettled,
  onSelectAgenda,
}: {
  agendas: PublicAgenda[];
  card: OpeningCard;
  index: number;
  isFinalCardSettled: boolean;
  onSelectAgenda: (choice: OpeningAgendaChoice & { agenda: PublicAgenda }) => void;
}) {
  const cardRef = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(index === 0);
  const background = getOpeningBackground(index);
  const hasVisual = hasOpeningVisual(card);
  const shouldShowCard = card.kind === "closing" ? isVisible && isFinalCardSettled : isVisible;

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
      data-visible={shouldShowCard ? "true" : "false"}
      ref={cardRef}
      style={
        {
          "--event-accent": card.accent,
          "--opening-card-blur": "0px",
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
  onSelectAgenda: (choice: OpeningAgendaChoice & { agenda: PublicAgenda }) => void;
}) {
  const transitionTimers = useRef<number[]>([]);
  const [selectedChoiceKey, setSelectedChoiceKey] = useState<string | null>(null);
  const [transitionStage, setTransitionStage] = useState<"idle" | "selected" | "swipe">(
    "idle",
  );
  const choices = closingAgendaChoices
    .map((choice) => ({
      ...choice,
      agenda: agendas.find((agenda) => agenda.id === choice.agendaId),
    }))
    .filter(
      (choice): choice is OpeningAgendaChoice & { agenda: PublicAgenda } =>
      Boolean(choice.agenda),
    );

  useEffect(() => {
    const timers = transitionTimers.current;
    return () => {
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, []);

  function handleChoiceClick(choice: OpeningAgendaChoice & { agenda: PublicAgenda }) {
    if (transitionStage !== "idle") return;

    for (const timer of transitionTimers.current) window.clearTimeout(timer);
    transitionTimers.current = [];
    setSelectedChoiceKey(getOpeningChoiceKey(choice));
    setTransitionStage("selected");
    const transitionDuration = getOpeningTransitionDurationMs(choice.transitionTheme);
    transitionTimers.current.push(
      window.setTimeout(() => setTransitionStage("swipe"), 460),
      window.setTimeout(() => onSelectAgenda(choice), transitionDuration),
    );
  }

  const selectedChoice = choices.find(
    (choice) => selectedChoiceKey === getOpeningChoiceKey(choice),
  );

  return (
    <div
      className="opening-closing-stage relative flex min-h-full w-full items-center justify-center overflow-hidden"
      data-transition={transitionStage}
    >
      <div
        className="opening-closing-shell relative flex min-h-full w-full items-center justify-center"
        data-transition={transitionStage}
      >
        <p className="opening-closing-copy absolute inset-x-0 mx-auto max-w-[760px] break-keep px-4 text-center text-[clamp(22px,3.4vw,46px)] font-black leading-[1.35] text-[#f6f2e8] max-sm:text-[24px]">
          {card.lines.map((line, index) => (
            <span className="block" key={`${line}-${index}`}>
              {line}
            </span>
          ))}
        </p>

        <div className="opening-choice-panel flex w-full max-w-[1180px] flex-col gap-7 max-sm:gap-4">
          <div className="opening-choice-header text-left text-[clamp(24px,3vw,48px)] font-black leading-none text-[#f6f2e8] max-sm:text-[23px]">
            희망은 어디에 있을까요?
          </div>

          <div className="opening-choice-grid grid w-full grid-cols-2 grid-rows-3 gap-4 max-sm:h-[68svh] max-sm:gap-2 sm:h-[min(66vh,640px)]">
            {choices.map((choice) => (
              <button
                className="opening-choice-card group relative min-h-0 overflow-hidden bg-[#111] text-left"
                data-selected={
                  selectedChoiceKey ? getOpeningChoiceKey(choice) === selectedChoiceKey : undefined
                }
                key={`${choice.agendaId}-${choice.label}`}
                onClick={() => handleChoiceClick(choice)}
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
      {selectedChoice ? <OpeningTransitionPage theme={selectedChoice.transitionTheme} /> : null}
    </div>
  );
}

function getOpeningChoiceKey(choice: OpeningAgendaChoice) {
  return `${choice.agendaId}::${choice.label}`;
}

function getOpeningTransitionDurationMs(theme: OpeningTransitionTheme) {
  if (theme === "disabled") return 2580;
  if (theme === "pride") return 2700;
  if (theme === "palestine") return 3600;
  return 1180;
}

function OpeningTransitionPage({ theme }: { theme: OpeningTransitionTheme }) {
  return (
    <div aria-hidden="true" className="opening-transition-page" data-theme={theme}>
      {theme === "disabled" ? (
        <Image
          alt=""
          className="opening-transition-media opening-transition-media-disabled"
          fill
          sizes="100vw"
          src="/disabled.png"
          unoptimized
        />
      ) : null}
      {theme === "pride" ? (
        <Image
          alt=""
          className="opening-transition-media opening-transition-media-pride"
          fill
          sizes="100vw"
          src="/pride.avif"
          unoptimized
        />
      ) : null}
      {theme === "palestine" ? <div className="opening-transition-media opening-transition-media-palestine" /> : null}
    </div>
  );
}

function OpeningVisual({ card, index }: { card: OpeningCard; index: number }) {
  const youtubeEmbedUrl = getYouTubeEmbedUrl(card);
  const youtubeVideoId = getYouTubeVideoId(card);
  const imageSize = card.imageSrc ? getOpeningImageSize(card.imageSrc) : null;

  return (
    <figure className={youtubeEmbedUrl ? "opening-card-visual opening-video-figure" : "opening-card-visual"}>
      <div className="opening-media-frame">
        {card.imageSrc && imageSize ? (
          <Image
            alt={card.imageLabel ?? card.title}
            className="block h-auto max-h-[72vh] w-full object-contain"
            height={imageSize.height}
            priority={index <= 2}
            sizes="(max-width: 1024px) 100vw, 56vw"
            src={card.imageSrc}
            unoptimized
            width={imageSize.width}
          />
        ) : youtubeEmbedUrl ? (
          <iframe
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            className="opening-video-frame bg-black"
            src={youtubeEmbedUrl}
            srcDoc={
              youtubeVideoId
                ? getYouTubeSrcDoc({
                    embedUrl: youtubeEmbedUrl,
                    title: card.imageLabel ?? card.title,
                    videoId: youtubeVideoId,
                  })
                : undefined
            }
            title={card.imageLabel ?? card.title}
          />
        ) : null}
        {card.sources?.length ? <OpeningSourceLinks sources={card.sources} /> : null}
      </div>
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
    <figcaption className="opening-source-links flex flex-wrap justify-end gap-x-2 gap-y-1 text-right font-mono text-[11px] font-black text-[#858176]">
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
    return `${base} grid-cols-[minmax(320px,0.95fr)_minmax(0,0.78fr)] gap-10 max-lg:grid-cols-1 max-lg:gap-3 max-sm:gap-3`;
  }

  return `${base} grid-cols-[minmax(360px,1.08fr)_minmax(0,0.82fr)] gap-10 max-lg:grid-cols-1 max-lg:gap-3 max-sm:gap-3`;
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
    card.style.setProperty("--opening-card-blur", "0px");
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

  const baseIndex = Math.min(maxIndex, Math.floor(clamped));
  const nextIndex = Math.min(maxIndex, baseIndex + 1);
  const localProgress = clamped - baseIndex;
  const from = getOpeningBackgroundStep(baseIndex).color;
  const to = getOpeningBackgroundStep(nextIndex).color;
  const eased = smoothStep(localProgress);

  if (nextIndex === maxIndex) {
    const color = mixOklabColor(from, to, eased);

    return {
      bottom: color,
      top: color,
    };
  }

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

function easeOpeningFinalScroll(value: number) {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - ((-2 * value + 2) ** 3) / 2;
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
  const alignClass =
    card.copyAlign === "mobile-center" ? "max-lg:items-center max-lg:text-center" : "";

  if (card.kind === "story" && hasOpeningVisual(card)) {
    return `flex min-h-0 flex-col justify-center ${alignClass}`.trim();
  }

  return `max-w-[980px] ${alignClass}`.trim();
}

function hasOpeningVisual(card: OpeningCard) {
  return Boolean(card.imageSrc || card.mediaKind === "youtube");
}

function getYouTubeEmbedUrl(card: OpeningCard) {
  if (card.mediaKind !== "youtube") return null;

  const videoId = getYouTubeVideoId(card);
  return videoId
    ? `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1&controls=0&fs=0&iv_load_policy=3&disablekb=1&vq=hd1080`
    : null;
}

function getYouTubeVideoId(card: OpeningCard) {
  if (card.mediaKind !== "youtube") return null;

  const sourceUrl = card.sources?.find((source) => source.label === "YouTube")?.url;
  return sourceUrl?.match(/(?:shorts\/|watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/)?.[1] ?? null;
}

function getYouTubeSrcDoc({
  embedUrl,
  title,
  videoId,
}: {
  embedUrl: string;
  title: string;
  videoId: string;
}) {
  const thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
  const autoplayUrl = `${embedUrl}&autoplay=1`;
  const safeTitle = escapeHtml(title);
  const safeAutoplayUrl = escapeHtml(autoplayUrl);
  const safeThumbnailUrl = escapeHtml(thumbnailUrl);

  return `<style>*{box-sizing:border-box}html,body,a{display:block;width:100%;height:100%;margin:0;background:#000;overflow:hidden}img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.play{position:absolute;left:50%;top:50%;width:76px;height:54px;border-radius:16px;background:#ff0033;transform:translate(-50%,-50%);box-shadow:0 10px 28px rgba(0,0,0,.32)}.play:before{content:"";position:absolute;left:31px;top:15px;border-left:21px solid #fff;border-top:12px solid transparent;border-bottom:12px solid transparent}</style><a href="${safeAutoplayUrl}" aria-label="${safeTitle}"><img src="${safeThumbnailUrl}" alt="${safeTitle}"><span class="play" aria-hidden="true"></span></a>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function getOpeningImageSize(src: string) {
  return openingImageSizes[src] ?? { height: 820, width: 1200 };
}

const openingImageSizes: Record<string, { height: number; width: number }> = {
  "/coupang.jpg": { height: 608, width: 1080 },
  "/court.jpg": { height: 493, width: 658 },
  "/fukushima.jpg": { height: 293, width: 560 },
  "/haecho.webp": { height: 526, width: 700 },
  "/hanwha.jpg": { height: 800, width: 1200 },
  "/jang.jpg": { height: 1165, width: 1800 },
  "/junjang.jpg": { height: 720, width: 960 },
  "/namu.webp": { height: 582, width: 970 },
  "/nobong-protest.jpeg": { height: 540, width: 960 },
  "/nobong.jpg": { height: 640, width: 960 },
  "/oh-debate.png": { height: 1130, width: 1392 },
  "/oh-win.jpg": { height: 720, width: 1280 },
  "/palestine.jpg": { height: 279, width: 425 },
  "/queer.jpg": { height: 800, width: 1200 },
  "/seosomun.webp": { height: 582, width: 970 },
};


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

const closingAgendaChoices: OpeningAgendaChoice[] = [
  {
    agendaId: "election-democracy",
    imageSrc: "/oh-win.jpg",
    label: "선거와 민주주의",
    transitionTheme: "election",
  },
  {
    agendaId: "disability-rights",
    imageSrc: "/junjang.jpg",
    label: "왜 그들은 열차를 세웠을까",
    transitionTheme: "disabled",
  },
  {
    agendaId: "rights-equality",
    imageSrc: "/queer.jpg",
    label: "서울시청과 퀴어퍼레이드",
    transitionTheme: "pride",
  },
  {
    agendaId: "labor-safety",
    imageSrc: "/coupang.jpg",
    label: "일하다 죽지 않을 권리",
    transitionTheme: "labor",
  },
  {
    agendaId: "rights-equality",
    imageSrc: "/jang.jpg",
    label: "여성 살해",
    transitionTheme: "gender",
  },
  {
    agendaId: "peace-palestine",
    imageSrc: "/haecho.webp",
    label: "전쟁과 평화: 해초의 여권",
    transitionTheme: "palestine",
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
    copyAlign: "mobile-center",
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
    copyAlign: "mobile-center",
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
    copyAlign: "mobile-center",
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
    copyAlign: "mobile-center",
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
