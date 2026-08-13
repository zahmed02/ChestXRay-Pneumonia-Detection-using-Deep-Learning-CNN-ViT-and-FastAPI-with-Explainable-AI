from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from api.database import SessionLocal
from api import models
from api.schemas import ExplainRequest, ExplainResponse, RetrievedSource
from api.groq_client import ask_about_image
from api.rag import retrieve_clinical_knowledge, retrieve_similar_cases, index_case

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _format_retrieved_context(knowledge, cases):
    """Builds the text block injected into the Groq prompt, plus a parallel
    list of RetrievedSource entries for the API response / UI."""
    if not knowledge and not cases:
        return None, []

    lines = ["RETRIEVED CONTEXT (from PneumoniaAI's internal knowledge base and case history):"]
    sources = []

    if knowledge:
        lines.append("\nClinical reference snippets:")
        for i, item in enumerate(knowledge, start=1):
            tag = f"KB{i}"
            lines.append(f"[{tag}] {item['text']}")
            sources.append(RetrievedSource(
                type="knowledge",
                label=f"Reference {tag} ({item['source']})",
                snippet=item["text"][:220],
            ))

    if cases:
        lines.append("\nSimilar past cases from this system:")
        for item in cases:
            tag = f"Case #{item['prediction_id']}"
            conf = item.get("confidence")
            conf_pct = f"{conf * 100:.1f}%" if conf is not None else "n/a"
            lines.append(f"[{tag}] Diagnosis: {item['diagnosis']} ({conf_pct} confidence). {item['text']}")
            sources.append(RetrievedSource(
                type="case",
                label=tag,
                snippet=item["text"][:220],
            ))

    return "\n".join(lines), sources


@router.post("/explain/{prediction_id}", response_model=ExplainResponse)
def explain_prediction(prediction_id: int, req: ExplainRequest, db: Session = Depends(get_db)):
    pred = db.query(models.Prediction).filter(models.Prediction.id == prediction_id).first()
    if not pred:
        raise HTTPException(status_code=404, detail="Prediction not found")

    question = (req.question or "").strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    history = [turn.dict() for turn in (req.history or [])]

    # --- RAG retrieval (best-effort; never blocks the explanation) ---
    retrieval_query = f"{pred.diagnosis} chest X-ray: {question}"
    try:
        knowledge_hits = retrieve_clinical_knowledge(retrieval_query, k=3)
    except Exception as e:
        print(f"Warning: clinical knowledge retrieval failed: {e}")
        knowledge_hits = []
    try:
        case_hits = retrieve_similar_cases(retrieval_query, exclude_prediction_id=prediction_id, k=3)
    except Exception as e:
        print(f"Warning: similar case retrieval failed: {e}")
        case_hits = []

    retrieved_context, sources = _format_retrieved_context(knowledge_hits, case_hits)

    try:
        answer = ask_about_image(
            diagnosis=pred.diagnosis,
            confidence=pred.confidence,
            image_path=pred.image_path,
            heatmap_path=pred.heatmap_path,
            history=history,
            question=question,
            retrieved_context=retrieved_context,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Groq API error: {e}")

    # Enrich this case's vector-store entry with the real explanation text,
    # so future questions (on this case or others) can retrieve it as a
    # genuinely similar past case, not just a diagnosis/confidence match.
    try:
        index_case(
            prediction_id=pred.id,
            diagnosis=pred.diagnosis,
            confidence=pred.confidence,
            description=f"{pred.diagnosis} case ({pred.confidence * 100:.1f}% confidence). {answer[:500]}",
        )
    except Exception as e:
        print(f"Warning: failed to enrich case index for prediction {pred.id}: {e}")

    return ExplainResponse(answer=answer, prediction_id=prediction_id, sources=sources)