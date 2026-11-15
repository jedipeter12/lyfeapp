"""Check repository documentation without third-party dependencies."""

from pathlib import Path
import re
import subprocess
import sys
from urllib.parse import unquote


ROOT = Path(__file__).resolve().parents[1]
REQUIRED = (
    "AGENTS.md",
    "CLAUDE.md",
    "README.md",
    "docs/PRODUCT.md",
    "docs/ARCHITECTURE.md",
    "docs/DOMAIN_MODEL.md",
    "docs/DECISIONS.md",
    "docs/ROADMAP.md",
    "docs/DEVELOPMENT.md",
    "docs/BACKLOG.md",
)
LINK = re.compile(r"(?<!!)\[[^\]]+\]\(([^)]+)\)")


def check() -> list[str]:
    errors = []
    for name in REQUIRED:
        if not (ROOT / name).is_file():
            errors.append(f"missing required file: {name}")

    markdown_paths = subprocess.check_output(
        ["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z", "--", "*.md"],
        cwd=ROOT,
    )
    for name in markdown_paths.split(b"\0"):
        if not name:
            continue
        path = ROOT / name.decode("utf-8")
        relative = path.relative_to(ROOT)
        for line_no, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            if line.rstrip() != line:
                errors.append(f"{relative}:{line_no}: trailing whitespace")
            for raw in LINK.findall(line):
                target = raw.strip().split()[0].strip("<>")
                if target.startswith(("#", "http://", "https://", "mailto:")):
                    continue
                target = unquote(target.split("#", 1)[0])
                if target and not (path.parent / target).exists():
                    errors.append(f"{relative}:{line_no}: broken link: {raw}")
    return errors


if __name__ == "__main__":
    failures = check()
    if failures:
        print("\n".join(failures), file=sys.stderr)
        raise SystemExit(1)
    print("Repository documentation check passed")
