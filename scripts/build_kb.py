import json
import re
import hashlib
from pathlib import Path

from pypdf import PdfReader


# ============================================================
# Paths
# ============================================================

ROOT = Path(__file__).resolve().parent.parent

SOURCE_DIR = ROOT / "knowledge_sources"
CATALOG_FILE = SOURCE_DIR / "catalog.json"

OUTPUT_DIR = ROOT / "public" / "knowledge"
DOCUMENT_OUTPUT_DIR = OUTPUT_DIR / "documents"

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
DOCUMENT_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


# ============================================================
# Chunk configuration
# ============================================================

TARGET_WORDS = 280
MAX_WORDS = 380
OVERLAP_WORDS = 45
MIN_WORDS = 35


# ============================================================
# Text utilities
# ============================================================

def clean_text(text):
    if not text:
        return ""

    # Normalize unusual whitespace
    text = text.replace("\u00a0", " ")

    # Fix hyphenated line breaks:
    # vulnera-
    # bility -> vulnerability
    text = re.sub(r"(\w)-\s*\n\s*(\w)", r"\1\2", text)

    # Normalize spaces
    text = re.sub(r"[ \t]+", " ", text)

    # Normalize line breaks
    text = re.sub(r"\r\n?", "\n", text)

    # Avoid excessive blank lines
    text = re.sub(r"\n{3,}", "\n\n", text)

    return text.strip()


def normalize_for_hash(text):
    text = text.lower()
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def make_hash(text):
    return hashlib.sha1(
        normalize_for_hash(text).encode("utf-8")
    ).hexdigest()


# ============================================================
# Paragraph-aware chunking
# ============================================================

def split_paragraphs(text):
    paragraphs = []

    for paragraph in re.split(r"\n\s*\n", text):
        paragraph = re.sub(r"\s+", " ", paragraph).strip()

        if paragraph:
            paragraphs.append(paragraph)

    return paragraphs


def chunk_text(text):
    """
    Paragraph-aware chunking.

    Tries to preserve paragraphs while keeping chunks near
    TARGET_WORDS. Very large paragraphs are split by words.
    """

    paragraphs = split_paragraphs(text)

    chunks = []

    current_words = []

    for paragraph in paragraphs:

        words = paragraph.split()

        # Very large paragraph
        if len(words) > MAX_WORDS:

            if current_words:
                chunks.append(" ".join(current_words))
                current_words = []

            start = 0

            while start < len(words):

                end = min(
                    start + TARGET_WORDS,
                    len(words)
                )

                part = words[start:end]

                if len(part) >= MIN_WORDS:
                    chunks.append(" ".join(part))

                if end >= len(words):
                    break

                start = max(
                    end - OVERLAP_WORDS,
                    start + 1
                )

            continue

        # Start a new chunk if adding paragraph is too large
        if (
            current_words
            and len(current_words) + len(words) > TARGET_WORDS
        ):

            chunks.append(
                " ".join(current_words)
            )

            overlap = current_words[-OVERLAP_WORDS:]

            current_words = overlap + words

        else:
            current_words.extend(words)

        # Hard upper bound
        if len(current_words) >= MAX_WORDS:

            chunks.append(
                " ".join(current_words[:MAX_WORDS])
            )

            current_words = current_words[
                MAX_WORDS - OVERLAP_WORDS:
            ]

    if len(current_words) >= MIN_WORDS:
        chunks.append(
            " ".join(current_words)
        )

    return chunks


# ============================================================
# PDF processing
# ============================================================

def process_pdf(path, metadata):

    reader = PdfReader(str(path))

    output = []

    empty_pages = 0

    total_pages = len(reader.pages)

    print(f"  PDF pages: {total_pages}")

    for page_index, page in enumerate(
        reader.pages,
        start=1
    ):

        try:
            raw_text = page.extract_text() or ""

        except Exception as exc:
            print(
                f"  Warning: page {page_index} "
                f"could not be read: {exc}"
            )

            empty_pages += 1
            continue

        text = clean_text(raw_text)

        if len(text.split()) < MIN_WORDS:
            empty_pages += 1
            continue

        page_chunks = chunk_text(text)

        for chunk_index, chunk_content in enumerate(
            page_chunks,
            start=1
        ):

            output.append({
                "id": (
                    f"{metadata['id']}"
                    f"_p{page_index}"
                    f"_c{chunk_index}"
                ),

                "docId": metadata["id"],

                "title": metadata["title"],

                "agency": metadata["agency"],

                "year": metadata.get("year"),

                "sourceType": metadata.get(
                    "sourceType"
                ),

                "page": page_index,

                "topics": metadata.get(
                    "topics",
                    []
                ),

                "url": metadata.get(
                    "url",
                    ""
                ),

                "text": chunk_content
            })

    if empty_pages:
        print(
            f"  Pages with little/no extractable text: "
            f"{empty_pages}/{total_pages}"
        )

    return output


# ============================================================
# Markdown / TXT processing
# ============================================================

def process_text(path, metadata):

    raw = path.read_text(
        encoding="utf-8",
        errors="ignore"
    )

    text = clean_text(raw)

    pieces = chunk_text(text)

    output = []

    for chunk_index, chunk_content in enumerate(
        pieces,
        start=1
    ):

        output.append({
            "id": (
                f"{metadata['id']}"
                f"_c{chunk_index}"
            ),

            "docId": metadata["id"],

            "title": metadata["title"],

            "agency": metadata["agency"],

            "year": metadata.get("year"),

            "sourceType": metadata.get(
                "sourceType"
            ),

            "page": None,

            "topics": metadata.get(
                "topics",
                []
            ),

            "url": metadata.get(
                "url",
                ""
            ),

            "text": chunk_content
        })

    return output


# ============================================================
# Deduplication
# ============================================================

def deduplicate(chunks):

    seen = set()

    unique = []

    for chunk in chunks:

        digest = make_hash(
            chunk["text"]
        )

        if digest in seen:
            continue

        seen.add(digest)

        unique.append(chunk)

    return unique


# ============================================================
# Write JSON
# ============================================================

def write_json(path, data, pretty=False):

    with path.open(
        "w",
        encoding="utf-8"
    ) as file:

        if pretty:
            json.dump(
                data,
                file,
                ensure_ascii=False,
                indent=2
            )

        else:
            json.dump(
                data,
                file,
                ensure_ascii=False,
                separators=(",", ":")
            )


# ============================================================
# Main
# ============================================================

def main():

    print()
    print("=" * 70)
    print("HazardWeave Knowledge Base Builder")
    print("=" * 70)

    if not CATALOG_FILE.exists():
        raise FileNotFoundError(
            f"Missing catalog:\n{CATALOG_FILE}"
        )

    with CATALOG_FILE.open(
        "r",
        encoding="utf-8-sig"
    ) as file:

        catalog = json.load(file)

    manifest_documents = []

    total_chunks = 0

    successfully_processed = 0

    failed_documents = []

    for metadata in catalog:

        print()
        print("-" * 70)

        print(
            f"Document: {metadata['title']}"
        )

        relative_file = metadata["file"]

        source_path = (
            SOURCE_DIR /
            Path(relative_file)
        )

        print(
            f"Source:   {source_path}"
        )

        if not source_path.exists():

            print("  ERROR: file does not exist")

            failed_documents.append({
                "id": metadata["id"],
                "reason": "file_missing"
            })

            continue

        suffix = source_path.suffix.lower()

        try:

            if suffix == ".pdf":

                chunks = process_pdf(
                    source_path,
                    metadata
                )

            elif suffix in {
                ".md",
                ".txt",
                ".markdown"
            }:

                chunks = process_text(
                    source_path,
                    metadata
                )

            else:

                print(
                    f"  ERROR: unsupported format {suffix}"
                )

                failed_documents.append({
                    "id": metadata["id"],
                    "reason": (
                        f"unsupported_format_{suffix}"
                    )
                })

                continue

        except Exception as exc:

            print(
                f"  ERROR: processing failed: {exc}"
            )

            failed_documents.append({
                "id": metadata["id"],
                "reason": str(exc)
            })

            continue

        original_count = len(chunks)

        chunks = deduplicate(chunks)

        removed = original_count - len(chunks)

        output_name = (
            metadata["id"] + ".json"
        )

        output_path = (
            DOCUMENT_OUTPUT_DIR /
            output_name
        )

        write_json(
            output_path,
            chunks
        )

        file_size = output_path.stat().st_size

        print(
            f"  Chunks: {len(chunks)}"
        )

        if removed:
            print(
                f"  Duplicate chunks removed: {removed}"
            )

        print(
            f"  Output: {output_path.name}"
        )

        print(
            f"  JSON size: "
            f"{file_size / 1024 / 1024:.2f} MB"
        )

        manifest_documents.append({
            "id": metadata["id"],

            "title": metadata["title"],

            "agency": metadata["agency"],

            "year": metadata.get("year"),

            "sourceType": metadata.get(
                "sourceType"
            ),

            "topics": metadata.get(
                "topics",
                []
            ),

            "url": metadata.get(
                "url",
                ""
            ),

            "file": (
                "/knowledge/documents/"
                + output_name
            ),

            "chunkCount": len(chunks),

            "sizeBytes": file_size
        })

        total_chunks += len(chunks)

        successfully_processed += 1

    # ========================================================
    # Manifest
    # ========================================================

    manifest = {

        "version": 1,

        "generator": "HazardWeave Knowledge Base Builder",

        "configuration": {
            "targetWords": TARGET_WORDS,
            "maxWords": MAX_WORDS,
            "overlapWords": OVERLAP_WORDS
        },

        "stats": {
            "documents": successfully_processed,
            "chunks": total_chunks,
            "failedDocuments": len(
                failed_documents
            )
        },

        "documents": manifest_documents,

        "failures": failed_documents
    }

    manifest_path = (
        OUTPUT_DIR /
        "manifest.json"
    )

    write_json(
        manifest_path,
        manifest,
        pretty=True
    )

    # ========================================================
    # Completion
    # ========================================================

    print()
    print("=" * 70)
    print("BUILD COMPLETE")
    print("=" * 70)

    print(
        f"Documents processed: "
        f"{successfully_processed}"
    )

    print(
        f"Total chunks: "
        f"{total_chunks}"
    )

    print(
        f"Failed documents: "
        f"{len(failed_documents)}"
    )

    print()
    print(
        f"Manifest:\n{manifest_path}"
    )

    print()

    if failed_documents:

        print("Failures:")

        for failure in failed_documents:
            print(
                f"  - {failure['id']}: "
                f"{failure['reason']}"
            )


if __name__ == "__main__":
    main()
