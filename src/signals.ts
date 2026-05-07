export const MODAL_ABORTED: unique symbol = Symbol.for("@reactleaf/modal/aborted");
export const MODAL_REPLACED: unique symbol = Symbol.for("@reactleaf/modal/replaced");

export type ModalAborted = typeof MODAL_ABORTED;
export type ModalReplaced = typeof MODAL_REPLACED;
export type ModalClosedSignal = ModalAborted | ModalReplaced;
