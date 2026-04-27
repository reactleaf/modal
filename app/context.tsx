import React, { createContext, useContext } from 'react';

import type { ModalClosedSignal } from './manager';
import type { ModalComponent, ModalOptions, PropsAreOptional } from './types';

export type ReplaceSelf = {
  <Props, Result = unknown>(
    Component: PropsAreOptional<Props> extends true ? ModalComponent<Props> : never,
    props?: Props | null,
    options?: ModalOptions,
  ): Promise<Result | ModalClosedSignal | undefined>;

  <Props, Result = unknown>(
    Component: PropsAreOptional<Props> extends true ? never : ModalComponent<Props>,
    props: Props,
    options?: ModalOptions,
  ): Promise<Result | ModalClosedSignal | undefined>;
};

// 모달 인스턴스별 Context 타입
export interface ModalInstanceContextType {
  visible: boolean;
  closeSelf: <T = unknown>(result?: T) => Promise<void>;
  replaceSelf: ReplaceSelf;
}

// Context 생성
export const ModalInstanceContext = createContext<ModalInstanceContextType | null>(null);

// 모달 인스턴스 Context Provider
interface ModalInstanceProviderProps {
  visible: boolean;
  closeSelf: <T = unknown>(result?: T) => Promise<void>;
  replaceSelf: ReplaceSelf;
}

export const ModalInstanceProvider = ({
  children,
  visible,
  closeSelf,
  replaceSelf,
}: React.PropsWithChildren<ModalInstanceProviderProps>) => {
  return (
    <ModalInstanceContext.Provider value={{ visible, closeSelf, replaceSelf }}>
      {children}
    </ModalInstanceContext.Provider>
  );
};

// 모달 인스턴스 Context 사용 훅
export const useModalInstance = (): ModalInstanceContextType => {
  const context = useContext(ModalInstanceContext);

  if (!context) {
    throw new Error(
      'useModalInstance must be used within a ModalInstanceProvider. ' +
        'Make sure your modal component is rendered through the modal system.',
    );
  }

  return context;
};
