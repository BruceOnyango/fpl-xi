"""Raw-payload persistence. Only responsibility: read/write JSON (SRP)."""

from __future__ import annotations
import json
from pathlib import Path


class JsonRawDataRepository:
    def __init__(self, root: str | Path):
        self._root = Path(root)
        self._root.mkdir(parents=True, exist_ok=True)

    def _path(self, name: str) -> Path:
        return self._root / f"{name}.json"

    def save(self, name: str, payload: object) -> None:
        self._path(name).write_text(json.dumps(payload), encoding="utf-8")

    def load(self, name: str) -> object:
        return json.loads(self._path(name).read_text(encoding="utf-8"))

    def exists(self, name: str) -> bool:
        return self._path(name).exists()
