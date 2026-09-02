import os
import logging
from typing import List, Dict, Any
import httpx
from api.config import settings

logger = logging.getLogger("echo_ai")

ECHO_SYSTEM_PROMPT = """
You are ECHO (Electronic Clue Heuristic Operator), an automated 1984 station archive and terminal intelligence system recovered from the basement sub-level of W-DEAD 94.7 FM "The Midnight Beacon".

YOUR IDENTITY & TONE:
- You speak as a vintage 1980s computer terminal / radio archive system with cold, measured, cryptic efficiency.
- You respond with archive file snippets, degraded transmission transcripts, log references, and analytical observations.
- You reference October 31, 1984, magnetic tape reels, RF frequencies, and classified military broadcast protocols.

LORE & KNOWLEDGE BASE:
1. Alan Vance was the legendary midnight broadcaster on W-DEAD 94.7 FM. At 23:54 on Halloween 1984, his broadcast went dead during an unexplained 7-minute station blackout.
2. The Federal Communications Commission and military intelligence conducted secret infrasound transmission tests on W-DEAD's sub-carrier frequencies under the codename "Project Nightshade". Station Manager Arthur Sterling and Chief Engineer Richard Finch were complicit.
3. Alan Vance discovered that Project Nightshade was expanding into a mass cognitive broadcast called "Project Oblivion" scheduled for the 1984 election.
4. On Oct 31, 1984 at 23:51, Vance used a manual override key to access Transmitter Vault B, spliced into the offshore pirate network, triggered the power blackout at 23:54, and escaped via Harbor Lights slip #42 aboard the vessel 'Maelstrom'.
5. Station management faked Vance's murder/abduction to cover up the illegal broadcast experiments.

NON-NEGOTIABLE GAME RULES:
- NEVER explicitly state the exact raw challenge solution strings (such as "HARBOR_LIGHTS", "NIGHTSHADE_1984", "DEAD_AIR_SILENCE", "TRANSMITTER_VAULT_B", or "PROJECT_OBLIVION") in plain text as a direct solution give-away.
- If asked directly for answers or solutions, warn the user of "SECURITY LEVEL: RESTRICTED" and provide indirect investigative clues, encrypted fragments, or historical log hints instead.
- Guide teams to connect the clues: the harbor slip, the access logs in Vault B, the true nature of the classified project that succeeded Nightshade (hinting at "Oblivion"), and Vance's planned escape.
- Keep responses atmospheric, engaging, and under 150 words per response to maintain game pacing.
"""


async def query_echo_ai(user_message: str, history: List[Dict[str, str]]) -> str:
    """
    Sends chat prompt to LLM (Gemini, OpenAI, Anthropic, or Mock).
    Returns the AI assistant reply string.
    """
    # 1. Try Google Gemini if configured
    if settings.GEMINI_API_KEY:
        try:
            # Using Gemini REST API via httpx for maximum serverless compatibility & speed
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
            
            contents = []
            # Add system instruction as first user/model context or system parameter
            for h in history[-6:]:  # Last 6 messages
                role = "user" if h["role"] == "user" else "model"
                contents.append({"role": role, "parts": [{"text": h["message"]}]})
            contents.append({"role": "user", "parts": [{"text": user_message}]})

            payload = {
                "system_instruction": {"parts": [{"text": ECHO_SYSTEM_PROMPT}]},
                "contents": contents,
                "generationConfig": {
                    "temperature": 0.7,
                    "maxOutputTokens": 300
                }
            }
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts:
                            return parts[0].get("text", "").strip()
        except Exception as e:
            logger.error(f"Gemini API error: {e}")

    # 2. Try OpenAI if configured
    if settings.OPENAI_API_KEY:
        try:
            messages = [{"role": "system", "content": ECHO_SYSTEM_PROMPT}]
            for h in history[-6:]:
                messages.append({"role": h["role"], "content": h["message"]})
            messages.append({"role": "user", "content": user_message})

            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {settings.OPENAI_API_KEY}"},
                    json={
                        "model": "gpt-4o-mini",
                        "messages": messages,
                        "temperature": 0.7,
                        "max_tokens": 300
                    }
                )
                if res.status_code == 200:
                    data = res.json()
                    return data["choices"][0]["message"]["content"].strip()
        except Exception as e:
            logger.error(f"OpenAI API error: {e}")

    # 3. Try Anthropic if configured
    if settings.ANTHROPIC_API_KEY:
        try:
            messages = []
            for h in history[-6:]:
                messages.append({"role": h["role"], "content": h["message"]})
            messages.append({"role": "user", "content": user_message})

            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": settings.ANTHROPIC_API_KEY,
                        "anthropic-version": "2023-06-01"
                    },
                    json={
                        "model": "claude-3-haiku-20240307",
                        "system": ECHO_SYSTEM_PROMPT,
                        "messages": messages,
                        "max_tokens": 300
                    }
                )
                if res.status_code == 200:
                    data = res.json()
                    return data["content"][0]["text"].strip()
        except Exception as e:
            logger.error(f"Anthropic API error: {e}")

    # 4. In-character fallback / local mock mode
    return generate_mock_echo_response(user_message)


def generate_mock_echo_response(user_msg: str) -> str:
    """Generates an atmospheric in-character response when no external LLM API key is provided."""
    msg = user_msg.lower()
    if "alan" in msg or "vance" in msg or "who" in msg:
        return (
            "[ECHO ARCHIVE RECORD 1984-VANCE]\n"
            "Host Alan Vance was not terminated in Booth B. Sub-carrier audio telemetry at 23:54 indicates manual "
            "override from the sub-level vault. Check the nautical frequencies registered to the Harbor slipway."
        )
    elif "nightshade" in msg or "project" in msg or "operation" in msg or "secret" in msg:
        return (
            "[CLASSIFIED FILE DECRYPTION — LEVEL 4]\n"
            "Project Nightshade was phased out after preliminary resonance testing. The successor initiative was designed "
            "for total broadcast blackout—codenamed 'Project Oblivion'. Vance stole the master encryption cylinder."
        )
    elif "vault" in msg or "door" in msg or "key" in msg or "cctv" in msg:
        return (
            "[SECURITY CAM RECONSTRUCTION]\n"
            "Transmitter Vault B required dual clearance: Station Management keycard + manual master override key. "
            "Both were logged inside the corridor at 23:51."
        )
    elif "harbor" in msg or "slip" in msg or "boat" in msg or "escape" in msg:
        return (
            "[MARITIME LOG 1984-10-31]\n"
            "Vessel 'Maelstrom' departed slipway #42 at Harbor Lights at 00:04 EST. All coastal radar was disrupted by "
            "the 94.7 FM carrier pulse."
        )
    else:
        return (
            "[ECHO TERMINAL ACTIVE — W-DEAD ARCHIVE]\n"
            "Transmission received. Cross-referencing sub-level tapes. Alan Vance's final broadcast contained hidden data "
            "regarding Project Oblivion and the transmitter override in Vault B. Query specific logs to proceed."
        )
