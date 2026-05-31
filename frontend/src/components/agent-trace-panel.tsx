import { BrainCircuit, Cpu, DatabaseZap, FileCheck2, GitBranch, ScanSearch, SearchCheck } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AgentTrace, AnalysisResponse } from "@/lib/types";

const icons: Record<string, typeof Cpu> = {
  storage: DatabaseZap,
  preprocessing_agent: ScanSearch,
  cnn_agent: BrainCircuit,
  resnet50_agent: BrainCircuit,
  vgg16_agent: BrainCircuit,
  inception_v3_agent: BrainCircuit,
  orchestration_agent: GitBranch,
  retrieval_agent: SearchCheck,
  report_agent: FileCheck2,
  verification_agent: SearchCheck,
  memory: DatabaseZap,
};

function tone(status: string) {
  if (status === "completed") return "border-emerald-500/30 bg-emerald-950/30 text-emerald-200";
  if (status === "warning") return "border-amber-500/30 bg-amber-950/30 text-amber-200";
  return "border-sky-500/30 bg-sky-950/25 text-sky-200";
}

export function AgentTracePanel({ result, traces }: { result: AnalysisResponse | null; traces?: AgentTrace[] }) {
  const traceEntries = traces ?? result?.agent_trace ?? [];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Workflow steps</CardTitle>
        <CardDescription>Each step the app ran.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {traceEntries.length ? (
          traceEntries.map((trace, index) => {
            const Icon = icons[trace.agent] ?? Cpu;
            return (
              <div key={`${trace.agent}-${index}`} className="flex gap-4 rounded-lg border border-border bg-secondary p-4">
                <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary/18 text-sky-200">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-semibold capitalize text-white">{trace.agent.replaceAll("_", " ")}</p>
                    <span className={`rounded-md border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] ${tone(trace.status)}`}>
                      {trace.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{trace.detail}</p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-secondary p-6 text-sm leading-7 text-slate-300">
            Run an upload to see the steps.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
