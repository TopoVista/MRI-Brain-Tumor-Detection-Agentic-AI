import Image from "next/image";
import { CheckCircle2, CircleAlert, FileText, Microscope, ShieldAlert, Sparkles } from "lucide-react";

import { MarkdownReport } from "@/components/markdown-report";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { AgentTrace, AnalysisResponse, ModelVote } from "@/lib/types";

const STAGE_LABELS: Record<string, string> = {
  storage: "Storing scan",
  preprocessing_agent: "Normalizing image",
  cnn_agent: "Running CNN agent",
  resnet50_agent: "Running ResNet-50 agent",
  vgg16_agent: "Running VGG16 agent",
  inception_v3_agent: "Running Inception V3 agent",
  orchestration_agent: "Aggregating votes",
  retrieval_agent: "Retrieving literature",
  report_agent: "Formatting report",
  verification_agent: "Running safety checks",
  memory: "Saving case",
};

function predictionVariant(prediction: AnalysisResponse["prediction"]) {
  if (prediction === "notumor") return "success" as const;
  if (prediction === "glioma" || prediction === "pituitary") return "destructive" as const;
  return "secondary" as const;
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
  const totalStages = 11;
  const progressValue = Math.min((liveTrace.length / totalStages) * 100, 98);
  const currentStage = activeAgent ? STAGE_LABELS[activeAgent] ?? "Processing workflow" : "Preparing workflow";

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-slate-100 bg-[linear-gradient(180deg,#ffffff,#f7fbfd)]">
        <CardTitle>Clinical note</CardTitle>
        <CardDescription>Live report assembly from workflow events.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          {previewUrl ? (
            <div className="overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Uploaded image</p>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">
                  <div className="h-2 w-2 rounded-full bg-sky-600" />
                  Live run
                </div>
              </div>
              <div className="relative aspect-[21/10] overflow-hidden bg-slate-100">
                <Image src={previewUrl} alt="MRI preview during analysis" fill unoptimized className="object-cover" />
                <div className="scan-loader absolute inset-0" />
              </div>
            </div>
          ) : null}

          <div className="rounded-[1.5rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f7fbfd)] p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-sky-700" />
              <h3 className="font-semibold text-slate-900">Workflow status</h3>
            </div>
            <p className="mt-4 text-2xl font-semibold text-slate-900">{currentStage}</p>
            <Progress className="mt-4" value={progressValue} />
            <p className="mt-3 text-sm text-slate-500">{liveTrace.length} of {totalStages} stages confirmed.</p>
            {liveModelVotes.length ? (
              <div className="mt-5 grid gap-2">
                {liveModelVotes.map((vote) => (
                  <div key={vote.agent} className="flex items-center justify-between rounded-2xl bg-white px-3 py-2 text-sm">
                    <span className="capitalize text-slate-600">{vote.agent.replaceAll("_", " ")}</span>
                    <span className="font-semibold text-slate-900">{vote.prediction}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                <div className="skeleton h-4 w-full rounded-full" />
                <div className="skeleton h-4 w-[90%] rounded-full" />
                <div className="skeleton h-4 w-[76%] rounded-full" />
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-6">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-sky-700" />
            <h3 className="font-semibold text-slate-900">Drafting markdown report</h3>
          </div>
          <div className="mt-4 space-y-3">
            <div className="skeleton h-4 w-36 rounded-full" />
            <div className="skeleton h-12 w-full rounded-2xl" />
            <div className="skeleton h-4 w-40 rounded-full" />
            <div className="skeleton h-12 w-full rounded-2xl" />
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
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-[linear-gradient(180deg,#ffffff,#f7fbfd)]">
          <CardTitle>Clinical note</CardTitle>
          <CardDescription>Structured markdown report appears here after analysis.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 p-6 text-sm text-slate-600">
          <div className="rounded-[1.4rem] border border-dashed border-slate-200 bg-slate-50 p-6 leading-7">Awaiting MRI workflow output.</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-slate-100 bg-[linear-gradient(180deg,#ffffff,#f7fbfd)]">
        <div className="flex flex-wrap items-center gap-3">
          <CardTitle>Case {result.case_id.slice(0, 8)}</CardTitle>
          <Badge variant={predictionVariant(result.prediction)}>{result.prediction.replace("-", " ")}</Badge>
          <Badge variant={result.verified ? "success" : "destructive"}>{result.verified ? "verified" : "review"}</Badge>
        </div>
        <CardDescription>Confidence-calibrated support summary.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[1.4rem] border border-slate-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Confidence</p>
            <p className="mt-3 text-4xl font-semibold text-slate-900">{Math.round(result.confidence * 100)}%</p>
            <Progress className="mt-4" value={result.confidence * 100} />
          </div>
          <div className="rounded-[1.4rem] border border-slate-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Triage band</p>
            <p className="mt-3 text-3xl font-semibold capitalize text-slate-900">{result.severity_band}</p>
            <p className="mt-3 text-sm leading-6 text-slate-500">Triage-oriented signal.</p>
          </div>
          <div className="rounded-[1.4rem] border border-slate-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Image storage</p>
            <p className="mt-3 break-all text-sm leading-6 text-slate-600">{result.image_url ?? "local only"}</p>
          </div>
        </div>

        <Separator className="bg-slate-200" />

        <div className="rounded-[1.5rem] border border-slate-200 bg-[linear-gradient(180deg,#f8fbfd,#f1f8fb)] p-6">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-sky-700" />
            <h3 className="font-semibold text-slate-900">Generated report</h3>
          </div>
          <div className="mt-5 rounded-[1.4rem] bg-white p-5 shadow-sm">
            <MarkdownReport content={result.report} />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2">
              <Microscope className="h-4 w-4 text-sky-700" />
              <h3 className="font-semibold text-slate-900">Findings</h3>
            </div>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
              {result.findings.map((finding) => (
                <li key={finding} className="rounded-2xl bg-slate-50 px-4 py-3">
                  {finding}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-sky-700" />
              <h3 className="font-semibold text-slate-900">Verifier notes</h3>
            </div>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
              {result.verification_notes.map((note) => (
                <li key={note} className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                  {result.verified ? (
                    <CheckCircle2 className="mt-1 h-4 w-4 text-emerald-600" />
                  ) : (
                    <CircleAlert className="mt-1 h-4 w-4 text-amber-600" />
                  )}
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2">
              <Microscope className="h-4 w-4 text-sky-700" />
              <h3 className="font-semibold text-slate-900">Tumor classification</h3>
            </div>
            <div className="mt-4 space-y-3">
              {result.class_probabilities.map((item) => (
                <div key={item.label} className="rounded-2xl bg-slate-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{item.display_name}</p>
                      <p className="text-sm text-slate-500 capitalize">{item.label}</p>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">{Math.round(item.probability * 100)}%</p>
                  </div>
                  <Progress className="mt-3" value={item.probability * 100} />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-sky-700" />
              <h3 className="font-semibold text-slate-900">Consensus and next actions</h3>
            </div>
            <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Consensus strength</p>
              <p className="mt-2 text-lg font-semibold capitalize text-slate-900">{result.consensus_summary.strength}</p>
              <p className="mt-1 text-sm text-slate-500">
                Margin vs runner-up class: {Math.round(result.consensus_summary.margin * 100)}%
              </p>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {result.differential_diagnosis.map((item, index) => (
                <div key={item.label} className="rounded-2xl bg-slate-50 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Rank {index + 1}</p>
                  <p className="mt-2 font-semibold text-slate-900">{item.display_name}</p>
                  <p className="mt-1 text-sm text-slate-600">{Math.round(item.probability * 100)}%</p>
                </div>
              ))}
            </div>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
              {result.recommended_actions.map((action) => (
                <li key={action} className="rounded-2xl bg-slate-50 px-4 py-3">
                  {action}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-sky-700" />
            <h3 className="font-semibold text-slate-900">Tumor profile</h3>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="rounded-2xl bg-slate-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Predicted class</p>
              <p className="mt-2 text-xl font-semibold text-slate-900">{result.tumor_profile.display_name}</p>
              <p className="mt-2 text-sm text-slate-500">{result.tumor_profile.category}</p>
              <p className="mt-4 text-sm leading-7 text-slate-600">{result.tumor_profile.summary}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Clinical considerations</p>
              <ul className="mt-3 space-y-3 text-sm leading-6 text-slate-600">
                {result.tumor_profile.common_considerations.map((item) => (
                  <li key={item} className="rounded-xl bg-white px-4 py-3">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <Microscope className="h-4 w-4 text-sky-700" />
            <h3 className="font-semibold text-slate-900">Algorithm agents</h3>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {result.model_votes.map((vote) => (
              <div key={vote.agent} className="rounded-2xl bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{vote.agent.replaceAll("_", " ")}</p>
                <p className="mt-2 text-lg font-semibold capitalize text-slate-900">{vote.prediction.replace("-", " ")}</p>
                <p className="mt-1 text-sm text-slate-600">{Math.round(vote.confidence * 100)}% confidence</p>
                <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-sky-700">{vote.mode}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
