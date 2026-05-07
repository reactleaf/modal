const HISTORY_STATE_KEY = "__reactleafModal";

export function createModalHistoryState(id: string) {
  return {
    [HISTORY_STATE_KEY]: {
      id,
    },
  };
}

export function getModalIdFromHistoryState(state: unknown): string | null {
  if (!state || typeof state !== "object") return null;

  const modalState = (state as Record<string, unknown>)[HISTORY_STATE_KEY];
  if (!modalState || typeof modalState !== "object") return null;

  const id = (modalState as Record<string, unknown>).id;
  return typeof id === "string" ? id : null;
}
