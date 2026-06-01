"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AgentTrace, AnalysisResponse } from "@/lib/types";
import { cn } from "@/lib/utils";
import { getWorkflowNodes, resolveWorkflowMode, WorkflowNode, WorkflowRunMode, workflowRunModeToWorkflowMode } from "@/lib/workflow";

function traceStatus(traces: AgentTrace[], id: string) {
  const entry = traces.find((trace) => trace.agent === id);
  if (!entry) return "idle" as const;
  if (entry.status === "completed") return "complete" as const;
  if (entry.status === "warning") return "warning" as const;
  return "fallback" as const;
}

function nodeTone(status: ReturnType<typeof traceStatus>, activeAgent: string | null, id: string) {
  if (activeAgent === id) {
    return "border-[var(--color-primary)] bg-[rgba(74,138,193,0.18)] text-white shadow-[0_10px_24px_-22px_rgba(74,138,193,0.55)]";
  }
  if (status === "complete") {
    return "border-[#49d5d3]/40 bg-[rgba(15,54,57,0.72)] text-white";
  }
  if (status === "warning") {
    return "border-amber-500/35 bg-[rgba(68,50,22,0.72)] text-white";
  }
  if (status === "fallback") {
    return "border-[#3b5871] bg-secondary text-slate-100";
  }
  return "border-border bg-secondary text-slate-100";
}

function currentStageLabel(nodes: WorkflowNode[], activeAgent: string | null, isUploading: boolean) {
  if (activeAgent) return nodes.find((node) => node.id === activeAgent)?.label ?? "Workflow running";
  if (isUploading) return "Workflow running";
  return "No active run";
}

function buildRows(nodes: WorkflowNode[], perRow = 4) {
  const rows: WorkflowNode[][] = [];
  for (let index = 0; index < nodes.length; index += perRow) {
    rows.push(nodes.slice(index, index + perRow));
  }
  return rows;
}

function buildSequenceIndex(nodes: WorkflowNode[]) {
  return new Map(nodes.map((node, index) => [node.id, index + 1]));
}

function NodeCard({
  node,
  traces,
  activeAgent,
  stepNumber,
}: {
  node: WorkflowNode;
  traces: AgentTrace[];
  activeAgent: string | null;
  stepNumber: number;
}) {
  const status = traceStatus(traces, node.id);
  const isActive = activeAgent === node.id;

  return (
    <div
      className={cn(
        "flex min-h-[116px] flex-col justify-center rounded-md border px-4 py-3 transition-all duration-300",
        nodeTone(status, activeAgent, node.id),
        isActive && "workflow-node-active"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-200/68">Step {stepNumber}</span>
        <span
          className={cn(
            "inline-flex h-2.5 w-2.5 rounded-full",
            isActive ? "bg-sky-300" : status === "complete" ? "bg-[#49d5d3]" : status === "warning" ? "bg-amber-300" : "bg-slate-500"
          )}
        />
      </div>
      <p className="text-lg font-semibold">{node.label}</p>
      <p className={cn("mt-2 text-sm leading-6", isActive ? "text-white/90" : "text-slate-300")}>{node.detail}</p>
    </div>
  );
}

function Connector({ active = false }: { active?: boolean }) {
  return (
    <div className="hidden items-center gap-2 md:flex">
      <div className={cn("h-1 flex-1 rounded-full", active ? "bg-[var(--color-primary)] workflow-connector-active" : "bg-slate-600")} />
      <div
        className={cn(
          "h-0 w-0 border-y-[6px] border-y-transparent border-l-[10px]",
          active ? "border-l-[var(--color-primary)]" : "border-l-slate-600"
        )}
      />
    </div>
  );
}

function WorkflowStatusStrip({
  traces,
  activeAgent,
  isUploading,
  totalNodes,
  nodes,
}: {
  traces: AgentTrace[];
  activeAgent: string | null;
  isUploading: boolean;
  totalNodes: number;
  nodes: WorkflowNode[];
}) {
  const completed = traces.filter((trace) => trace.status === "completed").length;
  const warnings = traces.filter((trace) => trace.status === "warning").length;

  return (
    <div className="grid gap-3 md:grid-cols-3">
      <div className="rounded-md border border-border bg-secondary px-4 py-3.5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-200/68">Current stage</p>
        <p className="mt-2 text-lg font-semibold text-white">{currentStageLabel(nodes, activeAgent, isUploading)}</p>
      </div>
      <div className="rounded-md border border-border bg-secondary px-4 py-3.5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-200/68">Completed stages</p>
        <p className="mt-2 text-lg font-semibold text-white">{completed} / {totalNodes}</p>
      </div>
      <div className="rounded-md border border-border bg-secondary px-4 py-3.5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-200/68">Warnings</p>
        <p className="mt-2 text-lg font-semibold text-white">{warnings}</p>
      </div>
    </div>
  );
}

function rowConnectorLabel(index: number, total: number) {
  if (index >= total - 1) return null;
  return "Next step group";
}

export function WorkflowGraph({
  result,
  isUploading,
  activeAgent,
  liveTrace,
  requestedMode,
}: {
  result: AnalysisResponse | null;
  isUploading: boolean;
  activeAgent: string | null;
  liveTrace: AgentTrace[];
  requestedMode: WorkflowRunMode;
}) {
  const traces = result?.agent_trace?.length ? result.agent_trace : liveTrace;
  const workflowMode = resolveWorkflowMode(result?.workflow_mode ?? workflowRunModeToWorkflowMode(requestedMode), traces);
  const nodes = getWorkflowNodes(workflowMode, traces);
  const rows = buildRows(nodes);
  const sequenceIndex = buildSequenceIndex(nodes);

  return (
    <Card>
      <CardHeader className="border-b border-border">
        <CardTitle>Workflow steps</CardTitle>
        <CardDescription>
          {workflowMode === "extended_support"
            ? "This mode adds source lookup, report writing, checks, and case saving after the main model path."
            : "This mode runs upload, image prep, the four model votes, and the final combination step."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        <WorkflowStatusStrip traces={traces} activeAgent={activeAgent} isUploading={isUploading} totalNodes={nodes.length} nodes={nodes} />

        <div className="rounded-md border border-border bg-secondary p-4 lg:p-5">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-200/68">
              {workflowMode === "extended_support" ? "Full workflow" : "Core workflow"}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              The path below shows the order the app follows. Extra steps only appear in the full workflow.
            </p>
          </div>

          <div className="space-y-5 rounded-md border border-border bg-background/35 p-5">
            {rows.map((row, rowIndex) => (
              <div key={rowIndex} className="space-y-4">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  <span>Step group {rowIndex + 1}</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <div className={cn("grid gap-3", row.length === 4 ? "xl:grid-cols-[repeat(4,minmax(0,1fr))]" : "xl:grid-cols-[repeat(3,minmax(0,1fr))]", "md:grid-cols-[repeat(2,minmax(0,1fr))]")}>
                  {row.map((node, nodeIndex) => {
                    const nextNode = row[nodeIndex + 1];
                    const isActive = activeAgent === node.id || activeAgent === nextNode?.id;
                    return (
                      <div key={node.id} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_56px] md:items-center">
                        <NodeCard node={node} traces={traces} activeAgent={activeAgent} stepNumber={sequenceIndex.get(node.id) ?? 0} />
                        {nextNode ? <Connector active={isActive} /> : <div className="hidden md:block" />}
                      </div>
                    );
                  })}
                </div>
                {rowConnectorLabel(rowIndex, rows.length) ? (
                  <div className="flex items-center gap-3 rounded-md border border-dashed border-border bg-card px-4 py-3 text-sm text-slate-300">
                    <div className="h-8 w-px bg-border" />
                    <span>{rowConnectorLabel(rowIndex, rows.length)}</span>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
