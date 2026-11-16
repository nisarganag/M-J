"""Extract the source DOCX without changing its wording.

Usage: python scripts/extract_ceremony.py /path/to/source.docx
Uses Python's standard library; never modifies the original.
"""
from pathlib import Path
from zipfile import ZipFile
import hashlib
import json
import re
import sys
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(sys.argv[1])
NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
W = "{" + NS["w"] + "}"

with ZipFile(SOURCE) as archive:
    xml = ET.fromstring(archive.read("word/document.xml"))
    paragraphs = []
    for paragraph in xml.findall(".//w:body//w:p", NS):
        parts = []
        for node in paragraph.iter():
            if node.tag == W + "t":
                parts.append(node.text or "")
            elif node.tag == W + "br":
                parts.append("\n")
            elif node.tag == W + "tab":
                parts.append("\t")
        paragraphs.append("".join(parts).strip())

# Positions audited against the supplied source document.
HEADINGS = [1, 5, 9, 16, 30, 36, 43, 50, 53, 70, 75, 82, 88, 94, 100,
            112, 157, 163, 173, 186, 194, 199, 204, 210, 216, 243,
            262, 270, 273, 278]
GROUP_MARKERS = {74, 111}
HYMNS = {1, 4, 6, 8, 16, 18, 23, 25, 27, 30}
READINGS = {5, 7, 9}
CEREMONY = {10, 11, 12, 13, 14, 22, 29, 31}

sections = []
covered = {0, *GROUP_MARKERS, *range(283, 290)}
for offset, start in enumerate(HEADINGS):
    number = offset + 1 if offset < 25 else offset + 2
    end = HEADINGS[offset + 1] if offset + 1 < len(HEADINGS) else 283
    title = re.sub(r"^\d+\.\s*", "", paragraphs[start]).strip()
    posture = ""
    body = []
    for index in range(start + 1, end):
        if index in GROUP_MARKERS:
            continue
        value = paragraphs[index]
        if value.startswith("CONGREGATION:"):
            posture = value.split(":", 1)[1].strip()
        elif value:
            body.append(value)
        covered.add(index)
    covered.add(start)
    chapter = ("opening" if number <= 4 else "word" if number <= 10 else
               "marriage" if number <= 15 else "eucharist" if number <= 25 else "closing")
    category = ("hymn" if number in HYMNS else "reading" if number in READINGS else
                "ceremony" if number in CEREMONY else "prayer")
    sections.append({
        "id": f"section-{number:02}", "number": number, "title": title,
        "chapter": chapter, "category": category, "posture": posture,
        "content": "\n\n".join(body),
    })

uncovered = [i for i, text in enumerate(paragraphs) if text and i not in covered]
if uncovered:
    raise ValueError(f"Uncovered source paragraphs: {uncovered}")

document = {
    "schemaVersion": 1,
    "couple": {"firstName": "Mohini", "secondName": "Jewel"},
    "intro": {
        "eyebrow": "THE WEDDING CELEBRATION OF",
        "title": "Blessed is His love.",
        "message": "Together with our families, we invite you to join us in prayer, song, and the celebration of our love.",
    },
    "closing": {"title": paragraphs[283].title(),
                "message": "\n\n".join(paragraphs[284:290])},
    "sections": sections,
}
target = ROOT / "src/data/default-ceremony.json"
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(json.dumps(document, ensure_ascii=False, indent=2) + "\n")
manifest = {
    "source": SOURCE.name,
    "sha256": hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
    "paragraphCount": len(paragraphs),
    "nonEmptyParagraphCount": sum(bool(p) for p in paragraphs),
    "sectionCount": len(sections),
    "sectionNumbers": [s["number"] for s in sections],
    "notes": ["The supplied document skips section 26; no missing text has been invented.",
              "Hymn line breaks are extracted from Word line-break elements.",
              "Leading/trailing whitespace and heading number formatting are normalized.",
              "Every non-empty source paragraph is accounted for in content, titles, posture cues, chapter headings, or the source title and closing."],
}
(ROOT / "src/data/source-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
print(f"Extracted {len(sections)} sections; {manifest['nonEmptyParagraphCount']} source paragraphs accounted for.")
