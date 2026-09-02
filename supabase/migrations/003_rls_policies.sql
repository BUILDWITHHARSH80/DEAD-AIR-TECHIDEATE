-- ==============================================================================
-- DEAD AIR EVENT PLATFORM — ROW LEVEL SECURITY (RLS) MIGRATION 003
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_challenge_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_unlocked_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE echo_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE echo_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE final_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE finale_state ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is admin via custom claims or service_role
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        auth.jwt() ->> 'role' = 'service_role' OR
        auth.jwt() ->> 'role' = 'super_admin' OR
        auth.jwt() ->> 'role' = 'room_coordinator'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get the current team_id from JWT
CREATE OR REPLACE FUNCTION get_auth_team_id()
RETURNS UUID AS $$
BEGIN
    RETURN (auth.jwt() ->> 'team_id')::UUID;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 1. TEAMS POLICIES
CREATE POLICY "Teams can view own record" ON teams
    FOR SELECT USING (id = get_auth_team_id() OR is_admin());

CREATE POLICY "Admins can manage teams" ON teams
    FOR ALL USING (is_admin());


-- 2. ADMINS POLICIES
CREATE POLICY "Admins can view and manage admins" ON admins
    FOR ALL USING (is_admin());


-- 3. CHALLENGES POLICIES
CREATE POLICY "Teams and admins can view challenges" ON challenges
    FOR SELECT USING (TRUE);

CREATE POLICY "Admins can manage challenges" ON challenges
    FOR ALL USING (is_admin());


-- 4. ATTEMPTS POLICIES
CREATE POLICY "Teams can view their own attempts" ON attempts
    FOR SELECT USING (team_id = get_auth_team_id() OR is_admin());

CREATE POLICY "Teams can insert their own attempts" ON attempts
    FOR INSERT WITH CHECK (team_id = get_auth_team_id() OR is_admin());

CREATE POLICY "Admins can manage attempts" ON attempts
    FOR ALL USING (is_admin());


-- 5. TEAM CHALLENGE PROGRESS POLICIES
CREATE POLICY "Teams can view their own progress" ON team_challenge_progress
    FOR SELECT USING (team_id = get_auth_team_id() OR is_admin());

CREATE POLICY "Backend/Admins can mutate progress" ON team_challenge_progress
    FOR ALL USING (is_admin());


-- 6. EVIDENCE FILES POLICIES
CREATE POLICY "Teams can view unlocked evidence files" ON evidence_files
    FOR SELECT USING (
        is_admin() OR
        EXISTS (
            SELECT 1 FROM team_unlocked_files tuf
            WHERE tuf.evidence_file_id = evidence_files.id
            AND tuf.team_id = get_auth_team_id()
        )
    );

CREATE POLICY "Admins can manage evidence files" ON evidence_files
    FOR ALL USING (is_admin());


-- 7. TEAM UNLOCKED FILES POLICIES
CREATE POLICY "Teams can view their own unlocked files" ON team_unlocked_files
    FOR SELECT USING (team_id = get_auth_team_id() OR is_admin());

CREATE POLICY "Backend/Admins can unlock files" ON team_unlocked_files
    FOR ALL USING (is_admin());


-- 8. ECHO CONVERSATIONS POLICIES
CREATE POLICY "Teams can view and insert own echo conversations" ON echo_conversations
    FOR ALL USING (team_id = get_auth_team_id() OR is_admin());


-- 9. ECHO USAGE POLICIES
CREATE POLICY "Teams can view own echo usage" ON echo_usage
    FOR SELECT USING (team_id = get_auth_team_id() OR is_admin());

CREATE POLICY "Backend/Admins can update echo usage" ON echo_usage
    FOR ALL USING (is_admin());


-- 10. TIMELINE EVENTS POLICIES
CREATE POLICY "Teams and admins can view timeline events" ON timeline_events
    FOR SELECT USING (TRUE);

CREATE POLICY "Admins can manage timeline events" ON timeline_events
    FOR ALL USING (is_admin());


-- 11. TIMELINE SUBMISSIONS POLICIES
CREATE POLICY "Teams can view and insert own timeline submissions" ON timeline_submissions
    FOR ALL USING (team_id = get_auth_team_id() OR is_admin());


-- 12. FINAL SUBMISSIONS POLICIES
CREATE POLICY "Teams can view own final submission" ON final_submissions
    FOR SELECT USING (team_id = get_auth_team_id() OR is_admin());

CREATE POLICY "Teams can insert own final submission" ON final_submissions
    FOR INSERT WITH CHECK (team_id = get_auth_team_id() OR is_admin());

CREATE POLICY "Admins can score final submissions" ON final_submissions
    FOR ALL USING (is_admin());


-- 13. EVENT STATE POLICIES
CREATE POLICY "Everyone can view event state" ON event_state
    FOR SELECT USING (TRUE);

CREATE POLICY "Admins can update event state" ON event_state
    FOR ALL USING (is_admin());


-- 14. SCORE LOG POLICIES
CREATE POLICY "Teams can view own score logs" ON score_log
    FOR SELECT USING (team_id = get_auth_team_id() OR is_admin());

CREATE POLICY "Admins and service_role can manage score logs" ON score_log
    FOR ALL USING (is_admin());


-- 15. FINALE STATE POLICIES
CREATE POLICY "Everyone can view finale state" ON finale_state
    FOR SELECT USING (TRUE);

CREATE POLICY "Admins can update finale state" ON finale_state
    FOR ALL USING (is_admin());
