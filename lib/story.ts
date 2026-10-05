// Server-only narrative, solution and initial configuration. Never import into client components.
export const initialDocuments = [
    {
        "id": "01",
        "title": "THE LAST MINUTE",
        "subtitle": "An interrupted voice. An impossible silence.",
        "classification": "EXTREME PRIORITY",
        "passkey": "4172",
        "description": "Recover the last surviving record from Studio A.",
        "content": "Decrypted at 4:24:04 PM\n\nRADIO MERIDIAN â€“ OFF-AIR TRANSCRIPT (INCIDENT 02:13)\n02:10:11 / ADRIAN VALE (HOST): \"You are listening to Meridian. Stay with me.\"\n02:11:03 / SYSTEM WARNING: A secondary, low-frequency hum bleeds into the mix. The desk meter registers a live, breathing carrier waveâ€”even though the microphone is dead.\n02:13:02 / ADRIAN (Frantic): \"I have checked the master clock. This is not a replay. Itâ€™s... itâ€™s happening right now.\"\n02:13:47 / EVENT: Programme output violently cuts to silence. The automated emergency backup tape never triggers.\n\nENGINEERâ€™S SCRAWL:\nThe studio remained powered for exactly 14 seconds after the broadcast died. When security breached the doors, Adrianâ€™s chair was spinning. The room was empty. The exterior door counter did not tick up. He never left.\n\nPENCIL NOTE RECOVERED FROM DESK:\n\"87.6 is the programme. The other frequency is a passenger. Follow the interval, not the volume. ...if this recording survives, don't trust theâ€” [STATIC]\"",
        "clues": [
            "The exact interruption was 02:13:47.",
            "Studio power survived the programme loss."
        ],
        "question": "What happened at 02:13:47?",
        "echo": "I remember Adrianâ€™s final transmission. The broadcast ended. That is not the same thing as saying Adrian did."
    },
    {
        "id": "02",
        "title": "THE GHOST CARRIER",
        "subtitle": "There was something underneath the music.",
        "classification": "SIGNAL ANALYSIS | RESTRICTED",
        "passkey": "8036",
        "description": "Examine an unidentified repeating carrier.",
        "content": "SIGNAL LAB / COMPARISON SHEET\n\nWe ran the anomaly through the ECHO diagnostic system. The results are impossible.\nArchive 1986: Residual pulse detected. Interval: 47 seconds.\n\nArchive 2004: Residual pulse detected. Interval: 47 seconds.\n\nCurrent Programme: Identical pulse. No matching input channel.\n\nAdrian named it THE GHOST CARRIER. It is a parasite. It travels directly beneath ordinary speech and music. Removing the Studio A input doesn't kill it.\n\nADRIANâ€™S URGENT MEMO:\n\"How can the same damaged interval appear in tapes recorded decades apart? ECHO saw the pattern before we did. The next scheduled route leaves the building. Do not call it interference until we know what it carries. Itâ€™s alive.\"",
        "clues": [
            "The carrier is embedded in normal transmissions.",
            "ECHO detected a pattern across archive decades."
        ],
        "question": "Where does the carrier originate?",
        "echo": "The frequency did not originate from the studio. I recognised the interval in material older than my current installation."
    },
    {
        "id": "03",
        "title": "ROOM ZERO",
        "subtitle": "The blueprint has a deliberate omission.",
        "classification": "INTERNAL FACILITY RECORD",
        "passkey": "2659",
        "description": "Follow the discrepancy in the access records.",
        "content": "FACILITIES / ACCESS AUDIT\nThe public blueprints show Studio A, the archives, a service corridor, and a transformer bay. They are lying.\nDeep scan reveals Maintenance Circuit Z-0 is active. Its destination is heavily redacted.\n\n02:12:31: Adrianâ€™s badge accesses the service corridor.\n\n02:13:48: Interior latch Z-0 accepts his badge.\n\n02:14:03: NO PERIMETER EXIT RECORDED.\n\nCCTV ANOMALY:\nCamera 3 shows an empty corridor, but the timestamp is a lie. It is offset by 19 seconds. The electrical fluctuation we saw on tape belongs to a secondary, hidden transmitterâ€”not a power surge.\n\nMaintenance labels identify Z-0 as ROOM ZERO. It houses an isolated secondary broadcast desk.\n\nA torn, blood-smudged note was found near the latch: \"If they search only the exits, they will believe I vanished.\"",
        "clues": [
            "Adrianâ€™s badge entered Z-0 after the interruption.",
            "No exterior departure was recorded."
        ],
        "question": "What was Adrian doing in Room Zero?",
        "echo": "Room Zero was not listed on the public station map. Your question assumes he left. I recorded his voice. I did not record his departure."
    },
    {
        "id": "04",
        "title": "THE FINAL TRANSMISSION",
        "subtitle": "Restore the warning. Never relay the carrier.",
        "classification": "QUARANTINE DIRECTIVE",
        "passkey": "9413",
        "description": "Recover the pieces of Adrianâ€™s final warning.",
        "content": "ISOLATED ARCHIVE / FINAL NOTE\nECHO system confirms: The next scheduled transmission was about to route the secondary bus beyond Meridian. We don't know the Ghost Carrierâ€™s intent, but we know a regional relay would have reproduced it across the entire network.\n\nADRIAN'S LAST LOG:\n\"I will cut the programme by hand. Keep the warning in the isolated archive. Do not restore the live carrier route. I can reach the secondary desk from the service corridor. Let them think I left.\"\n\nSYSTEM ECHO CONTAINMENT:\nContainment activated at 02:14:01. The remaining distribution buses have been violently disconnected.\n\nWARNING TO RECOVERY TEAMS:\nReconstruct the warning. Establish the sequence. Supply your recovered audio. Rebroadcasting the unidentified carrier is strictly forbidden. Containment was a decision made under total uncertainty. We still don't know where it came from.",
        "clues": [
            "The programme was deliberately interrupted.",
            "Containment silenced the remaining station routes."
        ],
        "question": "Can you restore the warning without propagating the carrier?",
        "echo": "You have enough evidence to reconstruct the final transmission. Separate the manual interruption from the containment that followed."
    },
    {
        "id": "A",
        "title": "THE RED LEDGER",
        "subtitle": "Someone changed the sign-out sheet.",
        "classification": "PERSONNEL / EVIDENCE",
        "passkey": "5521",
        "description": "Personnel movements in the minutes before silence.",
        "content": "PERSONNEL / EVIDENCE\n01:58 - Technician Mara Sen signs out.\n02:07 - Adrian requests archive access.\n02:12 - Adrian enters the internal service corridor.\n02:14 - Security adds \"host departed\" in red ink.\n\nINVESTIGATOR NOTE: The red ink is a lieâ€”an assumption made after the incident. Nobody logged a vehicle leaving. Maintenance confirmed an interior latch was freshly oiled that same afternoon. He never left the facility.",
        "clues": [
            "The departure entry was written after the event."
        ],
        "question": "Which records are observations, and which are assumptions?",
        "echo": "A record can preserve an inference as if it were a fact."
    },
    {
        "id": "B",
        "title": "THE SILENT ROOM",
        "subtitle": "A route behind the public wall.",
        "classification": "FACILITY SCHEMATIC / EVIDENCE",
        "passkey": "7184",
        "description": "A maintenance drawing contradicts the public map.",
        "content": "FACILITY SCHEMATIC / EVIDENCE\nThe true route: Studio A â†’ Archive Shelving â†’ Service Corridor â†’ Latch Z-0.\nZ-0 has no exterior doors. It is a sealed box with independent ventilation.\n\nCRITICAL CATCH: If you are comparing the badge logs to the security video, you must correct the time. Camera 3 time = Master Clock MINUS 19 seconds. The public floor plan calls this space a \"structural void\". Itâ€™s a blind spot.",
        "clues": [
            "Camera 3 is nineteen seconds behind.",
            "The hidden route stays inside the station."
        ],
        "question": "How could someone disappear without leaving?",
        "echo": "Correct the clock before you correct the witness."
    },
    {
        "id": "C",
        "title": "THE VANISHING VOICE",
        "subtitle": "Static has swallowed the most important word.",
        "classification": "VOICE ANALYSIS / EVIDENCE",
        "passkey": "3348",
        "description": "Compare alternate interpretations of damaged speech.",
        "content": "VOICE ANALYSIS / EVIDENCE\nWe ran audio recovery on the final static burst.\nFragment 1: \"Don't trust the [carrier / courier].\" Context confirms he is warning us about the signal: CARRIER.\nFragment 2: \"I am cutting the [programme / power].\" The mic kept recording after the output died, proving he cut the PROGRAMME, not the electrical power.\n02:13:02 Transcript recovery: \"If it goes out on the scheduled route, it will repeat beyond us.\"\n\nDo not confuse a voice disappearing from the public channel with a person leaving the building.",
        "clues": [
            "The recording continues after the programme cuts."
        ],
        "question": "Which kind of silence did the speaker intend?",
        "echo": "The missing word matters. So does the circuit that remained alive."
    },
    {
        "id": "D",
        "title": "THE MERIDIAN VECTOR",
        "subtitle": "The shape is a route, not a destination.",
        "classification": "DISTRIBUTION ROUTING / EVIDENCE",
        "passkey": "6207",
        "description": "Follow the outgoing relay pattern.",
        "content": "DISTRIBUTION ROUTING / EVIDENCE\nThis was a viral path. The waypoints form a closed vector:\n02:13 - Local Programme to Secondary Bus.\n02:15 - Secondary Bus to Regional Relay.\n02:16 - Regional Relay to External Repeaters.\n\nAdrian entered a routing hold right before the regional slot. Whoever made that hold knew the broadcast was about to infect the outside world. The origin remains a ghost.",
        "clues": [
            "The supposed itinerary describes relay hops."
        ],
        "question": "What would the next scheduled transmission have spread?",
        "echo": "A route is not evidence of a journey by a person."
    }
];
export const initialChallenges = [
    ['01', 'DEAF-MUTE AUDIO PATCH', 'Use lip-reading and mime to communicate information under simulated noise.', '01'], ['02', 'MORSE STROBE OPTICAL', 'Decode your teammateâ€™s LED pulses with the provided Morse guide.', '02'], ['03', 'DECIBEL STATIC CALIBRATION', 'Maintain a steady vocal tone while partners solve the frequency calculation.', '03'], ['04', 'EMERGENCY HOT-POTATO DECRYPT', 'Pass the ball with one hand and solve an equation on every catch without dropping it.', '04'], ['05', 'FREQUENCY SPEED-STACK', 'Stack the frequency pyramid within 60 seconds, stacking only after a successful bottle flip.', 'D'], ['06', 'THE STUDIO TRIAD', 'Cooperate across mime, hearing and vision constraints to operate the station controls.', 'A'], ['07', 'THE VANITY CIPHER', 'Use UV light and order the marked styling tools shortest to tallest.', 'B'], ['08', 'BROADCAST WAYPOINTS', 'Trace the intercepted itinerary with string and compare its shape to the pilot legend.', 'C']
].map(([id, name, description, document]) => ({ id, name, description, document, enabled: true, instructions: 'Visit this physical station. A marshal verifies completion and issues your passkey.' }));
export const fragments = [{ id: 'f1', time: '02:10:11', text: 'You are listening to Radio Meridian. Stay with me.' }, { id: 'f2', time: '02:11:03', text: 'There is another signal beneath the programme.' }, { id: 'f3', time: '02:11:47', text: 'ECHO has found its interval in the old archives.' }, { id: 'f4', time: '02:12:19', text: 'The next route carries it beyond this station.' }, { id: 'f5', time: '02:13:02', text: 'Preserve this warning on the isolated return.' }, { id: 'f6', time: '02:13:47', text: 'I am cutting the programme. Do not relay the carrier.' }, { id: 'f7', time: '02:14:01', text: 'Containment active. Distribution buses isolated.' }];
export const timeline = ['Adrian discovers the signal', 'ECHO detects the archive anomaly', 'Adrian investigates the signal', 'Room Zero discovered', 'Final broadcast prepared', 'Ghost Carrier begins', 'Adrian interrupts transmission', 'ECHO initiates containment', 'Station goes silent'].map((text, i) => ({ id: 't' + i, text }));
export const defaultSettings = { name: 'DEAD AIR / RADIO MERIDIAN', status: 'WAITING', duration: 5400, remaining: 5400, endsAt: 0, startedAt: 0, leaderboard: true, hintCost: 5, hintPenalty: true, threshold: 80, weights: [10, 10, 20, 20, 15, 10, 15], maxUploadMB: 25, requiredUploads: 1, requireApproval: true, announcement: 'The station is waiting for investigators.' };
export const freshState = () => ({ members: [], challenges: {}, archiveApprovals: {}, unlocks: {}, hints: [], messages: [], notes: [], flag: false, broadcast: false, truth: false, accuracy: 0, submittedAt: 0, finishedAt: 0, submission: null, draft: null });