import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.rag import get_knowledge_collection, embed_texts

KB_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "api", "knowledge_base")


def chunk_markdown(text: str):
    """Split on blank lines into paragraph-level chunks, dropping tiny/heading-only ones."""
    raw_chunks = [c.strip() for c in text.split("\n\n")]
    return [c for c in raw_chunks if len(c) > 40 and not c.startswith("#")]


def build_index():
    if not os.path.isdir(KB_DIR):
        print(f"Knowledge base directory not found: {KB_DIR}")
        return

    collection = get_knowledge_collection()

    ids, documents, metadatas = [], [], []
    for filename in sorted(os.listdir(KB_DIR)):
        if not filename.endswith(".md"):
            continue
        path = os.path.join(KB_DIR, filename)
        with open(path, "r", encoding="utf-8") as f:
            text = f.read()
        for i, chunk in enumerate(chunk_markdown(text)):
            ids.append(f"{filename}_{i}")
            documents.append(chunk)
            metadatas.append({"source": filename})

    if not ids:
        print("No chunks found. Check api/knowledge_base/*.md files.")
        return

    print(f"Embedding {len(ids)} chunks from {KB_DIR} ...")
    embeddings = embed_texts(documents)

    collection.upsert(ids=ids, embeddings=embeddings, documents=documents, metadatas=metadatas)
    print(f"Indexed {len(ids)} chunks into 'clinical_knowledge' ({collection.count()} total).")


if __name__ == "__main__":
    build_index()