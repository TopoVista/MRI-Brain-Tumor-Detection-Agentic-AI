"use client";

import { useState } from "react";

import { AgentTracePanel } from "@/components/agent-trace-panel";
import { CitationsPanel } from "@/components/citations-panel";
import { Hero } from "@/components/hero";
import { OperationsPanel } from "@/components/operations-panel";
import { RecentCases } from "@/components/recent-cases";
import { ReportPanel } from "@/components/report-panel";
import { ReviewSummary } from "@/components/review-summary";
import { UploadPanel } from "@/components/upload-panel";
import { WorkflowGraph } from "@/components/workflow-graph";
import { AgentTrace, AnalysisResponse, AnalysisSummary, ModelVote } from "@/lib/types";

type DashboardClientProps = {
  initialCases: AnalysisSummary[];
};

export function DashboardClient({ initialCases }: DashboardClientProps) {
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [cases, setCases] = useState<AnalysisSummary[]>(initialCases);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [liveTrace, setLiveTrace] = useState<AgentTrace[]>([]);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [liveModelVotes, setLiveModelVotes] = useState<ModelVote[]>([]);

  function handleResult(next: AnalysisResponse) {
    setResult(next);
    setLiveTrace(next.agent_trace);
    setLiveModelVotes(next.model_votes);
    setCases((current) => [
      {
        case_id: next.case_id,
        prediction: next.prediction,
        confidence: next.confidence,
        created_at: new Date().toISOString(),
      },
      ...current,
    ]);
  }

  function resetWorkflowState() {
    setResult(null);
    setLiveTrace([]);
    setActiveAgent("storage");
    setLiveModelVotes([]);
  }

  function appendTrace(trace: AgentTrace) {
    setLiveTrace((current) => [...current, trace]);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
      <Hero />
      <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)] xl:items-start">
        <div className="grid gap-6 xl:sticky xl:top-6">
          <UploadPanel
            onResult={handleResult}
            onUploadingChange={setIsUploading}
            previewUrl={previewUrl}
            onPreviewChange={setPreviewUrl}
            onWorkflowReset={resetWorkflowState}
            onStageChange={setActiveAgent}
            onTraceUpdate={appendTrace}
            onModelVotesUpdate={setLiveModelVotes}
          />
          <OperationsPanel result={result} isUploading={isUploading} />
          <RecentCases cases={cases} />
        </div>

        <div className="grid gap-6">
          <WorkflowGraph result={result} isUploading={isUploading} activeAgent={activeAgent} liveTrace={liveTrace} />
          <ReviewSummary result={result} />
          <ReportPanel
            result={result}
            isUploading={isUploading}
            previewUrl={previewUrl}
            activeAgent={activeAgent}
            liveTrace={liveTrace}
            liveModelVotes={liveModelVotes}
          />
          <div className="grid gap-6 2xl:grid-cols-[1.02fr_0.98fr]">
            <CitationsPanel result={result} />
            <AgentTracePanel result={result} traces={liveTrace} />
          </div>
        </div>
      </section>
    </main>
  );
}
