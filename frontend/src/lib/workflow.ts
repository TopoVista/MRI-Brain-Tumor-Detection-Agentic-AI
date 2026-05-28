import { AgentTrace } from "@/lib/types";

export type WorkflowMode = "paper_core" | "extended_support";

export type WorkflowNodeId =
  | "storage"
  | "preprocessing_agent"
  | "cnn_agent"
  | "resnet50_agent"
  | "vgg16_agent"
  | "inception_v3_agent"
  | "orchestration_agent"
  | "retrieval_agent"
  | "report_agent"
  | "verification_agent"
  | "memory";

export type WorkflowNode = {
  id: WorkflowNodeId;
  label: string;
  detail: string;
};

export const WORKFLOW_NODES: Record<WorkflowNodeId, WorkflowNode> = {
  storage: { id: "storage", label: "Upload", detail: "MRI intake" },
  preprocessing_agent: { id: "preprocessing_agent", label: "Preprocess", detail: "Normalize and filter" },
  cnn_agent: { id: "cnn_agent", label: "CNN", detail: "Baseline model" },
  resnet50_agent: { id: "resnet50_agent", label: "ResNet-50", detail: "Transfer agent" },
  vgg16_agent: { id: "vgg16_agent", label: "VGG16", detail: "Transfer agent" },
  inception_v3_agent: { id: "inception_v3_agent", label: "Inception V3", detail: "Transfer agent" },
  orchestration_agent: { id: "orchestration_agent", label: "Orchestrator", detail: "Ensemble decision" },
  retrieval_agent: { id: "retrieval_agent", label: "Retrieval", detail: "Literature grounding" },
  report_agent: { id: "report_agent", label: "Report", detail: "Clinical markdown note" },
  verification_agent: { id: "verification_agent", label: "Verifier", detail: "Safety and consistency" },
  memory: { id: "memory", label: "Memory", detail: "Persist case" },
};

export const PAPER_CORE_WORKFLOW: WorkflowNodeId[] = [
  "storage",
  "preprocessing_agent",
  "cnn_agent",
  "resnet50_agent",
  "vgg16_agent",
  "inception_v3_agent",
  "orchestration_agent",
];

export const EXTENDED_WORKFLOW: WorkflowNodeId[] = [
  ...PAPER_CORE_WORKFLOW,
  "retrieval_agent",
  "report_agent",
  "verification_agent",
  "memory",
];

const EXTENDED_ONLY_AGENTS = new Set<WorkflowNodeId>(["retrieval_agent", "report_agent", "verification_agent", "memory"]);

export function getStageLabel(agent: string | null) {
  if (!agent) return "Preparing workflow";
  return WORKFLOW_NODES[agent as WorkflowNodeId]?.label ?? "Processing workflow";
}

export function resolveWorkflowMode(mode?: WorkflowMode | null, traces: AgentTrace[] = []): WorkflowMode {
  if (mode === "extended_support") return mode;
  return traces.some((trace) => EXTENDED_ONLY_AGENTS.has(trace.agent as WorkflowNodeId)) ? "extended_support" : "paper_core";
}

export function getWorkflowNodes(mode?: WorkflowMode | null, traces: AgentTrace[] = []) {
  const resolvedMode = resolveWorkflowMode(mode, traces);
  const ids = resolvedMode === "extended_support" ? EXTENDED_WORKFLOW : PAPER_CORE_WORKFLOW;
  return ids.map((id) => WORKFLOW_NODES[id]);
}
