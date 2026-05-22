from typing import Callable, TypedDict
from uuid import uuid4

from langgraph.graph import END, StateGraph

from app.agents.mri_agent import run_model_agent, run_orchestration_agent, run_preprocessing_agent
from app.agents.report_agent import run_report_agent
from app.agents.retrieval_agent import run_retrieval_agent
from app.agents.verifier_agent import run_verifier_agent
from app.schemas.analysis import AgentTrace, AnalysisResponse, ClassProbability, ConsensusSummary, ModelVote, TumorProfile
from app.services.clinical_support import build_differential_diagnosis, build_recommended_actions, TUMOR_PROFILES
from app.services.case_repository import save_case
from app.services.storage import store_scan


class WorkflowState(TypedDict, total=False):
    case_id: str
    filename: str
    content: bytes
    image_url: str
    image: object
    prediction: str
    confidence: float
    features: dict
    model_votes: list[dict]
    citations: list
    report: str
    findings: list[str]
    verified: bool
    verification_notes: list[str]
    ensemble_probabilities: dict
    consensus_summary: dict
    trace: list[AgentTrace]
    inference_note: str


def _append_trace(state: WorkflowState, agent: str, status: str, detail: str) -> WorkflowState:
    trace = list(state.get("trace", []))
    trace.append(AgentTrace(agent=agent, status=status, detail=detail))
    state["trace"] = trace
    return state


def upload_node(state: WorkflowState) -> WorkflowState:
    state["image_url"] = store_scan(state["case_id"], state["filename"], state["content"])
    return _append_trace(state, "storage", "completed", "MRI image stored successfully.")


def preprocessing_node(state: WorkflowState) -> WorkflowState:
    result = run_preprocessing_agent(state["content"])
    state.update(result)
    return _append_trace(state, "preprocessing_agent", "completed", result["inference_note"])


def _model_node(state: WorkflowState, agent: str) -> WorkflowState:
    vote = run_model_agent(agent=agent, image=state["image"], features=state["features"])
    votes = list(state.get("model_votes", []))
    votes.append(vote)
    state["model_votes"] = votes
    status = "completed" if vote["mode"] == "onnx" else "fallback"
    return _append_trace(state, agent, status, vote["note"])


def cnn_node(state: WorkflowState) -> WorkflowState:
    return _model_node(state, "cnn_agent")


def resnet50_node(state: WorkflowState) -> WorkflowState:
    return _model_node(state, "resnet50_agent")


def vgg16_node(state: WorkflowState) -> WorkflowState:
    return _model_node(state, "vgg16_agent")


def inception_v3_node(state: WorkflowState) -> WorkflowState:
    return _model_node(state, "inception_v3_agent")


def orchestration_node(state: WorkflowState) -> WorkflowState:
    result = run_orchestration_agent(state.get("model_votes", []))
    state.update(result)
    return _append_trace(state, "orchestration_agent", "completed", result["inference_note"])


def retrieval_node(state: WorkflowState) -> WorkflowState:
    citations = run_retrieval_agent(state["prediction"], state["features"])
    state["citations"] = citations
    status = "completed" if citations else "fallback"
    detail = "Retrieved literature support." if citations else "No literature found, continuing with fallback report."
    return _append_trace(state, "retrieval_agent", status, detail)


def report_node(state: WorkflowState) -> WorkflowState:
    result = run_report_agent(
        state["prediction"],
        state["confidence"],
        state["features"],
        state["citations"],
        state.get("model_votes", []),
    )
    state.update(result)
    return _append_trace(state, "report_agent", "completed", "Generated grounded AI-assisted report.")


def verifier_node(state: WorkflowState) -> WorkflowState:
    result = run_verifier_agent(
        state["prediction"],
        state["confidence"],
        state["report"],
        state["citations"],
        state.get("model_votes", []),
    )
    state["verified"] = result["verified"]
    state["verification_notes"] = result["notes"]
    status = "completed" if result["verified"] else "warning"
    return _append_trace(state, "verification_agent", status, "Verification checks completed.")


def persist_node(state: WorkflowState) -> WorkflowState:
    save_case(
        case_id=state["case_id"],
        image_name=state["filename"],
        image_url=state["image_url"],
        prediction=state["prediction"],
        confidence=state["confidence"],
        report=state["report"],
        verified=state["verified"],
    )
    return _append_trace(state, "memory", "completed", "Case stored in SQLite memory.")


graph = StateGraph(WorkflowState)
graph.add_node("upload", upload_node)
graph.add_node("preprocessing", preprocessing_node)
graph.add_node("cnn", cnn_node)
graph.add_node("resnet50", resnet50_node)
graph.add_node("vgg16", vgg16_node)
graph.add_node("inception_v3", inception_v3_node)
graph.add_node("orchestration", orchestration_node)
graph.add_node("retrieval", retrieval_node)
graph.add_node("report", report_node)
graph.add_node("verifier", verifier_node)
graph.add_node("persist", persist_node)
graph.set_entry_point("upload")
graph.add_edge("upload", "preprocessing")
graph.add_edge("preprocessing", "cnn")
graph.add_edge("cnn", "resnet50")
graph.add_edge("resnet50", "vgg16")
graph.add_edge("vgg16", "inception_v3")
graph.add_edge("inception_v3", "orchestration")
graph.add_edge("orchestration", "retrieval")
graph.add_edge("retrieval", "report")
graph.add_edge("report", "verifier")
graph.add_edge("verifier", "persist")
graph.add_edge("persist", END)
compiled_workflow = graph.compile()

WORKFLOW_STEPS: list[tuple[str, Callable[[WorkflowState], WorkflowState]]] = [
    ("storage", upload_node),
    ("preprocessing_agent", preprocessing_node),
    ("cnn_agent", cnn_node),
    ("resnet50_agent", resnet50_node),
    ("vgg16_agent", vgg16_node),
    ("inception_v3_agent", inception_v3_node),
    ("orchestration_agent", orchestration_node),
    ("retrieval_agent", retrieval_node),
    ("report_agent", report_node),
    ("verification_agent", verifier_node),
    ("memory", persist_node),
]


def _build_response_from_state(case_id: str, result: WorkflowState) -> AnalysisResponse:
    confidence = float(result["confidence"])
    if confidence >= 0.85:
        severity_band = "high"
    elif confidence >= 0.55:
        severity_band = "moderate"
    else:
        severity_band = "low"
    ensemble_probabilities = result.get("ensemble_probabilities", {})
    class_probabilities = [
        ClassProbability(
            label=label,
            display_name=TUMOR_PROFILES[label]["display_name"],
            probability=float(ensemble_probabilities.get(label, 0.0)),
        )
        for label in sorted(ensemble_probabilities.keys(), key=lambda current: ensemble_probabilities[current], reverse=True)
    ]
    differential_diagnosis = [
        ClassProbability(
            label=item["label"],
            display_name=item["display_name"],
            probability=item["probability"],
        )
        for item in build_differential_diagnosis(ensemble_probabilities)
    ]
    tumor_profile = TumorProfile(label=result["prediction"], **TUMOR_PROFILES[result["prediction"]])
    consensus_data = result.get("consensus_summary", {"strength": "weak", "margin": 0.0, "supporting_agents": [], "dissenting_agents": []})
    recommended_actions = build_recommended_actions(
        prediction=result["prediction"],
        confidence=confidence,
        verified=bool(result["verified"]),
        dissenting_agents=consensus_data.get("dissenting_agents", []),
    )
    return AnalysisResponse(
        case_id=case_id,
        prediction=result["prediction"],
        confidence=confidence,
        severity_band=severity_band,
        findings=result["findings"],
        report=result["report"],
        verified=result["verified"],
        verification_notes=result["verification_notes"],
        class_probabilities=class_probabilities,
        differential_diagnosis=differential_diagnosis,
        tumor_profile=tumor_profile,
        consensus_summary=ConsensusSummary(**consensus_data),
        recommended_actions=recommended_actions,
        citations=result["citations"],
        model_votes=[ModelVote(**vote) for vote in result.get("model_votes", [])],
        agent_trace=result["trace"],
        image_url=result["image_url"],
    )


async def run_analysis_workflow(filename: str, content: bytes) -> AnalysisResponse:
    case_id = str(uuid4())
    state: WorkflowState = {
        "case_id": case_id,
        "filename": filename,
        "content": content,
        "trace": [],
        "model_votes": [],
    }
    result = compiled_workflow.invoke(state)
    return _build_response_from_state(case_id, result)


async def stream_analysis_workflow(filename: str, content: bytes):
    case_id = str(uuid4())
    state: WorkflowState = {
        "case_id": case_id,
        "filename": filename,
        "content": content,
        "trace": [],
        "model_votes": [],
    }

    for agent, handler in WORKFLOW_STEPS:
        yield {"type": "stage", "agent": agent, "status": "running", "case_id": case_id}
        state = handler(state)
        last_trace = state.get("trace", [])[-1]
        payload = {"type": "trace", "case_id": case_id, "trace": last_trace.model_dump()}
        if agent == "orchestration_agent":
            payload["model_votes"] = state.get("model_votes", [])
            payload["prediction"] = state.get("prediction")
            payload["confidence"] = state.get("confidence")
        yield payload

    response = _build_response_from_state(case_id, state)
    yield {"type": "complete", "case_id": case_id, "result": response.model_dump()}
