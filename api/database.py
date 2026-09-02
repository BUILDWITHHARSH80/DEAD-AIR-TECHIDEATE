import os
from typing import Optional, Dict, Any, List
from supabase import create_client, Client
from api.config import settings

_supabase_client: Optional[Client] = None
_supabase_admin_client: Optional[Client] = None

def get_supabase() -> Optional[Client]:
    """Get standard Supabase client with public anon key."""
    global _supabase_client
    if _supabase_client is None:
        if settings.SUPABASE_URL and settings.SUPABASE_KEY:
            _supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    return _supabase_client

def get_supabase_admin() -> Optional[Client]:
    """Get privileged Supabase client with service_role key."""
    global _supabase_admin_client
    if _supabase_admin_client is None:
        key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_KEY
        if settings.SUPABASE_URL and key:
            _supabase_admin_client = create_client(settings.SUPABASE_URL, key)
    return _supabase_admin_client


# ==============================================================================
# IN-MEMORY DEV / TEST STORE FALLBACK (when Supabase credentials are empty)
# This enables running locally out-of-the-box before cloud configuration.
# ==============================================================================
class MockDB:
    def __init__(self):
        self.teams: Dict[str, Dict[str, Any]] = {
            "b0000000-0000-0000-0000-000000000001": {
                "id": "b0000000-0000-0000-0000-000000000001",
                "team_id": "TEAM-01",
                "team_name": "Radio Silence",
                "password_hash": "1f85626a6bdcd7394b3a199188055baf44fe3015cfba7044be3d11814977b98f",
                "room": "A",
                "members": ["Maya Lin", "James Cooper", "Daria Vance"],
                "status": "active",
                "current_score": 0,
                "echo_prompts_used": 0,
                "is_logged_in": False,
                "current_session_token": None,
            },
            "b0000000-0000-0000-0000-000000000002": {
                "id": "b0000000-0000-0000-0000-000000000002",
                "team_id": "TEAM-02",
                "team_name": "The Frequency Hunters",
                "password_hash": "1f85626a6bdcd7394b3a199188055baf44fe3015cfba7044be3d11814977b98f",
                "room": "A",
                "members": ["Samir Patel", "Chloe Bennett"],
                "status": "active",
                "current_score": 0,
                "echo_prompts_used": 0,
                "is_logged_in": False,
                "current_session_token": None,
            }
        }
        self.admins: Dict[str, Dict[str, Any]] = {
            "admin": {
                "id": "a0000000-0000-0000-0000-000000000001",
                "username": "admin",
                "password_hash": "74646ab4964cba04468fdaa1b78717ec60fd74af543f8cc1ffb248da98705604",
                "role": "super_admin",
                "assigned_room": None
            },
            "coord_a": {
                "id": "a0000000-0000-0000-0000-000000000002",
                "username": "coord_a",
                "password_hash": "1f85626a6bdcd7394b3a199188055baf44fe3015cfba7044be3d11814977b98f",
                "role": "room_coordinator",
                "assigned_room": "A"
            }
        }
        self.challenges: List[Dict[str, Any]] = [
            {
                "id": "c0000000-0000-0000-0000-000000000001",
                "slug": "frequency",
                "title": "The Ghost Carrier",
                "description": "At 23:15, a phantom carrier wave overlapped W-DEAD 94.7 FM. Use the frequency tuner to sweep the spectrum and find the beacon signal.",
                "challenge_type": "frequency_tuner",
                "correct_answer_hash": "e2a278b679b722229fae35adda457c8cb6825901280554500d3528cbc60dbdc9",
                "points_value": 100,
                "unlock_order": 1,
                "is_locked_by_admin": False,
                "hint": "Sweep towards 96.4 MHz to find the harbor beacon."
            },
            {
                "id": "c0000000-0000-0000-0000-000000000002",
                "slug": "static",
                "title": "Spectrogram Interference",
                "description": "A 15-second burst of static was recorded at 23:38. Filter the frequency bands to decode the Morse codename and year.",
                "challenge_type": "spectrogram_morse",
                "correct_answer_hash": "b8623801a55364da6de15cb627dd3b933755de8be27312f95477555c8ba6b977",
                "points_value": 150,
                "unlock_order": 2,
                "is_locked_by_admin": False,
                "hint": "Translate Morse: -. .. --. .... - ... .... .- -.. . + broadcast year 1984."
            },
            {
                "id": "c0000000-0000-0000-0000-000000000003",
                "slug": "script",
                "title": "Censored Cue Sheet",
                "description": "Alan Vance left his cue sheet with redacted passages. Unscramble the red margin notes to find the 3-word anagram.",
                "challenge_type": "censored_script",
                "correct_answer_hash": "016e854174cc055df2a18d1cca2025f965dc47e42f0e71b00a09f6663f3a204c",
                "points_value": 150,
                "unlock_order": 3,
                "is_locked_by_admin": False,
                "hint": "Combine red circled letters: DEAD AIR SILENCE."
            },
            {
                "id": "c0000000-0000-0000-0000-000000000004",
                "slug": "frame",
                "title": "CCTV Forensic Frame",
                "description": "Corridor camera CAM-04 recorded a 3-frame sequence at 23:52 before blackout. Inspect the door stencil.",
                "challenge_type": "cctv_frame",
                "correct_answer_hash": "0bfde9e2965779b2c66e1bfee9fcf334f3067a26e1df56362e373da7173cc3a3",
                "points_value": 200,
                "unlock_order": 4,
                "is_locked_by_admin": False,
                "hint": "Check Frame 3: Sub-level 2 TRANSMITTER_VAULT_B."
            },
            {
                "id": "c0000000-0000-0000-0000-000000000005",
                "slug": "echo",
                "title": "Interrogate ECHO",
                "description": "Query the terminal AI ECHO (5 prompt quota). Uncover the classified operation that replaced Nightshade.",
                "challenge_type": "ai_echo",
                "correct_answer_hash": "0dbdd507008434c474352e271466c03da529d4c5c307eaaf8c48b7a15e59b43b",
                "points_value": 250,
                "unlock_order": 5,
                "is_locked_by_admin": False,
                "hint": "Ask ECHO about the secret project that took over the broadcast."
            }
        ]
        self.attempts: List[Dict[str, Any]] = []
        self.team_progress: Dict[str, Dict[str, Any]] = {}  # key: f"{team_id}:{challenge_id}"
        self.evidence_files: List[Dict[str, Any]] = [
            {
                "id": "d0000000-0000-0000-0000-000000000001",
                "challenge_id": "c0000000-0000-0000-0000-000000000001",
                "title": "Audio Log: Harbor Nav Beacon (23:15)",
                "file_type": "transcript",
                "storage_path": "evidence/audio_log_2315.txt",
                "content": "### W-DEAD 94.7 FM — OFF-AIR RECORDER TAPE #84-A\n**Timestamp:** 23:15:02 EST\n**[ALAN VANCE]:** '...slip #42 is active tonight. Trawler Maelstrom is idling. Don''t look for me in the studio. Look for the harbor lights.'",
                "unlocked_description": "Recovered cassette recording from soundboard recorder."
            },
            {
                "id": "d0000000-0000-0000-0000-000000000002",
                "challenge_id": "c0000000-0000-0000-0000-000000000002",
                "title": "Classified Memo: FCC Project Nightshade",
                "file_type": "pdf",
                "storage_path": "evidence/fcc_memo_nightshade.pdf",
                "content": "### CONFIDENTIAL — FEDERAL COMMUNICATIONS COMMISSION\n**Subject:** Unauthorized Sub-carrier Broadcasts\nProject Nightshade experimental psychological broadcast authorized. Host Alan Vance is NOT cleared.",
                "unlocked_description": "Official confidential memorandum from station safe."
            },
            {
                "id": "d0000000-0000-0000-0000-000000000003",
                "challenge_id": "c0000000-0000-0000-0000-000000000003",
                "title": "Station Floor Plan & Access Log",
                "file_type": "log",
                "storage_path": "evidence/keycard_log_oct31.log",
                "content": "### W-DEAD STUDIOS ACCESS LOG (1984-10-31)\n23:38:44 - SUB-LEVEL 1: Arthur Sterling - GRANTED\n23:41:09 - TRANSMITTER VAULT B: Richard Finch - GRANTED\n23:51:30 - TRANSMITTER VAULT B: Manual Key #9 - ACCESS RECORDED\n23:54:00 - POWER GRID BLACKOUT",
                "unlocked_description": "Digital access records proving entry into Vault B before blackout."
            },
            {
                "id": "d0000000-0000-0000-0000-000000000004",
                "challenge_id": "c0000000-0000-0000-0000-000000000004",
                "title": "Police Incident Report #84-1031",
                "file_type": "text",
                "storage_path": "evidence/police_report_841031.txt",
                "content": "### PORT CITY POLICE DEPARTMENT — INCIDENT REPORT\nStudio empty. Vance's coat found in Transmitter Vault B next to severed mic cable. Marine radio warm to the touch.",
                "unlocked_description": "Original police report filed the night of Vance's disappearance."
            },
            {
                "id": "d0000000-0000-0000-0000-000000000005",
                "challenge_id": "c0000000-0000-0000-0000-000000000005",
                "title": "ECHO Master Decryption: Project Oblivion",
                "file_type": "transcript",
                "storage_path": "evidence/project_oblivion_final.txt",
                "content": "### ECHO ARCHIVE LOG — CLASSIFIED OPERATION OBLIVION\nVance discovered Project Nightshade was expanding into Project Oblivion. Hijacked Vault B relay at 23:54 and escaped via vessel Maelstrom at slip #42.",
                "unlocked_description": "Decrypted archive file proving Alan Vance's survival."
            }
        ]
        self.team_unlocked_files: List[Dict[str, Any]] = []
        self.echo_conversations: List[Dict[str, Any]] = []
        self.echo_usage: Dict[str, int] = {}  # team_id -> count
        self.timeline_events: List[Dict[str, Any]] = [
            {
                "id": "e0000000-0000-0000-0000-000000000001",
                "order_index": 1,
                "correct_timestamp_label": "23:15",
                "correct_event_text": "Alan Vance broadcasts coded message warning listeners about Harbor Lights slip #42 and the vessel Maelstrom.",
                "hint_title": "The Secret Broadcast Warning",
                "points_value": 50
            },
            {
                "id": "e0000000-0000-0000-0000-000000000002",
                "order_index": 2,
                "correct_timestamp_label": "23:38",
                "correct_event_text": "Station Manager Sterling and Engineer Finch enter Sub-Level 1 and unlock Transmitter Vault B.",
                "hint_title": "Sub-Level Vault Infiltration",
                "points_value": 50
            },
            {
                "id": "e0000000-0000-0000-0000-000000000003",
                "order_index": 3,
                "correct_timestamp_label": "23:52",
                "correct_event_text": "Alan Vance enters Transmitter Vault B with the manual override key to seize the master relay.",
                "hint_title": "Manual Override in Vault B",
                "points_value": 50
            },
            {
                "id": "e0000000-0000-0000-0000-000000000004",
                "order_index": 4,
                "correct_timestamp_label": "23:54",
                "correct_event_text": "The station power grid trips into a 7-minute blackout while Vance broadcasts the Project Oblivion leak and escapes.",
                "hint_title": "The 7-Minute Blackout & Escape",
                "points_value": 50
            }
        ]
        self.timeline_submissions: List[Dict[str, Any]] = []
        self.final_submissions: Dict[str, Dict[str, Any]] = {}  # team_id -> submission
        self.score_logs: List[Dict[str, Any]] = []
        self.event_state: Dict[str, Any] = {
            "round": 1,
            "event_start_time": "2026-09-02T17:00:00Z",
            "event_end_time": "2026-09-02T18:30:00Z",
            "is_paused": False,
            "paused_at": None,
            "paused_duration_accumulated": 0,
            "duration_minutes": 90
        }
        self.finale_state: Dict[str, Any] = {
            "is_active": False,
            "finalist_team_ids": [],
            "current_question_index": 0,
            "current_question": {
                "id": 1,
                "title": "Who authorized the 7-minute blackout override at 23:54?",
                "points": 100,
                "time_limit": 60
            },
            "timer_seconds": 60,
            "is_timer_running": False,
            "scores": {}
        }

mock_db = MockDB()
