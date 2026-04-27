import React from 'react';

import {
  CloseOptions,
  CloseRequestListener,
  ModalComponent,
  ModalListener,
  ModalOptions,
  ModalState,
  PropsAreOptional,
  ReplaceRequestListener,
} from './types';

type ModalEntry = {
  id: string;
  Component: React.ComponentType<Record<string, unknown>>;
  props?: unknown;
  options: ModalOptions;
  disposeAbortListener?: () => void;
  close: (value?: unknown, options?: CloseOptions) => void;
  settle: (value?: unknown) => void;
};

type PendingProgrammaticBack = {
  id: string;
  settle: () => void;
};

const HISTORY_STATE_KEY = '__reactleafModal';
export const MODAL_ABORTED: unique symbol = Symbol.for('@reactleaf/modal/aborted');
export const MODAL_REPLACED: unique symbol = Symbol.for('@reactleaf/modal/replaced');
export type ModalAborted = typeof MODAL_ABORTED;
export type ModalReplaced = typeof MODAL_REPLACED;
export type ModalClosedSignal = ModalAborted | ModalReplaced;

function createModalHistoryState(id: string) {
  return {
    [HISTORY_STATE_KEY]: {
      id,
    },
  };
}

function getModalIdFromHistoryState(state: unknown): string | null {
  if (!state || typeof state !== 'object') return null;

  const modalState = (state as Record<string, unknown>)[HISTORY_STATE_KEY];
  if (!modalState || typeof modalState !== 'object') return null;

  const id = (modalState as Record<string, unknown>).id;
  return typeof id === 'string' ? id : null;
}

export default class ModalManager {
  private modalStack: ModalEntry[] = [];
  private listeners: ModalListener[] = [];
  private closeRequestListener: CloseRequestListener | null = null;
  private replaceRequestListener: ReplaceRequestListener | null = null;
  private pendingReplacements = new Map<string, ModalEntry>();
  private pendingCloseHistories = new Map<string, Promise<void>>();
  private idCounter = 0;
  private pendingProgrammaticBacks: PendingProgrammaticBack[] = [];

  constructor() {}

  private generateId(): string {
    return `modal-${++this.idCounter}-${Date.now()}`;
  }

  private notifyListeners(): void {
    const snapshot = this.getSnapshot();
    this.listeners.forEach((listener) => listener([...snapshot]));
  }

  private createModalEntry<Props, Result>(
    id: string,
    Component: ModalComponent<Props>,
    props: Props | null | undefined,
    options: ModalOptions | undefined,
    resolve: (value: Result | ModalClosedSignal | undefined) => void,
    onAbort?: () => void,
  ): ModalEntry {
    const finalOptions = { ...Component?.layerOptions, ...options };

    const closeModal = (result?: unknown, closeOptions?: CloseOptions) => {
      const historySettled = this.prepareClose(id, closeOptions);

      this.removeById(id, () => {
        void historySettled.then(() => resolve(result as Result | ModalClosedSignal | undefined));
      });
    };

    let disposeAbortListener: (() => void) | undefined;
    if (finalOptions.abortController) {
      const handleAbort = () => {
        if (onAbort) {
          onAbort();
          return;
        }

        this.closeWithResult(id, MODAL_ABORTED);
      };

      finalOptions.abortController.signal.addEventListener('abort', handleAbort, { once: true });
      disposeAbortListener = () => {
        finalOptions.abortController?.signal.removeEventListener('abort', handleAbort);
      };
    }

    return {
      id,
      Component: Component as React.ComponentType<Record<string, unknown>>,
      props,
      options: finalOptions,
      disposeAbortListener,
      close: closeModal,
      settle: (value) => resolve(value as Result | ModalClosedSignal | undefined),
    };
  }

  open<Props, Result = unknown>(
    Component: PropsAreOptional<Props> extends true ? ModalComponent<Props> : never,
    props?: Props | null,
    options?: ModalOptions,
  ): Promise<Result | ModalClosedSignal | undefined>;

  open<Props, Result = unknown>(
    Component: PropsAreOptional<Props> extends true ? never : ModalComponent<Props>,
    props: Props,
    options?: ModalOptions,
  ): Promise<Result | ModalClosedSignal | undefined>;

  open<Props, Result = unknown>(
    Component: ModalComponent<Props>,
    props?: Props | null,
    options?: ModalOptions,
  ): Promise<Result | ModalClosedSignal | undefined> {
    return new Promise<Result | ModalClosedSignal | undefined>((resolve) => {
      const id = this.generateId();

      if (options?.abortController?.signal.aborted) {
        resolve(MODAL_ABORTED);
        return;
      }

      const modalEntry = this.createModalEntry(id, Component, props, options, resolve);
      this.modalStack.push(modalEntry);

      if (typeof window !== 'undefined') {
        window.history.pushState(createModalHistoryState(id), '', window.location.href);
      }

      this.notifyListeners();
    });
  }

  /** @internal Used by ModalProvider to replace a specific modal layer from useModalInstance(). */
  replaceById<Props, Result = unknown>(
    id: string,
    Component: PropsAreOptional<Props> extends true ? ModalComponent<Props> : never,
    props?: Props | null,
    options?: ModalOptions,
  ): Promise<Result | ModalClosedSignal | undefined>;

  replaceById<Props, Result = unknown>(
    id: string,
    Component: PropsAreOptional<Props> extends true ? never : ModalComponent<Props>,
    props: Props,
    options?: ModalOptions,
  ): Promise<Result | ModalClosedSignal | undefined>;

  /** @internal Used by ModalProvider to replace a specific modal layer from useModalInstance(). */
  replaceById<Props, Result = unknown>(
    id: string,
    Component: ModalComponent<Props>,
    props?: Props | null,
    options?: ModalOptions,
  ): Promise<Result | ModalClosedSignal | undefined> {
    const currentModal = this.modalStack.find((modal) => modal.id === id);
    if (!currentModal) {
      return Promise.resolve(MODAL_REPLACED);
    }

    return this.replaceExisting(currentModal, Component, props, options);
  }

  private replaceExisting<Props, Result = unknown>(
    currentModal: ModalEntry,
    Component: ModalComponent<Props>,
    props?: Props | null,
    options?: ModalOptions,
  ): Promise<Result | ModalClosedSignal | undefined> {
    return new Promise<Result | ModalClosedSignal | undefined>((resolve) => {
      if (options?.abortController?.signal.aborted) {
        resolve(MODAL_ABORTED);
        return;
      }

      let nextModal!: ModalEntry;
      nextModal = this.createModalEntry(currentModal.id, Component, props, options, resolve, () => {
        if (this.pendingReplacements.get(currentModal.id) !== nextModal) return;

        this.pendingReplacements.delete(currentModal.id);
        nextModal.disposeAbortListener?.();
        nextModal.settle(MODAL_ABORTED);
      });
      this.pendingReplacements.set(currentModal.id, nextModal);

      const request = {
        id: currentModal.id,
        next: this.toModalState(nextModal),
      };

      if (this.replaceRequestListener?.(request)) {
        return;
      }

      this.completeReplace(currentModal.id);
    });
  }

  private removeById(id: string, onRemoved?: () => void): boolean {
    const modalIndex = this.modalStack.findIndex((modal) => modal.id === id);
    if (modalIndex === -1) return false;

    const [removedModal] = this.modalStack.splice(modalIndex, 1);
    removedModal?.disposeAbortListener?.();
    this.pendingReplacements.delete(id);
    this.pendingCloseHistories.delete(id);
    onRemoved?.();

    this.notifyListeners();
    return true;
  }

  private toModalState({ id, Component, props, options }: ModalEntry): ModalState {
    return {
      id,
      Component,
      props: props as Record<string, unknown> | undefined,
      options,
    };
  }

  /** @internal Starts history reconciliation for a close request without removing the modal yet. */
  prepareClose(id: string, options?: CloseOptions): Promise<void> {
    const modal = this.modalStack.find((m) => m.id === id);
    if (!modal) return Promise.resolve();

    const pendingHistory = this.pendingCloseHistories.get(id);
    if (pendingHistory) return pendingHistory;

    const historySettled = this.startHistoryBack(id, options).then(
      () => {
        this.pendingCloseHistories.delete(id);
      },
      () => {
        this.pendingCloseHistories.delete(id);
      },
    );

    this.pendingCloseHistories.set(id, historySettled);
    return historySettled;
  }

  private startHistoryBack(id: string, options?: CloseOptions): Promise<void> {
    if (options?.historyBack || typeof window === 'undefined') {
      return Promise.resolve();
    }

    if (typeof window.addEventListener !== 'function') {
      window.history.back();
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      this.pendingProgrammaticBacks.push({ id, settle: resolve });
      window.history.back();
    });
  }

  handlePopState(state?: unknown): boolean {
    const pendingProgrammaticBack = this.pendingProgrammaticBacks.shift();
    if (pendingProgrammaticBack) {
      pendingProgrammaticBack.settle();
      return false;
    }

    const destinationModalId = getModalIdFromHistoryState(state);

    if (!destinationModalId) {
      return this.closeTop({ historyBack: true });
    }

    const destinationIndex = this.modalStack.findIndex((modal) => modal.id === destinationModalId);
    if (destinationIndex === -1) {
      return false;
    }

    const modalsAboveDestination = this.modalStack.slice(destinationIndex + 1);
    for (const modal of modalsAboveDestination.reverse()) {
      this.close(modal.id, { historyBack: true });
    }

    return modalsAboveDestination.length > 0;
  }

  closeWithResult<Result = unknown>(id: string, result?: Result, options?: CloseOptions): boolean {
    const modal = this.modalStack.find((m) => m.id === id);
    if (!modal) return false;

    if (this.closeRequestListener?.({ id, result, options, historySettled: this.prepareClose(id, options) })) {
      return true;
    }

    modal.close(result, options);
    return true;
  }

  /** @internal Used by ModalProvider after it handles a close request. */
  completeCloseWithResult<Result = unknown>(id: string, result?: Result, options?: CloseOptions): boolean {
    const modal = this.modalStack.find((m) => m.id === id);
    if (!modal) return false;
    modal.close(result, { ...options, historyBack: true });
    return true;
  }

  /** @internal Used by ModalProvider after it handles a replace request. */
  completeReplace(id: string): boolean {
    const modalIndex = this.modalStack.findIndex((modal) => modal.id === id);
    const nextModal = this.pendingReplacements.get(id);
    if (modalIndex === -1 || !nextModal) return false;

    const previousModal = this.modalStack[modalIndex];
    previousModal?.disposeAbortListener?.();
    previousModal?.settle(MODAL_REPLACED);

    this.modalStack[modalIndex] = nextModal;
    this.pendingReplacements.delete(id);
    this.notifyListeners();
    return true;
  }

  close(id: string, options?: CloseOptions): boolean {
    return this.closeWithResult(id, undefined, options);
  }

  closeTop(options?: CloseOptions): boolean {
    const topModal = this.modalStack[this.modalStack.length - 1];
    if (!topModal) return false;
    return this.close(topModal.id, options);
  }

  closeAll(options?: CloseOptions): void {
    const openModals = [...this.modalStack];
    for (const modal of openModals) {
      this.close(modal.id, options);
    }
  }

  getSnapshot(): ReadonlyArray<ModalState> {
    return this.modalStack.map(({ id, Component, props, options }) => ({
      id,
      Component,
      props: props as Record<string, unknown> | undefined,
      options,
    }));
  }

  hasOpenModals(): boolean {
    return this.modalStack.length > 0;
  }

  subscribe(listener: ModalListener): () => void {
    this.listeners.push(listener);

    if (this.modalStack.length > 0) {
      listener([...this.getSnapshot()]);
    }

    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /** @internal Used by ModalProvider to own UI close transitions. */
  setCloseRequestListener(listener: CloseRequestListener): () => void {
    this.closeRequestListener = listener;

    return () => {
      if (this.closeRequestListener === listener) {
        this.closeRequestListener = null;
      }
    };
  }

  /** @internal Used by ModalProvider to own UI replace transitions. */
  setReplaceRequestListener(listener: ReplaceRequestListener): () => void {
    this.replaceRequestListener = listener;

    return () => {
      if (this.replaceRequestListener === listener) {
        this.replaceRequestListener = null;
      }
    };
  }
}
