import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AnalysisSummary } from "@/lib/types";

export function RecentCases({ cases }: { cases: AnalysisSummary[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Case history</CardTitle>
        <CardDescription>Recent persisted analyses.</CardDescription>
      </CardHeader>
      <CardContent>
        {cases.length ? (
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <div className="grid grid-cols-[1.1fr_1fr_0.7fr] gap-4 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              <span>Case</span>
              <span>Prediction</span>
              <span className="text-right">Confidence</span>
            </div>
            <div className="divide-y divide-slate-200">
              {cases.map((entry) => (
                <div key={entry.case_id} className="grid grid-cols-[1.1fr_1fr_0.7fr] gap-4 px-5 py-4 text-sm">
                  <div>
                    <p className="font-semibold text-slate-900">{entry.case_id.slice(0, 8)}</p>
                    <p className="mt-1 text-slate-500">{new Date(entry.created_at).toLocaleString()}</p>
                  </div>
                  <div className="self-center text-slate-700">{entry.prediction.replace("-", " ")}</div>
                  <div className="self-center text-right font-semibold text-slate-900">
                    {Math.round(entry.confidence * 100)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-sm leading-7 text-slate-600">
            No stored analyses yet.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
