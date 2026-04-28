import React from 'react';

/* Layer / modal entry ------------------------------------------------------ */

export interface LayerOptions {
  className?: string;
  closeDelay?: number;
  closeOnOutsideClick?: boolean;
  dim?: boolean | string;
}

export interface RootOptions {
  preventScroll?: boolean;
}

export interface ModalOptions extends LayerOptions {
  abortController?: AbortController;
}

export interface ModalState<TComponent extends React.ComponentType = React.ComponentType> {
  id: string;
  Component: TComponent;
  props?: React.ComponentProps<TComponent>;
  options: ModalOptions;
}

export type ModalComponent<TProps = unknown> = React.ComponentType<TProps> & {
  layerOptions?: Partial<LayerOptions>;
};

export type ModalListener = (modalStack: ModalState[]) => void;

/* Close -------------------------------------------------------------------- */

export interface CloseOptions {
  historyBack?: boolean;
}

export interface CloseRequest {
  id: string;
  result?: unknown;
  options?: CloseOptions;
  historySettled: Promise<void>;
}

export type CloseRequestListener = (request: CloseRequest) => boolean;

/* Replace ------------------------------------------------------------------ */

export interface ReplaceRequest {
  id: string;
}

export type ReplaceRequestListener = (request: ReplaceRequest) => boolean;

export type PropsAreOptional<Props> =
  [Props] extends [void] ? true
    : [Props] extends [undefined] ? true
      : {} extends Props ? true
        : false;
