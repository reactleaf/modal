import React from 'react';

import {
  CloseOptions,
  CloseRequestListener,
  ModalComponent,
  ModalListener,
  ModalOptions,
  ModalState,
  PropsAreOptional,
} from './types';

type ModalEntry = ModalState & {
  disposeAbortListener?: () => void;
  close: (value?: unknown, options?: CloseOptions) => void;
};

type PendingProgrammaticBack = {
  id: string;
  settle: () => void;
};

const HISTORY_STATE_KEY = '__reactleafModal';

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

  open<Props, Result = unknown>(
    Component: PropsAreOptional<Props> extends true ? ModalComponent<Props> : never,
    props?: Props | null,
    options?: ModalOptions,
  ): Promise<Result | null | undefined>;

  open<Props, Result = unknown>(
    Component: PropsAreOptional<Props> extends true ? never : ModalComponent<Props>,
    props: Props,
    options?: ModalOptions,
  ): Promise<Result | null | undefined>;

  open<Props, Result = unknown>(
    Component: ModalComponent<Props>,
    props?: Props | null,
    options?: ModalOptions,
  ): Promise<Result | null | undefined> {
    return new Promise<Result | null | undefined>((resolve) => {
      const id = this.generateId();
      const finalOptions = { ...Component?.modalOptions, ...options };
      let disposeAbortListener: (() => void) | undefined;

      if (finalOptions.abortController?.signal.aborted) {
        resolve(null);
        return;
      }

      const closeModal = (result?: Result, closeOptions?: CloseOptions) => {
        const historySettled = this.prepareClose(id, closeOptions);

        this.removeById(id, () => {
          void historySettled.then(() => resolve(result));
        });
      };

      if (finalOptions.abortController) {
        const handleAbort = () => {
          this.closeWithResult(id, null);
        };

        finalOptions.abortController.signal.addEventListener('abort', handleAbort, { once: true });
        disposeAbortListener = () => {
          finalOptions.abortController?.signal.removeEventListener('abort', handleAbort);
        };
      }

      const modalState = {
        id,
        Component: Component as React.ComponentType<Record<string, unknown>>,
        props,
        options: finalOptions,
        disposeAbortListener,
        close: closeModal,
      };

      this.modalStack.push(modalState as ModalEntry);

      if (typeof window !== 'undefined') {
        window.history.pushState(createModalHistoryState(id), '', window.location.href);
      }

      this.notifyListeners();
    });
  }

  private removeById(id: string, onRemoved?: () => void): boolean {
    const modalIndex = this.modalStack.findIndex((modal) => modal.id === id);
    if (modalIndex === -1) return false;

    const [removedModal] = this.modalStack.splice(modalIndex, 1);
    removedModal?.disposeAbortListener?.();
    this.pendingCloseHistories.delete(id);
    onRemoved?.();

    this.notifyListeners();
    return true;
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
      props,
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
}
