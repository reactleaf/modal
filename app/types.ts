import React from 'react';

// 오버레이 옵션
export interface OverlayOptions {
  className?: string;
  closeDelay?: number;
  closeOnOverlayClick?: boolean;
  dim?: boolean;
  preventScroll?: boolean;
}

// 모달 옵션 (AbortController 포함)
export interface ModalOptions extends OverlayOptions {
  abortController?: AbortController;
}

export interface CloseOptions {
  historyBack?: boolean;
}

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
  modalOptions?: Partial<ModalOptions>;
};

// 모달 매니저 이벤트 리스너 타입
export type ModalListener = (modalStack: ModalState[]) => void;
