"""
Gemini client adapter for Phase 5A Emergency Understanding experimentation.

Implements LLMClientProtocol using the Google GenAI SDK.
- Reads API key strictly from GEMINI_API_KEY environment variable.
- Fails clearly if API key is missing (no silent fallback to mock).
- Enforces strict JSON output schema and zero temperature for deterministic output.
- Isolates untrusted emergency descriptions from system instructions.
- Includes automatic backoff handling for HTTP 429 / RESOURCE_EXHAUSTED rate limits.
"""

import json
import os
import re
import time
from typing import Optional


class GeminiClient:
    """
    Adapter implementing LLMClientProtocol for Google Gemini models.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model_name: str = "gemini-3.5-flash",
    ):
        resolved_key = api_key or os.environ.get("GEMINI_API_KEY")
        if not resolved_key or not resolved_key.strip():
            raise ValueError(
                "GEMINI_API_KEY is not set or empty. Provide an API key via environment variable "
                "'GEMINI_API_KEY' or directly to the client constructor."
            )
        self.api_key = resolved_key.strip()
        self.model_name = model_name
        self._init_sdk_client()

    def _init_sdk_client(self) -> None:
        """Initialize Google GenAI client, supporting both modern and legacy SDK formats."""
        try:
            from google import genai
            from google.genai import types

            self._sdk_type = "google-genai"
            self._client = genai.Client(api_key=self.api_key)
            self._types = types
        except ImportError:
            try:
                import google.generativeai as genai_legacy

                self._sdk_type = "google-generativeai"
                genai_legacy.configure(api_key=self.api_key)
                self._client = genai_legacy.GenerativeModel(
                    model_name=self.model_name,
                    generation_config={"temperature": 0.0, "response_mime_type": "application/json"},
                )
            except ImportError as err:
                raise ImportError(
                    "Neither 'google-genai' nor 'google-generativeai' SDK is installed. "
                    "Install with: pip install google-genai"
                ) from err

    def complete(self, system_prompt: str, user_prompt: str) -> str:
        """
        Invoke Gemini model with system instructions and user prompt.
        Handles 429 quota exhaustion with automatic backoff retry.
        Fails immediately if daily quota is reached so fallback triggers instantly.
        """
        max_retries = 3
        backoff_seconds = 45.0

        for attempt in range(max_retries):
            try:
                if self._sdk_type == "google-genai":
                    config = self._types.GenerateContentConfig(
                        system_instruction=system_prompt,
                        temperature=0.0,
                        response_mime_type="application/json",
                    )
                    response = self._client.models.generate_content(
                        model=self.model_name,
                        contents=user_prompt,
                        config=config,
                    )
                    return response.text or ""

                elif self._sdk_type == "google-generativeai":
                    combined_prompt = f"SYSTEM INSTRUCTIONS:\n{system_prompt}\n\nUSER PROMPT:\n{user_prompt}"
                    response = self._client.generate_content(combined_prompt)
                    return response.text or ""

            except Exception as e:
                err_str = str(e)
                # If daily quota is hit, waiting will not help—raise immediately to trigger fallback
                if "PerDay" in err_str:
                    raise RuntimeError("Gemini daily quota exhausted (GenerateRequestsPerDay).") from e

                if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                    match = re.search(r"retry in (\d+(\.\d+)?)s", err_str, re.IGNORECASE)
                    wait_time = float(match.group(1)) + 2.0 if match else backoff_seconds
                    print(f"\n[Rate Limit 429] Waiting {wait_time:.1f}s (attempt {attempt + 1}/{max_retries})...")
                    time.sleep(wait_time)
                else:
                    raise e

        raise RuntimeError("Exceeded maximum retries for Gemini API due to rate limits.")