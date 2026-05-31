import { BrainCircuit, FileSearch, ShieldAlert } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AnalysisResponse } from "@/lib/types";

export function ReviewSummary({ result }: { result: AnalysisResponse | null }) {
  const topVote = result?.model_votes?.slice().sort((a, b) => b.confidence - a.confidence)[0] ?? null;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f7fafc)]">
        <CardTitle>Quick summary</CardTitle>
        <CardDescription>Short checks beside the report.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 p-5 lg:grid-cols-3">
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-slate-500">
            <BrainCircuit className="h-4 w-4 text-sky-700" />
            <span className="text-xs font-semibold uppercase tracking-[0.18em]">Model votes</span>
          </div>
          <p className="mt-3 text-lg font-semibold text-slate-900">
            {topVote ? `${topVote.agent.replaceAll("_", " ")} strongest` : "Waiting for votes"}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {topVote ? `${Math.round(topVote.confidence * 100)}% on ${topVote.prediction}.` : "Model confidence appears here after upload."}
          </p>
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-slate-500">
            <FileSearch className="h-4 w-4 text-sky-700" />
            <span className="text-xs font-semibold uppercase tracking-[0.18em]">Sources</span>
          </div>
          <p className="mt-3 text-lg font-semibold text-slate-900">{result ? `${result.citations.length} sources` : "Waiting for sources"}</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">Supporting sources stay next to the result.</p>
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-slate-500">
            <ShieldAlert className="h-4 w-4 text-sky-700" />
            <span className="text-xs font-semibold uppercase tracking-[0.18em]">Checks</span>
          </div>
          <p className="mt-3 text-lg font-semibold text-slate-900">{result ? (result.verified ? "Checked" : "Needs review") : "Waiting for checks"}</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">Basic checks stay visible before sign-off.</p>
        </div>
      </CardContent>
    </Card>
  );
}
