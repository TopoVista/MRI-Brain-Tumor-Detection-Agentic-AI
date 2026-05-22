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
  if (status === "completed") return "bg-emerald-50 text-emerald-700";
  if (status === "warning") return "bg-amber-50 text-amber-700";
  return "bg-sky-50 text-sky-700";
}

export function AgentTracePanel({ result, traces }: { result: AnalysisResponse | null; traces?: AgentTrace[] }) {
  const traceEntries = traces ?? result?.agent_trace ?? [];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Execution trace</CardTitle>
        <CardDescription>Compact audit trail of each stage.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {traceEntries.length ? (
          traceEntries.map((trace, index) => {
            const Icon = icons[trace.agent] ?? Cpu;
            return (
              <div key={`${trace.agent}-${index}`} className="flex gap-4 rounded-[1.4rem] border border-slate-200 bg-white p-4">
                <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-semibold capitalize text-slate-900">{trace.agent.replaceAll("_", " ")}</p>
                    <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] ${tone(trace.status)}`}>
                      {trace.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{trace.detail}</p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-[1.4rem] border border-dashed border-slate-200 bg-slate-50 p-6 text-sm leading-7 text-slate-600">
            Run an upload to inspect stage handoffs.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
