"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { HierarchyModel, HierarchyNode } from "../graph-explorer";

type G6Payload = {
  childCount: number;
  isLeaf: boolean;
  keywords: string[];
  label: string;
  leafCount: number;
  level: string;
  organizations: string[];
  originalId: string;
  renderId: string;
  sentence: string;
  timeRange: string;
};

type G6EdgePayload = {
  fromLayer: string;
  similarity: number;
};

type G6Datum = {
  combo?: string | null;
  data?: G6Payload | G6EdgePayload;
  id?: string;
  source?: string;
  style?: Record<string, unknown>;
  target?: string;
};

type G6GraphData = {
  combos: G6Datum[];
  edges: G6Datum[];
  nodes: G6Datum[];
};

type G6PointerEvent = {
  target?: {
    id?: string;
  };
};

type G6GraphInstance = {
  destroy: () => void;
  fitView?: () => Promise<void> | void;
  off?: (eventName: string, handler: (event: G6PointerEvent) => void) => void;
  on: (eventName: string, handler: (event: G6PointerEvent) => void) => void;
  render: () => Promise<void> | void;
};

type G6Module = {
  ComboEvent?: Record<string, string>;
  Graph: new (options: Record<string, unknown>) => G6GraphInstance;
  NodeEvent?: Record<string, string>;
};

type IndexedModel = {
  layerIds: string[];
  nodeById: Map<string, HierarchyNode>;
  topLayerId: string;
  topLayerNumber: number;
};

type RenderModel = {
  data: G6GraphData;
  renderNodeById: Map<string, HierarchyNode>;
  searchRows: Array<{
    node: HierarchyNode;
    renderId: string;
    text: string;
  }>;
};

type EdgeScope = "upper" | "all";

const layerColors = [
  "#111111",
  "#8a2f2f",
  "#244b6a",
  "#315c45",
  "#6f4f8f",
  "#8a6b2e",
  "#2f5f73",
  "#6b3547",
  "#4b5f2f",
];

export function G6Explorer({ model }: { model: HierarchyModel }) {
  const indexed = useMemo(() => indexModel(model), [model]);
  const [query, setQuery] = useState("");
  const [selectedRenderId, setSelectedRenderId] = useState<string | null>(null);
  const [edgeScope, setEdgeScope] = useState<EdgeScope>("upper");
  const [showEdges, setShowEdges] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [layoutVersion, setLayoutVersion] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const graphRef = useRef<G6GraphInstance | null>(null);
  const [size, setSize] = useState({ height: 0, width: 0 });

  const renderModel = useMemo(
    () => buildG6Data(model, indexed, showEdges, edgeScope),
    [edgeScope, indexed, model, showEdges],
  );
  const selectedNode = selectedRenderId
    ? renderModel.renderNodeById.get(selectedRenderId) ?? null
    : null;
  const normalizedQuery = query.trim().toLowerCase();
  const matches = normalizedQuery
    ? renderModel.searchRows
        .filter((row) => row.text.includes(normalizedQuery))
        .slice(0, 32)
    : [];

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const updateSize = () => {
      const rect = element.getBoundingClientRect();
      setSize((current) => {
        const next = {
          height: Math.max(360, Math.floor(rect.height)),
          width: Math.max(480, Math.floor(rect.width)),
        };
        if (
          Math.abs(current.height - next.height) < 4 &&
          Math.abs(current.width - next.width) < 4
        ) {
          return current;
        }
        return next;
      });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || size.width <= 0 || size.height <= 0) return;

    let disposed = false;
    let graph: G6GraphInstance | null = null;
    const selectElement = (event: G6PointerEvent) => {
      const id = event.target?.id;
      if (id && renderModel.renderNodeById.has(id)) {
        setSelectedRenderId(id);
      }
    };

    async function mountGraph() {
      const g6 = (await import("@antv/g6")) as unknown as G6Module;
      if (disposed) return;

      graph = new g6.Graph({
        animation: true,
        autoFit: "view",
        behaviors: [
          "zoom-canvas",
          "drag-canvas",
          {
            dropEffect: "link",
            type: "drag-element",
          },
          {
            animation: true,
            key: "collapse-expand",
            type: "collapse-expand",
          },
        ],
        combo: {
          style: {
            collapsedFill: (datum: G6Datum) => colorForLayer(payloadOf(datum).level),
            collapsedLineWidth: 1.2,
            collapsedMarkerFill: "#ffffff",
            collapsedMarkerFontSize: 11,
            collapsedMarkerType: "descendant-count",
            collapsedSize: (datum: G6Datum) => comboCollapsedSize(payloadOf(datum)),
            collapsedStroke: "#111111",
            fill: (datum: G6Datum) => colorForLayer(payloadOf(datum).level),
            fillOpacity: (datum: G6Datum) => comboFillOpacity(payloadOf(datum)),
            labelFill: "#111111",
            labelFontFamily:
              "Geist, Malgun Gothic, Apple SD Gothic Neo, ui-sans-serif, system-ui, sans-serif",
            labelFontSize: (datum: G6Datum) => (payloadOf(datum).level === indexed.topLayerId ? 15 : 11),
            labelFontWeight: 700,
            labelMaxLines: 2,
            labelMaxWidth: 220,
            labelPlacement: "top",
            labelText: (datum: G6Datum) => {
              const payload = payloadOf(datum);
              if (!showLabels) return payload.level;
              return `${payload.level} · ${shorten(payload.label, payload.level === indexed.topLayerId ? 54 : 42)}`;
            },
            labelWordWrap: true,
            lineWidth: (datum: G6Datum) => (payloadOf(datum).level === indexed.topLayerId ? 2 : 1),
            padding: 16,
            radius: 4,
            shadowBlur: 8,
            shadowColor: "rgba(17, 17, 17, 0.08)",
            stroke: (datum: G6Datum) => colorForLayer(payloadOf(datum).level),
            strokeOpacity: 0.82,
          },
          type: "rect",
        },
        container,
        data: renderModel.data,
        edge: {
          style: (datum: G6Datum) => {
            const payload = edgePayloadOf(datum);
            const similarityStrength = Math.max(0, payload.similarity - 0.55);
            return {
              lineWidth: 0.7 + similarityStrength * 3.2,
              stroke: "#111111",
              strokeOpacity: Math.min(0.3, 0.055 + similarityStrength * 0.62),
            };
          },
          type: "line",
        },
        height: size.height,
        layout: {
          comboPadding: 18,
          nodeSize: (datum: G6Datum) => nodeVisualSize(payloadOf(datum)),
          spacing: 34,
          type: "combo-combined",
        },
        node: {
          style: {
            fill: (datum: G6Datum) => colorForLayer(payloadOf(datum).level),
            fillOpacity: 0.9,
            labelFill: "#242822",
            labelFontFamily:
              "Geist, Malgun Gothic, Apple SD Gothic Neo, ui-sans-serif, system-ui, sans-serif",
            labelFontSize: 10,
            labelMaxLines: 2,
            labelMaxWidth: 128,
            labelPlacement: "bottom",
            labelText: (datum: G6Datum) =>
              showLabels ? shorten(payloadOf(datum).label, 30) : "",
            labelWordWrap: true,
            lineWidth: 1,
            size: (datum: G6Datum) => nodeVisualSize(payloadOf(datum)),
            stroke: "#ffffff",
          },
          type: "circle",
        },
        plugins: [
          {
            size: 32,
            stroke: "rgba(17, 17, 17, 0.06)",
            type: "grid-line",
          },
        ],
        width: size.width,
      });

      graphRef.current = graph;
      graph.on(g6.NodeEvent?.CLICK ?? "node:click", selectElement);
      graph.on(g6.ComboEvent?.CLICK ?? "combo:click", selectElement);
      await graph.render();
    }

    void mountGraph();

    return () => {
      disposed = true;
      if (graph) {
        graph.off?.("node:click", selectElement);
        graph.off?.("combo:click", selectElement);
        graph.destroy();
      }
      if (graphRef.current === graph) graphRef.current = null;
    };
  }, [
    indexed.topLayerId,
    layoutVersion,
    renderModel.data,
    renderModel.renderNodeById,
    showLabels,
    size.height,
    size.width,
  ]);

  return (
    <div className="min-h-screen bg-[#f5f5f2] text-[#101010]">
      <div className="grid h-screen grid-cols-[370px_minmax(0,1fr)] overflow-hidden">
        <aside className="flex min-h-0 flex-col border-r border-[#d7d9d3] bg-white">
          <div className="border-b border-[#d7d9d3] p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-[21px] font-semibold leading-tight">
                  G6 Combo Explorer
                </h1>
                <p className="mt-2 text-[12px] leading-5 text-[#666b64]">
                  G6 combo로 전체 계층을 한 캔버스에 올렸습니다. 콤보를 더블클릭하면
                  아래 레이어가 접히거나 펼쳐집니다.
                </p>
              </div>
              <Link
                className="border border-[#d7d9d3] bg-[#fbfbf8] px-2.5 py-1.5 text-[12px] font-semibold"
                href="/"
              >
                Flow
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-4 gap-2">
              {indexed.layerIds.slice(-4).map((layerId) => (
                <div
                  className="border border-[#d7d9d3] bg-[#fbfbf8] p-2"
                  key={layerId}
                >
                  <strong className="block text-[17px] leading-none">
                    {model.summary.layerSizes[layerId] ?? 0}
                  </strong>
                  <span className="text-[10px] text-[#666b64]">{layerId}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4 border-b border-[#d7d9d3] p-5">
            <label className="block text-[12px] font-semibold text-[#666b64]">
              검색
              <input
                className="mt-2 h-10 w-full border border-[#d7d9d3] bg-white px-3 text-[13px] font-normal text-[#101010] outline-none focus:border-[#111111]"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="이슈, 단체, 대표문장 검색"
                value={query}
              />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className="flex h-10 items-center gap-2 border border-[#d7d9d3] bg-[#fbfbf8] px-3 text-[12px] text-[#20231f]">
                <input
                  checked={showLabels}
                  onChange={(event) => setShowLabels(event.target.checked)}
                  type="checkbox"
                />
                라벨
              </label>
              <label className="flex h-10 items-center gap-2 border border-[#d7d9d3] bg-[#fbfbf8] px-3 text-[12px] text-[#20231f]">
                <input
                  checked={showEdges}
                  onChange={(event) => setShowEdges(event.target.checked)}
                  type="checkbox"
                />
                연결선
              </label>
            </div>

            <label className="block text-[12px] font-semibold text-[#666b64]">
              연결 범위
              <select
                className="mt-2 h-10 w-full border border-[#d7d9d3] bg-white px-3 text-[13px] font-normal text-[#101010] outline-none focus:border-[#111111]"
                disabled={!showEdges}
                onChange={(event) => setEdgeScope(event.target.value as EdgeScope)}
                value={edgeScope}
              >
                <option value="upper">상위 2단계만</option>
                <option value="all">전체 레이어</option>
              </select>
            </label>

            <div className="grid grid-cols-2 gap-2">
              <button
                className="h-10 border border-[#111111] bg-[#111111] px-3 text-[13px] font-semibold text-white"
                onClick={() => setLayoutVersion((value) => value + 1)}
                type="button"
              >
                다시 배치
              </button>
              <button
                className="h-10 border border-[#d7d9d3] bg-white px-3 text-[13px] font-semibold"
                onClick={() => {
                  void graphRef.current?.fitView?.();
                }}
                type="button"
              >
                화면 맞춤
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto p-5">
            <SearchMatches
              matches={matches}
              onSelect={(renderId) => setSelectedRenderId(renderId)}
            />
            <NodeDetails node={selectedNode} />
          </div>
        </aside>

        <main className="relative min-w-0 bg-[#f7f7f4]">
          <div className="absolute left-4 top-4 z-10 border border-[#d7d9d3] bg-white/95 px-3 py-2 text-[12px] shadow-sm">
            <span className="font-semibold">{indexed.topLayerId}</span>
            <span className="mx-2 text-[#a0a39d]">/</span>
            <span>{renderModel.data.combos.length} combos</span>
            <span className="mx-2 text-[#a0a39d]">/</span>
            <span>{renderModel.data.nodes.length} leaves</span>
            <span className="mx-2 text-[#a0a39d]">/</span>
            <span>{renderModel.data.edges.length} edges</span>
          </div>
          <div
            aria-label="G6 hierarchical issue graph"
            className="h-full w-full"
            ref={containerRef}
          />
        </main>
      </div>
    </div>
  );
}

function SearchMatches({
  matches,
  onSelect,
}: {
  matches: Array<{
    node: HierarchyNode;
    renderId: string;
  }>;
  onSelect: (renderId: string) => void;
}) {
  if (!matches.length) return null;

  return (
    <section className="mb-4 border border-[#d7d9d3] bg-[#fbfbf8] p-3">
      <div className="text-[12px] font-semibold text-[#666b64]">검색 결과</div>
      <div className="mt-2 space-y-1.5">
        {matches.map(({ node, renderId }) => (
          <button
            className="w-full border border-[#d7d9d3] bg-white p-2 text-left text-[12px] leading-4 hover:border-[#111111]"
            key={renderId}
            onClick={() => onSelect(renderId)}
            type="button"
          >
            <span className="block font-semibold">{node.level}</span>
            <span className="block">{shorten(node.label, 66)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function NodeDetails({ node }: { node: HierarchyNode | null }) {
  if (!node) {
    return (
      <section className="border border-[#d7d9d3] bg-[#fbfbf8] p-4 text-[12px] leading-5 text-[#666b64]">
        캔버스에서 노드나 콤보를 클릭하면 날짜, 단체, 대표문장이 표시됩니다.
      </section>
    );
  }

  return (
    <section className="border border-[#d7d9d3] bg-[#fbfbf8] p-4">
      <div className="text-[12px] font-semibold text-[#666b64]">선택 항목</div>
      <h2 className="mt-2 text-[16px] font-semibold leading-snug">{node.label}</h2>
      <KeywordChips keywords={node.representativeKeywords} />
      <p className="mt-2 text-[12px] leading-5 text-[#666b64]">
        {node.level} · {node.leafCount} rows · {node.childIds.length} children
      </p>
      <p className="mt-1 text-[12px] leading-5 text-[#666b64]">
        {formatDateRange(node)}
      </p>
      <p className="mt-2 text-[12px] leading-5 text-[#333833]">
        {node.organizationNames.slice(0, 14).join(", ")}
      </p>
      <div className="mt-4 space-y-2">
        {node.representativeSentences.slice(0, 5).map((sentence) => (
          <div
            className="border border-[#d7d9d3] bg-white p-2 text-[12px] leading-5"
            key={sentence}
          >
            {sentence}
          </div>
        ))}
      </div>
    </section>
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

function buildG6Data(
  model: HierarchyModel,
  indexed: IndexedModel,
  showEdges: boolean,
  edgeScope: EdgeScope,
): RenderModel {
  const occurrenceTotals = new Map<string, number>();
  const occurrenceSeen = new Map<string, number>();
  const renderIdsByOriginalId = new Map<string, string[]>();
  const renderNodeById = new Map<string, HierarchyNode>();
  const elementIdSet = new Set<string>();
  const combos: G6Datum[] = [];
  const nodes: G6Datum[] = [];

  for (const layerId of indexed.layerIds) {
    for (const node of model.layers[layerId] ?? []) {
      occurrenceTotals.set(node.id, (occurrenceTotals.get(node.id) ?? 0) + 1);
    }
  }

  for (const layerId of indexed.layerIds) {
    for (const node of model.layers[layerId] ?? []) {
      const renderId = renderIdFor(node.id, occurrenceSeen, occurrenceTotals);
      const payload = toPayload(node, renderId);
      renderNodeById.set(renderId, node);
      elementIdSet.add(renderId);
      addToMultiMap(renderIdsByOriginalId, node.id, renderId);

      if (layerId === "L0") {
        nodes.push({
          combo: node.parentId ?? undefined,
          data: payload,
          id: renderId,
        });
      } else {
        combos.push({
          combo: node.parentId ?? null,
          data: payload,
          id: renderId,
          style: {
            collapsed: layerNumber(node.level) < indexed.topLayerNumber,
          },
        });
      }
    }
  }

  const edges = showEdges
    ? expandProximityEdges(model, indexed, edgeScope, renderIdsByOriginalId, elementIdSet)
    : [];
  const searchRows = Array.from(renderNodeById.entries()).map(([renderId, node]) => ({
    node,
    renderId,
    text: [
      node.label,
      node.representativeKeywords?.join(" ") ?? "",
      node.organizationNames.join(" "),
      node.representativeSentences.join(" "),
      node.sourceKeys.join(" "),
    ]
      .join(" ")
      .toLowerCase(),
  }));

  return {
    data: { combos, edges, nodes },
    renderNodeById,
    searchRows,
  };
}

function expandProximityEdges(
  model: HierarchyModel,
  indexed: IndexedModel,
  edgeScope: EdgeScope,
  renderIdsByOriginalId: Map<string, string[]>,
  elementIdSet: Set<string>,
) {
  const seen = new Set<string>();
  const edges: G6Datum[] = [];

  for (const edge of model.proximityEdges) {
    if (edgeScope === "upper" && layerNumber(edge.fromLayer) < indexed.topLayerNumber - 2) {
      continue;
    }
    const sources = renderIdsByOriginalId.get(edge.source) ?? [];
    const targets = renderIdsByOriginalId.get(edge.target) ?? [];
    for (const source of sources) {
      for (const target of targets) {
        if (!elementIdSet.has(source) || !elementIdSet.has(target) || source === target) {
          continue;
        }
        const edgeId = `${source}->${target}`;
        if (seen.has(edgeId)) continue;
        seen.add(edgeId);
        edges.push({
          data: {
            fromLayer: edge.fromLayer,
            similarity: edge.similarity,
          },
          id: edgeId,
          source,
          target,
        });
      }
    }
  }

  return edges;
}

function toPayload(node: HierarchyNode, renderId: string): G6Payload {
  return {
    childCount: node.childIds.length,
    isLeaf: node.level === "L0",
    keywords: node.representativeKeywords ?? [],
    label: node.label,
    leafCount: node.leafCount,
    level: node.level,
    organizations: node.organizationNames,
    originalId: node.id,
    renderId,
    sentence: node.representativeSentences[0] ?? "",
    timeRange: formatDateRange(node),
  };
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

function addToMultiMap(map: Map<string, string[]>, key: string, value: string) {
  const current = map.get(key);
  if (current) {
    current.push(value);
  } else {
    map.set(key, [value]);
  }
}

function payloadOf(datum: G6Datum): G6Payload {
  const payload = datum.data as Partial<G6Payload> | undefined;
  if (payload?.level && payload?.label && payload?.renderId) {
    return payload as G6Payload;
  }

  const fallbackId = datum.id ?? "unknown";
  return {
    childCount: 0,
    isLeaf: true,
    keywords: [],
    label: fallbackId,
    leafCount: 1,
    level: layerFromElementId(fallbackId),
    organizations: [],
    originalId: fallbackId,
    renderId: fallbackId,
    sentence: "",
    timeRange: "날짜 없음",
  };
}

function edgePayloadOf(datum: G6Datum): G6EdgePayload {
  const payload = datum.data as Partial<G6EdgePayload> | undefined;
  return {
    fromLayer: payload?.fromLayer ?? "L0",
    similarity: typeof payload?.similarity === "number" ? payload.similarity : 0.6,
  };
}

function comboCollapsedSize(payload: G6Payload): [number, number] {
  const base = Math.max(58, Math.min(150, 48 + Math.sqrt(payload.leafCount) * 13));
  return [base, Math.max(38, base * 0.58)];
}

function comboFillOpacity(payload: G6Payload) {
  const depth = layerNumber(payload.level);
  return Math.max(0.07, 0.16 - depth * 0.01);
}

function nodeVisualSize(payload: G6Payload) {
  if (!payload.isLeaf) return Math.max(22, Math.min(48, 18 + Math.sqrt(payload.leafCount) * 3));
  return Math.max(9, Math.min(24, 9 + Math.sqrt(payload.leafCount) * 4));
}

function indexModel(model: HierarchyModel): IndexedModel {
  const layerIds = Object.keys(model.layers).sort(
    (left, right) => layerNumber(left) - layerNumber(right),
  );
  const nodeById = new Map<string, HierarchyNode>();
  for (const nodes of Object.values(model.layers)) {
    for (const node of nodes) nodeById.set(node.id, node);
  }
  const topLayerId = layerIds.at(-1) ?? "L0";

  return {
    layerIds,
    nodeById,
    topLayerId,
    topLayerNumber: layerNumber(topLayerId),
  };
}

function colorForLayer(layerId: string) {
  return layerColors[layerNumber(layerId) % layerColors.length] ?? "#111111";
}

function layerNumber(layerId: string) {
  const match = layerId.match(/^L(\d+)/);
  return match ? Number.parseInt(match[1], 10) : 0;
}

function layerFromElementId(elementId: string) {
  const match = elementId.match(/^(L\d+(?:_[A-Z]+)?)/);
  return match?.[1] ?? "L0";
}

function formatDateRange(node: HierarchyNode) {
  const first = node.firstSeenAt?.slice(0, 10) || "";
  const last = node.lastSeenAt?.slice(0, 10) || "";
  if (!first && !last) return "날짜 없음";
  return first === last ? first : `${first} - ${last}`;
}

function shorten(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
