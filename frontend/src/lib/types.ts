export type Citation = {
  title: string;
  source: string;
  year?: number | null;
  summary: string;
  relevance_score: number;
};

export type AgentTrace = {
  agent: string;
  status: "completed" | "warning" | "fallback";
  detail: string;
};

export type ModelVote = {
  agent: string;
  prediction: "glioma" | "meningioma" | "notumor" | "pituitary";
  confidence: number;
  mode: "onnx" | "heuristic";
};

export type ClassProbability = {
  label: "glioma" | "meningioma" | "notumor" | "pituitary";
  display_name: string;
  probability: number;
};

export type TumorProfile = {
  label: "glioma" | "meningioma" | "notumor" | "pituitary";
  display_name: string;
  category: string;
  summary: string;
  common_considerations: string[];
};

export type ConsensusSummary = {
  strength: "strong" | "moderate" | "weak";
  margin: number;
  supporting_agents: string[];
  dissenting_agents: string[];
};

export type AnalysisResponse = {
  case_id: string;
  prediction: "glioma" | "meningioma" | "notumor" | "pituitary";
  confidence: number;
  severity_band: "high" | "moderate" | "low";
  findings: string[];
  report: string;
  verified: boolean;
  verification_notes: string[];
  class_probabilities: ClassProbability[];
  differential_diagnosis: ClassProbability[];
  tumor_profile: TumorProfile;
  consensus_summary: ConsensusSummary;
  recommended_actions: string[];
  citations: Citation[];
  model_votes: ModelVote[];
  agent_trace: AgentTrace[];
  image_url?: string | null;
};

export type AnalysisSummary = {
  case_id: string;
  prediction: string;
  confidence: number;
  created_at: string;
};

export type CaseDetail = {
  case_id: string;
  image_name: string;
  image_url: string;
  prediction: string;
  confidence: number;
  report: string;
  verified: boolean;
  created_at: string;
};
