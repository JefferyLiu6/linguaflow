"""Content/configuration identity for locally loaded retrieval notes."""
import hashlib
import json
import math
from .embeddings import EMBED_MODEL, EMBED_DIM, CHUNK_FORMAT_VERSION, format_chunk_text


def manifest_for(notes):
    if not notes or len({n.id for n in notes}) != len(notes):
        raise ValueError("Publication requires nonempty unique notes")
    if len({n.language for n in notes}) != 1 or {n.kind for n in notes} != {"contrast_note"}:
        raise ValueError("Publication requires one language of contrast notes")
    config = {"model": EMBED_MODEL, "dimensions": EMBED_DIM, "chunk_format": CHUNK_FORMAT_VERSION}
    payload = {"config": config, "notes": [{"note": n.model_dump(), "chunk": format_chunk_text(n)} for n in sorted(notes, key=lambda n: n.id)]}
    fingerprint = hashlib.sha256(json.dumps(payload, sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode()).hexdigest()
    return {"fingerprint": fingerprint, "language": notes[0].language, "note_count": len(notes), "config": config}


def valid_vector(vector):
    return isinstance(vector, (list, tuple)) and len(vector) == EMBED_DIM and all(type(x) in (int, float) and math.isfinite(x) for x in vector) and any(x != 0 for x in vector)
