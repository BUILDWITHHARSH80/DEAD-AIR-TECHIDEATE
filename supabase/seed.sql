-- ==============================================================================
-- DEAD AIR EVENT PLATFORM — SEED DATA (MYSTERY STORYLINE & CHALLENGES)
-- ==============================================================================

-- 1. SEED EVENT STATE (Singleton Row)
INSERT INTO event_state (id, round, event_start_time, event_end_time, is_paused, paused_duration_accumulated, duration_minutes)
VALUES (
    1,
    1,
    NOW(),
    NOW() + INTERVAL '90 minutes',
    FALSE,
    0,
    90
)
ON CONFLICT (id) DO UPDATE SET
    round = EXCLUDED.round,
    is_paused = EXCLUDED.is_paused,
    duration_minutes = EXCLUDED.duration_minutes;

-- 2. SEED FINALE STATE (Singleton Row)
INSERT INTO finale_state (id, is_active, finalist_team_ids, current_question_index, timer_seconds, is_timer_running, scores)
VALUES (
    1,
    FALSE,
    '[]'::jsonb,
    0,
    60,
    FALSE,
    '{}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- 3. SEED ADMINS
-- Super Admin: username = "admin", password = "DeadAir2026!"
-- Room Coordinators: "coord_a", "coord_b", "coord_c", "coord_d"
INSERT INTO admins (id, username, password_hash, role, assigned_room)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'admin', '74646ab4964cba04468fdaa1b78717ec60fd74af543f8cc1ffb248da98705604', 'super_admin', NULL),
    ('a0000000-0000-0000-0000-000000000002', 'coord_a', '1f85626a6bdcd7394b3a199188055baf44fe3015cfba7044be3d11814977b98f', 'room_coordinator', 'A'),
    ('a0000000-0000-0000-0000-000000000003', 'coord_b', '1f85626a6bdcd7394b3a199188055baf44fe3015cfba7044be3d11814977b98f', 'room_coordinator', 'B'),
    ('a0000000-0000-0000-0000-000000000004', 'coord_c', '1f85626a6bdcd7394b3a199188055baf44fe3015cfba7044be3d11814977b98f', 'room_coordinator', 'C'),
    ('a0000000-0000-0000-0000-000000000005', 'coord_d', '1f85626a6bdcd7394b3a199188055baf44fe3015cfba7044be3d11814977b98f', 'room_coordinator', 'D')
ON CONFLICT (username) DO NOTHING;

-- 4. SEED SAMPLE TEAMS (Password: "playdeadair")
INSERT INTO teams (id, team_id, team_name, password_hash, room, members, status, current_score)
VALUES
    ('b0000000-0000-0000-0000-000000000001', 'TEAM-01', 'Radio Silence', '1f85626a6bdcd7394b3a199188055baf44fe3015cfba7044be3d11814977b98f', 'A', '["Maya Lin", "James Cooper", "Daria Vance"]'::jsonb, 'active', 0),
    ('b0000000-0000-0000-0000-000000000002', 'TEAM-02', 'The Frequency Hunters', '1f85626a6bdcd7394b3a199188055baf44fe3015cfba7044be3d11814977b98f', 'A', '["Samir Patel", "Chloe Bennett"]'::jsonb, 'active', 0),
    ('b0000000-0000-0000-0000-000000000003', 'TEAM-03', 'Midnight Broadcast', '1f85626a6bdcd7394b3a199188055baf44fe3015cfba7044be3d11814977b98f', 'B', '["Alex Mercer", "Elena Rostova"]'::jsonb, 'active', 0),
    ('b0000000-0000-0000-0000-000000000004', 'TEAM-04', 'Static Decoders', '1f85626a6bdcd7394b3a199188055baf44fe3015cfba7044be3d11814977b98f', 'B', '["Lucas Scott", "Devin Reed"]'::jsonb, 'active', 0),
    ('b0000000-0000-0000-0000-000000000005', 'TEAM-05', 'Signal Crypt', '1f85626a6bdcd7394b3a199188055baf44fe3015cfba7044be3d11814977b98f', 'C', '["Zack Taylor", "Nina Perez"]'::jsonb, 'active', 0),
    ('b0000000-0000-0000-0000-000000000006', 'TEAM-06', 'Ghost Wave 94', '1f85626a6bdcd7394b3a199188055baf44fe3015cfba7044be3d11814977b98f', 'C', '["Oliver King", "Sophia Zhang"]'::jsonb, 'active', 0),
    ('b0000000-0000-0000-0000-000000000007', 'TEAM-07', 'Phantom Relay', '1f85626a6bdcd7394b3a199188055baf44fe3015cfba7044be3d11814977b98f', 'D', '["Victor Vance", "Amara Okafor"]'::jsonb, 'active', 0),
    ('b0000000-0000-0000-0000-000000000008', 'TEAM-08', 'Oblivion Protocol', '1f85626a6bdcd7394b3a199188055baf44fe3015cfba7044be3d11814977b98f', 'D', '["Marcus Vance", "Taylor Thorne"]'::jsonb, 'active', 0)
ON CONFLICT (team_id) DO NOTHING;

-- Initialize echo_usage rows for teams
INSERT INTO echo_usage (team_id, prompts_used)
SELECT id, 0 FROM teams
ON CONFLICT (team_id) DO NOTHING;


-- 5. SEED CHALLENGES (The 5 Core Puzzles)
-- Answer 1: HARBOR_LIGHTS -> hash: e2a278b679b722229fae35adda457c8cb6825901280554500d3528cbc60dbdc9
-- Answer 2: NIGHTSHADE_1984 -> hash: b8623801a55364da6de15cb627dd3b933755de8be27312f95477555c8ba6b977
-- Answer 3: DEAD_AIR_SILENCE -> hash: 016e854174cc055df2a18d1cca2025f965dc47e42f0e71b00a09f6663f3a204c
-- Answer 4: TRANSMITTER_VAULT_B -> hash: 0bfde9e2965779b2c66e1bfee9fcf334f3067a26e1df56362e373da7173cc3a3
-- Answer 5: PROJECT_OBLIVION -> hash: 0dbdd507008434c474352e271466c03da529d4c5c307eaaf8c48b7a15e59b43b

INSERT INTO challenges (id, slug, title, description, challenge_type, correct_answer_hash, points_value, unlock_order, is_locked_by_admin, hint)
VALUES
    (
        'c0000000-0000-0000-0000-000000000001',
        'frequency',
        'The Ghost Carrier',
        'At 23:15, a phantom carrier wave overlapped W-DEAD 94.7 FM. Use the frequency tuner to sweep the VHF spectrum between 94.0 and 108.0 MHz. Lock onto the carrier tone harmonic and decode the transmission beacon designation.',
        'frequency_tuner',
        'e2a278b679b722229fae35adda457c8cb6825901280554500d3528cbc60dbdc9',
        100,
        1,
        FALSE,
        'Sweep towards the lower coastal repeater frequencies near 96.4 MHz. Listen for the nautical phonetic signal.'
    ),
    (
        'c0000000-0000-0000-0000-000000000002',
        'static',
        'Spectrogram Interference',
        'A 15-second burst of static was recorded at 23:38 during the weather report. Filter the frequency bands to reveal hidden Morse code pulses and the secret government project codename and year.',
        'spectrogram_morse',
        'b8623801a55364da6de15cb627dd3b933755de8be27312f95477555c8ba6b977',
        150,
        2,
        FALSE,
        'Translate the high-pitch Morse dots and dashes: -. .. --. .... - ... .... .- -.. . followed by the broadcast year.'
    ),
    (
        'c0000000-0000-0000-0000-000000000003',
        'script',
        'Censored Cue Sheet',
        'Host Alan Vance left his on-air cue sheet in the booth. Several lines were redacted with heavy black marker, but notes in the margins contain a 3-word anagram cipher regarding the impending blackout.',
        'censored_script',
        '016e854174cc055df2a18d1cca2025f965dc47e42f0e71b00a09f6663f3a204c',
        150,
        3,
        FALSE,
        'Combine the letters circled in red across paragraphs 2, 4, and 7: D-E-A-D _ A-I-R _ S-I-L-E-N-C-E.'
    ),
    (
        'c0000000-0000-0000-0000-000000000004',
        'frame',
        'CCTV Forensic Frame',
        'Corridor camera CAM-04 captured a 3-frame sequence at 23:52 before the system blackout. Enhance the badge reader display and locate the restricted room destination identifier.',
        'cctv_frame',
        '0bfde9e2965779b2c66e1bfee9fcf334f3067a26e1df56362e373da7173cc3a3',
        200,
        4,
        FALSE,
        'Examine the door stencil behind the figure in the leather coat on Frame 3: Sub-level 2, TRANSMITTER_VAULT_...'
    ),
    (
        'c0000000-0000-0000-0000-000000000005',
        'echo',
        'Interrogate ECHO',
        'ECHO is the restored 1984 station archive computer. Ask ECHO strategic questions about Alan Vance, Project Nightshade, and what took place in Transmitter Vault B. Extract the master classified operation codename.',
        'ai_echo',
        '0dbdd507008434c474352e271466c03da529d4c5c307eaaf8c48b7a15e59b43b',
        250,
        5,
        FALSE,
        'Ask ECHO about Alan Vance''s final log entry, the 23:54 transmission shutdown, and the secret operation that replaced Nightshade.'
    )
ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    correct_answer_hash = EXCLUDED.correct_answer_hash,
    points_value = EXCLUDED.points_value,
    unlock_order = EXCLUDED.unlock_order;


-- 6. SEED EVIDENCE FILES
INSERT INTO evidence_files (id, challenge_id, title, file_type, storage_path, content, unlocked_description)
VALUES
    (
        'd0000000-0000-0000-0000-000000000001',
        'c0000000-0000-0000-0000-000000000001',
        'Audio Log: Harbor Nav Beacon (23:15)',
        'transcript',
        'evidence/audio_log_2315.txt',
        '### W-DEAD 94.7 FM — OFF-AIR RECORDER TAPE #84-A
**Timestamp:** 23:15:02 EST
**Recording source:** Booth B auxiliary receiver

**[VOICE - ALAN VANCE]:**
"...if anyone on the coast is tracking 96.4 MHz... the Harbor Lights yacht club slip #42 is active tonight. The trawler ''Maelstrom'' has its diesel engines idling. They think nobody noticed the equipment crates being moved from the transmitter shed at sundown. If this line goes dead tonight... don''t look for me in the studio. Look for the harbor lights."',
        'Recovered cassette recording from Alan Vance''s auxiliary soundboard recorder.'
    ),
    (
        'd0000000-0000-0000-0000-000000000002',
        'c0000000-0000-0000-0000-000000000002',
        'Classified Memo: FCC Project Nightshade',
        'pdf',
        'evidence/fcc_memo_nightshade.pdf',
        '### CONFIDENTIAL — FEDERAL COMMUNICATIONS COMMISSION
**Date:** October 12, 1984
**Subject:** Unauthorized High-Power Sub-carrier Broadcasts (Station W-DEAD)
**Classification:** EYES ONLY

1. Field agents have detected non-standard frequency modulations on the 94.7 MHz carrier between the hours of 23:00 and 01:00.
2. The transmission corresponds to Project Nightshade: an experimental psychological broadcast using infrasound resonance.
3. Station Manager Arthur Sterling and Chief Engineer Richard Finch have signed non-disclosure agreements.
4. Host Alan Vance is NOT cleared for Nightshade. If Vance attempts to expose the tests on-air, contingency Protocol 4 is authorized.',
        'Official confidential memorandum seized from Station Manager Arthur Sterling''s office safe.'
    ),
    (
        'd0000000-0000-0000-0000-000000000003',
        'c0000000-0000-0000-0000-000000000003',
        'Station Floor Plan & Keycard Access Log',
        'log',
        'evidence/keycard_log_oct31.log',
        '### W-DEAD STUDIOS — ELECTRONIC DOOR ACCESS LOG
**Date:** 1984-10-31

- 22:45:12 — MAIN ENTRANCE: Card #004 (Alan Vance - Host) - GRANTED
- 23:02:18 — MASTER CONTROL: Card #012 (Arthur Sterling - Manager) - GRANTED
- 23:38:44 — SUB-LEVEL 1 (VAULT ACCESS): Card #012 (Arthur Sterling) - GRANTED
- 23:41:09 — TRANSMITTER VAULT B: Card #007 (Richard Finch - Chief Engineer) - GRANTED
- 23:51:30 — TRANSMITTER VAULT B: Manual Override Key #9 - ACCESS RECORDED
- 23:54:00 — POWER GRID FAILURE: Substation B tripped
- 23:54:01 — ALL READERS OFFLINE (7-minute system blackout)',
        'Digital access records proving that Station Manager Sterling and Engineer Finch entered Vault B minutes before the blackout.'
    ),
    (
        'd0000000-0000-0000-0000-000000000004',
        'c0000000-0000-0000-0000-000000000004',
        'Police Incident Report #84-1031',
        'text',
        'evidence/police_report_841031.txt',
        '### PORT CITY POLICE DEPARTMENT — INCIDENT REPORT
**Case Number:** 84-1031-H
**Responding Officer:** Sgt. D. Kowalski
**Time of Call:** 00:25 EST, Nov 1, 1984

**Summary:**
Dispatched to W-DEAD radio tower following emergency distress call from sound engineer Richard Finch.
Upon arrival, broadcast studio was empty. Host Alan Vance was missing. Vance''s car was parked outside with keys in ignition.
A brown leather trench coat matching Vance''s was found discarded inside Transmitter Vault B next to a severed microphone cable.
Station Manager Sterling claimed Vance left abruptly through the emergency exit. No signs of struggle, but a commercial marine radio in Vault B was warm to the touch.',
        'Original police report filed the night of Alan Vance''s disappearance.'
    ),
    (
        'd0000000-0000-0000-0000-000000000005',
        'c0000000-0000-0000-0000-000000000005',
        'ECHO Master Decryption: Project Oblivion',
        'transcript',
        'evidence/project_oblivion_final.txt',
        '### ECHO ARCHIVE LOG — CLASSIFIED OPERATION OBLIVION
**Decryption Level:** OMEGA-5
**Record ID:** ECHO-1984-FINAL

**[ECHO RECONSTRUCTION]:**
Alan Vance did not perish in the studio. He discovered that Project Nightshade was expanding into Project Oblivion — a weaponized broadcast intended to induce panic during the 1984 election.
Vance coordinated with an off-shore pirate radio coalition. At 23:54, Vance hijacked the master relay from Transmitter Vault B, broadcast the evidence on maritime frequencies, and escaped via the harbor slip #42 on the vessel ''Maelstrom''.
Station management staged the disappearance as an unsolved kidnapping to protect the military contract.',
        'The definitive decrypted archive file proving Alan Vance''s survival and the true nature of Project Oblivion.'
    )
ON CONFLICT (id) DO NOTHING;


-- 7. SEED TIMELINE EVENTS (The 4 Key Moments to Reconstruct)
INSERT INTO timeline_events (id, order_index, correct_timestamp_label, correct_event_text, hint_title, points_value)
VALUES
    (
        'e0000000-0000-0000-0000-000000000001',
        1,
        '23:15',
        'Alan Vance broadcasts coded message warning listeners about Harbor Lights slip #42 and the vessel Maelstrom.',
        'The Secret Broadcast Warning',
        50
    ),
    (
        'e0000000-0000-0000-0000-000000000002',
        2,
        '23:38',
        'Station Manager Sterling and Engineer Finch enter Sub-Level 1 and unlock Transmitter Vault B.',
        'Sub-Level Vault Infiltration',
        50
    ),
    (
        'e0000000-0000-0000-0000-000000000003',
        3,
        '23:52',
        'Alan Vance enters Transmitter Vault B with the manual override key to seize the master relay.',
        'Manual Override in Vault B',
        50
    ),
    (
        'e0000000-0000-0000-0000-000000000004',
        4,
        '23:54',
        'The station power grid trips into a 7-minute blackout while Vance broadcasts the Project Oblivion leak and escapes.',
        'The 7-Minute Blackout & Escape',
        50
    )
ON CONFLICT (id) DO NOTHING;
