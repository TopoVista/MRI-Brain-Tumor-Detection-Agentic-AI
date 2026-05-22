import { Activity, BrainCircuit, ShieldCheck, Waypoints } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const metrics = [
  { label: "Agents", value: "11", icon: Waypoints },
  { label: "Models", value: "4", icon: BrainCircuit },
  { label: "Mode", value: "CPU", icon: Activity },
  { label: "Safety", value: "Verifier", icon: ShieldCheck },
];

export function Hero() {
  return (
    <Card className="overflow-hidden border-sky-100 bg-[linear-gradient(135deg,#ffffff,#f6fbfd_55%,#ecf7fa)]">
      <CardContent className="flex flex-col gap-6 p-6 lg:flex-row lg:items-end lg:justify-between lg:p-8">
        <div className="max-w-4xl">
          <div className="flex flex-wrap items-center gap-3">
            <Badge>Brain MRI intelligence</Badge>
            <Badge variant="secondary">Realtime orchestration</Badge>
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Agentic MRI workstation for upload, ensemble review, evidence retrieval, and verification.
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
            Left side runs the case. Right side reads the clinical note, model consensus, evidence, and trace.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {metrics.map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-[1.2rem] border border-slate-200 bg-white/90 px-4 py-4 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500">
                <Icon className="h-4 w-4 text-sky-700" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">{label}</span>
              </div>
              <p className="mt-3 text-xl font-semibold text-slate-900">{value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
