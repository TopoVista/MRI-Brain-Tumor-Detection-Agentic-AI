from typing import Callable, TypedDict
from uuid import uuid4

from app.agents.mri_agent import run_model_agent, run_orchestration_agent, run_preprocessing_agent
from app.schemas.analysis import AgentTrace, AnalysisResponse, ClassProbability, ConsensusSummary, ModelVote, TumorProfile
from app.services.case_repository import save_case
from app.core.config import get_settings
from app.services.clinical_support import TUMOR_PROFILES, build_differential_diagnosis, build_recommended_actions
from app.services.inference import inference_service
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
    workflow_mode: str
    extensions_applied: list[str]


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


def _model_node(state: WorkflowState, agent: str, strict: bool) -> WorkflowState:
    vote = run_model_agent(agent=agent, image=state["image"], features=state["features"], strict=strict)
    votes = list(state.get("model_votes", []))
    votes.append(vote)
    state["model_votes"] = votes
    status = "completed" if vote["mode"] == "onnx" else "fallback"
    return _append_trace(state, agent, status, vote["note"])


def cnn_node(state: WorkflowState, strict: bool = True) -> WorkflowState:
    return _model_node(state, "cnn_agent", strict=strict)


def resnet50_node(state: WorkflowState, strict: bool = True) -> WorkflowState:
    return _model_node(state, "resnet50_agent", strict=strict)


def vgg16_node(state: WorkflowState, strict: bool = True) -> WorkflowState:
    return _model_node(state, "vgg16_agent", strict=strict)


def inception_v3_node(state: WorkflowState, strict: bool = True) -> WorkflowState:
    return _model_node(state, "inception_v3_agent", strict=strict)


def orchestration_node(state: WorkflowState) -> WorkflowState:
    result = run_orchestration_agent(state.get("model_votes", []))
    state.update(result)
    return _append_trace(state, "orchestration_agent", "completed", result["inference_note"])


def retrieval_node(state: WorkflowState) -> WorkflowState:
    from app.agents.retrieval_agent import run_retrieval_agent

    citations = run_retrieval_agent(state["prediction"], state["features"])
    state["citations"] = citations
    detail = "Retrieved literature support." if citations else "No literature found, continuing with evidence-free extended report."
    status = "completed" if citations else "fallback"
    extensions = list(state.get("extensions_applied", []))
    if "retrieval_agent" not in extensions:
        extensions.append("retrieval_agent")
    state["extensions_applied"] = extensions
    return _append_trace(state, "retrieval_agent", status, detail)


def report_node(state: WorkflowState) -> WorkflowState:
    from app.agents.report_agent import run_report_agent

    result = run_report_agent(
        state["prediction"],
        state["confidence"],
        state["features"],
        state.get("citations", []),
        state.get("model_votes", []),
    )
    state.update(result)
    extensions = list(state.get("extensions_applied", []))
    if "report_agent" not in extensions:
        extensions.append("report_agent")
    state["extensions_applied"] = extensions
    return _append_trace(state, "report_agent", "completed", "Generated grounded AI-assisted report.")


def verifier_node(state: WorkflowState) -> WorkflowState:
    from app.agents.verifier_agent import run_verifier_agent

    result = run_verifier_agent(
        state["prediction"],
        state["confidence"],
        state["report"],
        state.get("citations", []),
        state.get("model_votes", []),
    )
    state["verified"] = result["verified"]
    state["verification_notes"] = result["notes"]
    extensions = list(state.get("extensions_applied", []))
    if "verification_agent" not in extensions:
        extensions.append("verification_agent")
    state["extensions_applied"] = extensions
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
    extensions = list(state.get("extensions_applied", []))
    if "memory" not in extensions:
        extensions.append("memory")
    state["extensions_applied"] = extensions
    return _append_trace(state, "memory", "completed", "Case stored in SQLite memory.")


def _build_core_report(state: WorkflowState) -> str:
    prediction = state["prediction"].replace("-", " ")
    confidence = float(state["confidence"])
    votes = state.get("model_votes", [])
    consensus = state.get("consensus_summary", {})
    strengths = consensus.get("strength", "weak")
    dissenting = consensus.get("dissenting_agents", [])
    lines = [
        "## Impression",
        f"Ensemble prediction: {prediction} with confidence {confidence:.2f}.",
        f"Consensus strength across the four paper models: {strengths}.",
    ]
    if dissenting:
        lines.append(
            "Disagreement detected among: "
            + ", ".join(agent.replace("_", " ") for agent in dissenting)
            + "."
        )
    lines.extend(
        [
            "## Model Consensus",
            f"Predicted class: {prediction}",
            f"Ensemble confidence: {confidence:.2f}",
            "Model votes:",
        ]
    )
    for vote in votes:
        lines.append(
            f"- {vote['agent']}: {vote['prediction']} ({vote['confidence']:.2f}, {vote['mode']})"
        )
    lines.extend(
        [
            "## Evidence Signals",
            f"Mean intensity: {state['features']['mean_intensity']:.3f}",
            f"Intensity variability: {state['features']['std_intensity']:.3f}",
            f"High signal ratio: {state['features']['high_signal_ratio']:.3f}",
            f"Edge density: {state['features']['edge_density']:.3f}",
            "## Recommendation",
            "Use the ensemble output as decision support only and correlate with formal clinical review.",
        ]
    )
    return "\n".join(lines)


def _build_core_findings(state: WorkflowState) -> list[str]:
    top_vote = max(state.get("model_votes", []), key=lambda vote: vote["confidence"]) if state.get("model_votes") else None
    findings = [
        f"Predicted class: {state['prediction'].replace('-', ' ')}",
        f"Confidence score: {state['confidence']:.0%}",
        "Classified among: glioma, meningioma, notumor, pituitary",
        f"Mean intensity: {state['features']['mean_intensity']:.3f}",
        f"High signal ratio: {state['features']['high_signal_ratio']:.3f}",
        f"Edge density: {state['features']['edge_density']:.3f}",
    ]
    if top_vote is not None:
        findings.append(
            f"Strongest individual model: {top_vote['agent'].replace('_', ' ')} at {top_vote['confidence']:.0%} confidence"
        )
    return findings


def _build_response_from_state(case_id: str, state: WorkflowState) -> AnalysisResponse:
    confidence = float(state["confidence"])
    if confidence >= 0.85:
        severity_band = "high"
    elif confidence >= 0.55:
        severity_band = "moderate"
    else:
        severity_band = "low"

    ensemble_probabilities = state.get("ensemble_probabilities", {})
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
    tumor_profile = TumorProfile(label=state["prediction"], **TUMOR_PROFILES[state["prediction"]])
    consensus_data = state.get("consensus_summary", {"strength": "weak", "margin": 0.0, "supporting_agents": [], "dissenting_agents": []})
    verifier_executed = state.get("workflow_mode") == "extended_support"
    recommended_actions = build_recommended_actions(
        prediction=state["prediction"],
        confidence=confidence,
        verified=bool(state.get("verified", False)),
        dissenting_agents=consensus_data.get("dissenting_agents", []),
        verifier_executed=verifier_executed,
    )
    report = state.get("report") or _build_core_report(state)
    findings = state.get("findings") or _build_core_findings(state)
    verification_notes = state.get("verification_notes", [])
    if not verifier_executed:
        verification_notes = ["Paper-core mode does not execute the optional verifier agent."]
    return AnalysisResponse(
        case_id=case_id,
        workflow_mode=state.get("workflow_mode", "paper_core"),
        extensions_applied=state.get("extensions_applied", []),
        prediction=state["prediction"],
        confidence=confidence,
        severity_band=severity_band,
        findings=findings,
        report=report,
        verified=bool(state.get("verified", False)) if verifier_executed else False,
        verification_notes=verification_notes,
        class_probabilities=class_probabilities,
        differential_diagnosis=differential_diagnosis,
        tumor_profile=tumor_profile,
        consensus_summary=ConsensusSummary(**consensus_data),
        recommended_actions=recommended_actions,
        citations=state.get("citations", []),
        model_votes=[ModelVote(**vote) for vote in state.get("model_votes", [])],
        agent_trace=state["trace"],
        image_url=state.get("image_url"),
    )


PAPER_CORE_STEPS: list[tuple[str, Callable[[WorkflowState], WorkflowState]]] = [
    ("storage", upload_node),
    ("preprocessing_agent", preprocessing_node),
    ("cnn_agent", lambda state: cnn_node(state, strict=True)),
    ("resnet50_agent", lambda state: resnet50_node(state, strict=True)),
    ("vgg16_agent", lambda state: vgg16_node(state, strict=True)),
    ("inception_v3_agent", lambda state: inception_v3_node(state, strict=True)),
    ("orchestration_agent", orchestration_node),
]

EXTENDED_STEPS: list[tuple[str, Callable[[WorkflowState], WorkflowState]]] = [
    ("retrieval_agent", retrieval_node),
    ("report_agent", report_node),
    ("verification_agent", verifier_node),
    ("memory", persist_node),
]


def _initial_state(filename: str, content: bytes, workflow_mode: str) -> WorkflowState:
    return {
        "case_id": str(uuid4()),
        "filename": filename,
        "content": content,
        "trace": [],
        "model_votes": [],
        "workflow_mode": workflow_mode,
        "extensions_applied": [],
    }


def _paper_core_is_strict() -> bool:
    env = settings.app_env.lower()
    if env in {"development", "local", "test"}:
        return True
    return settings.strict_paper_core and inference_service.has_configured_weights()


def _bind_model_step(agent: str, strict: bool) -> Callable[[WorkflowState], WorkflowState]:
    def runner(state: WorkflowState) -> WorkflowState:
        return _model_node(state, agent=agent, strict=strict)

    return runner


def _run_steps(state: WorkflowState, steps: list[tuple[str, Callable[[WorkflowState], WorkflowState]]]) -> WorkflowState:
    for _, handler in steps:
        state = handler(state)
    return state


def _core_steps() -> list[tuple[str, Callable[[WorkflowState], WorkflowState]]]:
    strict_mode = _paper_core_is_strict()
    return [
        ("storage", upload_node),
        ("preprocessing_agent", preprocessing_node),
        ("cnn_agent", _bind_model_step("cnn_agent", strict_mode)),
        ("resnet50_agent", _bind_model_step("resnet50_agent", strict_mode)),
        ("vgg16_agent", _bind_model_step("vgg16_agent", strict_mode)),
        ("inception_v3_agent", _bind_model_step("inception_v3_agent", strict_mode)),
        ("orchestration_agent", orchestration_node),
    ]


async def run_analysis_workflow(filename: str, content: bytes) -> AnalysisResponse:
    state = _initial_state(filename=filename, content=content, workflow_mode="paper_core")
    result = _run_steps(state, _core_steps())
    return _build_response_from_state(state["case_id"], result)


async def run_extended_analysis_workflow(filename: str, content: bytes) -> AnalysisResponse:
    state = _initial_state(filename=filename, content=content, workflow_mode="extended_support")
    state = _run_steps(state, _core_steps())
    state = _run_steps(state, EXTENDED_STEPS)
    return _build_response_from_state(state["case_id"], state)


async def stream_analysis_workflow(filename: str, content: bytes, extended: bool = False):
    state = _initial_state(
        filename=filename,
        content=content,
        workflow_mode="extended_support" if extended else "paper_core",
    )
    steps = _core_steps() + (EXTENDED_STEPS if extended else [])

    for agent, handler in steps:
        yield {"type": "stage", "agent": agent, "status": "running", "case_id": state["case_id"]}
        state = handler(state)
        last_trace = state.get("trace", [])[-1]
        payload = {"type": "trace", "case_id": state["case_id"], "trace": last_trace.model_dump()}
        if agent == "orchestration_agent":
            payload["model_votes"] = state.get("model_votes", [])
            payload["prediction"] = state.get("prediction")
            payload["confidence"] = state.get("confidence")
        yield payload

    response = _build_response_from_state(state["case_id"], state)
    yield {"type": "complete", "case_id": state["case_id"], "result": response.model_dump()}
settings = get_settings()
