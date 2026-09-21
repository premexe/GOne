"""
Local LLM client adapter for Ollama.
Connects via Ollama's HTTP API using Python's standard library (no extra pip packages).
"""

import json
import urllib.request


class LocalLLMClient:
    def __init__(
        self,
        endpoint: str = "http://localhost:11434/api/generate",
        model_name: str = "qwen2.5:1.5b",
    ):
        self.endpoint = endpoint
        self.model_name = model_name

    def complete(self, system_prompt: str, user_prompt: str) -> str:
        payload = {
            "model": self.model_name,
            "system": system_prompt,
            "prompt": user_prompt,
            "stream": False,
            "format": "json",
            "options": {"temperature": 0.0},
        }

        req = urllib.request.Request(
            self.endpoint,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        with urllib.request.urlopen(req, timeout=60.0) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data.get("response", "")