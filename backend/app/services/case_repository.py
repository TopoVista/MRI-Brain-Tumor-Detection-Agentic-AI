from app.memory.database import CaseRecord, get_session
from app.schemas.analysis import AnalysisSummary, CaseDetail


def save_case(
    case_id: str,
    image_name: str,
    image_url: str,
    prediction: str,
    confidence: float,
    report: str,
    verified: bool,
) -> None:
    with get_session() as session:
        record = CaseRecord(
            id=case_id,
            image_name=image_name,
            image_url=image_url,
            prediction=prediction,
            confidence=confidence,
            report=report,
            verified=verified,
        )
        session.add(record)
        session.commit()


def list_cases() -> list[AnalysisSummary]:
    with get_session() as session:
        rows = session.query(CaseRecord).order_by(CaseRecord.created_at.desc()).limit(12).all()
        return [
            AnalysisSummary(
                case_id=row.id,
                prediction=row.prediction,
                confidence=row.confidence,
                created_at=row.created_at.isoformat(),
            )
            for row in rows
        ]


def get_case(case_id: str) -> CaseDetail | None:
    with get_session() as session:
        row = session.query(CaseRecord).filter(CaseRecord.id == case_id).first()
        if row is None:
            return None
        return CaseDetail(
            case_id=row.id,
            image_name=row.image_name,
            image_url=row.image_url,
            prediction=row.prediction,
            confidence=row.confidence,
            report=row.report,
            verified=row.verified,
            created_at=row.created_at.isoformat(),
        )
