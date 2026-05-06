import React, { createContext, useContext } from 'react';

import type { ModalClosedSignal } from './signals';
import type {
  ModalComponent,
  ModalComponentProps,
  ModalOptions,
  ModalReplaceResult,
  PropsAreOptional,
} from './types';

/* Instance API ------------------------------------------------------------- */

type CloseSelf<Result = unknown> = (result?: Result) => Promise<void>;

export type ReplaceSelf = {
  <Component extends ModalComponent<any, any>>(
    Component: PropsAreOptional<ModalComponentProps<Component>> extends true ? Component : never,
    props?: ModalComponentProps<Component> | null,
    options?: ModalOptions,
  ): ModalReplaceResult<Component>;

  <Component extends ModalComponent<any, any>>(
    Component: PropsAreOptional<ModalComponentProps<Component>> extends true ? never : Component,
    props: ModalComponentProps<Component>,
    options?: ModalOptions,
  ): ModalReplaceResult<Component>;

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

export interface ModalInstanceContextType<Result = unknown> {
  visible: boolean;
  closeSelf: CloseSelf<Result>;
  replaceSelf: ReplaceSelf;
}

const ModalInstanceContext = createContext<ModalInstanceContextType | null>(null);

export const useModalInstance = <Result = unknown,>(): ModalInstanceContextType<Result> => {
  const context = useContext(ModalInstanceContext);

  if (!context) {
    throw new Error(
      'useModalInstance must be used within a ModalInstanceProvider. ' +
        'Make sure your modal component is rendered through the modal system.',
    );
  }

  return context as ModalInstanceContextType<Result>;
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
