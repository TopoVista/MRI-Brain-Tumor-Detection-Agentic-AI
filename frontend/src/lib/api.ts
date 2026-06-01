import { AgentTrace, AnalysisResponse, ModelVote } from "@/lib/types";
import { WorkflowRunMode, workflowRunModeToWorkflowMode } from "@/lib/workflow";

const baseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  (process.env.NODE_ENV === "production" ? "/api" : "http://localhost:8000/api");

function uploadPath(mode: WorkflowRunMode) {
  return workflowRunModeToWorkflowMode(mode) === "extended_support" ? "/analysis/upload-stream-extended" : "/analysis/upload-stream";
}

export async function uploadMri(file: File, mode: WorkflowRunMode = "core"): Promise<AnalysisResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const path = workflowRunModeToWorkflowMode(mode) === "extended_support" ? "/analysis/upload-extended" : "/analysis/upload";

  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(async () => ({ detail: await response.text().catch(() => "Upload failed") }));
    throw new Error(error.detail ?? "Upload failed");
  }

  return response.json();
}

type UploadStreamHandlers = {
  onStage?: (agent: string) => void;
  onTrace?: (trace: AgentTrace) => void;
  onModelVotes?: (votes: ModelVote[]) => void;
};

export async function uploadMriStream(
  file: File,
  handlers: UploadStreamHandlers = {},
  mode: WorkflowRunMode = "core"
): Promise<AnalysisResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${baseUrl}${uploadPath(mode)}`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok || !response.body) {
    const error = await response
      .json()
      .catch(async () => ({ detail: await response.text().catch(() => "Upload failed") }));
    throw new Error(error.detail ?? "Upload failed");
  }

  const decoder = new TextDecoder();
  const reader = response.body.getReader();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });

    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";

    for (const chunk of chunks) {
      const line = chunk
        .split("\n")
        .find((entry) => entry.startsWith("data: "));
      if (!line) continue;

      const payload = JSON.parse(line.slice(6));
      if (payload.type === "stage" && payload.agent) {
        handlers.onStage?.(payload.agent);
      }
      if (payload.type === "trace" && payload.trace) {
        handlers.onTrace?.(payload.trace as AgentTrace);
        if (payload.model_votes) {
          handlers.onModelVotes?.(payload.model_votes as ModelVote[]);
        }
      }
      if (payload.type === "complete" && payload.result) {
        return payload.result as AnalysisResponse;
      }
      if (payload.type === "error") {
        throw new Error(payload.detail ?? "Upload failed");
      }
    }

    if (done) {
      break;
    }
  }

  throw new Error("Workflow stream closed before completion.");
}
