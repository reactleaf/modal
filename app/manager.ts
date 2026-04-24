import React from 'react';

import { CloseOptions, ModalComponent, ModalListener, ModalOptions, ModalState, PropsAreOptional } from './types';

type ModalEntry = ModalState & {
  disposeAbortListener?: () => void;
  close: (value?: unknown, options?: CloseOptions) => void;
};

export default class ModalManager {
  private modalStack: ModalEntry[] = [];
  private listeners: ModalListener[] = [];
  private idCounter = 0;
  private pendingProgrammaticPopStates = 0;

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
        this.removeById(id, closeOptions);
        resolve(result);
      };

      if (finalOptions.abortController) {
        const handleAbort = () => {
          this.removeById(id);
          resolve(null);
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
        window.history.pushState(null, '', window.location.href);
      }

      this.notifyListeners();
    });
  }

  private removeById(id: string, options?: CloseOptions): boolean {
    const modalIndex = this.modalStack.findIndex((modal) => modal.id === id);
    if (modalIndex === -1) return false;

    const [removedModal] = this.modalStack.splice(modalIndex, 1);
    removedModal?.disposeAbortListener?.();

    if (!options?.historyBack && typeof window !== 'undefined') {
      this.pendingProgrammaticPopStates += 1;
      window.history.back();
    }

    this.notifyListeners();
    return true;
  }

  handlePopState(): boolean {
    if (this.pendingProgrammaticPopStates > 0) {
      this.pendingProgrammaticPopStates -= 1;
      return false;
    }

    return this.closeTop({ historyBack: true });
  }

  closeWithResult<Result = unknown>(id: string, result?: Result, options?: CloseOptions): boolean {
    const modal = this.modalStack.find((m) => m.id === id);
    if (!modal) return false;
    modal.close(result, options);
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
}
