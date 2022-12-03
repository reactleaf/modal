import React, { useEffect } from "react";

import ModalContainer from "./Container";
import { ModalContext, ModalContextType } from "./context";
import useModalReducer from "./reducer";
import { OpenModalPayload, Register, OverlayOptions } from "./types";

interface Props<R extends Register> {
  register: R;
  defaultOverlayOptions?: { default?: Partial<OverlayOptions> } & {
    [key in keyof R]?: Partial<OverlayOptions>;
  };
}
export const ModalProvider = <R extends Register>({
  register,
  defaultOverlayOptions,
  children,
}: React.PropsWithChildren<Props<R>>) => {
  const { openedModals, ...actions } = useModalReducer<R>(
    defaultOverlayOptions
  );

  // can open modal with window.postMessage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const messageHandler = (e: MessageEvent) => {
      // message to @reactleaf/react-modal
      if (e.data?.to && e.data?.to === "@reactleaf/react-modal") {
        actions.openModal(e.data.payload as OpenModalPayload<R, keyof R>);
      }
    };
    window.addEventListener("message", messageHandler);
    return () => window.removeEventListener("message", messageHandler);
  }, []);

  const TypedModalContext = ModalContext as React.Context<ModalContextType<R>>;

  return (
    <TypedModalContext.Provider value={{ openedModals, ...actions }}>
      {children}
      <ModalContainer register={register} openedModals={openedModals} />
    </TypedModalContext.Provider>
  );
};
