import { ExternalLink, LibraryBig } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AnalysisResponse } from "@/lib/types";

export function CitationsPanel({ result }: { result: AnalysisResponse | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Grounding literature</CardTitle>
        <CardDescription>Evidence retrieved for the report.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {result?.citations?.length ? (
          result.citations.map((citation) => (
            <div key={citation.title} className="rounded-lg border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-900">{citation.title}</p>
                  <p className="mt-1 text-sm text-slate-500">{citation.year ? `${citation.source} | ${citation.year}` : citation.source}</p>
                </div>
                <div className="rounded-md border border-sky-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
                  {Math.round(citation.relevance_score * 100)}% relevant
                </div>
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-600">{citation.summary}</p>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-sm leading-7 text-slate-600">
            <div className="mb-3 flex items-center gap-2">
              <LibraryBig className="h-4 w-4 text-sky-700" />
              Evidence appears here after analysis.
            </div>
            Retrieval grounds the explanation before verification.
          </div>
        )}
        <a
          href="https://pubmed.ncbi.nlm.nih.gov/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 text-sm font-medium text-sky-700 hover:underline"
        >
          Browse PubMed for further validation
          <ExternalLink className="h-4 w-4" />
        </a>
      </CardContent>
    </Card>
  );
}
