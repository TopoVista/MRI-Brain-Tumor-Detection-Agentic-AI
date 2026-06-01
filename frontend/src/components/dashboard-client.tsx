"use client";

import { useState } from "react";

import { Hero } from "@/components/hero";
import { ReportPanel } from "@/components/report-panel";
import { UploadPanel } from "@/components/upload-panel";
import { WorkflowGraph } from "@/components/workflow-graph";
import { AgentTrace, AnalysisResponse, ModelVote } from "@/lib/types";
import { WorkflowRunMode } from "@/lib/workflow";

export function DashboardClient() {
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [liveTrace, setLiveTrace] = useState<AgentTrace[]>([]);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [liveModelVotes, setLiveModelVotes] = useState<ModelVote[]>([]);
  const [workflowMode, setWorkflowMode] = useState<WorkflowRunMode>("core");

  function handleResult(next: AnalysisResponse) {
    setResult(next);
    setLiveTrace(next.agent_trace);
    setLiveModelVotes(next.model_votes);
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
    <main className="flex min-h-screen w-full max-w-none flex-col gap-5 px-[clamp(1rem,2.4vw,2.25rem)] py-5">
      <Hero result={result} isUploading={isUploading} />
      <section className="grid gap-5 xl:grid-cols-[minmax(360px,27vw)_minmax(0,1fr)] xl:items-start">
        <div className="grid gap-6 xl:sticky xl:top-6">
          <UploadPanel
          onResult={handleResult}
          onUploadingChange={setIsUploading}
          workflowMode={workflowMode}
          onWorkflowModeChange={setWorkflowMode}
          previewUrl={previewUrl}
          onPreviewChange={setPreviewUrl}
          onWorkflowReset={resetWorkflowState}
          onStageChange={setActiveAgent}
          onTraceUpdate={appendTrace}
            onModelVotesUpdate={setLiveModelVotes}
          />
        </div>

        <div className="grid gap-6">
          <WorkflowGraph
            result={result}
            isUploading={isUploading}
            activeAgent={activeAgent}
            liveTrace={liveTrace}
            requestedMode={workflowMode}
          />
        </div>
      </section>
      <ReportPanel
        result={result}
        isUploading={isUploading}
        previewUrl={previewUrl}
        activeAgent={activeAgent}
        liveTrace={liveTrace}
        liveModelVotes={liveModelVotes}
        requestedMode={workflowMode}
      />
    </main>
  );
}
