type MarkdownReportProps = {
  content: string;
};

type SectionBlock = {
  title: string;
  items: Array<{ type: "bullet" | "paragraph"; content: string }>;
};

const SECTION_HELPERS: Record<string, string> = {
  Impression: "Plain-language interpretation of what the system thinks this scan most likely represents.",
  "Model Consensus": "How the different algorithm agents voted, and whether they agreed with each other.",
  "Evidence Signals": "Supporting numeric image signals and literature grounding used to keep the summary anchored.",
  Recommendation: "Suggested next steps for review, follow-up, and safe use of the AI output.",
};

const JARGON_HELPERS: Array<{ pattern: RegExp; helper: string }> = [
  {
    pattern: /^Ensemble confidence:/i,
    helper: "This is the combined confidence after all models are weighted together, not a guarantee that the prediction is correct.",
  },
  {
    pattern: /^Mean intensity:/i,
    helper: "A basic brightness average across the processed image. On its own, it is not diagnostic.",
  },
  {
    pattern: /^Intensity variability:/i,
    helper: "Measures how much the image brightness changes across the scan. Higher variation can reflect more visual complexity.",
  },
  {
    pattern: /^High signal ratio:/i,
    helper: "Estimates how much of the image contains brighter-than-usual signal. It is only a crude imaging feature.",
  },
  {
    pattern: /^Edge density:/i,
    helper: "A simple estimate of how many sharp boundaries or structural edges appear in the image.",
  },
  {
    pattern: /^Model votes:/i,
    helper: "The individual model outputs are shown below so you can see whether the ensemble decision came from agreement or disagreement.",
  },
  {
    pattern: /^Note:/i,
    helper: "This is a caution from the system explaining why the result may be less reliable.",
  },
];

function parseSections(content: string): SectionBlock[] {
  const lines = content.split("\n");
  const sections: SectionBlock[] = [];
  let currentSection: SectionBlock | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith("## ")) {
      currentSection = {
        title: line.slice(3),
        items: [],
      };
      sections.push(currentSection);
      continue;
    }

    if (!currentSection) {
      currentSection = {
        title: "Summary",
        items: [],
      };
      sections.push(currentSection);
    }

    if (line.startsWith("- ")) {
      currentSection.items.push({ type: "bullet", content: line.slice(2) });
      continue;
    }

    currentSection.items.push({ type: "paragraph", content: line });
  }

  return sections;
}

function emphasisSplit(content: string) {
  return content.split("**");
}

function helperForLine(content: string) {
  return JARGON_HELPERS.find((entry) => entry.pattern.test(content))?.helper ?? null;
}

function renderSegments(content: string) {
  return emphasisSplit(content).map((segment, segmentIndex) =>
    segmentIndex % 2 === 1 ? (
      <strong key={segmentIndex} className="font-semibold text-white">
        {segment}
      </strong>
    ) : (
      <span key={segmentIndex}>{segment}</span>
    )
  );
}

function previewText(section: SectionBlock) {
  const firstParagraph = section.items.find((item) => item.type === "paragraph")?.content;
  const firstBullet = section.items.find((item) => item.type === "bullet")?.content;
  return firstParagraph ?? firstBullet ?? "Open for more detail.";
}

function defaultOpen(title: string) {
  return title === "Impression" || title === "Recommendation";
}

export function MarkdownReport({ content }: MarkdownReportProps) {
  const sections = parseSections(content);

  return (
    <div className="space-y-4">
      {sections.map((section, index) => (
        <details
          key={`${section.title}-${index}`}
          className="group overflow-hidden rounded-lg border border-border bg-card"
          open={defaultOpen(section.title)}
        >
          <summary className="cursor-pointer list-none px-5 py-4 transition hover:bg-secondary">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200/68">{section.title}</p>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">{previewText(section)}</p>
                {SECTION_HELPERS[section.title] ? (
                  <p className="mt-2 text-xs leading-5 text-slate-400">{SECTION_HELPERS[section.title]}</p>
                ) : null}
              </div>
              <div className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-300 transition group-open:rotate-180">
                ▼
              </div>
            </div>
          </summary>

          <div className="border-t border-border px-5 py-4">
            <div className="space-y-3">
              {section.items.map((item, itemIndex) => {
                const helper = helperForLine(item.content);

                if (item.type === "bullet") {
                  return (
                    <div key={`${item.type}-${itemIndex}`} className="rounded-md border border-border bg-secondary px-4 py-3">
                      <div className="flex items-start gap-3">
                        <span className="mt-2 h-2 w-2 rounded-[2px] bg-sky-300" />
                        <div className="min-w-0">
                          <p className="text-sm leading-7 text-slate-300">{renderSegments(item.content)}</p>
                          {helper ? <p className="mt-2 text-xs leading-5 text-slate-400">{helper}</p> : null}
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={`${item.type}-${itemIndex}`} className="rounded-md border border-transparent px-1 py-1">
                    <p className="text-sm leading-7 text-slate-300">{renderSegments(item.content)}</p>
                    {helper ? <p className="mt-2 text-xs leading-5 text-slate-400">{helper}</p> : null}
                  </div>
                );
              })}
            </div>
          </div>
        </details>
      ))}
    </div>
  );
}
