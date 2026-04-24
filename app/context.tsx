import React, { createContext, useContext } from 'react';

// 모달 인스턴스별 Context 타입
export interface ModalInstanceContextType {
  visible: boolean;
  closeSelf: <T = unknown>(result?: T) => Promise<void>;
}

// Context 생성
export const ModalInstanceContext = createContext<ModalInstanceContextType | null>(null);

// 모달 인스턴스 Context Provider
interface ModalInstanceProviderProps {
  visible: boolean;
  closeSelf: <T = unknown>(result?: T) => Promise<void>;
}

export const ModalInstanceProvider = ({
  children,
  visible,
  closeSelf,
}: React.PropsWithChildren<ModalInstanceProviderProps>) => {
  return <ModalInstanceContext.Provider value={{ visible, closeSelf }}>{children}</ModalInstanceContext.Provider>;
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
