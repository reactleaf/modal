import React from 'react';

import { ModalComponent, ModalListener, ModalOptions, ModalState, PropsAreOptional } from './types';

export default class ModalManager {
  private modalStack: ModalState[] = [];
  private listeners: ModalListener[] = [];
  private idCounter = 0;

  constructor() {}

  private generateId(): string {
    return `modal-${++this.idCounter}-${Date.now()}`;
  }

  private notifyListeners(): void {
    const snapshot = [...this.modalStack];
    this.listeners.forEach((listener) => listener(snapshot));
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
      const closeModal = (result?: Result) => {
        this.closeById(id);
        resolve(result);
      };

      if (finalOptions.abortController) {
        finalOptions.abortController.signal.addEventListener(
          'abort',
          () => {
            this.closeById(id);
            resolve(null);
          },
          { once: true },
        );
      }

      const modalState = {
        id,
        Component: Component as React.ComponentType<Record<string, unknown>>,
        props,
        options: finalOptions,
        close: closeModal,
      };

      this.modalStack.push(modalState as ModalState);

      if (typeof window !== 'undefined') {
        window.history.pushState(null, '', window.location.href);
      }

      this.notifyListeners();
    });
  }

  closeById(id: string, historyBack = false): void {
    const modalIndex = this.modalStack.findIndex((modal) => modal.id === id);
    if (modalIndex === -1) return;

    this.modalStack.splice(modalIndex, 1);

    if (!historyBack && typeof window !== 'undefined') {
      window.history.back();
    }

    this.notifyListeners();
  }

  closeTop(historyBack = false): boolean {
    if (this.modalStack.length === 0) return false;

    const topModal = this.modalStack[this.modalStack.length - 1];
    if (topModal) {
      this.closeById(topModal.id, historyBack);
    }
    return true;
  }

  closeAll(): void {
    const openModals = [...this.modalStack];
    this.modalStack = [];
    this.notifyListeners();

    openModals.forEach((modal) => {
      modal.close(null);
    });
  }

  getSnapshot(): ReadonlyArray<ModalState> {
    return [...this.modalStack];
  }

  hasOpenModals(): boolean {
    return this.modalStack.length > 0;
  }

  subscribe(listener: ModalListener): () => void {
    this.listeners.push(listener);

    if (this.modalStack.length > 0) {
      listener([...this.modalStack]);
    }

    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }
}
