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
    <Card>
      <CardHeader className="border-b border-border">
        <CardTitle>Upload scan</CardTitle>
        <CardDescription>Upload one brain MRI image and start analysis.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5 p-6">
        <form action={handleSubmit} className="space-y-4">
          <label className="group relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-secondary px-6 py-10 text-center transition hover:border-sky-400/22 hover:bg-[rgba(17,28,41,0.98)]">
            {isUploading ? <div className="scan-loader pointer-events-none absolute inset-0" /> : null}
            <div className="flex h-14 w-14 items-center justify-center rounded-md bg-primary/18 text-sky-200 transition group-hover:scale-105">
              <Upload className="h-8 w-8" />
            </div>
            <span className="mt-4 text-lg font-semibold text-white">Drop an MRI image or browse</span>
            <span className="mt-1.5 text-sm text-slate-400">PNG or JPG</span>
            <div className="mt-5 inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm text-slate-300">
              <FileImage className="h-4 w-4 text-sky-300" />
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
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-200/68">Selected image</p>
                {isUploading ? <span className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-300">Processing</span> : null}
              </div>
              <div className="relative aspect-[16/10] overflow-hidden bg-slate-950">
                <Image src={previewUrl} alt="MRI preview" fill unoptimized className="object-cover" />
              </div>
            </div>
          ) : null}

          <Button type="submit" className="w-full" disabled={isUploading}>
            <span className="button-content relative z-10 flex items-center gap-2">
              {isUploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              {isUploading ? "Processing..." : "Start analysis"}
            </span>
            {isUploading ? <span className="button-loading-scan absolute inset-0" aria-hidden="true" /> : null}
          </Button>
        </form>

        {isUploading ? (
          <div className="rounded-md border border-sky-400/22 bg-[rgba(17,39,51,0.66)] px-4 py-3">
            <div className="flex items-center gap-3">
              <LoaderCircle className="h-4 w-4 animate-spin text-sky-300" />
              <p className="text-sm font-medium text-sky-100">Processing the image and building the result.</p>
            </div>
          </div>
        ) : null}

        <div className="rounded-md border border-border bg-secondary px-4 py-4">
          <div className="flex items-center gap-2 text-slate-200">
            <LockKeyhole className="h-4 w-4 text-teal-300" />
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-200/68">Use notice</p>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-300">This tool supports review. A clinician should make the final call.</p>
        </div>

        {error ? <p className="rounded-md border border-rose-500/30 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
