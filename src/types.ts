import React from 'react';
import type { ModalClosedSignal } from './signals';

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

export type ModalComponent<TProps = unknown, TResult = unknown> = React.ComponentType<TProps> & {
  layerOptions?: Partial<LayerOptions>;
  readonly __modalResult?: TResult;
};

export type ModalComponentProps<TComponent extends React.ComponentType<any>> =
  TComponent extends ModalComponent<infer Props, any> ? Props : React.ComponentProps<TComponent>;

export type ModalComponentResult<TComponent extends React.ComponentType<any>> =
  TComponent extends ModalComponent<any, infer Result> ? Result : unknown;

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

export type PropsAreOptional<Props> = [Props] extends [void]
  ? true
  : [Props] extends [undefined]
    ? true
    : {} extends Props
      ? true
      : false;

/* Return types ---- */
export type ModalOpenResult<TComponent extends React.ComponentType<any>> = Promise<
  ModalComponentResult<TComponent> | ModalClosedSignal | undefined
>;

export type ModalReplaceResult<TComponent extends React.ComponentType<any>> = ModalOpenResult<TComponent>;
