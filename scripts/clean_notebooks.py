#!/usr/bin/env python3
"""Strip outputs and execution counts from Jupyter notebooks.

Usage:
  python scripts/clean_notebooks.py [path1 path2 ...]

If no paths are provided, the script will find all `.ipynb` files in the repository
folder and clean them.

The script rewrites notebooks in-place when changes are detected.
"""
import json
import sys
from pathlib import Path


def clean_notebook(path: Path) -> bool:
    """Return True if the file was changed (and written)."""
    try:
        text = path.read_text(encoding="utf-8")
        nb = json.loads(text)
    except Exception as e:
        print(f"[skip] {path}: failed to read/parse ({e})")
        return False

    changed = False
    cells = nb.get("cells", [])
    for cell in cells:
        if cell.get("cell_type") == "code":
            # clear outputs
            outputs = cell.get("outputs")
            if outputs:
                cell["outputs"] = []
                changed = True

            # clear execution count
            if cell.get("execution_count") not in (None, "", 0):
                cell["execution_count"] = None
                changed = True

            # Optionally, remove large metadata fields that store execution state
            metadata = cell.get("metadata", {})
            if metadata.get("_execution"):  # non-standard metadata
                metadata.pop("_execution", None)
                cell["metadata"] = metadata
                changed = True

    if changed:
        # write pretty JSON with consistent separators
        path.write_text(json.dumps(nb, ensure_ascii=False, indent=1, separators=(",", ": ")), encoding="utf-8")
        print(f"[cleaned] {path}")
    else:
        print(f"[clean] {path} (no changes)")

    return changed


def find_notebooks(root: Path):
    return list(root.rglob("*.ipynb"))


def main():
    repo_root = Path(__file__).resolve().parents[1]
    paths = [Path(p) for p in sys.argv[1:]] if len(sys.argv) > 1 else find_notebooks(repo_root)

    any_changed = False
    for p in paths:
        if p.exists():
            if clean_notebook(p):
                any_changed = True
        else:
            print(f"[warn] path not found: {p}")

    if any_changed:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
