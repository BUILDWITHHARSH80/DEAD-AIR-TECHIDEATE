import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { GitBranch, ArrowLeft, Send, CheckCircle2, Clock, Award, AlertCircle, HelpCircle, FolderLock } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../utils/api';
import { playDialClick, playSolveChime, playErrorBuzzer } from '../utils/audio';

export function TimelineModule() {
  const { user, refreshAuth } = useAuth();
  const { addToast } = useToast();

  const [timelineSlots, setTimelineSlots] = useState([]);
  const [inputs, setInputs] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadTimeline = async () => {
    try {
      const data = await api.get('/timeline');
      setTimelineSlots(data || []);
      const initialInputs = {};
      (data || []).forEach((slot) => {
        initialInputs[slot.id] = slot.submitted_text || '';
      });
      setInputs(initialInputs);
    } catch (err) {
      console.warn('Failed to load timeline:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTimeline();
  }, []);

  const handleInputChange = (slotId, text) => {
    setInputs((prev) => ({ ...prev, [slotId]: text }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const submissions = Object.entries(inputs)
      .filter(([_, text]) => text.trim().length > 0)
      .map(([slotId, text]) => ({
        timeline_event_id: slotId,
        submitted_text: text.trim()
      }));

    if (submissions.length === 0) {
      addToast('Please enter event details for at least one timeline slot.', 'warning');
      setSubmitting(false);
      return;
    }

    try {
      const res = await api.post('/timeline/submit', { submissions });
      if (res.total_points_awarded > 0) {
        playSolveChime();
        confetti({ particleCount: 90, spread: 60, origin: { y: 0.6 } });
        addToast(`Timeline Accepted! +${res.total_points_awarded} Points awarded!`, 'success');
        refreshAuth();
      } else {
        const anyCorrect = res.results.some((r) => r.is_correct);
        if (anyCorrect) {
          playSolveChime();
          addToast('Timeline verified and updated.', 'info');
        } else {
          playErrorBuzzer();
          addToast('Descriptions need more forensic detail from evidence logs.', 'warning');
        }
      }
      loadTimeline();
    } catch (err) {
      playErrorBuzzer();
      addToast(err.message || 'Submission error.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const solvedSlotsCount = timelineSlots.filter((s) => s.is_correct).length;

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

      {/* Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-deadair-900 border border-deadair-800 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-cyan-400" />
            <h1 className="font-tech text-2xl sm:text-3xl font-bold text-zinc-100 uppercase tracking-wide">
              BROADCAST TIMELINE RECONSTRUCTION
            </h1>
          </div>
          <p className="font-mono text-xs text-zinc-400">
            Align the forensic timestamps from decrypted audio recordings, CCTV frames, and police reports.
          </p>
        </div>

        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-deadair-950 border border-deadair-800 self-start sm:self-auto font-mono text-xs">
          <Award className="w-4 h-4 text-deadair-amber" />
          <span>RECONSTRUCTED: <strong className="text-cyan-400">{solvedSlotsCount} / {timelineSlots.length}</strong></span>
        </div>
      </div>

      {/* Interactive Slots Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          {timelineSlots.map((slot, index) => {
            const isCorrect = slot.is_correct;
            return (
              <div
                key={slot.id}
                className={`p-6 rounded-2xl border transition shadow-xl space-y-3 ${
                  isCorrect
                    ? 'bg-deadair-900/90 border-deadair-green/40 shadow-deadair-green/5'
                    : 'bg-deadair-900 border-deadair-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="px-3 py-1 rounded bg-black text-deadair-green border border-deadair-green/40 font-bold flex items-center gap-1.5 glow-green">
                      <Clock className="w-3.5 h-3.5" /> {slot.timestamp_label} EST
                    </span>
                    <span className="text-zinc-400 font-tech font-bold text-sm sm:text-base">
                      {slot.hint_title}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs px-2.5 py-0.5 rounded bg-deadair-850 text-deadair-amber border border-deadair-700">
                      +{slot.points_value} PTS
                    </span>
                    {isCorrect ? (
                      <span className="font-mono text-xs px-2.5 py-0.5 rounded bg-deadair-green/20 text-deadair-green border border-deadair-green/40 flex items-center gap-1 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> VERIFIED
                      </span>
                    ) : (
                      <span className="font-mono text-xs px-2.5 py-0.5 rounded bg-deadair-800 text-zinc-500 border border-deadair-700">
                        PENDING
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <textarea
                    rows={2}
                    value={inputs[slot.id] || ''}
                    onChange={(e) => handleInputChange(slot.id, e.target.value)}
                    placeholder={`Describe what happened at ${slot.timestamp_label} based on decrypted evidence...`}
                    className="w-full bg-deadair-950 border border-deadair-700 rounded-lg p-3 font-mono text-xs sm:text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-cyan-400 resize-y leading-relaxed"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Submit Button */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-2xl bg-deadair-900 border border-deadair-800 shadow-xl">
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
            <HelpCircle className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <span>50 points awarded per correctly described milestone event.</span>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto px-8 py-3 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-black font-tech font-bold text-sm tracking-wider uppercase transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{submitting ? 'EVALUATING TIMELINE...' : 'SUBMIT TIMELINE FOR SCORING'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
