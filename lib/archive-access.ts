// Old unlocks did not distinguish admin access from verified passkey entry.
// Treat those records as approvals; only a new passkey check reveals content.
export function prepareArchiveState(state: any) {
    if (!state.archiveApprovals) {
        state.archiveApprovals = { ...state.unlocks };
        state.unlocks = {};
    }
    return state;
}

export function revokeArchiveAccess(state: any, document: string) {
    delete state.archiveApprovals[document];
    delete state.unlocks[document];
    state.broadcast = false;
    state.truth = false;
    state.finishedAt = 0;
}