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
  storage: { id: "storage", label: "Upload", detail: "Image upload" },
  preprocessing_agent: { id: "preprocessing_agent", label: "Prepare", detail: "Resize and clean the image" },
  cnn_agent: { id: "cnn_agent", label: "CNN", detail: "First model" },
  resnet50_agent: { id: "resnet50_agent", label: "ResNet-50", detail: "Second model" },
  vgg16_agent: { id: "vgg16_agent", label: "VGG16", detail: "Third model" },
  inception_v3_agent: { id: "inception_v3_agent", label: "Inception V3", detail: "Fourth model" },
  orchestration_agent: { id: "orchestration_agent", label: "Combine", detail: "Merge model votes" },
  retrieval_agent: { id: "retrieval_agent", label: "Sources", detail: "Find supporting sources" },
  report_agent: { id: "report_agent", label: "Summary", detail: "Write the result text" },
  verification_agent: { id: "verification_agent", label: "Checks", detail: "Check the result" },
  memory: { id: "memory", label: "Save", detail: "Store case details" },
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
  if (!agent) return "Starting";
  return WORKFLOW_NODES[agent as WorkflowNodeId]?.label ?? "Working";
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
