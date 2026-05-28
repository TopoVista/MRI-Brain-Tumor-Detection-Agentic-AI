import Image from "next/image";
import { CheckCircle2, CircleAlert, FileText, Microscope, ShieldAlert, Sparkles } from "lucide-react";

import { MarkdownReport } from "@/components/markdown-report";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { AgentTrace, AnalysisResponse, ModelVote } from "@/lib/types";
import { getStageLabel, resolveWorkflowMode } from "@/lib/workflow";

function predictionTone(prediction: AnalysisResponse["prediction"]) {
  if (prediction === "notumor") return "border-emerald-500/30 bg-emerald-950/35 text-emerald-200";
  if (prediction === "glioma" || prediction === "pituitary") return "border-rose-500/30 bg-rose-950/35 text-rose-200";
  return "border-amber-500/30 bg-amber-950/35 text-amber-200";
}

function verificationTone(verified: boolean) {
  return verified ? "border-emerald-500/30 bg-emerald-950/35 text-emerald-200" : "border-rose-500/30 bg-rose-950/35 text-rose-200";
}

function workflowModeTone(result: AnalysisResponse) {
  return result.workflow_mode === "extended_support"
    ? verificationTone(result.verified)
    : "border-sky-500/30 bg-sky-950/35 text-sky-200";
}

function workflowModeLabel(result: AnalysisResponse) {
  return result.workflow_mode === "extended_support" ? (result.verified ? "Verified" : "Review") : "Core mode";
}

function formatPrediction(prediction: AnalysisResponse["prediction"]) {
  if (prediction === "notumor") return "No tumor pattern";
  if (prediction === "pituitary") return "Pituitary tumor pattern";
  if (prediction === "meningioma") return "Meningioma pattern";
  return "Glioma pattern";
}

function confidenceNarrative(confidence: number) {
  if (confidence >= 0.8) return "The models are fairly aligned, so the system is more comfortable with this output.";
  if (confidence >= 0.6) return "This is a moderate-confidence result, so it can help triage but still needs clinician review.";
  return "This is a low-confidence result, which usually means the models disagreed or the image signals were weak.";
}

function triageNarrative(severityBand: AnalysisResponse["severity_band"]) {
  if (severityBand === "high") return "The system sees a stronger signal for urgent specialist review.";
  if (severityBand === "moderate") return "The scan should be reviewed soon, but the output is not by itself an emergency finding.";
  return "This reads as a lower-priority AI signal, but it still requires proper clinical interpretation.";
}

function reviewHeadline(result: AnalysisResponse) {
  if (result.prediction === "notumor") {
    return result.confidence >= 0.7
      ? "The system leans away from a tumor pattern, but this still is not a diagnosis."
      : "The system leans away from a tumor pattern, but uncertainty is high.";
  }

  return result.confidence >= 0.7
    ? `The system most strongly favors a ${result.tumor_profile.display_name.toLowerCase()} pattern.`
    : `The system tentatively favors a ${result.tumor_profile.display_name.toLowerCase()} pattern, but the evidence is mixed.`;
}

function strongestVote(votes: ModelVote[]) {
  return votes.reduce((best, vote) => (vote.confidence > best.confidence ? vote : best), votes[0]);
}

function normalizeVerifierNotes(notes: string[] | undefined, workflowMode: AnalysisResponse["workflow_mode"]) {
  const cleaned = (notes ?? []).map((note) => note.trim()).filter(Boolean);
  if (cleaned.length) return cleaned;
  return workflowMode === "paper_core"
    ? [
        "Core mode does not execute the optional verifier agent by default.",
        "This result comes directly from preprocessing, the four model agents, and orchestration.",
        "If you need safety review and literature grounding, use the extended support workflow.",
      ]
    : ["No verifier notes were returned for this run."];
}

function normalizeModelVotes(votes: ModelVote[] | undefined) {
  return (votes ?? []).filter(
    (vote) =>
      Boolean(vote?.agent?.trim()) &&
      Boolean(vote?.prediction?.trim()) &&
      typeof vote?.confidence === "number" &&
      Number.isFinite(vote.confidence)
  );
}

const EXPECTED_AGENT_ORDER = [
  { key: "cnn_agent", label: "CNN agent" },
  { key: "resnet50_agent", label: "ResNet-50 agent" },
  { key: "vgg16_agent", label: "VGG16 agent" },
  { key: "inception_v3_agent", label: "Inception V3 agent" },
] as const;

function buildDisplayedModelVotes(votes: ModelVote[]) {
  return EXPECTED_AGENT_ORDER.map((agent) => {
    const match = votes.find((vote) => vote.agent === agent.key);
    if (match) return match;
    return {
      agent: agent.key,
      prediction: "notumor" as const,
      confidence: 0,
      mode: "heuristic" as const,
      unavailable: true,
    };
  });
}

function fileNameFromPath(path: string | null | undefined) {
  if (!path) return "local only";
  const parts = path.split(/[\\/]/);
  return parts[parts.length - 1] || path;
}

function LoadingCard({
  previewUrl,
  activeAgent,
  liveTrace,
  liveModelVotes,
}: {
  previewUrl: string | null;
  activeAgent: string | null;
  liveTrace: AgentTrace[];
  liveModelVotes: ModelVote[];
}) {
  const workflowMode = resolveWorkflowMode(undefined, liveTrace);
  const totalStages = workflowMode === "extended_support" ? 11 : 7;
  const progressValue = Math.min((liveTrace.length / totalStages) * 100, 98);
  const currentStage = getStageLabel(activeAgent);

  return (
    <Card>
      <CardHeader className="border-b border-border">
        <CardTitle>Clinical note</CardTitle>
        <CardDescription>Live report assembly from workflow events.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          {previewUrl ? (
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-200/68">Uploaded image</p>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-sky-300">
                  <div className="h-2 w-2 rounded-[2px] bg-sky-300" />
                  Live run
                </div>
              </div>
              <div className="relative aspect-[21/10] overflow-hidden bg-slate-950">
                <Image src={previewUrl} alt="MRI preview during analysis" fill unoptimized className="object-cover" />
                <div className="scan-loader absolute inset-0" />
              </div>
            </div>
          ) : null}

          <div className="rounded-lg border border-border bg-secondary p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-sky-300" />
              <h3 className="font-semibold text-white">Workflow status</h3>
            </div>
            <p className="mt-4 text-2xl font-semibold text-white">{currentStage}</p>
            <Progress className="mt-4" value={progressValue} />
            <p className="mt-3 text-sm text-slate-400">{liveTrace.length} of {totalStages} stages confirmed.</p>
            {liveModelVotes.length ? (
              <div className="mt-5 grid gap-2">
                {liveModelVotes.map((vote) => (
                  <div key={vote.agent} className="flex items-center justify-between rounded-md border border-border bg-[rgba(12,22,35,0.82)] px-3 py-2 text-sm">
                    <span className="capitalize text-slate-300">{vote.agent.replaceAll("_", " ")}</span>
                    <span className="font-semibold text-white">{vote.prediction}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                <div className="skeleton h-4 w-full rounded-sm" />
                <div className="skeleton h-4 w-[90%] rounded-sm" />
                <div className="skeleton h-4 w-[76%] rounded-sm" />
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-secondary p-6">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-sky-300" />
            <h3 className="font-semibold text-white">Drafting markdown report</h3>
          </div>
          <div className="mt-4 space-y-3">
            <div className="skeleton h-4 w-36 rounded-sm" />
            <div className="skeleton h-12 w-full rounded-md" />
            <div className="skeleton h-4 w-40 rounded-sm" />
            <div className="skeleton h-12 w-full rounded-md" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ReportPanel({
  result,
  isUploading,
  previewUrl,
  activeAgent,
  liveTrace,
  liveModelVotes,
}: {
  result: AnalysisResponse | null;
  isUploading: boolean;
  previewUrl: string | null;
  activeAgent: string | null;
  liveTrace: AgentTrace[];
  liveModelVotes: ModelVote[];
}) {
  if (isUploading) {
    return <LoadingCard previewUrl={previewUrl} activeAgent={activeAgent} liveTrace={liveTrace} liveModelVotes={liveModelVotes} />;
  }

  if (!result) {
    return (
      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle>Clinical note</CardTitle>
          <CardDescription>Structured markdown report appears here after analysis.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 p-6 text-sm text-slate-300">
          <div className="rounded-lg border border-dashed border-border bg-[rgba(11,20,32,0.88)] p-6 leading-7">Awaiting MRI workflow output.</div>
        </CardContent>
      </Card>
    );
  }

  const verifierNotes = normalizeVerifierNotes(result.verification_notes, result.workflow_mode);
  const modelVotes = normalizeModelVotes(result.model_votes);
  const displayedModelVotes = buildDisplayedModelVotes(modelVotes);
  const strongestModel = modelVotes.length ? strongestVote(modelVotes) : null;

  return (
    <Card>
      <CardHeader className="border-b border-border">
        <div className="flex flex-wrap items-center gap-3">
          <CardTitle>Case {result.case_id.slice(0, 8)}</CardTitle>
          <span className={`rounded-md border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] ${predictionTone(result.prediction)}`}>
            {result.prediction.replace("-", " ")}
          </span>
          <span className={`rounded-md border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] ${workflowModeTone(result)}`}>
            {workflowModeLabel(result)}
          </span>
        </div>
        <CardDescription>Confidence-calibrated support summary.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 p-6">
        <div className="rounded-lg border border-border bg-secondary p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200/68">What this means</p>
          <h3 className="mt-3 text-xl font-semibold text-white sm:text-2xl">{reviewHeadline(result)}</h3>
          <p className="mt-3 max-w-4xl text-sm leading-6.5 text-slate-300">
            {confidenceNarrative(result.confidence)} {triageNarrative(result.severity_band)}
          </p>
          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            <div className="rounded-md border border-border bg-card px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200/68">AI impression</p>
              <p className="mt-2 text-base font-semibold text-white">{formatPrediction(result.prediction)}</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">This is the main pattern the ensemble currently favors.</p>
            </div>
            <div className="rounded-md border border-border bg-card px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200/68">Confidence guide</p>
              <p className="mt-2 text-base font-semibold text-white">{Math.round(result.confidence * 100)}% confidence</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">Lower values mean the models are less aligned and the AI signal is weaker.</p>
            </div>
            <div className="rounded-md border border-border bg-card px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200/68">Best next step</p>
              <p className="mt-2 text-base font-semibold text-white">{result.recommended_actions[0] ?? "Radiologist review recommended."}</p>
            </div>
          </div>
          <p className="mt-4 text-xs uppercase tracking-[0.18em] text-slate-400">
            {result.workflow_mode === "extended_support"
              ? "Extended support mode adds retrieval, report generation, verification, and memory after the core classifier path."
              : "Core mode runs preprocessing, the four model agents, and orchestration. Extra support agents are optional."}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-border bg-card px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-200/68">Confidence</p>
            <p className="mt-3 text-4xl font-semibold text-white">{Math.round(result.confidence * 100)}%</p>
            <Progress className="mt-4" value={result.confidence * 100} />
          </div>
          <div className="rounded-lg border border-border bg-card px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-200/68">Triage band</p>
            <p className="mt-3 text-3xl font-semibold capitalize text-white">{result.severity_band}</p>
            <p className="mt-3 text-sm leading-6 text-slate-400">Triage-oriented signal.</p>
          </div>
          <div className="rounded-lg border border-border bg-card px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-200/68">Image storage</p>
            <p className="mt-3 text-sm font-medium leading-6 text-white">{fileNameFromPath(result.image_url)}</p>
            <details className="mt-3 rounded-md border border-border bg-[rgba(9,17,28,0.88)] px-3 py-2">
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">Show full path</summary>
              <p className="mt-3 break-all text-sm leading-6 text-slate-300">{result.image_url ?? "local only"}</p>
            </details>
          </div>
        </div>

        <Separator className="bg-border" />

        <div className="rounded-lg border border-border bg-secondary p-5">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-sky-300" />
            <h3 className="font-semibold text-white">Generated report</h3>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            The first sections are kept readable for quick review. Expand any section to see the more technical reasoning behind it.
          </p>
          <div className="mt-5 rounded-lg border border-border bg-card p-5">
            <MarkdownReport content={result.report} />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-4.5">
            <div className="flex items-center gap-2">
              <Microscope className="h-4 w-4 text-sky-300" />
              <h3 className="font-semibold text-white">Findings</h3>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-400">Short machine-derived observations that support the result.</p>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
              {result.findings.map((finding) => (
                <li key={finding} className="rounded-md border border-border bg-secondary px-4 py-3">
                  {finding}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-border bg-card p-4.5">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-sky-300" />
              <h3 className="font-semibold text-white">Verifier notes</h3>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-400">Safety checks that explain whether the final note is trustworthy enough to surface as support output.</p>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
              {verifierNotes.map((note) => (
                <li key={note} className="flex items-start gap-3 rounded-md border border-border bg-secondary px-4 py-3">
                  {result.verified ? (
                    <CheckCircle2 className="mt-1 h-4 w-4 text-emerald-300" />
                  ) : (
                    <CircleAlert className="mt-1 h-4 w-4 text-amber-300" />
                  )}
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
          <div className="rounded-lg border border-border bg-card p-4.5">
            <div className="flex items-center gap-2">
              <Microscope className="h-4 w-4 text-sky-300" />
              <h3 className="font-semibold text-white">Tumor classification</h3>
            </div>
            <div className="mt-4 space-y-3">
              {result.class_probabilities.map((item) => (
                <div key={item.label} className="rounded-md border border-border bg-secondary px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{item.display_name}</p>
                      <p className="text-sm text-slate-400 capitalize">{item.label}</p>
                    </div>
                    <p className="text-sm font-semibold text-white">{Math.round(item.probability * 100)}%</p>
                  </div>
                  <Progress className="mt-3" value={item.probability * 100} />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-4.5">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-sky-300" />
              <h3 className="font-semibold text-white">Consensus and next actions</h3>
            </div>
            <div className="mt-4 rounded-md border border-border bg-secondary px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200/68">Consensus strength</p>
              <p className="mt-2 text-lg font-semibold capitalize text-white">{result.consensus_summary.strength}</p>
              <p className="mt-1 text-sm text-slate-400">
                Margin vs runner-up class: {Math.round(result.consensus_summary.margin * 100)}%
              </p>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {result.differential_diagnosis.map((item, index) => (
                <div key={item.label} className="rounded-md border border-border bg-secondary px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200/68">Rank {index + 1}</p>
                  <p className="mt-2 font-semibold text-white">{item.display_name}</p>
                  <p className="mt-1 text-sm text-slate-300">{Math.round(item.probability * 100)}%</p>
                </div>
              ))}
            </div>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
              {result.recommended_actions.map((action) => (
                <li key={action} className="rounded-md border border-border bg-secondary px-4 py-3">
                  {action}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4.5">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-sky-300" />
            <h3 className="font-semibold text-white">Tumor profile</h3>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="rounded-md border border-border bg-secondary px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200/68">Predicted class</p>
              <p className="mt-2 text-xl font-semibold text-white">{result.tumor_profile.display_name}</p>
              <p className="mt-2 text-sm text-slate-400">{result.tumor_profile.category}</p>
              <p className="mt-4 text-sm leading-7 text-slate-300">{result.tumor_profile.summary}</p>
            </div>
            <div className="rounded-md border border-border bg-secondary px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200/68">Clinical considerations</p>
              <ul className="mt-3 space-y-3 text-sm leading-6 text-slate-300">
                {result.tumor_profile.common_considerations.map((item) => (
                  <li key={item} className="rounded-md border border-border bg-card px-4 py-3">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4.5">
          <div className="flex items-center gap-2">
            <Microscope className="h-4 w-4 text-sky-300" />
            <h3 className="font-semibold text-white">Algorithm agents</h3>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            These are the four models behind the ensemble. {strongestModel ? `The strongest single vote came from ${strongestModel.agent.replaceAll("_", " ")} at ${Math.round(strongestModel.confidence * 100)}%.` : "Live per-model vote data was not returned, so the cards below show the expected agent lineup."}
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {displayedModelVotes.map((vote) => {
              const isUnavailable = "unavailable" in vote;
              return (
                <div key={vote.agent} className="rounded-md border border-border bg-secondary px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200/68">{vote.agent.replaceAll("_", " ")}</p>
                  <p className="mt-2 text-lg font-semibold capitalize text-white">
                    {isUnavailable ? "Unavailable" : vote.prediction.replace("-", " ")}
                  </p>
                  <p className="mt-1 text-sm text-slate-300">
                    {isUnavailable ? "No returned vote for this result" : `${Math.round(vote.confidence * 100)}% confidence`}
                  </p>
                  <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-sky-300">
                    {isUnavailable ? "expected agent" : vote.mode}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
