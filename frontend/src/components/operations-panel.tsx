import { Cpu, Database, FileSearch, ShieldCheck, Stethoscope } from "lucide-react";

import { CorporateScene } from "@/components/corporate-scene";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AnalysisResponse } from "@/lib/types";

const checklist = [
  { label: "Models", detail: "Four ONNX model votes", icon: Cpu },
  { label: "Sources", detail: "Optional source lookup", icon: FileSearch },
  { label: "Summary", detail: "Plain text result note", icon: Stethoscope },
  { label: "Checks", detail: "Optional result checks", icon: ShieldCheck },
  { label: "Saved cases", detail: "SQLite + Chroma storage", icon: Database },
];

function predictionTone(prediction?: string | null) {
  if (!prediction) return "text-slate-500";
  if (prediction === "notumor") return "text-emerald-700";
  if (prediction === "glioma" || prediction === "pituitary") return "text-rose-700";
  return "text-amber-700";
}

export function OperationsPanel({ result, isUploading }: { result: AnalysisResponse | null; isUploading: boolean }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-slate-100 bg-[linear-gradient(180deg,#ffffff,#f7fbfd)]">
        <CardTitle>System status</CardTitle>
        <CardDescription>Current upload and analysis state.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 p-5">
        <div className="overflow-hidden rounded-md border border-slate-200 bg-[linear-gradient(180deg,#fbfeff,#f1f8fb)]">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
            <div className="p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Current state</p>
              <p className="mt-3 text-2xl font-semibold text-slate-900">{isUploading ? "Processing" : result ? "Case reviewed" : "Ready"}</p>
              <p className={`mt-2 text-sm font-medium ${predictionTone(result?.prediction)}`}>
                {result ? `Latest result: ${result.prediction}` : "Upload a scan to begin."}
              </p>
            </div>
            <div className="border-l border-slate-200 bg-white/60">
              <CorporateScene compact className="h-[180px] w-full" />
            </div>
          </div>
        </div>

        <div className="grid gap-3">
          {checklist.map(({ label, detail, icon: Icon }) => (
            <div key={label} className="flex items-center gap-4 rounded-md border border-slate-200 bg-white px-4 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-sky-50 text-sky-700">
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{label}</p>
                <p className="text-sm text-slate-500">{detail}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
