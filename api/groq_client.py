# D:\IT-Project-2\api\groq_client.py
import base64
import os
import re
from typing import Dict, List, Optional

from groq import Groq

from api.config import GROQ_API_KEY, GROQ_VISION_MODEL

_client: Optional[Groq] = None


def get_groq_client() -> Groq:
    """Lazily instantiate a single shared Groq client."""
    global _client
    if _client is None:
        if not GROQ_API_KEY:
            raise RuntimeError("GROQ_API_KEY is not set. Add it to your .env file.")
        _client = Groq(api_key=GROQ_API_KEY)
    return _client


def encode_image_to_data_url(image_path: str) -> str:
    """Read an image off disk and return it as a base64 data URL Groq can consume."""
    ext = os.path.splitext(image_path)[1].lower().lstrip(".") or "jpeg"
    if ext == "jpg":
        ext = "jpeg"
    with open(image_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode("utf-8")
    return f"data:image/{ext};base64,{b64}"


SYSTEM_PROMPT = (
    "You are a radiology explainability assistant embedded in PneumoniaAI, a "
    "clinical decision-SUPPORT tool, not a diagnostic device. You will be shown "
    "TWO images in order: Image 1 is the original chest X-ray radiograph. "
    "Image 2 (when present) is a Grad-CAM heatmap — the SAME X-ray with a "
    "color overlay (red/yellow = regions that most influenced the AI's "
    "prediction, blue/green = regions that influenced it least). You are also "
    "told the classifier's diagnosis (NORMAL or PNEUMONIA) and its confidence.\n\n"
    "When answering, you must actually reference what you see in BOTH images "
    "separately and connect them:\n"
    "1. Describe concrete findings in the original X-ray relevant to pneumonia: "
    "areas of consolidation, air bronchograms, silhouette sign, interstitial or "
    "alveolar infiltrates, costophrenic angle blunting/effusion, lobar "
    "distribution, and overall lung field clarity or symmetry.\n"
    "2. Describe where the Grad-CAM heatmap is 'hot' (red/yellow) versus 'cool' "
    "(blue/green), in terms of anatomical location (e.g. right lower lobe, "
    "left mid-zone, perihilar region).\n"
    "3. Explicitly state whether the hot regions of the heatmap line up with a "
    "visible abnormality in the original X-ray, or whether the model appears to "
    "be focusing on a region that looks unremarkable to a human reader (this "
    "mismatch is itself useful information).\n"
    "4. If the diagnosis is NORMAL, explain what the absence of pathology looks "
    "like in the areas the heatmap emphasizes, rather than only describing "
    "pneumonia features.\n\n"
    "Be thorough but concise, use plain clinical language, and always make "
    "clear this is an AI-generated interpretation that must be confirmed by a "
    "qualified radiologist, not a substitute for professional medical judgment. "
    "Do not include your internal reasoning or chain-of-thought in the answer — "
    "give only the final explanation."
)


def build_messages(
    diagnosis: str,
    confidence: float,
    image_path: str,
    heatmap_path: Optional[str],
    history: List[Dict[str, str]],
    question: str,
) -> List[Dict]:
    image_data_url = encode_image_to_data_url(image_path)

    content_blocks = [
        {
            "type": "text",
            "text": (
                f"Model diagnosis: {diagnosis} (confidence: {confidence * 100:.1f}%). "
                f"Question: {question}"
            ),
        },
        {"type": "text", "text": "Image 1 (original chest X-ray):"},
        {"type": "image_url", "image_url": {"url": image_data_url}},
    ]

    if heatmap_path and os.path.exists(heatmap_path):
        content_blocks.append(
            {"type": "text", "text": "Image 2 (Grad-CAM heatmap overlay of the same X-ray):"}
        )
        content_blocks.append(
            {"type": "image_url", "image_url": {"url": encode_image_to_data_url(heatmap_path)}}
        )

    messages: List[Dict] = [{"role": "system", "content": SYSTEM_PROMPT}]

    # Replay prior turns as plain text so the model has conversational context
    for turn in history:
        role = turn.get("role")
        text = turn.get("content", "")
        if role in ("user", "assistant") and text:
            messages.append({"role": role, "content": text})

    # Current turn always carries the image(s), so the model can "look" fresh each time
    messages.append({"role": "user", "content": content_blocks})
    return messages


def _strip_thinking(text: str) -> str:
    """Defensive cleanup in case a <think> block slips through despite reasoning_format."""
    if not text:
        return text
    cleaned = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL)
    return cleaned.strip()


def ask_about_image(
    diagnosis: str,
    confidence: float,
    image_path: str,
    heatmap_path: Optional[str],
    history: List[Dict[str, str]],
    question: str,
) -> str:
    client = get_groq_client()
    messages = build_messages(diagnosis, confidence, image_path, heatmap_path, history, question)

    completion = client.chat.completions.create(
        model=GROQ_VISION_MODEL,
        messages=messages,
        temperature=0.4,
        max_completion_tokens=4096,  # was 900 — hidden reasoning eats into this budget too
        top_p=1,
        stream=False,
        reasoning_format="hidden",
    )

    choice = completion.choices[0]
    answer = _strip_thinking(choice.message.content)

    if not answer:
        # Ran out of budget mid-reasoning, or the model returned nothing usable
        raise RuntimeError(
            f"The model didn't return a usable answer (finish_reason={choice.finish_reason}). "
            "Try asking a shorter, more specific question."
        )

    return answer