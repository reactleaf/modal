import React, { createContext, useContext } from 'react';

import type { ModalClosedSignal } from './manager';
import type { ModalComponent, ModalOptions, PropsAreOptional } from './types';

/* Instance API ------------------------------------------------------------- */

export type CloseSelf = <T = unknown>(result?: T) => Promise<void>;

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

export interface ModalInstanceContextType {
  visible: boolean;
  closeSelf: CloseSelf;
  replaceSelf: ReplaceSelf;
}

const ModalInstanceContext = createContext<ModalInstanceContextType | null>(null);

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

export const ModalInstanceProvider = ({
  children,
  visible,
  closeSelf,
  replaceSelf,
}: React.PropsWithChildren<ModalInstanceContextType>) => {
  return (
    <ModalInstanceContext.Provider value={{ visible, closeSelf, replaceSelf }}>
      {children}
    </ModalInstanceContext.Provider>
  );
};
