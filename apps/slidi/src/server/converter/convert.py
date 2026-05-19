"""
MarkItDown bridge script for Slidi.
Usage: python convert.py <file_path>
Outputs the converted Markdown to stdout.
Errors are written to stderr with a non-zero exit code.
"""

import sys
import os


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: convert.py <file_path>", file=sys.stderr)
        sys.exit(1)

    file_path = sys.argv[1]

    if not os.path.exists(file_path):
        print(f"File not found: {file_path}", file=sys.stderr)
        sys.exit(1)

    try:
        from markitdown import MarkItDown  # type: ignore
    except ImportError:
        print(
            "markitdown is not installed. "
            "Run: pip install \"markitdown[all]\"",
            file=sys.stderr,
        )
        sys.exit(2)

    try:
        md = MarkItDown()
        result = md.convert(file_path)
        text = result.text_content
        if not text or not text.strip():
            print(
                "Conversion produced empty output. "
                "The file may be unsupported or have no extractable text.",
                file=sys.stderr,
            )
            sys.exit(1)
        # Write UTF-8 to stdout
        sys.stdout.buffer.write(text.encode("utf-8"))
    except Exception as exc:  # noqa: BLE001
        print(f"Conversion error: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
