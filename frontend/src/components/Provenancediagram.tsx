"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import ReactFlow, {
  Handle,
  MarkerType,
  Position,
  ReactFlowProvider,
  useNodesInitialized,
  type Edge,
  type Node,
  type NodeProps,
  type ReactFlowInstance,
} from "reactflow";

import "reactflow/dist/style.css";

type ConfidenceDimensions = {
  source_quality: number;
  retrieval_coverage: number;
  internal_consistency: number;
  temporal_freshness: number;
  domain_confidence: number;
};

export type ProvenanceDiagramProps = {
  query: string;
  sources_retrieved: number;
  dimensions: ConfidenceDimensions;
  status: "PASS" | "FAILURE";
  contradictions: string[];
  receipt_id: string;
};

type ProvenanceNodeData = {
  label: string;
  subtitle?: string;
  backgroundColor: string;
  textColor: string;
};

const GRAY_EDGE = "#9CA3AF";
const RED_EDGE = "#8B1A1A";

function truncate(text: string, max = 40): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function ProvenanceNode({
  data,
  showBranchHandles = false,
}: NodeProps<ProvenanceNodeData> & { showBranchHandles?: boolean }) {
  const handleStyle = {
    opacity: 0,
    width: 1,
    height: 1,
    minWidth: 1,
    minHeight: 1,
  };

  return (
    <div
      className="w-[220px] rounded-none px-4 py-3"
      style={{
        backgroundColor: data.backgroundColor,
        color: data.textColor,
        fontFamily: "var(--font-ui)",
      }}
    >
      <Handle
        id="left"
        type="target"
        position={Position.Left}
        style={handleStyle}
      />
      {showBranchHandles && (
        <Handle
          id="top"
          type="target"
          position={Position.Top}
          style={handleStyle}
        />
      )}
      <p className="text-base font-semibold leading-tight">{data.label}</p>
      {data.subtitle && (
        <p className="mt-1.5 text-sm leading-snug opacity-90">{data.subtitle}</p>
      )}
      <Handle
        id="right"
        type="source"
        position={Position.Right}
        style={handleStyle}
      />
      {showBranchHandles && (
        <Handle
          id="bottom"
          type="source"
          position={Position.Bottom}
          style={handleStyle}
        />
      )}
    </div>
  );
}

function MainFlowNode(props: NodeProps<ProvenanceNodeData>) {
  const showBranchHandles = props.id === "confidence";
  return <ProvenanceNode {...props} showBranchHandles={showBranchHandles} />;
}

function BranchNode(props: NodeProps<ProvenanceNodeData>) {
  return <ProvenanceNode {...props} showBranchHandles />;
}

const nodeTypes = {
  mainFlowNode: MainFlowNode,
  branchNode: BranchNode,
};

const LAYOUT_MARGIN = 32;
const MAIN_Y = 32;
const BRANCH_Y = 240;
const NODE_WIDTH = 220;
const MAIN_SPACING = NODE_WIDTH + 100;
const BRANCH_SPACING = NODE_WIDTH + 60;
const FIT_VIEW_OPTIONS = { padding: 0.15, minZoom: 0.2, maxZoom: 1 };

function computeLayout(contradictionCount: number) {
  const queryX = LAYOUT_MARGIN;
  const retrievalX = queryX + MAIN_SPACING;
  const confidenceX = retrievalX + MAIN_SPACING;
  const receiptX = confidenceX + MAIN_SPACING;
  const contradictionStartX =
    confidenceX - ((contradictionCount - 1) * BRANCH_SPACING) / 2;

  return {
    queryX,
    retrievalX,
    confidenceX,
    receiptX,
    contradictionStartX,
    branchSpacing: BRANCH_SPACING,
  };
}

function buildDiagramElements({
  query,
  sources_retrieved,
  status,
  contradictions,
}: ProvenanceDiagramProps): { nodes: Node<ProvenanceNodeData>[]; edges: Edge[] } {
  const layout = computeLayout(contradictions.length);

  const nodes: Node<ProvenanceNodeData>[] = [
    {
      id: "query",
      type: "mainFlowNode",
      position: { x: layout.queryX, y: MAIN_Y },
      className: "nopan nodrag",
      data: {
        label: "Query Submitted",
        subtitle: truncate(query),
        backgroundColor: "var(--navy)",
        textColor: "var(--white)",
      },
    },
    {
      id: "retrieval",
      type: "mainFlowNode",
      position: { x: layout.retrievalX, y: MAIN_Y },
      className: "nopan nodrag",
      data: {
        label: "Sources Retrieved",
        subtitle: `${sources_retrieved} sources found`,
        backgroundColor: "var(--accent)",
        textColor: "var(--white)",
      },
    },
    {
      id: "confidence",
      type: "mainFlowNode",
      position: { x: layout.confidenceX, y: MAIN_Y },
      className: "nopan nodrag",
      data: {
        label: "Confidence Assessment",
        subtitle: "5 dimensions scored",
        backgroundColor: "var(--light-blue)",
        textColor: "var(--stone)",
      },
    },
    {
      id: "receipt",
      type: "mainFlowNode",
      position: { x: layout.receiptX, y: MAIN_Y },
      className: "nopan nodrag",
      data: {
        label: status === "PASS" ? "PASS Receipt" : "FAILURE Receipt",
        backgroundColor: status === "PASS" ? "var(--green)" : "var(--red)",
        textColor: "var(--white)",
      },
    },
  ];

  contradictions.forEach((contradiction, index) => {
    nodes.push({
      id: `contradiction-${index}`,
      type: "branchNode",
      position: {
        x: layout.contradictionStartX + index * layout.branchSpacing,
        y: BRANCH_Y,
      },
      className: "nopan nodrag",
      data: {
        label: "Contradiction Detected",
        subtitle: truncate(contradiction, 55),
        backgroundColor: "var(--red)",
        textColor: "var(--white)",
      },
    });
  });

  const edges: Edge[] = [
    {
      id: "query-retrieval",
      source: "query",
      target: "retrieval",
      animated: true,
      style: { stroke: GRAY_EDGE },
      markerEnd: { type: MarkerType.ArrowClosed, color: GRAY_EDGE },
    },
    {
      id: "retrieval-confidence",
      source: "retrieval",
      target: "confidence",
      animated: true,
      style: { stroke: GRAY_EDGE },
      markerEnd: { type: MarkerType.ArrowClosed, color: GRAY_EDGE },
    },
    {
      id: "confidence-receipt",
      source: "confidence",
      target: "receipt",
      animated: true,
      style: { stroke: GRAY_EDGE },
      markerEnd: { type: MarkerType.ArrowClosed, color: GRAY_EDGE },
    },
  ];

  contradictions.forEach((_, index) => {
    edges.push({
      id: `confidence-contradiction-${index}`,
      source: "confidence",
      sourceHandle: "bottom",
      target: `contradiction-${index}`,
      targetHandle: "top",
      animated: true,
      style: { stroke: RED_EDGE },
      markerEnd: { type: MarkerType.ArrowClosed, color: RED_EDGE },
    });
  });

  return { nodes, edges };
}

function ProvenanceDiagramInner(props: ProvenanceDiagramProps) {
  const flowRef = useRef<ReactFlowInstance | null>(null);
  const nodesInitialized = useNodesInitialized();

  const { nodes, edges } = useMemo(
    () => buildDiagramElements(props),
    [
      props.query,
      props.sources_retrieved,
      props.status,
      props.contradictions,
      props.receipt_id,
    ],
  );

  const fitDiagram = useCallback(() => {
    flowRef.current?.fitView(FIT_VIEW_OPTIONS);
  }, []);

  const onInit = useCallback((instance: ReactFlowInstance) => {
    flowRef.current = instance;
  }, []);

  useEffect(() => {
    if (nodesInitialized) {
      fitDiagram();
    }
  }, [nodesInitialized, nodes, edges, fitDiagram]);

  const hasContradictions = props.contradictions.length > 0;

  return (
    <div
      className={`provenance-diagram w-full border ${hasContradictions ? "h-[480px]" : "h-[300px]"}`}
      style={{ borderColor: "var(--rule)", backgroundColor: "var(--mist)" }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        className="h-full w-full"
        style={{ backgroundColor: "var(--mist)" }}
        onInit={onInit}
        fitView
        fitViewOptions={FIT_VIEW_OPTIONS}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={false}
        panOnScroll={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        preventScrolling
        proOptions={{ hideAttribution: true }}
      />
    </div>
  );
}

export default function ProvenanceDiagram(props: ProvenanceDiagramProps) {
  return (
    <ReactFlowProvider>
      <ProvenanceDiagramInner {...props} />
    </ReactFlowProvider>
  );
}
