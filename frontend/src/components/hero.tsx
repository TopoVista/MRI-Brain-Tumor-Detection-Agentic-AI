import { Activity, BrainCircuit, ShieldCheck, Workflow } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { AnalysisResponse } from "@/lib/types";

function currentRunLabel(result: AnalysisResponse | null, isUploading: boolean) {
  if (isUploading) return "Processing image";
  if (!result) return "Waiting for an MRI upload";
  return `Latest result: ${result.prediction.replace("-", " ")}`;
}

export function Hero({ result, isUploading }: { result: AnalysisResponse | null; isUploading: boolean }) {
  return (
    <Card>
      <CardContent className="grid gap-5 p-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(440px,1fr)] lg:items-start">
        <div className="space-y-4">
          <div className="space-y-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-200/68">Brain MRI Tumor Classification</p>
            <h1 className="hero-title max-w-4xl text-3xl text-white sm:text-4xl xl:text-[3rem]">
              Brain MRI classification with model votes, confidence, and a plain summary.
            </h1>
            <p className="max-w-3xl text-sm leading-6.5 text-slate-300 sm:text-base">
              Upload a scan, run the four model votes, and read a short result summary with the main details in one place.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-md border border-border bg-secondary px-4 py-3.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/18 text-sky-200">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-200/68">Current run</p>
              <p className="mt-1 text-sm font-semibold text-white sm:text-base">{currentRunLabel(result, isUploading)}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
          <div className="rounded-md border border-border bg-secondary px-4 py-4">
            <div className="flex items-center gap-2 text-sky-300">
              <Workflow className="h-4 w-4" />
              <p className="text-xs font-semibold uppercase tracking-[0.18em]">Steps</p>
            </div>
            <p className="mt-3 text-base font-semibold text-white">One upload path</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">One workspace for upload, processing, and the final result.</p>
          </div>

          <div className="rounded-md border border-border bg-secondary px-4 py-4">
            <div className="flex items-center gap-2 text-sky-300">
              <BrainCircuit className="h-4 w-4" />
              <p className="text-xs font-semibold uppercase tracking-[0.18em]">Models</p>
            </div>
            <p className="mt-3 text-base font-semibold text-white">Four-label result</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">The app predicts glioma, meningioma, pituitary, or no tumor.</p>
          </div>

          <div className="rounded-md border border-border bg-secondary px-4 py-4">
            <div className="flex items-center gap-2 text-sky-300">
              <ShieldCheck className="h-4 w-4" />
              <p className="text-xs font-semibold uppercase tracking-[0.18em]">Extra steps</p>
            </div>
            <p className="mt-3 text-base font-semibold text-white">Core steps first</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">Source lookup and result checks are optional extra steps.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
