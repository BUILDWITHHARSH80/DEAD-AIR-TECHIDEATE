-- ==============================================================================
-- DEAD AIR EVENT PLATFORM — DATABASE TRIGGERS & BUSINESS RULES MIGRATION 002
-- ==============================================================================

-- 1. TRIGGER: IMMUTABLE solved_at PROTECTION
-- Enforces that once solved_at is set, it CAN NEVER be overwritten, modified, or set back to null.
CREATE OR REPLACE FUNCTION protect_solved_at_function()
RETURNS TRIGGER AS $$
BEGIN
    -- Block any changes if already solved
    IF OLD.solved_at IS NOT NULL THEN
        IF NEW.solved_at IS DISTINCT FROM OLD.solved_at THEN
            RAISE EXCEPTION 'Database Integrity Violation: solved_at cannot be modified once set (team: %, challenge: %).', OLD.team_id, OLD.challenge_id;
        END IF;
        IF OLD.is_solved = TRUE AND NEW.is_solved = FALSE THEN
            RAISE EXCEPTION 'Database Integrity Violation: is_solved cannot be reverted to false once solved.';
        END IF;
    END IF;

    -- Update updated_at timestamp
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_solved_at ON team_challenge_progress;
CREATE TRIGGER trg_protect_solved_at
BEFORE UPDATE ON team_challenge_progress
FOR EACH ROW
EXECUTE FUNCTION protect_solved_at_function();


-- 2. TRIGGER: IMMUTABLE LOCKED FINAL SUBMISSIONS
-- Enforces that once locked = true, participant case theory cannot be edited.
CREATE OR REPLACE FUNCTION protect_locked_final_submission_function()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.locked = TRUE THEN
        -- Allow admin to set admin_score and admin_feedback, but reject participant changes
        IF (NEW.what_happened IS DISTINCT FROM OLD.what_happened) OR
           (NEW.who_was_involved IS DISTINCT FROM OLD.who_was_involved) OR
           (NEW.reconstructed_timeline IS DISTINCT FROM OLD.reconstructed_timeline) OR
           (NEW.key_evidence IS DISTINCT FROM OLD.key_evidence) OR
           (NEW.final_explanation IS DISTINCT FROM OLD.final_explanation) OR
           (NEW.locked = FALSE) THEN
            RAISE EXCEPTION 'Database Integrity Violation: final submission is locked and permanently immutable.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_final_submission ON final_submissions;
CREATE TRIGGER trg_protect_final_submission
BEFORE UPDATE ON final_submissions
FOR EACH ROW
EXECUTE FUNCTION protect_locked_final_submission_function();


-- 3. TRIGGER: AUTO-RECOMPUTE TEAM SCORE ON score_log INSERT/UPDATE/DELETE
CREATE OR REPLACE FUNCTION sync_team_score_function()
RETURNS TRIGGER AS $$
DECLARE
    target_team_id UUID;
    total_score INTEGER;
BEGIN
    IF TG_OP = 'DELETE' THEN
        target_team_id := OLD.team_id;
    ELSE
        target_team_id := NEW.team_id;
    END IF;

    SELECT COALESCE(SUM(delta), 0) INTO total_score
    FROM score_log
    WHERE team_id = target_team_id;

    UPDATE teams
    SET current_score = total_score,
        updated_at = NOW()
    WHERE id = target_team_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_team_score ON score_log;
CREATE TRIGGER trg_sync_team_score
AFTER INSERT OR UPDATE OR DELETE ON score_log
FOR EACH ROW
EXECUTE FUNCTION sync_team_score_function();


-- 4. ATOMIC FUNCTION: PROCESS CHALLENGE ATTEMPT
-- Handles attempt logging, first-time solve recording, score awarding, and evidence unlock in a single transaction.
CREATE OR REPLACE FUNCTION submit_challenge_attempt(
    p_team_id UUID,
    p_challenge_id UUID,
    p_submitted_answer TEXT,
    p_is_correct BOOLEAN
)
RETURNS JSONB AS $$
DECLARE
    v_is_already_solved BOOLEAN := FALSE;
    v_solved_at TIMESTAMPTZ := NULL;
    v_points INTEGER := 0;
    v_unlocked_file_id UUID := NULL;
    v_challenge_slug VARCHAR(50);
BEGIN
    -- 1. Always record in attempts audit table
    INSERT INTO attempts (team_id, challenge_id, submitted_answer, is_correct, attempted_at)
    VALUES (p_team_id, p_challenge_id, p_submitted_answer, p_is_correct, NOW());

    -- 2. Fetch challenge info
    SELECT points_value, slug INTO v_points, v_challenge_slug
    FROM challenges
    WHERE id = p_challenge_id;

    -- 3. Ensure progress row exists
    INSERT INTO team_challenge_progress (team_id, challenge_id, is_solved, attempt_count, points_awarded)
    VALUES (p_team_id, p_challenge_id, FALSE, 0, 0)
    ON CONFLICT (team_id, challenge_id) DO NOTHING;

    -- 4. Check existing solve state
    SELECT is_solved, solved_at INTO v_is_already_solved, v_solved_at
    FROM team_challenge_progress
    WHERE team_id = p_team_id AND challenge_id = p_challenge_id;

    -- 5. If correct and NOT already solved: Record first solve!
    IF p_is_correct AND (v_is_already_solved = FALSE OR v_solved_at IS NULL) THEN
        UPDATE team_challenge_progress
        SET is_solved = TRUE,
            solved_at = NOW(),
            attempt_count = attempt_count + 1,
            points_awarded = v_points,
            updated_at = NOW()
        WHERE team_id = p_team_id AND challenge_id = p_challenge_id;

        -- Award points via score_log
        INSERT INTO score_log (team_id, delta, reason, source)
        VALUES (p_team_id, v_points, 'Solved challenge: ' || v_challenge_slug, 'auto');

        -- Unlock linked evidence file
        SELECT id INTO v_unlocked_file_id
        FROM evidence_files
        WHERE challenge_id = p_challenge_id
        LIMIT 1;

        IF v_unlocked_file_id IS NOT NULL THEN
            INSERT INTO team_unlocked_files (team_id, evidence_file_id, unlocked_at)
            VALUES (p_team_id, v_unlocked_file_id, NOW())
            ON CONFLICT (team_id, evidence_file_id) DO NOTHING;
        END IF;

        RETURN jsonb_build_object(
            'is_correct', TRUE,
            'is_first_solve', TRUE,
            'points_awarded', v_points,
            'unlocked_file_id', v_unlocked_file_id
        );
    ELSE
        -- Just increment attempt count
        UPDATE team_challenge_progress
        SET attempt_count = attempt_count + 1,
            updated_at = NOW()
        WHERE team_id = p_team_id AND challenge_id = p_challenge_id;

        RETURN jsonb_build_object(
            'is_correct', p_is_correct,
            'is_first_solve', FALSE,
            'points_awarded', 0,
            'unlocked_file_id', NULL
        );
    END IF;
END;
$$ LANGUAGE plpgsql;
