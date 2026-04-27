import React from 'react';

export interface LayerOptions {
  className?: string;
  closeDelay?: number;
  closeOnOutsideClick?: boolean;
  dim?: boolean | string;
}

export interface StackOptions {
  preventScroll?: boolean;
}

// 모달 옵션 (AbortController 포함)
export interface ModalOptions extends LayerOptions {
  abortController?: AbortController;
}

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

// getSnapshot() / subscribe()로 노출되는 모달 엔트리(내부 close 핸들러는 포함하지 않음)
export interface ModalState<TComponent extends React.ComponentType = React.ComponentType> {
  id: string;
  Component: TComponent;
  props?: React.ComponentProps<TComponent>;
  options: ModalOptions;
}

export type Equals<X, Y> = (() => Y extends X ? 1 : 2) extends () => X extends Y ? 1 : 2 ? true : false;
export type PropsAreOptional<Props> =
  [Props] extends [void] ? true
    : [Props] extends [undefined] ? true
      : {} extends Props ? true
        : false;

// 모달 컴포넌트 타입 정의
export type ModalComponent<TProps = unknown> = React.ComponentType<TProps> & {
  layerOptions?: Partial<LayerOptions>;
};

// 모달 매니저 이벤트 리스너 타입
export type ModalListener = (modalStack: ModalState[]) => void;
