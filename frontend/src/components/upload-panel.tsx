"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { FileImage, LoaderCircle, LockKeyhole, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { uploadMriStream } from "@/lib/api";
import { AgentTrace, AnalysisResponse, ModelVote } from "@/lib/types";

type UploadPanelProps = {
  onResult: (result: AnalysisResponse) => void;
  onUploadingChange: (isUploading: boolean) => void;
  previewUrl: string | null;
  onPreviewChange: (previewUrl: string | null) => void;
  onWorkflowReset: () => void;
  onStageChange: (agent: string | null) => void;
  onTraceUpdate: (trace: AgentTrace) => void;
  onModelVotesUpdate: (votes: ModelVote[]) => void;
};

export function UploadPanel({
  onResult,
  onUploadingChange,
  previewUrl,
  onPreviewChange,
  onWorkflowReset,
  onStageChange,
  onTraceUpdate,
  onModelVotesUpdate,
}: UploadPanelProps) {
  const [fileName, setFileName] = useState<string>("No file selected");
  const [error, setError] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl);
      }
    };
  }, [localPreviewUrl]);

  function updatePreview(file: File | null) {
    if (localPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl);
      setLocalPreviewUrl(null);
    }
    if (!file) {
      onPreviewChange(null);
      return;
    }
    const nextPreviewUrl = URL.createObjectURL(file);
    setLocalPreviewUrl(nextPreviewUrl);
    onPreviewChange(nextPreviewUrl);
  }

  async function handleSubmit(formData: FormData) {
    const file = formData.get("mri") as File | null;
    if (!file || file.size === 0) {
      setError("Please choose an MRI image file before running analysis.");
      return;
    }
    setError("");
    onWorkflowReset();
    setIsUploading(true);
    onUploadingChange(true);
    const startTime = Date.now();
    try {
      const result = await uploadMriStream(file, {
        onStage: (agent) => onStageChange(agent),
        onTrace: (trace) => onTraceUpdate(trace),
        onModelVotes: (votes) => onModelVotesUpdate(votes),
      });
      onResult(result);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed");
    } finally {
      const elapsed = Date.now() - startTime;
      if (elapsed < 1200) {
        await new Promise((resolve) => setTimeout(resolve, 1200 - elapsed));
      }
      onStageChange(null);
      setIsUploading(false);
      onUploadingChange(false);
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-slate-100 bg-[linear-gradient(180deg,#ffffff,#f7fbfd)]">
        <CardTitle>Scan intake</CardTitle>
        <CardDescription>Upload a brain MRI image and run the workflow.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 p-6">
        <form action={handleSubmit} className="space-y-4">
          <label className="group relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[1.6rem] border border-dashed border-sky-200 bg-[linear-gradient(180deg,#fbfeff,#f2fafd)] px-6 py-12 text-center transition hover:border-sky-300 hover:bg-[linear-gradient(180deg,#ffffff,#edf8fb)]">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.55),transparent)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            {isUploading ? <div className="scan-loader pointer-events-none absolute inset-0" /> : null}
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sky-700 text-white shadow-lg shadow-sky-100 transition group-hover:scale-105">
              <Upload className="h-8 w-8" />
            </div>
            <span className="mt-5 text-lg font-semibold text-slate-900">Drop MRI image or browse</span>
            <span className="mt-2 text-sm text-slate-500">PNG or JPG</span>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">
              <FileImage className="h-4 w-4 text-sky-700" />
              {fileName}
            </div>
            <input
              name="mri"
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              className="hidden"
              onChange={(event) => {
                const nextFile = event.target.files?.[0];
                setFileName(nextFile?.name ?? "No file selected");
                updatePreview(nextFile ?? null);
              }}
            />
          </label>

          {previewUrl ? (
            <div className="overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Selected image</p>
                {isUploading ? <span className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">Analyzing</span> : null}
              </div>
              <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                <Image src={previewUrl} alt="MRI preview" fill unoptimized className="object-cover" />
              </div>
            </div>
          ) : null}

          <Button type="submit" className="w-full" disabled={isUploading}>
            {isUploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
            {isUploading ? "Running orchestration..." : "Launch MRI workflow"}
          </Button>
        </form>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[1.3rem] bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Pipeline</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">Infer, retrieve, report, verify, store.</p>
          </div>
          <div className="rounded-[1.3rem] bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-slate-700">
              <LockKeyhole className="h-4 w-4 text-teal-700" />
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Positioning</p>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">Decision support, not autonomous diagnosis.</p>
          </div>
        </div>

        {isUploading ? (
          <div className="rounded-[1.3rem] border border-sky-200 bg-sky-50 px-4 py-3">
            <div className="flex items-center gap-3">
              <LoaderCircle className="h-4 w-4 animate-spin text-sky-700" />
              <p className="text-sm font-medium text-sky-800">Workflow in progress. Generating preview states and report.</p>
            </div>
          </div>
        ) : null}

        {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
