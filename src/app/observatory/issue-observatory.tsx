"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { HierarchyModel, HierarchyNode } from "../graph-explorer";

type AncestorChain = {
  L1?: HierarchyNode;
  L2?: HierarchyNode;
  L3?: HierarchyNode;
  L4?: HierarchyNode;
  L4_AGENDA?: HierarchyNode;
  L4_EVENT?: HierarchyNode;
  L5_EVENT?: HierarchyNode;
  L5?: HierarchyNode;
  L6?: HierarchyNode;
};

type LeafRow = {
  chain: AncestorChain;
  date: Date | null;
  dateKey: string;
  macroAgendas: HierarchyNode[];
  macroEvents: HierarchyNode[];
  longEventArcs: HierarchyNode[];
  monthKey: string;
  node: HierarchyNode;
  renderId: string;
};

type Indexed = {
  categories: HierarchyNode[];
  entityById: Map<string, HierarchyNode>;
  issues: HierarchyNode[];
  leafByRenderId: Map<string, LeafRow>;
  leaves: LeafRow[];
  macroAgendas: HierarchyNode[];
  macroEvents: HierarchyNode[];
  longEventArcs: HierarchyNode[];
  nodeById: Map<string, HierarchyNode>;
};

type CategoryLayout = {
  color: string;
  node: HierarchyNode;
  radius: number;
  x: number;
  y: number;
};

type PointLayout = {
  categoryId: string;
  color: string;
  leaf: LeafRow;
  opacity: number;
  r: number;
  selected: boolean;
  x: number;
  y: number;
};

type MonthRange = {
  end: string;
  label: string;
  start: string;
};

type StepKey = "atlas" | "river" | "actors" | "timeline";

type StepDefinition = {
  description: string;
  key: StepKey;
  label: string;
};

const steps: StepDefinition[] = [
  {
    description: "L4 지형에서 살펴볼 큰 구역을 고릅니다.",
    key: "atlas",
    label: "1. 지형",
  },
  {
    description: "선택한 구역 안에서 L3 사안이 시간에 따라 어떻게 움직이는지 봅니다.",
    key: "river",
    label: "2. 흐름",
  },
  {
    description: "단체별로 어떤 사안에 대표발언이 모이는지 확인합니다.",
    key: "actors",
    label: "3. 단체",
  },
  {
    description: "선택한 사안이나 구역의 대표발언을 날짜순으로 읽습니다.",
    key: "timeline",
    label: "4. 발언",
  },
];

const palette = [
  "#111111",
  "#b23a48",
  "#1e6b62",
  "#b98222",
  "#4f4a9f",
  "#7a4b2a",
  "#2f6f9f",
  "#7b3f78",
  "#3f6f36",
  "#9d4c2f",
  "#4c6a7b",
  "#8a6b2e",
];

const monthRanges: MonthRange[] = [
  { end: "2026-06", label: "전체", start: "2026-01" },
  { end: "2026-02", label: "1-2월", start: "2026-01" },
  { end: "2026-04", label: "3-4월", start: "2026-03" },
  { end: "2026-06", label: "5-6월", start: "2026-05" },
];

export function IssueObservatory({ model }: { model: HierarchyModel }) {
  const indexed = useMemo(() => indexModel(model), [model]);
  const [activeRange, setActiveRange] = useState(monthRanges[0]);
  const [activeStep, setActiveStep] = useState<StepKey>("atlas");
  const [selectedId, setSelectedId] = useState(() => indexed.categories[0]?.id ?? "");
  const [query, setQuery] = useState("");

  const selectedEntity =
    indexed.entityById.get(selectedId) ??
    indexed.leafByRenderId.get(selectedId)?.node ??
    indexed.categories[0] ??
    null;
  const selectedLeaves = useMemo(
    () => getLeavesForSelection(indexed, selectedId, activeRange),
    [activeRange, indexed, selectedId],
  );
  const filteredLeaves = useMemo(
    () => filterLeaves(indexed.leaves, activeRange, query),
    [activeRange, indexed.leaves, query],
  );
  const selectedCategory = resolveSelectedCategory(indexed, selectedId);
  const selectedCategoryId = selectedCategory?.id ?? indexed.categories[0]?.id ?? "";
  const categoryChildren = getCategoryIssues(indexed, selectedCategoryId, activeRange).slice(0, 10);
  const topActors = getTopActors(selectedLeaves, 12);

  return (
    <div className="min-h-screen bg-[#f3f2ee] text-[#101010]">
      <header className="flex h-16 items-center justify-between border-b border-[#d8d8d0] bg-[#fbfbf8] px-5">
        <div className="min-w-0">
          <h1 className="text-[22px] font-semibold leading-none">Issue Observatory</h1>
          <p className="mt-1 text-[12px] text-[#666b64]">
            한 단계씩 보는 의제 지도
          </p>
        </div>
        <nav className="flex items-center gap-2 text-[12px] font-semibold">
          <Link className="border border-[#d8d8d0] bg-white px-3 py-2" href="/">
            Flow
          </Link>
          <Link className="border border-[#d8d8d0] bg-white px-3 py-2" href="/g6">
            G6
          </Link>
        </nav>
      </header>

      <main className="grid h-[calc(100vh-4rem)] grid-cols-[300px_minmax(0,1fr)_330px] overflow-hidden max-lg:h-auto max-lg:min-h-[calc(100vh-4rem)] max-lg:grid-cols-1 max-lg:overflow-auto">
        <aside className="flex min-h-0 flex-col border-r border-[#d8d8d0] bg-white max-lg:border-b max-lg:border-r-0">
          <ControlPanel
            activeRange={activeRange}
            activeStep={activeStep}
            categories={indexed.categories}
            query={query}
            selectedCategoryId={selectedCategoryId}
            setActiveRange={setActiveRange}
            setQuery={setQuery}
            setSelectedId={setSelectedId}
            setActiveStep={setActiveStep}
          />
        </aside>

        <section className="flex min-h-0 flex-col border-r border-[#d8d8d0] bg-[#f7f7f3] max-lg:h-[720px] max-lg:border-b max-lg:border-r-0">
          <FocusHeader
            activeStep={activeStep}
            selectedEntity={selectedEntity}
            setActiveStep={setActiveStep}
          />
          <div className="min-h-0 flex-1">
            <FocusContent
              activeRange={activeRange}
              activeStep={activeStep}
              categories={indexed.categories}
              categoryChildren={categoryChildren}
              filteredLeaves={filteredLeaves}
              selectedCategoryId={selectedCategoryId}
              selectedEntity={selectedEntity}
              selectedId={selectedId}
              selectedLeaves={selectedLeaves}
              setSelectedId={setSelectedId}
              topActors={topActors}
            />
          </div>
        </section>

        <aside className="min-h-0 overflow-hidden bg-[#fbfbf8] max-lg:h-auto">
          <ContextPanel
            activeStep={activeStep}
            activeRange={activeRange}
            categoryChildren={categoryChildren}
            selectedEntity={selectedEntity}
            selectedLeaves={selectedLeaves}
            setSelectedId={setSelectedId}
            setActiveStep={setActiveStep}
            topActors={topActors}
          />
        </aside>
      </main>
    </div>
  );
}

function FocusHeader({
  activeStep,
  selectedEntity,
  setActiveStep,
}: {
  activeStep: StepKey;
  selectedEntity: HierarchyNode | null;
  setActiveStep: (step: StepKey) => void;
}) {
  const activeIndex = steps.findIndex((step) => step.key === activeStep);
  const step = steps[activeIndex] ?? steps[0];
  const previous = activeIndex > 0 ? steps[activeIndex - 1] : null;
  const next = activeIndex < steps.length - 1 ? steps[activeIndex + 1] : null;

  return (
    <div className="flex min-h-20 items-center justify-between gap-4 border-b border-[#d8d8d0] bg-[#fbfbf8] px-5 py-4">
      <div className="min-w-0">
        <div className="text-[12px] font-semibold text-[#666b64]">{step.label}</div>
        <h2 className="mt-1 truncate text-[22px] font-semibold leading-none">
          {selectedEntity?.label ?? "선택 없음"}
        </h2>
        <p className="mt-2 text-[12px] leading-5 text-[#666b64]">{step.description}</p>
      </div>
      <div className="flex shrink-0 gap-2 text-[12px] font-semibold">
        <button
          className="h-10 border border-[#d8d8d0] bg-white px-3 disabled:opacity-40"
          disabled={!previous}
          onClick={() => previous && setActiveStep(previous.key)}
          type="button"
        >
          이전
        </button>
        <button
          className="h-10 border border-[#111111] bg-[#111111] px-3 text-white disabled:opacity-40"
          disabled={!next}
          onClick={() => next && setActiveStep(next.key)}
          type="button"
        >
          다음
        </button>
      </div>
    </div>
  );
}

function FocusContent({
  activeRange,
  activeStep,
  categories,
  categoryChildren,
  filteredLeaves,
  selectedCategoryId,
  selectedEntity,
  selectedId,
  selectedLeaves,
  setSelectedId,
  topActors,
}: {
  activeRange: MonthRange;
  activeStep: StepKey;
  categories: HierarchyNode[];
  categoryChildren: HierarchyNode[];
  filteredLeaves: LeafRow[];
  selectedCategoryId: string;
  selectedEntity: HierarchyNode | null;
  selectedId: string;
  selectedLeaves: LeafRow[];
  setSelectedId: (id: string) => void;
  topActors: string[];
}) {
  if (activeStep === "river") {
    return (
      <IssueRiver
        activeRange={activeRange}
        issues={categoryChildren}
        large
        leaves={filteredLeaves}
        selectedCategoryId={selectedCategoryId}
        selectedId={selectedId}
        setSelectedId={setSelectedId}
      />
    );
  }

  if (activeStep === "actors") {
    return (
      <ActorMatrix
        issues={categoryChildren.slice(0, 10)}
        large
        leaves={selectedLeaves}
        setSelectedId={setSelectedId}
        topActors={topActors}
      />
    );
  }

  if (activeStep === "timeline") {
    return (
      <DossierPanel
        selectedEntity={selectedEntity}
        selectedLeaves={selectedLeaves}
        setSelectedId={setSelectedId}
      />
    );
  }

  return (
    <SemanticAtlas
      activeRange={activeRange}
      categories={categories}
      filteredLeaves={filteredLeaves}
      selectedId={selectedId}
      setSelectedId={setSelectedId}
    />
  );
}

function ContextPanel({
  activeRange,
  activeStep,
  categoryChildren,
  selectedEntity,
  selectedLeaves,
  setActiveStep,
  setSelectedId,
  topActors,
}: {
  activeRange: MonthRange;
  activeStep: StepKey;
  categoryChildren: HierarchyNode[];
  selectedEntity: HierarchyNode | null;
  selectedLeaves: LeafRow[];
  setActiveStep: (step: StepKey) => void;
  setSelectedId: (id: string) => void;
  topActors: string[];
}) {
  const activeIndex = steps.findIndex((step) => step.key === activeStep);
  const step = steps[activeIndex] ?? steps[0];
  const next = activeIndex < steps.length - 1 ? steps[activeIndex + 1] : null;
  const previous = activeIndex > 0 ? steps[activeIndex - 1] : null;
  const shownLeaves = selectedLeaves
    .toSorted((left, right) => (left.dateKey > right.dateKey ? 1 : -1))
    .slice(0, 5);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-[#d8d8d0] p-5">
        <div className="text-[12px] font-semibold text-[#666b64]">현재 초점</div>
        <h2 className="mt-2 text-[17px] font-semibold leading-snug">
          {selectedEntity?.label ?? "선택 없음"}
        </h2>
        <KeywordChips keywords={selectedEntity?.representativeKeywords} />
        <p className="mt-2 text-[12px] leading-5 text-[#666b64]">
          {step.description}
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <StatBox label="rows" value={selectedLeaves.length} />
          <StatBox label="actors" value={topActors.length} />
          <StatBox label="period" value={activeRange.label} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-[12px] font-semibold">
          <button
            className="h-10 border border-[#d8d8d0] bg-white disabled:opacity-40"
            disabled={!previous}
            onClick={() => previous && setActiveStep(previous.key)}
            type="button"
          >
            이전 단계
          </button>
          <button
            className="h-10 border border-[#111111] bg-[#111111] text-white disabled:opacity-40"
            disabled={!next}
            onClick={() => next && setActiveStep(next.key)}
            type="button"
          >
            다음 단계
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-5">
        <div className="mb-4">
          <div className="text-[12px] font-semibold text-[#666b64]">상위 사안</div>
          <div className="mt-2 space-y-1.5">
            {categoryChildren.slice(0, 6).map((issue) => (
              <button
                className="w-full border border-[#d8d8d0] bg-white px-2.5 py-2 text-left text-[12px] leading-4 hover:border-[#111111]"
                key={issue.id}
                onClick={() => setSelectedId(issue.id)}
              type="button"
            >
                <span className="block truncate font-semibold">{issue.label}</span>
                <KeywordLine keywords={issue.representativeKeywords} />
                <span className="mt-1 block text-[#666b64]">{issue.leafCount} rows</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <div className="text-[12px] font-semibold text-[#666b64]">주요 단체</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {topActors.slice(0, 10).map((actor) => (
              <span className="border border-[#d8d8d0] bg-white px-2 py-1 text-[11px]" key={actor}>
                {actor}
              </span>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[12px] font-semibold text-[#666b64]">대표발언 미리보기</div>
          <div className="mt-2 space-y-2">
            {shownLeaves.map((leaf) => (
              <button
                className="w-full border-l-2 border-[#111111] bg-white p-2.5 text-left hover:bg-[#f7f7f3]"
                key={leaf.renderId}
                onClick={() => {
                  setSelectedId(leaf.renderId);
                  setActiveStep("timeline");
                }}
                type="button"
              >
                <div className="flex justify-between gap-2 text-[10px] font-semibold text-[#666b64]">
                  <span>{leaf.dateKey}</span>
                  <span className="truncate">{leaf.node.organizationNames.join(", ")}</span>
                </div>
                <p className="mt-1 text-[12px] leading-5">
                  {leaf.node.representativeSentences[0] || leaf.node.label}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ControlPanel({
  activeRange,
  activeStep,
  categories,
  query,
  selectedCategoryId,
  setActiveRange,
  setQuery,
  setSelectedId,
  setActiveStep,
}: {
  activeRange: MonthRange;
  activeStep: StepKey;
  categories: HierarchyNode[];
  query: string;
  selectedCategoryId: string;
  setActiveRange: (range: MonthRange) => void;
  setQuery: (value: string) => void;
  setSelectedId: (id: string) => void;
  setActiveStep: (step: StepKey) => void;
}) {
  const totalRows = categories.reduce((sum, node) => sum + node.leafCount, 0);

  return (
    <>
      <div className="border-b border-[#d8d8d0] p-5">
        <div className="text-[12px] font-semibold text-[#666b64]">단계</div>
        <div className="mt-3 space-y-2">
          {steps.map((step) => (
            <button
              className={[
                "w-full border px-3 py-2 text-left text-[12px]",
                activeStep === step.key
                  ? "border-[#111111] bg-[#111111] text-white"
                  : "border-[#d8d8d0] bg-[#fbfbf8] text-[#20231f]",
              ].join(" ")}
              key={step.key}
              onClick={() => setActiveStep(step.key)}
              type="button"
            >
              <span className="block font-semibold">{step.label}</span>
              <span
                className={[
                  "mt-1 block leading-4",
                  activeStep === step.key ? "text-white/70" : "text-[#666b64]",
                ].join(" ")}
              >
                {step.description}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="border-b border-[#d8d8d0] p-5">
        <div className="text-[12px] font-semibold text-[#666b64]">기간</div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {monthRanges.map((range) => (
            <button
              className={[
                "h-9 border px-2 text-[12px] font-semibold",
                activeRange.label === range.label
                  ? "border-[#111111] bg-[#111111] text-white"
                  : "border-[#d8d8d0] bg-[#fbfbf8]",
              ].join(" ")}
              key={range.label}
              onClick={() => setActiveRange(range)}
              type="button"
            >
              {range.label}
            </button>
          ))}
        </div>
        <label className="mt-4 block text-[12px] font-semibold text-[#666b64]">
          검색
          <input
            className="mt-2 h-10 w-full border border-[#d8d8d0] bg-white px-3 text-[13px] font-normal text-[#101010] outline-none focus:border-[#111111]"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="단체, 이슈, 대표발언"
            value={query}
          />
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-5">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <div className="text-[12px] font-semibold text-[#666b64]">L4 지형</div>
            <div className="mt-1 text-[22px] font-semibold leading-none">{categories.length}</div>
          </div>
          <div className="text-right text-[11px] leading-4 text-[#666b64]">
            {totalRows} rows
            <br />
            size = 대표발언 수
          </div>
        </div>

        <div className="relative mb-5 h-52 border border-[#d8d8d0] bg-[#f7f7f3]">
          <CategoryOrbit
            categories={categories.slice(0, 12)}
            selectedCategoryId={selectedCategoryId}
            setSelectedId={setSelectedId}
          />
        </div>

        <div className="space-y-1.5">
          {categories.slice(0, 18).map((category, index) => (
            <button
              className={[
                "flex w-full items-center gap-2 border px-2.5 py-2 text-left text-[12px] leading-4",
                category.id === selectedCategoryId
                  ? "border-[#111111] bg-[#f7f7f3]"
                  : "border-[#d8d8d0] bg-white hover:border-[#111111]",
              ].join(" ")}
              key={category.id}
              onClick={() => setSelectedId(category.id)}
              type="button"
            >
              <span
                className="h-3 w-3 shrink-0"
                style={{ background: colorForIndex(index) }}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate">{category.label}</span>
                <KeywordLine keywords={category.representativeKeywords} />
              </span>
              <span className="shrink-0 font-semibold">{category.leafCount}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

function CategoryOrbit({
  categories,
  selectedCategoryId,
  setSelectedId,
}: {
  categories: HierarchyNode[];
  selectedCategoryId: string;
  setSelectedId: (id: string) => void;
}) {
  const max = Math.max(...categories.map((category) => category.leafCount), 1);

  return (
    <svg className="h-full w-full" viewBox="0 0 280 200">
      <rect fill="#f7f7f3" height="200" width="280" />
      {categories.map((category, index) => {
        const angle = (Math.PI * 2 * index) / Math.max(categories.length, 1) - Math.PI / 2;
        const radius = round(18 + Math.sqrt(category.leafCount / max) * 34);
        const orbit = index === 0 ? 0 : 46 + (index % 3) * 22;
        const x = round(140 + Math.cos(angle) * orbit);
        const y = round(100 + Math.sin(angle) * orbit * 0.72);
        const selected = category.id === selectedCategoryId;

        return (
          <g
            className="cursor-pointer"
            key={category.id}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") setSelectedId(category.id);
            }}
            onClick={() => setSelectedId(category.id)}
            onPointerDown={() => setSelectedId(category.id)}
            role="button"
            tabIndex={0}
          >
            <circle
              cx={x}
              cy={y}
              fill={colorForIndex(index)}
              fillOpacity={selected ? 0.24 : 0.14}
              r={radius}
              stroke={selected ? "#111111" : colorForIndex(index)}
              strokeWidth={selected ? 2 : 1}
            />
            <text
              fill="#111111"
              fontSize="10"
              fontWeight={selected ? 800 : 600}
              textAnchor="middle"
              x={x}
              y={round(y + 3)}
            >
              {category.leafCount}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function SemanticAtlas({
  activeRange,
  categories,
  filteredLeaves,
  selectedId,
  setSelectedId,
}: {
  activeRange: MonthRange;
  categories: HierarchyNode[];
  filteredLeaves: LeafRow[];
  selectedId: string;
  setSelectedId: (id: string) => void;
}) {
  const { categoryLayouts, points } = useMemo(
    () => layoutAtlas(categories, filteredLeaves, selectedId),
    [categories, filteredLeaves, selectedId],
  );

  return (
    <div className="relative h-full">
      <div className="absolute left-5 top-5 z-10 border border-[#d8d8d0] bg-white/95 px-3 py-2 text-[12px] shadow-sm">
        <span className="font-semibold">Semantic Atlas</span>
        <span className="mx-2 text-[#a0a39d]">/</span>
        <span>{activeRange.label}</span>
        <span className="mx-2 text-[#a0a39d]">/</span>
        <span>{points.length} statements</span>
      </div>

      <svg className="h-full w-full" viewBox="0 0 960 640">
        <defs>
          <pattern height="28" id="atlas-grid" patternUnits="userSpaceOnUse" width="28">
            <path d="M 28 0 L 0 0 0 28" fill="none" stroke="rgba(17,17,17,0.055)" />
          </pattern>
        </defs>
        <rect fill="#f7f7f3" height="640" width="960" />
        <rect fill="url(#atlas-grid)" height="640" width="960" />
        {categoryLayouts.map((layout, index) => (
          <g
            className="cursor-pointer"
            key={layout.node.id}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") setSelectedId(layout.node.id);
            }}
            onClick={() => setSelectedId(layout.node.id)}
            onPointerDown={() => setSelectedId(layout.node.id)}
            role="button"
            tabIndex={0}
          >
            <circle
              cx={layout.x}
              cy={layout.y}
              fill={layout.color}
              fillOpacity={selectedId === layout.node.id ? 0.16 : 0.08}
              r={layout.radius}
              stroke={selectedId === layout.node.id ? "#111111" : layout.color}
              strokeOpacity={0.72}
              strokeWidth={selectedId === layout.node.id ? 2 : 1}
            />
            {index < 12 || selectedId === layout.node.id ? (
              <text
                fill="#111111"
                fontSize="12"
                fontWeight="800"
                textAnchor="middle"
                x={layout.x}
                y={layout.y - layout.radius - 8}
              >
                {shorten(layout.node.label, 26)}
              </text>
            ) : null}
          </g>
        ))}

        {points.map((point) => (
          <circle
            className="cursor-pointer transition-opacity"
            cx={point.x}
            cy={point.y}
            fill={point.color}
            fillOpacity={point.opacity}
            key={point.leaf.renderId}
            onClick={() => setSelectedId(point.leaf.renderId)}
            onPointerDown={() => setSelectedId(point.leaf.renderId)}
            r={point.r}
            stroke={point.selected ? "#111111" : "#ffffff"}
            strokeWidth={point.selected ? 2.4 : 1}
          />
        ))}
      </svg>
    </div>
  );
}

function IssueRiver({
  activeRange,
  issues,
  large = false,
  leaves,
  selectedCategoryId,
  selectedId,
  setSelectedId,
}: {
  activeRange: MonthRange;
  issues: HierarchyNode[];
  large?: boolean;
  leaves: LeafRow[];
  selectedCategoryId: string;
  selectedId: string;
  setSelectedId: (id: string) => void;
}) {
  const months = getMonths(activeRange);
  const rows = issues.map((issue, index) => {
    const counts = months.map(
      (month) =>
        leaves.filter(
          (leaf) =>
            leaf.monthKey === month &&
            leaf.chain.L2?.id === issue.id,
        ).length,
    );
    return { counts, issue, index };
  });

  return (
    <div className={large ? "h-full min-w-0 p-6" : "min-w-0 border-r border-[#d8d8d0] p-4"}>
      <div className="mb-3 flex items-end justify-between">
        <div>
          <h2 className={large ? "text-[20px] font-semibold" : "text-[15px] font-semibold"}>
            Issue River
          </h2>
          <p className="mt-1 text-[11px] text-[#666b64]">선택 L4 안의 L3 사안 흐름</p>
        </div>
        <div className="text-[11px] text-[#666b64]">{selectedCategoryId}</div>
      </div>

      <svg className={large ? "h-[calc(100%-56px)] min-h-[420px] w-full" : "h-[195px] w-full"} viewBox="0 0 520 195">
        <rect fill="#fbfbf8" height="195" width="520" />
        {months.map((month, index) => (
          <g key={month}>
            <line
              stroke="rgba(17,17,17,0.08)"
              x1={96 + index * 72}
              x2={96 + index * 72}
              y1="20"
              y2="176"
            />
            <text fill="#666b64" fontSize="10" textAnchor="middle" x={96 + index * 72} y="14">
              {month.slice(5)}월
            </text>
          </g>
        ))}
        {rows.map(({ counts, issue, index }) => {
          const y = 34 + index * 17;
          const color = colorForIndex(index + 2);
          const path = counts
            .map((count, monthIndex) => {
              const x = 96 + monthIndex * 72;
              const offset = Math.min(9, count * 2.3);
              return `${monthIndex === 0 ? "M" : "L"} ${x} ${y - offset}`;
            })
            .join(" ");
          const reverse = counts
            .map((count, monthIndex) => {
              const x = 96 + monthIndex * 72;
              const offset = Math.min(9, count * 2.3);
              return `L ${x} ${y + offset}`;
            })
            .reverse()
            .join(" ");

          return (
            <g
              className="cursor-pointer"
              key={issue.id}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") setSelectedId(issue.id);
              }}
              onClick={() => setSelectedId(issue.id)}
              onPointerDown={() => setSelectedId(issue.id)}
              role="button"
              tabIndex={0}
            >
              <text
                fill={selectedId === issue.id ? "#111111" : "#4f554e"}
                fontSize="10"
                fontWeight={selectedId === issue.id ? 800 : 500}
                x="10"
                y={y + 3}
              >
                {shorten(issue.label, 13)}
              </text>
              <path
                d={`${path} ${reverse} Z`}
                fill={color}
                fillOpacity={selectedId === issue.id ? 0.32 : 0.18}
                stroke={selectedId === issue.id ? "#111111" : color}
                strokeWidth={selectedId === issue.id ? 1.4 : 0.8}
              />
              {counts.map((count, monthIndex) =>
                count ? (
                  <circle
                    cx={96 + monthIndex * 72}
                    cy={y}
                    fill={color}
                    key={`${issue.id}:${monthIndex}`}
                    r={Math.min(7, 2 + Math.sqrt(count) * 2)}
                    stroke="#ffffff"
                    strokeWidth="1"
                  />
                ) : null,
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function ActorMatrix({
  issues,
  large = false,
  leaves,
  setSelectedId,
  topActors,
}: {
  issues: HierarchyNode[];
  large?: boolean;
  leaves: LeafRow[];
  setSelectedId: (id: string) => void;
  topActors: string[];
}) {
  const max = Math.max(
    1,
    ...topActors.flatMap((actor) =>
      issues.map((issue) => getCellLeaves(leaves, actor, issue.id).length),
    ),
  );

  return (
    <div className={large ? "h-full min-w-0 overflow-auto p-6" : "min-w-0 p-4"}>
      <div className="mb-3">
        <h2 className={large ? "text-[20px] font-semibold" : "text-[15px] font-semibold"}>
          Actor × Issue
        </h2>
        <p className="mt-1 text-[11px] text-[#666b64]">단체별 대표발언 분포</p>
      </div>
      <div
        className={large ? "grid gap-1.5" : "grid gap-[3px]"}
        style={{
          gridTemplateColumns: `${large ? 118 : 86}px repeat(${Math.max(issues.length, 1)}, minmax(${large ? 34 : 18}px, 1fr))`,
        }}
      >
        <div />
        {issues.map((issue) => (
          <div
            className="truncate text-center text-[9px] font-semibold text-[#666b64]"
            key={issue.id}
            title={issue.label}
          >
            {shorten(issue.label, 5)}
          </div>
        ))}
        {topActors.map((actor) => (
          <ActorRow
            actor={actor}
            issues={issues}
            key={actor}
            large={large}
            leaves={leaves}
            max={max}
            setSelectedId={setSelectedId}
          />
        ))}
      </div>
    </div>
  );
}

function ActorRow({
  actor,
  issues,
  large = false,
  leaves,
  max,
  setSelectedId,
}: {
  actor: string;
  issues: HierarchyNode[];
  large?: boolean;
  leaves: LeafRow[];
  max: number;
  setSelectedId: (id: string) => void;
}) {
  return (
    <>
      <div
        className={[
          "truncate pr-1 text-right text-[#333833]",
          large ? "text-[12px] leading-9" : "text-[10px] leading-6",
        ].join(" ")}
      >
        {actor}
      </div>
      {issues.map((issue, index) => {
        const cellLeaves = getCellLeaves(leaves, actor, issue.id);
        const count = cellLeaves.length;
        const opacity = count ? 0.14 + (count / max) * 0.68 : 0.035;
        return (
          <button
            aria-label={`${actor} ${issue.label} ${count}`}
            className={[large ? "h-9" : "h-6", "border border-white"].join(" ")}
            disabled={!count}
            key={`${actor}:${issue.id}`}
            onClick={() => setSelectedId(cellLeaves[0].renderId)}
            style={{
              background: count ? colorForIndex(index + 2) : "#eef0eb",
              opacity,
            }}
            title={`${actor} · ${issue.label} · ${count}`}
            type="button"
          />
        );
      })}
    </>
  );
}

function DossierPanel({
  selectedEntity,
  selectedLeaves,
  setSelectedId,
}: {
  selectedEntity: HierarchyNode | null;
  selectedLeaves: LeafRow[];
  setSelectedId: (id: string) => void;
}) {
  const shownLeaves = selectedLeaves
    .toSorted((left, right) => (left.dateKey > right.dateKey ? 1 : -1))
    .slice(0, 28);
  const actors = getTopActors(selectedLeaves, 10);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-[#d8d8d0] p-5">
        <div className="text-[12px] font-semibold text-[#666b64]">Dossier</div>
        <h2 className="mt-2 text-[18px] font-semibold leading-snug">
          {selectedEntity ? selectedEntity.label : "선택 없음"}
        </h2>
        <KeywordChips keywords={selectedEntity?.representativeKeywords} />
        <div className="mt-3 grid grid-cols-3 gap-2">
          <StatBox label="rows" value={selectedLeaves.length} />
          <StatBox label="actors" value={actors.length} />
          <StatBox
            label="span"
            value={`${Math.round(selectedEntity?.timeSpanDays ?? estimateSpanDays(selectedLeaves))}d`}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {actors.slice(0, 8).map((actor) => (
            <span
              className="border border-[#d8d8d0] bg-white px-2 py-1 text-[11px]"
              key={actor}
            >
              {actor}
            </span>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-5">
        <div className="mb-3 text-[12px] font-semibold text-[#666b64]">
          Timeline
        </div>
        <div className="space-y-2">
          {shownLeaves.map((leaf) => (
            <button
              className="w-full border-l-2 border-[#111111] bg-white p-3 text-left shadow-[0_1px_0_rgba(17,17,17,0.06)] hover:bg-[#f7f7f3]"
              key={leaf.renderId}
              onClick={() => setSelectedId(leaf.renderId)}
              type="button"
            >
              <div className="flex items-center justify-between gap-3 text-[11px] font-semibold text-[#666b64]">
                <span>{leaf.dateKey}</span>
                <span className="truncate">{leaf.node.organizationNames.join(", ")}</span>
              </div>
              <p className="mt-2 text-[13px] leading-5 text-[#111111]">
                {leaf.node.representativeSentences[0] || leaf.node.label}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="border border-[#d8d8d0] bg-white p-2">
      <div className="text-[18px] font-semibold leading-none">{value}</div>
      <div className="mt-1 text-[10px] text-[#666b64]">{label}</div>
    </div>
  );
}

function KeywordChips({
  keywords,
  limit = 12,
}: {
  keywords?: string[];
  limit?: number;
}) {
  const shown = (keywords ?? []).filter(Boolean).slice(0, limit);
  if (!shown.length) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {shown.map((keyword) => (
        <span
          className="border border-[#cfd3cc] bg-white px-2 py-1 text-[11px] font-semibold text-[#242822]"
          key={keyword}
        >
          {keyword}
        </span>
      ))}
    </div>
  );
}

function KeywordLine({
  keywords,
  limit = 4,
}: {
  keywords?: string[];
  limit?: number;
}) {
  const text = (keywords ?? []).filter(Boolean).slice(0, limit).join(" · ");
  if (!text) return null;
  return (
    <span className="mt-1 block truncate text-[10px] font-normal text-[#666b64]">
      {text}
    </span>
  );
}

function indexModel(model: HierarchyModel): Indexed {
  const nodeById = new Map<string, HierarchyNode>();
  const entityById = new Map<string, HierarchyNode>();
  for (const nodes of Object.values(model.layers)) {
    for (const node of nodes) {
      if (!nodeById.has(node.id)) nodeById.set(node.id, node);
      entityById.set(node.id, node);
    }
  }

  const parentIdsById = buildParentIdsById(model);
  const rawLeaves = (model.layers.L0 ?? []).flatMap((node) => {
    const membership = resolveLeafMembership(node, nodeById, parentIdsById);
    return membership.categories.map((category) => ({
      chain: {
        ...membership.baseChain,
        L3: category,
        L4_AGENDA: membership.macroAgendas[0],
        L4_EVENT: membership.macroEvents[0],
        L5_EVENT: membership.longEventArcs[0],
      },
      longEventArcs: membership.longEventArcs,
      macroAgendas: membership.macroAgendas,
      macroEvents: membership.macroEvents,
      node,
    }));
  });
  const occurrenceSeen = new Map<string, number>();
  const occurrenceTotals = new Map<string, number>();
  for (const leaf of rawLeaves) {
    occurrenceTotals.set(leaf.node.id, (occurrenceTotals.get(leaf.node.id) ?? 0) + 1);
  }

  const leaves = rawLeaves.map(({ chain, longEventArcs, macroAgendas, macroEvents, node }) => {
    const renderId = renderIdFor(node.id, occurrenceSeen, occurrenceTotals);
    const dateKey = node.firstSeenAt?.slice(0, 10) || "";
    const monthKey = dateKey.slice(0, 7);
    return {
      chain,
      date: dateKey ? new Date(dateKey) : null,
      dateKey: dateKey || "날짜 없음",
      longEventArcs,
      macroAgendas,
      macroEvents,
      monthKey,
      node,
      renderId,
    };
  });
  const leafByRenderId = new Map(leaves.map((leaf) => [leaf.renderId, leaf]));

  return {
    categories: (model.layers.L3 ?? []).toSorted((left, right) => right.leafCount - left.leafCount),
    entityById,
    issues: (model.layers.L2 ?? []).toSorted((left, right) => right.leafCount - left.leafCount),
    leafByRenderId,
    leaves,
    longEventArcs: (model.layers.L5_EVENT ?? []).toSorted((left, right) => right.leafCount - left.leafCount),
    macroAgendas: (model.layers.L4_AGENDA ?? []).toSorted((left, right) => right.leafCount - left.leafCount),
    macroEvents: (model.layers.L4_EVENT ?? []).toSorted((left, right) => right.leafCount - left.leafCount),
    nodeById,
  };
}

function buildParentIdsById(model: HierarchyModel) {
  const parentIdsById = new Map<string, string[]>();
  for (const link of model.links ?? []) {
    parentIdsById.set(link.source, uniqueIds([...(parentIdsById.get(link.source) ?? []), link.target]));
  }
  for (const nodes of Object.values(model.layers)) {
    for (const node of nodes) {
      parentIdsById.set(
        node.id,
        uniqueIds([
          ...(parentIdsById.get(node.id) ?? []),
          ...(node.parentIds ?? []),
          node.parentId ?? "",
        ]),
      );
    }
  }
  return parentIdsById;
}

function resolveLeafMembership(
  node: HierarchyNode,
  nodeById: Map<string, HierarchyNode>,
  parentIdsById: Map<string, string[]>,
) {
  const baseChain: AncestorChain = {};
  let current: HierarchyNode | undefined = node;
  const seen = new Set<string>([node.id]);

  while (current && seen.size < 12) {
    const parent = getPrimaryParentNode(current, nodeById, parentIdsById);
    if (!parent || seen.has(parent.id)) break;
    if (isAncestorLevel(parent.level)) {
      baseChain[parent.level as keyof AncestorChain] = parent;
    }
    seen.add(parent.id);
    current = parent.level === "L2" ? undefined : parent;
  }

  const l2 = baseChain.L2;
  const l2Parents = l2 ? getParentNodes(l2, nodeById, parentIdsById) : [];
  const categories = l2Parents.filter((parent) => parent.level === "L3");
  const macroEvents = l2Parents.filter((parent) => parent.level === "L4_EVENT");
  const macroAgendas = l2Parents.filter((parent) => parent.level === "L4_AGENDA");
  const longEventArcs = l2Parents.filter((parent) => parent.level === "L5_EVENT");

  return {
    baseChain,
    categories: categories.length ? categories : [baseChain.L3].filter(Boolean),
    longEventArcs,
    macroAgendas,
    macroEvents,
  };
}

function getPrimaryParentNode(
  node: HierarchyNode,
  nodeById: Map<string, HierarchyNode>,
  parentIdsById: Map<string, string[]>,
) {
  const parentIds = uniqueIds([node.parentId, ...(parentIdsById.get(node.id) ?? [])]);
  return parentIds.map((parentId) => nodeById.get(parentId)).find(Boolean);
}

function getParentNodes(
  node: HierarchyNode,
  nodeById: Map<string, HierarchyNode>,
  parentIdsById: Map<string, string[]>,
) {
  return uniqueIds(parentIdsById.get(node.id) ?? [])
    .map((parentId) => nodeById.get(parentId))
    .filter((parent): parent is HierarchyNode => Boolean(parent));
}

function uniqueIds(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function renderIdFor(
  originalId: string,
  occurrenceSeen: Map<string, number>,
  occurrenceTotals: Map<string, number>,
) {
  const next = (occurrenceSeen.get(originalId) ?? 0) + 1;
  occurrenceSeen.set(originalId, next);
  return (occurrenceTotals.get(originalId) ?? 0) > 1 ? `${originalId}::${next}` : originalId;
}

function isAncestorLevel(level: string): level is keyof AncestorChain {
  return (
    level === "L1" ||
    level === "L2" ||
    level === "L3" ||
    level === "L4" ||
    level === "L4_AGENDA" ||
    level === "L4_EVENT" ||
    level === "L5" ||
    level === "L5_EVENT" ||
    level === "L6"
  );
}

function filterLeaves(leaves: LeafRow[], range: MonthRange, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  return leaves.filter((leaf) => {
    if (!isInRange(leaf.monthKey, range)) return false;
    if (!normalizedQuery) return true;
    const text = [
      leaf.node.label,
      leaf.node.representativeKeywords?.join(" ") ?? "",
      leaf.node.organizationNames.join(" "),
      leaf.node.representativeSentences.join(" "),
      leaf.chain.L2?.label ?? "",
      leaf.chain.L2?.representativeKeywords?.join(" ") ?? "",
      leaf.chain.L3?.label ?? "",
      leaf.chain.L3?.representativeKeywords?.join(" ") ?? "",
      leaf.chain.L4_AGENDA?.label ?? "",
      leaf.chain.L4_AGENDA?.representativeKeywords?.join(" ") ?? "",
      leaf.chain.L4_EVENT?.label ?? "",
      leaf.chain.L4_EVENT?.representativeKeywords?.join(" ") ?? "",
      leaf.chain.L5_EVENT?.label ?? "",
      leaf.chain.L5_EVENT?.representativeKeywords?.join(" ") ?? "",
      leaf.macroAgendas.map((node) => node.label).join(" "),
      leaf.macroAgendas.map((node) => node.representativeKeywords?.join(" ") ?? "").join(" "),
      leaf.macroEvents.map((node) => node.label).join(" "),
      leaf.macroEvents.map((node) => node.representativeKeywords?.join(" ") ?? "").join(" "),
      leaf.longEventArcs.map((node) => node.label).join(" "),
      leaf.longEventArcs.map((node) => node.representativeKeywords?.join(" ") ?? "").join(" "),
    ]
      .join(" ")
      .toLowerCase();
    return text.includes(normalizedQuery);
  });
}

function getLeavesForSelection(indexed: Indexed, selectedId: string, range: MonthRange) {
  const leaf = indexed.leafByRenderId.get(selectedId);
  if (leaf) return isInRange(leaf.monthKey, range) ? [leaf] : [];

  return indexed.leaves.filter((row) => {
    if (!isInRange(row.monthKey, range)) return false;
    return [
      row.chain.L1?.id,
      row.chain.L2?.id,
      row.chain.L3?.id,
      row.chain.L4?.id,
      row.chain.L4_AGENDA?.id,
      row.chain.L4_EVENT?.id,
      row.chain.L5?.id,
      row.chain.L5_EVENT?.id,
      row.chain.L6?.id,
      row.node.id,
      ...row.macroAgendas.map((node) => node.id),
      ...row.macroEvents.map((node) => node.id),
      ...row.longEventArcs.map((node) => node.id),
    ].includes(selectedId);
  });
}

function resolveSelectedCategory(indexed: Indexed, selectedId: string) {
  const leaf = indexed.leafByRenderId.get(selectedId);
  if (leaf?.chain.L3) return leaf.chain.L3;
  const entity = indexed.entityById.get(selectedId);
  if (!entity) return indexed.categories[0] ?? null;
  if (entity.level === "L3") return entity;

  const leafInEntity = indexed.leaves.find((row) =>
    [
      row.chain.L1?.id,
      row.chain.L2?.id,
      row.chain.L3?.id,
      row.chain.L4_AGENDA?.id,
      row.chain.L4_EVENT?.id,
      row.chain.L5?.id,
      row.chain.L5_EVENT?.id,
      row.chain.L6?.id,
      ...row.macroAgendas.map((node) => node.id),
      ...row.macroEvents.map((node) => node.id),
      ...row.longEventArcs.map((node) => node.id),
    ].includes(entity.id),
  );
  return leafInEntity?.chain.L3 ?? indexed.categories[0] ?? null;
}

function getCategoryIssues(indexed: Indexed, categoryId: string, range: MonthRange) {
  const counts = new Map<string, number>();
  for (const leaf of indexed.leaves) {
    if (!isInRange(leaf.monthKey, range)) continue;
    if (leaf.chain.L3?.id !== categoryId) continue;
    const issueId = leaf.chain.L2?.id;
    if (!issueId) continue;
    counts.set(issueId, (counts.get(issueId) ?? 0) + 1);
  }
  return indexed.issues
    .filter((issue) => counts.has(issue.id))
    .toSorted((left, right) => (counts.get(right.id) ?? 0) - (counts.get(left.id) ?? 0));
}

function layoutAtlas(
  categories: HierarchyNode[],
  leaves: LeafRow[],
  selectedId: string,
) {
  const max = Math.max(...categories.map((category) => category.leafCount), 1);
  const centers = [
    [480, 315],
    [265, 210],
    [690, 210],
    [260, 455],
    [690, 455],
    [480, 130],
    [480, 515],
    [150, 330],
    [810, 330],
    [350, 115],
    [610, 540],
    [610, 115],
  ];
  const categoryLayouts = categories.map<CategoryLayout>((node, index) => {
    const [x, y] = centers[index] ?? [
      160 + (index % 6) * 128,
      130 + Math.floor(index / 6) * 180,
    ];
    return {
      color: colorForIndex(index),
      node,
      radius: round(42 + Math.sqrt(node.leafCount / max) * 118),
      x: round(x),
      y: round(y),
    };
  });
  const layoutByCategoryId = new Map(categoryLayouts.map((layout) => [layout.node.id, layout]));
  const categoryIndexById = new Map(
    categoryLayouts.map((layout, index) => [layout.node.id, index]),
  );
  const issueIndex = new Map<string, number>();
  const issueTotals = new Map<string, number>();

  for (const leaf of leaves) {
    const issueId = leaf.chain.L2?.id ?? leaf.chain.L3?.id ?? "none";
    issueTotals.set(issueId, (issueTotals.get(issueId) ?? 0) + 1);
  }

  const points = leaves.flatMap<PointLayout>((leaf, index) => {
    const categoryId = leaf.chain.L3?.id ?? "";
    const layout = layoutByCategoryId.get(categoryId);
    if (!layout) return [];
    const issueId = leaf.chain.L2?.id ?? categoryId;
    const nextIssueIndex = issueIndex.get(issueId) ?? issueIndex.size;
    issueIndex.set(issueId, nextIssueIndex);
    const localIndex = Math.abs(hashString(leaf.renderId)) % 997;
    const issueAngle = nextIssueIndex * 1.618;
    const issueRadius = Math.min(layout.radius * 0.56, 24 + (nextIssueIndex % 7) * 14);
    const subX = layout.x + Math.cos(issueAngle) * issueRadius;
    const subY = layout.y + Math.sin(issueAngle) * issueRadius * 0.76;
    const jitterAngle = (localIndex / 997) * Math.PI * 2;
    const jitterRadius = 7 + (index % 11) * 2.2;
    const selected =
      selectedId === leaf.renderId ||
      selectedId === leaf.chain.L2?.id ||
      selectedId === leaf.chain.L3?.id ||
      selectedId === leaf.chain.L4_AGENDA?.id ||
      selectedId === leaf.chain.L4_EVENT?.id ||
      selectedId === leaf.chain.L5_EVENT?.id;
    const categoryIndex = categoryIndexById.get(categoryId) ?? 0;
    return [
      {
        categoryId,
        color: colorForIndex(categoryIndex),
        leaf,
        opacity: selected ? 0.96 : 0.62,
        r: selected ? 5.8 : 3.4,
        selected,
        x: round(subX + Math.cos(jitterAngle) * jitterRadius),
        y: round(subY + Math.sin(jitterAngle) * jitterRadius * 0.72),
      },
    ];
  });

  return { categoryLayouts, points };
}

function getTopActors(leaves: LeafRow[], limit: number) {
  const counts = new Map<string, number>();
  for (const leaf of leaves) {
    for (const actor of leaf.node.organizationNames) {
      counts.set(actor, (counts.get(actor) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .toSorted((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([actor]) => actor);
}

function getCellLeaves(leaves: LeafRow[], actor: string, issueId: string) {
  return leaves.filter(
    (leaf) => leaf.node.organizationNames.includes(actor) && leaf.chain.L2?.id === issueId,
  );
}

function getMonths(range: MonthRange) {
  const months = ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06"];
  return months.filter((month) => isInRange(month, range));
}

function isInRange(monthKey: string, range: MonthRange) {
  return Boolean(monthKey) && monthKey >= range.start && monthKey <= range.end;
}

function estimateSpanDays(leaves: LeafRow[]) {
  const dates = leaves
    .map((leaf) => leaf.date?.getTime())
    .filter((time): time is number => typeof time === "number" && Number.isFinite(time));
  if (!dates.length) return 0;
  return Math.ceil((Math.max(...dates) - Math.min(...dates)) / 86_400_000);
}

function colorForIndex(index: number) {
  return palette[index % palette.length] ?? "#111111";
}

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return hash;
}

function round(value: number) {
  return Math.round(value * 1000) / 1000;
}

function shorten(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
