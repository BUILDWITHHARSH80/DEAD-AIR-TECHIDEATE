from typing import List
from fastapi import APIRouter, HTTPException, status, Depends

from api.database import get_supabase_admin, mock_db
from api.auth import get_current_team

router = APIRouter(prefix="/api/evidence", tags=["evidence"])

@router.get("")
async def list_unlocked_evidence(team: dict = Depends(get_current_team)):
    """
    Returns the evidence files unlocked by the requesting team.
    Files not unlocked by the team are obscured.
    """
    supabase = get_supabase_admin()
    if supabase:
        # Fetch team's unlocked file mappings
        uf_res = supabase.table("team_unlocked_files").select(
            "evidence_file_id, unlocked_at"
        ).eq("team_id", team["id"]).execute()
        unlocked_map = {u["evidence_file_id"]: u["unlocked_at"] for u in (uf_res.data or [])}

        # Fetch all evidence files
        ef_res = supabase.table("evidence_files").select(
            "id, challenge_id, title, file_type, storage_path, content, unlocked_description"
        ).execute()
        all_files = ef_res.data or []

        # Fetch challenge info to label files
        ch_res = supabase.table("challenges").select("id, title, slug").execute()
        ch_map = {c["id"]: c for c in (ch_res.data or [])}

        results = []
        for f in all_files:
            file_id = f["id"]
            is_unlocked = file_id in unlocked_map
            ch = ch_map.get(f.get("challenge_id"), {})

            if is_unlocked:
                results.append({
                    "id": file_id,
                    "challenge_id": f.get("challenge_id"),
                    "challenge_title": ch.get("title", ""),
                    "challenge_slug": ch.get("slug", ""),
                    "title": f["title"],
                    "file_type": f["file_type"],
                    "storage_path": f.get("storage_path"),
                    "content": f["content"],
                    "unlocked_description": f.get("unlocked_description"),
                    "is_unlocked": True,
                    "unlocked_at": unlocked_map[file_id]
                })
            else:
                results.append({
                    "id": file_id,
                    "challenge_id": f.get("challenge_id"),
                    "challenge_title": ch.get("title", ""),
                    "challenge_slug": ch.get("slug", ""),
                    "title": f"Encrypted Evidence #{len(results) + 1}",
                    "file_type": f["file_type"],
                    "storage_path": None,
                    "content": "🔒 [ENCRYPTED — Solve linked challenge to decrypt this evidence file]",
                    "unlocked_description": "Locked evidence file",
                    "is_unlocked": False,
                    "unlocked_at": None
                })
        return results

    else:
        # Mock DB logic
        unlocked_ids = {
            u["evidence_file_id"]: u["unlocked_at"]
            for u in mock_db.team_unlocked_files
            if u["team_id"] == team["id"]
        }
        ch_map = {c["id"]: c for c in mock_db.challenges}

        results = []
        for idx, f in enumerate(mock_db.evidence_files):
            file_id = f["id"]
            is_unlocked = file_id in unlocked_ids
            ch = ch_map.get(f.get("challenge_id"), {})

            if is_unlocked:
                results.append({
                    "id": file_id,
                    "challenge_id": f.get("challenge_id"),
                    "challenge_title": ch.get("title", ""),
                    "challenge_slug": ch.get("slug", ""),
                    "title": f["title"],
                    "file_type": f["file_type"],
                    "storage_path": f.get("storage_path"),
                    "content": f["content"],
                    "unlocked_description": f.get("unlocked_description"),
                    "is_unlocked": True,
                    "unlocked_at": unlocked_ids[file_id]
                })
            else:
                results.append({
                    "id": file_id,
                    "challenge_id": f.get("challenge_id"),
                    "challenge_title": ch.get("title", ""),
                    "challenge_slug": ch.get("slug", ""),
                    "title": f"Encrypted File #{idx + 1}",
                    "file_type": f["file_type"],
                    "storage_path": None,
                    "content": "🔒 [ENCRYPTED — Solve linked challenge to decrypt this evidence file]",
                    "unlocked_description": "Locked evidence file",
                    "is_unlocked": False,
                    "unlocked_at": None
                })
        return results
