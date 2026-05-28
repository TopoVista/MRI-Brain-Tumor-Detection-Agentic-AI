import { ImageResponse } from "next/og";

export const alt = "Agentic MRI Analysis Copilot";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";
export const runtime = "edge";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: "linear-gradient(180deg, #f7fafb 0%, #eef3f6 100%)",
          color: "#0f2742",
          fontFamily: "Arial",
          padding: "52px",
        }}
      >
        <div
          style={{
            display: "flex",
            flex: 1,
            border: "1px solid #cbd7df",
            borderRadius: "18px",
            background: "#ffffff",
            padding: "42px",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              width: "58%",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              <div style={{ fontSize: 18, textTransform: "uppercase", letterSpacing: "0.34em", color: "#4e6476" }}>
                MRI Brain Tumor Copilot
              </div>
              <div style={{ fontSize: 62, lineHeight: 1.08, fontWeight: 700 }}>
                Brain MRI classification with grounded reporting and verified workflow review.
              </div>
              <div style={{ fontSize: 28, lineHeight: 1.5, color: "#4e6476" }}>
                Four model agents, literature retrieval, verification, and structured clinical support.
              </div>
            </div>
            <div style={{ display: "flex", gap: "16px" }}>
              {["Glioma", "Meningioma", "Pituitary", "No Tumor"].map((label) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    border: "1px solid #cbd7df",
                    borderRadius: "10px",
                    padding: "14px 18px",
                    fontSize: 22,
                    background: "#f7fafb",
                  }}
                >
                  {label}
                </div>
              ))}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              width: "34%",
              border: "1px solid #cbd7df",
              borderRadius: "16px",
              background: "linear-gradient(180deg, #f8fbfc 0%, #eff4f7 100%)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 34,
                border: "2px solid rgba(15,39,66,0.14)",
                borderRadius: 12,
                transform: "rotate(-10deg)",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 56,
                border: "2px solid rgba(47,139,146,0.18)",
                borderRadius: 12,
                transform: "rotate(8deg)",
              }}
            />
            <div
              style={{
                display: "flex",
                position: "absolute",
                left: 88,
                top: 76,
                width: 220,
                height: 220,
                borderRadius: "50%",
                background: "radial-gradient(circle at 40% 45%, #dbe5ec 0%, #7c8ea0 58%, #172133 100%)",
              }}
            />
            <div
              style={{
                display: "flex",
                position: "absolute",
                left: 146,
                top: 148,
                width: 58,
                height: 58,
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(47,139,146,0.95) 0%, rgba(47,139,146,0.15) 76%, transparent 100%)",
                border: "2px solid rgba(47,139,146,0.45)",
              }}
            />
            <div
              style={{
                display: "flex",
                position: "absolute",
                left: 72,
                right: 72,
                bottom: 74,
                height: 18,
                background: "rgba(47,139,146,0.16)",
              }}
            />
          </div>
        </div>
      </div>
    ),
    size
  );
}
