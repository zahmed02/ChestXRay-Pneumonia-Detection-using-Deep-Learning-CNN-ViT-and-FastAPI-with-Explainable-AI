"""
Retrieval-Augmented Generation (RAG) layer for PneumoniaAI.

Two local ChromaDB collections, embedded with a local sentence-transformers
model (no external API key — Groq does not currently offer an embeddings
endpoint):

- "clinical_knowledge": curated reference snippets about pneumonia
  radiographic findings, built from api/knowledge_base/*.md via
  scripts/build_knowledge_index.py.
- "case_history": short semantic summaries of past predictions (diagnosis,
  confidence, and — once available — the AI-generated explanation text),
  so new questions can surface similar past cases from this system.
"""
import os
from typing import Dict, List, Optional

import chromadb
from sentence_transformers import SentenceTransformer

CHROMA_DB_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "chroma_db")
EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"

_embedder: Optional[SentenceTransformer] = None
_chroma_client = None
_knowledge_collection = None
_case_collection = None


def get_embedder() -> SentenceTransformer:
    global _embedder
    if _embedder is None:
        print(f"Loading embedding model '{EMBEDDING_MODEL_NAME}' (first call only)...")
        _embedder = SentenceTransformer(EMBEDDING_MODEL_NAME)
    return _embedder


def _get_chroma_client():
    global _chroma_client
    if _chroma_client is None:
        os.makedirs(CHROMA_DB_DIR, exist_ok=True)
        _chroma_client = chromadb.PersistentClient(path=CHROMA_DB_DIR)
    return _chroma_client


def get_knowledge_collection():
    global _knowledge_collection
    if _knowledge_collection is None:
        _knowledge_collection = _get_chroma_client().get_or_create_collection(name="clinical_knowledge")
    return _knowledge_collection


def get_case_collection():
    global _case_collection
    if _case_collection is None:
        _case_collection = _get_chroma_client().get_or_create_collection(name="case_history")
    return _case_collection


def embed_texts(texts: List[str]) -> List[List[float]]:
    return get_embedder().encode(texts, convert_to_numpy=True).tolist()


def retrieve_clinical_knowledge(query: str, k: int = 3) -> List[Dict]:
    collection = get_knowledge_collection()
    if collection.count() == 0:
        return []
    query_embedding = embed_texts([query])[0]
    results = collection.query(query_embeddings=[query_embedding], n_results=min(k, collection.count()))

    ids = results.get("ids", [[]])[0]
    docs = results.get("documents", [[]])[0]
    metas = results.get("metadatas", [[]])[0]
    dists = results.get("distances", [[]])[0]

    return [
        {
            "id": ids[i],
            "text": docs[i],
            "source": (metas[i] or {}).get("source", "clinical_knowledge"),
            "distance": dists[i],
        }
        for i in range(len(ids))
    ]


def retrieve_similar_cases(query: str, exclude_prediction_id: Optional[int] = None, k: int = 3) -> List[Dict]:
    collection = get_case_collection()
    if collection.count() == 0:
        return []
    query_embedding = embed_texts([query])[0]
    # Over-fetch by one so we can drop the current case and still return k
    n_results = min(k + 1, collection.count())
    results = collection.query(query_embeddings=[query_embedding], n_results=n_results)

    ids = results.get("ids", [[]])[0]
    docs = results.get("documents", [[]])[0]
    metas = results.get("metadatas", [[]])[0]
    dists = results.get("distances", [[]])[0]

    out = []
    for i in range(len(ids)):
        meta = metas[i] or {}
        if exclude_prediction_id is not None and str(meta.get("prediction_id")) == str(exclude_prediction_id):
            continue
        out.append({
            "id": ids[i],
            "text": docs[i],
            "prediction_id": meta.get("prediction_id"),
            "diagnosis": meta.get("diagnosis"),
            "confidence": meta.get("confidence"),
            "distance": dists[i],
        })
        if len(out) >= k:
            break
    return out


def index_case(prediction_id: int, diagnosis: str, confidence: float, description: str) -> None:
    """
    Upsert a semantic summary of a case into case_history. Called once
    (minimally, diagnosis+confidence only) right after a prediction is
    created, and again (richer, with real findings) after an AI explanation
    is generated for that prediction.
    """
    try:
        collection = get_case_collection()
        embedding = embed_texts([description])[0]
        collection.upsert(
            ids=[str(prediction_id)],
            embeddings=[embedding],
            documents=[description],
            metadatas=[{
                "prediction_id": prediction_id,
                "diagnosis": diagnosis,
                "confidence": confidence,
            }],
        )
    except Exception as e:
        # Indexing must never break the predict/explain request flow
        print(f"Warning: failed to index case {prediction_id} into vector store: {e}")