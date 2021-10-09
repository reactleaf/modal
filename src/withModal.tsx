import React, { createContext, Dispatch, useContext, useReducer } from "react";

import ModalContainer from "./Container";
import { ModalOwnProps, Register } from "./types";

export type OpenModalPayload<R extends Register, T extends keyof R> = {
  type: T;
  props: ModalOwnProps<R[T]>;
  overlayOptions?: OverlayOptions;
};

export type EnhancedModalPayload<
  R extends Register,
  T extends keyof R
> = OpenModalPayload<R, T> & {
  id: string;
};

export interface OverlayOptions {
  dim?: boolean | string;
  closeDelay?: number;
  closeOnOverlayClick?: boolean;
  preventScroll?: boolean;
}

type ModalContextType<R extends Register> = {
  openModal: <T extends keyof R>(payload: OpenModalPayload<R, T>) => void;
  closeModal: (payload: { id: string }) => void;
  closeAll: () => void;
};

const ModalContext = createContext({
  openModal: (payload: any) => void 0,
  closeModal: (payload: any) => void 0,
  closeAll: () => void 0,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ActionCreator<A> = { (...args: any[]): A };
function bindActionCreator<A, C extends ActionCreator<A>>(
  actionCreator: C,
  dispatch: Dispatch<A>
) {
  return (...args: Parameters<C>) => dispatch(actionCreator(...args));
}

export const withModal = <R extends Register, P = unknown>(
  register: R,
  Component: React.ComponentType<P>
) => {
  function openModal(payload: OpenModalPayload<R, keyof R>) {
    return {
      type: "@modal/OPEN_MODAL" as const,
      payload: {
        ...payload,
        id: `${payload.type}_${Date.now()}`,
      } as EnhancedModalPayload<R, keyof R>,
    };
  }
  function closeModal(payload: { id: string }) {
    return { type: "@modal/CLOSE_MODAL" as const, payload };
  }
  function closeAll() {
    return { type: "@modal/CLOSE_ALL" as const };
  }

  /** reducer */
  type ModalActionCreator =
    | typeof openModal
    | typeof closeModal
    | typeof closeAll;
  type ModalAction = ReturnType<ModalActionCreator>;

  function reducer(
    state: EnhancedModalPayload<R, keyof R>[],
    action: ModalAction
  ) {
    switch (action.type) {
      case "@modal/OPEN_MODAL":
        return [...state, action.payload];
      case "@modal/CLOSE_MODAL":
        return state.filter((modal) => modal.id !== action.payload.id);
      case "@modal/CLOSE_ALL":
        return [] as EnhancedModalPayload<R, keyof R>[];
    }
  }

  const WithModal = (props: P) => {
    const [openedModals, dispatch] = useReducer(
      reducer,
      [] as EnhancedModalPayload<R, keyof R>[]
    );
    const modalActions = {
      openModal: bindActionCreator(openModal, dispatch),
      closeModal: bindActionCreator(closeModal, dispatch),
      closeAll: bindActionCreator(closeAll, dispatch),
    };

    const TypedModalContext = ModalContext as React.Context<
      ModalContextType<R>
    >;

    return (
      <TypedModalContext.Provider value={modalActions}>
        <Component {...props} />
        <ModalContainer register={register} openedModals={openedModals} />
      </TypedModalContext.Provider>
    );
  };
  return WithModal;
};

export const useModal = () => useContext(ModalContext);
