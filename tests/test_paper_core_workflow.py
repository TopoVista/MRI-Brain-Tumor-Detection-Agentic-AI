from app.workflows import orchestrator


def test_paper_core_response_has_only_core_trace(monkeypatch):
    monkeypatch.setattr(orchestrator, "store_scan", lambda case_id, filename, content: f"/tmp/{case_id}.png")
    monkeypatch.setattr(
        orchestrator,
        "run_preprocessing_agent",
        lambda content: {
            "image": object(),
            "features": {
                "mean_intensity": 0.15,
                "std_intensity": 0.12,
                "high_signal_ratio": 0.02,
                "edge_density": 0.03,
                "laplacian_variance": 1.0,
                "size": [224, 224],
            },
            "inference_note": "paper preprocessing complete",
        },
    )

    votes = {
        "cnn_agent": {
            "agent": "cnn_agent",
            "prediction": "notumor",
            "confidence": 0.80,
            "probabilities": {"glioma": 0.05, "meningioma": 0.05, "notumor": 0.80, "pituitary": 0.10},
            "mode": "onnx",
            "note": "cnn complete",
        },
        "resnet50_agent": {
            "agent": "resnet50_agent",
            "prediction": "notumor",
            "confidence": 0.90,
            "probabilities": {"glioma": 0.03, "meningioma": 0.04, "notumor": 0.90, "pituitary": 0.03},
            "mode": "onnx",
            "note": "resnet complete",
        },
        "vgg16_agent": {
            "agent": "vgg16_agent",
            "prediction": "notumor",
            "confidence": 0.88,
            "probabilities": {"glioma": 0.04, "meningioma": 0.03, "notumor": 0.88, "pituitary": 0.05},
            "mode": "onnx",
            "note": "vgg complete",
        },
        "inception_v3_agent": {
            "agent": "inception_v3_agent",
            "prediction": "pituitary",
            "confidence": 0.60,
            "probabilities": {"glioma": 0.10, "meningioma": 0.10, "notumor": 0.20, "pituitary": 0.60},
            "mode": "onnx",
            "note": "inception complete",
        },
    }

    monkeypatch.setattr(orchestrator, "run_model_agent", lambda agent, image, features, strict: votes[agent])

    response = orchestrator._build_response_from_state(
        "case-1",
        orchestrator._run_steps(
            {
                "case_id": "case-1",
                "filename": "scan.png",
                "content": b"content",
                "trace": [],
                "model_votes": [],
                "workflow_mode": "paper_core",
                "extensions_applied": [],
            },
            orchestrator.PAPER_CORE_STEPS,
        ),
    )

    assert response.workflow_mode == "paper_core"
    assert response.extensions_applied == []
    assert [trace.agent for trace in response.agent_trace] == [
        "storage",
        "preprocessing_agent",
        "cnn_agent",
        "resnet50_agent",
        "vgg16_agent",
        "inception_v3_agent",
        "orchestration_agent",
    ]
    assert response.citations == []
    assert response.verified is False
    assert "Paper-core mode does not execute the optional verifier agent." in response.verification_notes


def test_extended_workflow_adds_optional_agents(monkeypatch):
    monkeypatch.setattr(orchestrator, "store_scan", lambda case_id, filename, content: f"/tmp/{case_id}.png")
    monkeypatch.setattr(
        orchestrator,
        "run_preprocessing_agent",
        lambda content: {
            "image": object(),
            "features": {
                "mean_intensity": 0.15,
                "std_intensity": 0.12,
                "high_signal_ratio": 0.02,
                "edge_density": 0.03,
                "laplacian_variance": 1.0,
                "size": [224, 224],
            },
            "inference_note": "paper preprocessing complete",
        },
    )
    monkeypatch.setattr(
        orchestrator,
        "run_model_agent",
        lambda agent, image, features, strict: {
            "agent": agent,
            "prediction": "notumor",
            "confidence": 0.85,
            "probabilities": {"glioma": 0.05, "meningioma": 0.03, "notumor": 0.85, "pituitary": 0.07},
            "mode": "onnx",
            "note": f"{agent} complete",
        },
    )
    monkeypatch.setattr(orchestrator, "run_retrieval_agent", lambda prediction, features: [])
    monkeypatch.setattr(orchestrator, "run_report_agent", lambda prediction, confidence, features, citations, model_votes: {"report": "extended report", "findings": ["finding"]})
    monkeypatch.setattr(orchestrator, "run_verifier_agent", lambda prediction, confidence, report, citations, model_votes: {"verified": True, "notes": ["verified"]})
    monkeypatch.setattr(orchestrator, "save_case", lambda **kwargs: None)

    state = {
        "case_id": "case-2",
        "filename": "scan.png",
        "content": b"content",
        "trace": [],
        "model_votes": [],
        "workflow_mode": "extended_support",
        "extensions_applied": [],
    }
    state = orchestrator._run_steps(state, orchestrator.PAPER_CORE_STEPS)
    state = orchestrator._run_steps(state, orchestrator.EXTENDED_STEPS)
    response = orchestrator._build_response_from_state("case-2", state)

    assert response.workflow_mode == "extended_support"
    assert response.extensions_applied == ["retrieval_agent", "report_agent", "verification_agent", "memory"]
    assert response.verified is True
    assert response.report == "extended report"
