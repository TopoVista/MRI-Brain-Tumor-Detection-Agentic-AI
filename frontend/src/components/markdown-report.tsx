type MarkdownReportProps = {
  content: string;
};

export function MarkdownReport({ content }: MarkdownReportProps) {
  const lines = content.split("\n");
  const blocks: Array<{ type: "heading" | "bullet" | "paragraph"; content: string }> = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith("## ")) {
      blocks.push({ type: "heading", content: line.slice(3) });
      continue;
    }
    if (line.startsWith("- ")) {
      blocks.push({ type: "bullet", content: line.slice(2) });
      continue;
    }
    blocks.push({ type: "paragraph", content: line });
  }

  return (
    <div className="markdown-report space-y-4">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          return (
            <div key={`${block.type}-${index}`} className="pt-2">
              <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">{block.content}</h4>
            </div>
          );
        }

        if (block.type === "bullet") {
          const segments = block.content.split("**");
          return (
            <div key={`${block.type}-${index}`} className="flex items-start gap-3 rounded-2xl bg-white/80 px-4 py-3">
              <span className="mt-2 h-2 w-2 rounded-full bg-sky-600" />
              <p className="text-sm leading-7 text-slate-700">
                {segments.map((segment, segmentIndex) =>
                  segmentIndex % 2 === 1 ? (
                    <strong key={segmentIndex} className="font-semibold text-slate-900">
                      {segment}
                    </strong>
                  ) : (
                    <span key={segmentIndex}>{segment}</span>
                  )
                )}
              </p>
            </div>
          );
        }

        return (
          <p key={`${block.type}-${index}`} className="text-sm leading-7 text-slate-700">
            {block.content}
          </p>
        );
      })}
    </div>
  );
}
