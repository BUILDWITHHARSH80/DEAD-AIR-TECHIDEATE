// LocalStorage helpers for in-progress drafts and session cache

const DRAFT_KEY = 'deadair_case_theory_draft';

export function saveCaseTheoryDraft(data) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({
      ...data,
      savedAt: new Date().toISOString()
    }));
  } catch (e) {
    console.error('Failed to save draft:', e);
  }
}

export function loadCaseTheoryDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

export function clearCaseTheoryDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch (e) {
    // ignore
  }
}
