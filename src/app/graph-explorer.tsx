"use client";

import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { useMemo, useState } from "react";

export type HierarchyNode = {
  childIds: string[];
  childLayer?: string | null;
  firstSeenAt?: string;
  id: string;
  label: string;
  lastSeenAt?: string;
  leafCount: number;
  level: string;
  organizationNames: string[];
  parentId?: string | null;
  parentIds?: string[];
  representativeKeywords?: string[];
  representativeSentences: string[];
  sourceKeys: string[];
  sourceTypes: string[];
  timeSpanDays?: number;
};

export type HierarchyLink = {
  childLayer: string;
  parentLayer: string;
  source: string;
  target: string;
  type: string;
};

export type ProximityEdge = {
  fromLayer: string;
  relationType?: string;
  similarity: number;
  source: string;
  target: string;
  toLayer: string;
};

export type HierarchyModel = {
  generatedAt: string;
  layers: Record<string, HierarchyNode[]>;
  links: HierarchyLink[];
  proximityEdges: ProximityEdge[];
  summary: {
    layerSizes: Record<string, number>;
  };
};

type FlowNodeData = {
  childCount: number;
  isParent: boolean;
  keywords: string[];
  label: string;
  layerId: string;
  leafCount: number;
  organizationNames: string[];
  originalId: string;
  sentences: string[];
  timeRange: string;
};

type ClusterFlowNode = Node<FlowNodeData, "cluster">;

const layerColor = [
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

const nodeTypes = {
  cluster: ClusterNode,
};

export function GraphExplorer({ model }: { model: HierarchyModel }) {
  const { layerIds, nodeById, topLayerId } = useMemo(() => indexModel(model), [model]);
  const [query, setQuery] = useState("");
  const [showLabels, setShowLabels] = useState(true);
  const [viewStack, setViewStack] = useState<string[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const viewRoot = viewStack.length ? nodeById.get(viewStack.at(-1) ?? "") ?? null : null;
  const activeLayerId = viewRoot?.childLayer || topLayerId;
  const flow = useMemo(
    () =>
      buildFlow({
        activeLayerId,
        model,
        nodeById,
        query,
        rootNode: viewRoot,
        showLabels,
      }),
    [activeLayerId, model, nodeById, query, showLabels, viewRoot],
  );
  const selectedNode = selectedNodeId ? nodeById.get(selectedNodeId) ?? null : null;
  const breadcrumbNodes = viewStack
    .map((id) => nodeById.get(id))
    .filter((node): node is HierarchyNode => Boolean(node));

  function openNode(nodeId: string) {
    const node = nodeById.get(nodeId);
    if (!node?.childIds?.length || !node.childLayer) return;
    setSelectedNodeId(nodeId);
    setViewStack((current) => [...current, nodeId]);
  }

  function popTo(index: number) {
    const next = viewStack.slice(0, index + 1);
    setViewStack(next);
    setSelectedNodeId(next.at(-1) ?? null);
  }

  function resetView() {
    setViewStack([]);
    setSelectedNodeId(null);
    setQuery("");
  }

  return (
    <div className="min-h-screen bg-[#f5f5f2] text-[#101010]">
      <div className="grid h-screen grid-cols-[380px_minmax(0,1fr)] overflow-hidden">
        <aside className="flex min-h-0 flex-col border-r border-[#d7d9d3] bg-white">
          <div className="border-b border-[#d7d9d3] p-5">
            <h1 className="text-[22px] font-semibold leading-tight">
              Hierarchical Issue Explorer
            </h1>
            <p className="mt-2 text-[12px] leading-5 text-[#666b64]">
              full-text 대표발언을 가까운 것부터 접어 {topLayerId}까지 쌓은
              sub-flow 그래프입니다.
            </p>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {layerIds.slice(-4).map((layerId) => (
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
                placeholder="이슈, 단체, 문장 검색"
                value={query}
              />
            </label>
            <label className="flex items-center gap-2 border border-[#d7d9d3] bg-[#fbfbf8] px-3 py-2 text-[12px] text-[#20231f]">
              <input
                checked={showLabels}
                onChange={(event) => setShowLabels(event.target.checked)}
                type="checkbox"
              />
              노드 라벨 표시
            </label>
            <div className="flex gap-2">
              <button
                className="h-10 flex-1 border border-[#111111] bg-[#111111] px-3 text-[13px] font-semibold text-white"
                onClick={resetView}
                type="button"
              >
                전체 보기
              </button>
              <button
                className="h-10 flex-1 border border-[#d7d9d3] bg-white px-3 text-[13px] font-semibold"
                disabled={!viewStack.length}
                onClick={() => {
                  const next = viewStack.slice(0, -1);
                  setViewStack(next);
                  setSelectedNodeId(next.at(-1) ?? null);
                }}
                type="button"
              >
                상위로
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto p-5">
            <div className="mb-4">
              <div className="text-[12px] font-semibold text-[#666b64]">
                현재 경로
              </div>
              <div className="mt-2 space-y-2">
                <button
                  className={!viewStack.length ? "path active" : "path"}
                  onClick={resetView}
                  type="button"
                >
                  {topLayerId} 전체
                </button>
                {breadcrumbNodes.map((node, index) => (
                  <button
                    className="path"
                    key={node.id}
                    onClick={() => popTo(index)}
                    type="button"
                  >
                    {node.level} · {node.label}
                  </button>
                ))}
              </div>
            </div>

            <NodeDetails
              node={selectedNode}
              onOpen={selectedNode ? () => openNode(selectedNode.id) : undefined}
            />
          </div>
        </aside>

        <main className="relative min-w-0 bg-[#f7f7f4]">
          <div className="absolute left-4 top-4 z-10 border border-[#d7d9d3] bg-white/95 px-3 py-2 text-[12px] shadow-sm">
            <span className="font-semibold">{activeLayerId}</span>
            <span className="mx-2 text-[#a0a39d]">/</span>
            <span>{flow.visibleParentCount} parent nodes</span>
            <span className="mx-2 text-[#a0a39d]">/</span>
            <span>{flow.nodes.length} visible nodes</span>
          </div>
          <ReactFlow
            key={`${activeLayerId}:${viewStack.join(">")}:${query}`}
            colorMode="light"
            edges={flow.edges}
            fitView
            minZoom={0.08}
            maxZoom={2}
            nodes={flow.nodes}
            nodeTypes={nodeTypes}
            onNodeClick={(_, node) => setSelectedNodeId(node.data.originalId)}
            onNodeDoubleClick={(_, node) => openNode(node.data.originalId)}
          >
            <Background color="#d9ddd4" gap={28} />
            <Controls position="bottom-right" />
            <MiniMap
              maskColor="rgba(247,247,244,0.72)"
              nodeColor={(node) => {
                const data = node.data as FlowNodeData;
                return colorForLayer(data.layerId);
              }}
              pannable
              position="bottom-left"
              zoomable
            />
          </ReactFlow>
        </main>
      </div>
    </div>
  );
}

function ClusterNode({ data, selected }: NodeProps<ClusterFlowNode>) {
  const color = colorForLayer(data.layerId);
  return (
    <div
      className={[
        "h-full w-full border bg-white shadow-sm",
        data.isParent ? "p-3" : "px-2 py-1.5",
        selected ? "border-[#111111]" : "border-[#d7d9d3]",
      ].join(" ")}
      style={{
        boxShadow: selected ? "0 0 0 2px rgba(17,17,17,0.12)" : undefined,
      }}
    >
      <Handle position={Position.Left} type="target" />
      <Handle position={Position.Right} type="source" />
      <Handle position={Position.Top} type="target" />
      <Handle position={Position.Bottom} type="source" />
      <div className="flex items-start justify-between gap-2">
        <span
          className="inline-flex h-5 min-w-8 items-center justify-center px-1.5 text-[10px] font-bold text-white"
          style={{ background: color }}
        >
          {data.layerId}
        </span>
        <span className="text-[10px] text-[#666b64]">{data.leafCount} rows</span>
      </div>
      <div
        className={[
          "mt-2 overflow-hidden font-semibold leading-snug text-[#111111]",
          data.isParent ? "text-[13px]" : "text-[11px]",
        ].join(" ")}
      >
        {data.label}
      </div>
      {data.keywords.length ? (
        <div className="mt-2 truncate text-[10px] text-[#4e554d]">
          {data.keywords.slice(0, 4).join(" · ")}
        </div>
      ) : null}
      {data.isParent ? (
        <div className="mt-2 text-[11px] text-[#666b64]">
          {data.childCount} children · {data.organizationNames.slice(0, 3).join(", ")}
        </div>
      ) : null}
    </div>
  );
}

function NodeDetails({
  node,
  onOpen,
}: {
  node: HierarchyNode | null;
  onOpen?: () => void;
}) {
  if (!node) {
    return (
      <section className="border border-[#d7d9d3] bg-[#fbfbf8] p-4 text-[12px] leading-5 text-[#666b64]">
        노드를 클릭하면 날짜, 단체, 대표문장과 하위 그래프 진입 버튼이 표시됩니다.
      </section>
    );
  }

  return (
    <section className="border border-[#d7d9d3] bg-[#fbfbf8] p-4">
      <div className="text-[12px] font-semibold text-[#666b64]">
        선택 노드
      </div>
      <h2 className="mt-2 text-[16px] font-semibold leading-snug">{node.label}</h2>
      <KeywordChips keywords={node.representativeKeywords} />
      <p className="mt-2 text-[12px] leading-5 text-[#666b64]">
        {node.level} · {node.leafCount} rows · {node.childIds.length} children
      </p>
      <p className="mt-1 text-[12px] leading-5 text-[#666b64]">
        {formatDateRange(node)}
      </p>
      <p className="mt-2 text-[12px] leading-5 text-[#333833]">
        {node.organizationNames.slice(0, 12).join(", ")}
      </p>
      {node.childIds.length ? (
        <button
          className="mt-4 h-10 w-full border border-[#111111] bg-[#111111] px-3 text-[13px] font-semibold text-white"
          onClick={onOpen}
          type="button"
        >
          내부 그래프 열기
        </button>
      ) : null}
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

function buildFlow({
  activeLayerId,
  model,
  nodeById,
  query,
  rootNode,
  showLabels,
}: {
  activeLayerId: string;
  model: HierarchyModel;
  nodeById: Map<string, HierarchyNode>;
  query: string;
  rootNode: HierarchyNode | null;
  showLabels: boolean;
}) {
  const normalizedQuery = query.trim().toLowerCase();
  const activeNodes = getActiveNodes(model, nodeById, activeLayerId, rootNode)
    .filter((node) => matchesQuery(node, nodeById, normalizedQuery));
  const activeIdSet = new Set(activeNodes.map((node) => node.id));
  const childNodesByParent = new Map<string, HierarchyNode[]>();

  for (const node of activeNodes) {
    const children = node.childIds
      .map((id) => nodeById.get(id))
      .filter((child): child is HierarchyNode => Boolean(child))
      .filter((child) => !normalizedQuery || matchesQuery(child, nodeById, normalizedQuery));
    childNodesByParent.set(node.id, children);
  }

  const flowNodes: ClusterFlowNode[] = [];
  const hierarchyEdges: Edge[] = [];
  const renderIdsByOriginalId = new Map<string, string[]>();
  const occurrenceSeenByOriginalId = new Map<string, number>();
  const visibleIds = new Set<string>();
  const columns = Math.max(1, Math.min(4, Math.ceil(Math.sqrt(activeNodes.length || 1))));
  const rowHeights: number[] = [];
  const groupLayouts = activeNodes.map((node) => {
    const children = childNodesByParent.get(node.id) ?? [];
    const childColumns = Math.max(1, Math.min(3, Math.ceil(Math.sqrt(children.length || 1))));
    const childRows = Math.ceil(children.length / childColumns);
    const width = children.length ? Math.max(300, childColumns * 136 + 40) : 220;
    const parentHeight = children.length ? 92 : 74;
    const height = children.length ? Math.max(168, parentHeight + 24 + childRows * 66) : 116;
    return { childColumns, children, height, node, parentHeight, width };
  });

  for (let index = 0; index < groupLayouts.length; index += 1) {
    const row = Math.floor(index / columns);
    rowHeights[row] = Math.max(rowHeights[row] ?? 0, groupLayouts[index].height);
  }

  const rowTops = rowHeights.reduce<number[]>((tops, height, index) => {
    tops[index] = index === 0 ? 80 : tops[index - 1] + rowHeights[index - 1] + 90;
    return tops;
  }, []);

  for (let index = 0; index < groupLayouts.length; index += 1) {
    const layout = groupLayouts[index];
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = 80 + column * 420;
    const y = rowTops[row] ?? 80;
    const parentRenderId = flowRenderId(layout.node.id, occurrenceSeenByOriginalId);
    addToMultiMap(renderIdsByOriginalId, layout.node.id, parentRenderId);
    flowNodes.push(toFlowNode(layout.node, {
      height: layout.parentHeight,
      isParent: true,
      position: { x, y },
      renderId: parentRenderId,
      showLabels,
      width: layout.width,
    }));
    visibleIds.add(layout.node.id);

    layout.children.forEach((child, childIndex) => {
      const childColumn = childIndex % layout.childColumns;
      const childRow = Math.floor(childIndex / layout.childColumns);
      const childRenderId = flowRenderId(child.id, occurrenceSeenByOriginalId);
      addToMultiMap(renderIdsByOriginalId, child.id, childRenderId);
      flowNodes.push(toFlowNode(child, {
        height: 52,
        isParent: false,
        position: {
          x: x + 18 + childColumn * 136,
          y: y + layout.parentHeight + 24 + childRow * 66,
        },
        renderId: childRenderId,
        showLabels,
        width: 124,
      }));
      hierarchyEdges.push({
        animated: false,
        id: `${parentRenderId}->${childRenderId}:contains`,
        source: parentRenderId,
        style: {
          opacity: 0.22,
          stroke: "#6f756e",
          strokeDasharray: "4 4",
          strokeWidth: 1,
        },
        target: childRenderId,
        type: "smoothstep",
      });
      visibleIds.add(child.id);
    });
  }

  const flowEdges = buildVisibleEdges(model, visibleIds, activeIdSet, renderIdsByOriginalId);
  return {
    edges: [...hierarchyEdges, ...flowEdges],
    nodes: flowNodes,
    visibleParentCount: activeNodes.length,
  };
}

function getActiveNodes(
  model: HierarchyModel,
  nodeById: Map<string, HierarchyNode>,
  activeLayerId: string,
  rootNode: HierarchyNode | null,
) {
  if (rootNode) {
    return rootNode.childIds
      .map((id) => nodeById.get(id))
      .filter((node): node is HierarchyNode => Boolean(node));
  }
  return model.layers[activeLayerId] ?? [];
}

function flowRenderId(originalId: string, occurrenceSeenByOriginalId: Map<string, number>) {
  const next = (occurrenceSeenByOriginalId.get(originalId) ?? 0) + 1;
  occurrenceSeenByOriginalId.set(originalId, next);
  return next === 1 ? originalId : `${originalId}::${next}`;
}

function addToMultiMap(map: Map<string, string[]>, key: string, value: string) {
  const values = map.get(key);
  if (values) {
    values.push(value);
  } else {
    map.set(key, [value]);
  }
}

function toFlowNode(
  node: HierarchyNode,
  options: {
    height: number;
    isParent: boolean;
    parentId?: string;
    position: { x: number; y: number };
    renderId: string;
    showLabels: boolean;
    width: number;
  },
): ClusterFlowNode {
  return {
    data: {
      childCount: node.childIds.length,
      isParent: options.isParent,
      keywords: node.representativeKeywords ?? [],
      label: options.showLabels ? shorten(node.label, options.isParent ? 58 : 38) : "",
      layerId: node.level,
      leafCount: node.leafCount,
      organizationNames: node.organizationNames,
      originalId: node.id,
      sentences: node.representativeSentences,
      timeRange: formatDateRange(node),
    },
    extent: options.parentId ? "parent" : undefined,
    id: options.renderId,
    parentId: options.parentId,
    position: options.position,
    style: {
      height: options.height,
      width: options.width,
    },
    type: "cluster",
  };
}

function buildVisibleEdges(
  model: HierarchyModel,
  visibleIds: Set<string>,
  activeIdSet: Set<string>,
  renderIdsByOriginalId: Map<string, string[]>,
): Edge[] {
  const seen = new Set<string>();
  const edges: Edge[] = [];

  for (const edge of model.proximityEdges) {
    if (!visibleIds.has(edge.source) || !visibleIds.has(edge.target)) continue;
    const sourceRenderId = renderIdsByOriginalId.get(edge.source)?.[0];
    const targetRenderId = renderIdsByOriginalId.get(edge.target)?.[0];
    if (!sourceRenderId || !targetRenderId) continue;
    const isActiveLevel = activeIdSet.has(edge.source) && activeIdSet.has(edge.target);
    const id = `${sourceRenderId}->${targetRenderId}`;
    if (seen.has(id)) continue;
    seen.add(id);
    edges.push({
      animated: false,
      data: edge,
      id,
      source: sourceRenderId,
      style: {
        opacity: isActiveLevel ? 0.42 : 0.25,
        stroke: isActiveLevel ? "#111111" : "#6f756e",
        strokeWidth: isActiveLevel ? 1.8 : 1,
      },
      target: targetRenderId,
      type: "smoothstep",
    });
  }

  return edges;
}

function matchesQuery(
  node: HierarchyNode,
  nodeById: Map<string, HierarchyNode>,
  query: string,
): boolean {
  if (!query) return true;
  const ownText = [
    node.label,
    node.representativeKeywords?.join(" ") ?? "",
    node.organizationNames.join(" "),
    node.representativeSentences.join(" "),
    node.sourceKeys.join(" "),
  ].join(" ").toLowerCase();
  if (ownText.includes(query)) return true;
  return node.childIds.some((childId) => {
    const child = nodeById.get(childId);
    return child ? matchesQuery(child, nodeById, query) : false;
  });
}

function indexModel(model: HierarchyModel) {
  const layerIds = Object.keys(model.layers).sort(
    (left, right) => layerNumber(left) - layerNumber(right),
  );
  const nodeById = new Map<string, HierarchyNode>();
  for (const nodes of Object.values(model.layers)) {
    for (const node of nodes) nodeById.set(node.id, node);
  }
  return {
    layerIds,
    nodeById,
    topLayerId: layerIds.at(-1) ?? "L0",
  };
}

function colorForLayer(layerId: string) {
  return layerColor[layerNumber(layerId) % layerColor.length] ?? "#111111";
}

function layerNumber(layerId: string) {
  const match = layerId.match(/^L(\d+)/);
  return match ? Number.parseInt(match[1], 10) : 0;
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
