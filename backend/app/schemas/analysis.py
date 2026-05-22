from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class Citation(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    title: str
    source: str
    year: int | None = None
    summary: str
    relevance_score: float = Field(default=0.0, ge=0.0, le=1.0)


class AgentTrace(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    agent: str
    status: Literal["completed", "warning", "fallback"]
    detail: str


class ModelVote(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    agent: str
    prediction: Literal["glioma", "meningioma", "notumor", "pituitary"]
    confidence: float = Field(ge=0.0, le=1.0)
    mode: Literal["onnx", "heuristic"]


class ClassProbability(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    label: Literal["glioma", "meningioma", "notumor", "pituitary"]
    display_name: str
    probability: float = Field(ge=0.0, le=1.0)


class TumorProfile(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    label: Literal["glioma", "meningioma", "notumor", "pituitary"]
    display_name: str
    category: str
    summary: str
    common_considerations: list[str]


class ConsensusSummary(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    strength: Literal["strong", "moderate", "weak"]
    margin: float = Field(ge=0.0, le=1.0)
    supporting_agents: list[str]
    dissenting_agents: list[str]


class AnalysisResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    case_id: str
    prediction: Literal["glioma", "meningioma", "notumor", "pituitary"]
    confidence: float = Field(ge=0.0, le=1.0)
    severity_band: Literal["high", "moderate", "low"]
    findings: list[str]
    report: str
    verified: bool
    verification_notes: list[str]
    class_probabilities: list[ClassProbability]
    differential_diagnosis: list[ClassProbability]
    tumor_profile: TumorProfile
    consensus_summary: ConsensusSummary
    recommended_actions: list[str]
    citations: list[Citation]
    model_votes: list[ModelVote]
    agent_trace: list[AgentTrace]
    image_url: str | None = None


class AnalysisSummary(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    case_id: str
    prediction: str
    confidence: float
    created_at: str


class CaseDetail(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    case_id: str
    image_name: str
    image_url: str
    prediction: str
    confidence: float
    report: str
    verified: bool
    created_at: str
