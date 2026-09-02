import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileCheck2, ArrowLeft, Send, Lock, CheckCircle2, AlertTriangle, Save, Shield, HelpCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../utils/api';
import { saveCaseTheoryDraft, loadCaseTheoryDraft, clearCaseTheoryDraft } from '../utils/storage';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { playDialClick, playSolveChime, playErrorBuzzer } from '../utils/audio';

export function FinalSubmission() {
  const { user, refreshAuth } = useAuth();
  const { addToast } = useToast();

  const [form, setForm] = useState({
    what_happened: '',
    who_was_involved: '',
    reconstructed_timeline: '',
    key_evidence: '',
    final_explanation: ''
  });

  const [isLocked, setIsLocked] = useState(false);
  const [lockedSubmission, setLockedSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [lastDraftTime, setLastDraftTime] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadExistingSubmission = async () => {
    try {
      const res = await api.get('/round1/submission');
      if (res.is_submitted && res.submission?.locked) {
        setIsLocked(true);
        setLockedSubmission(res.submission);
      } else {
        // Load draft from localStorage
        const draft = loadCaseTheoryDraft();
        if (draft) {
          setForm({
            what_happened: draft.what_happened || '',
            who_was_involved: draft.who_was_involved || '',
            reconstructed_timeline: draft.reconstructed_timeline || '',
            key_evidence: draft.key_evidence || '',
            final_explanation: draft.final_explanation || ''
          });
          setLastDraftTime(draft.savedAt ? new Date(draft.savedAt).toLocaleTimeString() : null);
        }
      }
    } catch (err) {
      console.warn('Failed to load submission:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExistingSubmission();
  }, []);

  // Auto-save draft every 3 seconds if not locked
  useEffect(() => {
    if (isLocked) return;
    const interval = setInterval(() => {
      if (
        form.what_happened ||
        form.who_was_involved ||
        form.reconstructed_timeline ||
        form.key_evidence ||
        form.final_explanation
      ) {
        saveCaseTheoryDraft(form);
        setLastDraftTime(new Date().toLocaleTimeString());
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [form, isLocked]);

  const handleChange = (field, val) => {
    setForm((prev) => ({ ...prev, [field]: val }));
  };

  const handleOpenLockConfirm = (e) => {
    e.preventDefault();
    if (
      !form.what_happened.trim() ||
      !form.who_was_involved.trim() ||
      !form.key_evidence.trim() ||
      !form.final_explanation.trim()
    ) {
      addToast('Please complete all case theory sections before submitting.', 'warning');
      playErrorBuzzer();
      return;
    }
    playDialClick();
    setShowConfirmModal(true);
  };

  const handleConfirmLockSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await api.post('/round1/submit', {
        what_happened: form.what_happened.trim(),
        who_was_involved: form.who_was_involved.trim(),
        reconstructed_timeline: form.reconstructed_timeline.trim(),
        key_evidence: form.key_evidence.trim(),
        final_explanation: form.final_explanation.trim()
      });

      playSolveChime();
      confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
      addToast('Case Theory Locked and Submitted to Game Masters!', 'success', 6000);
      clearCaseTheoryDraft();
      setIsLocked(true);
      setLockedSubmission(res.submission);
      setShowConfirmModal(false);
      refreshAuth();
    } catch (err) {
      playErrorBuzzer();
      addToast(err.message || 'Submission failed.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center font-mono text-zinc-400">
        Loading Case Theory Dossier...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Back link */}
      <Link
        to="/dashboard"
        onClick={playDialClick}
        className="inline-flex items-center gap-2 text-xs font-mono text-zinc-400 hover:text-deadair-green transition"
      >
        <ArrowLeft className="w-4 h-4" /> &larr; BACK TO DASHBOARD
      </Link>

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-deadair-900 border border-deadair-800 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-deadair-amber" />
            <h1 className="font-tech text-2xl sm:text-3xl font-bold text-zinc-100 uppercase tracking-wide">
              FINAL CASE THEORY DOSSIER
            </h1>
          </div>
          <p className="font-mono text-xs text-zinc-400">
            Synthesize all decrypted evidence into a cohesive final solution for Game Master evaluation.
          </p>
        </div>

        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-deadair-950 border border-deadair-800 self-start sm:self-auto font-mono text-xs">
          {isLocked ? (
            <span className="text-deadair-green flex items-center gap-1.5 font-bold">
              <Lock className="w-4 h-4" /> DOSSIER LOCKED & SCORED
            </span>
          ) : (
            <span className="text-deadair-amber flex items-center gap-1.5">
              <Save className="w-3.5 h-3.5 animate-pulse" />
              {lastDraftTime ? `Draft Saved (${lastDraftTime})` : 'Auto-Save Active'}
            </span>
          )}
        </div>
      </div>

      {isLocked ? (
        /* Read-Only Locked View */
        <div className="p-6 sm:p-8 rounded-2xl bg-deadair-900 border-2 border-deadair-green/40 shadow-2xl space-y-6">
          <div className="p-4 rounded-xl bg-deadair-green/10 border border-deadair-green/30 text-deadair-green font-mono text-xs flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-sm font-bold block mb-1">OFFICIAL DOSSIER SUBMITTED & IMMUTABLY LOCKED</strong>
              Your team's case theory was submitted at{' '}
              <strong>{new Date(lockedSubmission?.submitted_at || Date.now()).toLocaleTimeString()}</strong>.
              Submissions are permanently frozen at the database layer. Finalist rankings will be announced in Round 2!
            </div>
          </div>

          <div className="space-y-5 font-mono text-xs sm:text-sm">
            <div className="p-4 rounded-xl bg-deadair-950 border border-deadair-800 space-y-1">
              <div className="text-zinc-500 uppercase text-[10px]">1. What Happened on Oct 31, 1984?</div>
              <div className="text-zinc-200 whitespace-pre-wrap leading-relaxed">{lockedSubmission?.what_happened}</div>
            </div>

            <div className="p-4 rounded-xl bg-deadair-950 border border-deadair-800 space-y-1">
              <div className="text-zinc-500 uppercase text-[10px]">2. Who Was Involved?</div>
              <div className="text-zinc-200 whitespace-pre-wrap leading-relaxed">{lockedSubmission?.who_was_involved}</div>
            </div>

            <div className="p-4 rounded-xl bg-deadair-950 border border-deadair-800 space-y-1">
              <div className="text-zinc-500 uppercase text-[10px]">3. Key Evidence Cited</div>
              <div className="text-zinc-200 whitespace-pre-wrap leading-relaxed">{lockedSubmission?.key_evidence}</div>
            </div>

            <div className="p-4 rounded-xl bg-deadair-950 border border-deadair-800 space-y-1">
              <div className="text-zinc-500 uppercase text-[10px]">4. Final Explanation & Escape Destination</div>
              <div className="text-zinc-200 whitespace-pre-wrap leading-relaxed">{lockedSubmission?.final_explanation}</div>
            </div>

            {lockedSubmission?.admin_score !== null && lockedSubmission?.admin_score !== undefined && (
              <div className="p-4 rounded-xl bg-amber-950/30 border border-deadair-amber text-deadair-amber space-y-1">
                <div className="font-tech text-base font-bold">GAME MASTER EVALUATION SCORE: {lockedSubmission.admin_score} PTS</div>
                {lockedSubmission.admin_feedback && (
                  <div className="text-xs text-zinc-300 italic">{lockedSubmission.admin_feedback}</div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Interactive Form */
        <form onSubmit={handleOpenLockConfirm} className="space-y-6">
          <div className="p-4 rounded-xl bg-deadair-amber/10 border border-deadair-amber/30 text-deadair-amber font-mono text-xs flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="block mb-0.5 text-zinc-100">NON-EDITABLE SUBMISSION WARNING:</strong>
              Once you press "Lock & Submit Final Theory", your answers will be permanently written to the database and locked. No further modifications can be made.
            </div>
          </div>

          <div className="space-y-5">
            {/* Section 1 */}
            <div className="p-6 rounded-2xl bg-deadair-900 border border-deadair-800 space-y-2 shadow-xl">
              <label className="block font-tech text-sm font-bold text-zinc-100 uppercase">
                1. WHAT HAPPENED AT W-DEAD 94.7 FM ON OCTOBER 31, 1984? *
              </label>
              <p className="font-mono text-xs text-zinc-400">
                Explain the sequence of events from the 23:15 broadcast to the 23:54 power grid failure.
              </p>
              <textarea
                rows={3}
                required
                value={form.what_happened}
                onChange={(e) => handleChange('what_happened', e.target.value)}
                placeholder="Detail what Alan Vance discovered, the power outage, and the radio transmission override..."
                className="w-full bg-deadair-950 border border-deadair-700 rounded-lg p-3 font-mono text-xs sm:text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-deadair-amber resize-y leading-relaxed"
              />
            </div>

            {/* Section 2 */}
            <div className="p-6 rounded-2xl bg-deadair-900 border border-deadair-800 space-y-2 shadow-xl">
              <label className="block font-tech text-sm font-bold text-zinc-100 uppercase">
                2. WHO WAS INVOLVED & WHAT WERE THEIR ROLES? *
              </label>
              <p className="font-mono text-xs text-zinc-400">
                Identify Alan Vance, Station Manager Arthur Sterling, Engineer Richard Finch, and federal agents.
              </p>
              <textarea
                rows={3}
                required
                value={form.who_was_involved}
                onChange={(e) => handleChange('who_was_involved', e.target.value)}
                placeholder="Identify who authorized Project Nightshade/Oblivion and who aided the escape..."
                className="w-full bg-deadair-950 border border-deadair-700 rounded-lg p-3 font-mono text-xs sm:text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-deadair-amber resize-y leading-relaxed"
              />
            </div>

            {/* Section 3 */}
            <div className="p-6 rounded-2xl bg-deadair-900 border border-deadair-800 space-y-2 shadow-xl">
              <label className="block font-tech text-sm font-bold text-zinc-100 uppercase">
                3. RECONSTRUCTED TIMELINE SUMMARY
              </label>
              <p className="font-mono text-xs text-zinc-400">
                Outline key timestamps (23:15, 23:38, 23:52, 23:54).
              </p>
              <textarea
                rows={2}
                value={form.reconstructed_timeline}
                onChange={(e) => handleChange('reconstructed_timeline', e.target.value)}
                placeholder="23:15: Harbor warning broadcast -> 23:38: Vault B entry..."
                className="w-full bg-deadair-950 border border-deadair-700 rounded-lg p-3 font-mono text-xs sm:text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-deadair-amber resize-y leading-relaxed"
              />
            </div>

            {/* Section 4 */}
            <div className="p-6 rounded-2xl bg-deadair-900 border border-deadair-800 space-y-2 shadow-xl">
              <label className="block font-tech text-sm font-bold text-zinc-100 uppercase">
                4. KEY EVIDENCE CITED *
              </label>
              <p className="font-mono text-xs text-zinc-400">
                List the documents, transcripts, and logs supporting your conclusion.
              </p>
              <textarea
                rows={3}
                required
                value={form.key_evidence}
                onChange={(e) => handleChange('key_evidence', e.target.value)}
                placeholder="Cite the 96.4 MHz audio log, FCC Project Nightshade memo, keycard access logs for Vault B..."
                className="w-full bg-deadair-950 border border-deadair-700 rounded-lg p-3 font-mono text-xs sm:text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-deadair-amber resize-y leading-relaxed"
              />
            </div>

            {/* Section 5 */}
            <div className="p-6 rounded-2xl bg-deadair-900 border border-deadair-800 space-y-2 shadow-xl">
              <label className="block font-tech text-sm font-bold text-zinc-100 uppercase">
                5. FINAL EXPLANATION & ESCAPE DESTINATION *
              </label>
              <p className="font-mono text-xs text-zinc-400">
                Where did Alan Vance go, what vessel did he board, and what happened to the secret project?
              </p>
              <textarea
                rows={3}
                required
                value={form.final_explanation}
                onChange={(e) => handleChange('final_explanation', e.target.value)}
                placeholder="Conclude with the vessel Maelstrom, Slip #42 at Harbor Lights, and the revelation of Project Oblivion..."
                className="w-full bg-deadair-950 border border-deadair-700 rounded-lg p-3 font-mono text-xs sm:text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-deadair-amber resize-y leading-relaxed"
              />
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-2xl bg-deadair-900 border border-deadair-800 shadow-xl">
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
              <Shield className="w-4 h-4 text-deadair-amber flex-shrink-0" />
              <span>Draft auto-saves continuously. Confirm before permanent lock.</span>
            </div>

            <button
              type="submit"
              className="w-full sm:w-auto px-8 py-3.5 rounded-lg bg-deadair-amber hover:bg-amber-400 text-black font-tech font-bold text-sm tracking-wider uppercase transition shadow-lg flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              <span>LOCK & SUBMIT FINAL THEORY</span>
            </button>
          </div>
        </form>
      )}

      {/* Permanent Lock Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        title="Permanently Lock & Submit Case Theory?"
        message="Are you sure your team is ready to submit? Once confirmed, this case dossier will be sealed and CANNOT be modified again under any circumstances."
        confirmText="Lock & Seal Dossier"
        confirmVariant="warning"
        isSubmitting={isSubmitting}
        onConfirm={handleConfirmLockSubmit}
        onCancel={() => setShowConfirmModal(false)}
      />
    </div>
  );
}
