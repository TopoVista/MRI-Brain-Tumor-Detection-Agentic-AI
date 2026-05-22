import {
  BrainCircuit,
  CheckCircle2,
  CircleDashed,
  FileSearch,
  GitBranch,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UploadCloud,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AgentTrace, AnalysisResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

const nodes = [
  { id: "storage", label: "Upload", sublabel: "MRI intake", icon: UploadCloud },
  { id: "preprocessing_agent", label: "Preprocess", sublabel: "Normalize + filters", icon: Sparkles },
  { id: "cnn_agent", label: "CNN", sublabel: "Paper model", icon: BrainCircuit },
  { id: "resnet50_agent", label: "ResNet-50", sublabel: "Transfer model", icon: BrainCircuit },
  { id: "vgg16_agent", label: "VGG16", sublabel: "Transfer model", icon: BrainCircuit },
  { id: "inception_v3_agent", label: "Inception V3", sublabel: "Transfer model", icon: BrainCircuit },
  { id: "orchestration_agent", label: "Orchestrator", sublabel: "Ensemble decision", icon: GitBranch },
  { id: "retrieval_agent", label: "Retrieval", sublabel: "Literature support", icon: FileSearch },
  { id: "report_agent", label: "Report", sublabel: "Clinical summary", icon: Stethoscope },
  { id: "verification_agent", label: "Verifier", sublabel: "Safety checks", icon: ShieldCheck },
  { id: "memory", label: "Memory", sublabel: "Persist case", icon: GitBranch },
];

function getTraceStatus(traces: AgentTrace[], id: string) {
  const trace = traces.find((entry) => entry.agent === id);
  if (!trace) return "idle";
  if (trace.status === "completed") return "complete";
  if (trace.status === "warning") return "warning";
  return "fallback";
}

function statusClasses(status: string) {
  if (status === "complete") return "border-teal-200 bg-teal-50 shadow-[0_18px_35px_-28px_rgba(12,130,137,0.65)]";
  if (status === "warning") return "border-amber-200 bg-amber-50";
  if (status === "fallback") return "border-sky-200 bg-sky-50";
  return "border-slate-200 bg-white";
}

export function WorkflowGraph({
  result,
  isUploading,
  activeAgent,
  liveTrace,
}: {
  result: AnalysisResponse | null;
  isUploading: boolean;
  activeAgent: string | null;
  liveTrace: AgentTrace[];
}) {
  const traces = result?.agent_trace?.length ? result.agent_trace : liveTrace;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-slate-100 bg-[linear-gradient(135deg,rgba(229,244,248,0.9),rgba(244,249,252,0.95))]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Workflow graph</CardTitle>
            <CardDescription>Live orchestration updates are streamed from the backend.</CardDescription>
          </div>
          <Badge variant="secondary">{isUploading ? "live run" : "11 nodes"}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        <div className="rounded-[1.5rem] border border-slate-200 bg-[radial-gradient(circle_at_top,_rgba(76,168,176,0.08),transparent_35%),linear-gradient(180deg,#ffffff,#f7fbfd)] p-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {nodes.map((node, index) => {
              const Icon = node.icon;
              const status = getTraceStatus(traces, node.id);
              const isActive = activeAgent === node.id;
              const isCompleted = status === "complete";
              const isReachable = index <= traces.length;

              return (
                <div
                  key={node.id}
                  className={cn(
                    "workflow-card relative overflow-hidden rounded-[1.35rem] border p-4 transition-all duration-500",
                    statusClasses(status),
                    isActive && "workflow-node-active",
                    !isReachable && !isActive && "opacity-70"
                  )}
                >
                  {isActive ? <div className="workflow-card-sweep absolute inset-0" /> : null}
                  <div className="relative flex items-center justify-between gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                    {isCompleted ? (
                      <CheckCircle2 className="h-5 w-5 text-teal-600" />
                    ) : isActive ? (
                      <CircleDashed className="h-5 w-5 animate-spin text-sky-700" />
                    ) : null}
                  </div>
                  <p className="relative mt-4 text-sm font-semibold text-slate-900">{node.label}</p>
                  <p className="relative mt-1 text-sm text-slate-500">{node.sublabel}</p>
                  <div className="relative mt-4 h-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        isCompleted && "w-full bg-teal-500",
                        isActive && "workflow-progress-live w-2/3 bg-sky-500",
                        status === "idle" && "w-0"
                      )}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-3xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Realtime flow</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">Stage cards advance as streamed workflow events arrive.</p>
          </div>
          <div className="rounded-3xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Dynamic report</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">Report generation starts only after retrieval and orchestration complete.</p>
          </div>
          <div className="rounded-3xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Safety</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">Verifier and memory stages remain visible in the run history.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
