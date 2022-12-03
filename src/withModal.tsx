import React, {
  createContext,
  Dispatch,
  useContext,
  useEffect,
  useReducer,
} from "react";

import ModalContainer from "./Container";
import {
  OpenModalPayload,
  EnhancedModalPayload,
  Register,
  OverlayOptions,
} from "./types";

type ModalContextType<R extends Register> = {
  openedModals: OpenModalPayload<R, keyof R>[];
  openModal: <T extends keyof R>(payload: OpenModalPayload<R, T>) => string;
  closeModal: (payload: { id: string }) => void;
  closeAll: () => void;
};

const ModalContext = createContext({
  openedModals: [] as unknown[],
  openModal: (payload: any) => "",
  closeModal: (payload: { id: string }) => void 0,
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

export const withModal =
  <R extends Register>(
    register: R,
    defaultOverlayOptions?: { default?: Partial<OverlayOptions> } & {
      [key in keyof R]?: Partial<OverlayOptions>;
    }
  ) =>
  <P extends JSX.IntrinsicAttributes>(Component: React.ComponentType<P>) => {
    function openModal(payload: OpenModalPayload<R, keyof R>) {
      // simple random hex generator
      const key = Math.floor(Math.random() * 0xffffffff)
        .toString(16)
        .padStart(8, "0");
      return {
        type: "@modal/OPEN_MODAL" as const,
        payload: {
          type: payload.type,
          props: payload.props,
          overlayOptions: Object.assign(
            {},
            defaultOverlayOptions?.default,
            defaultOverlayOptions?.[payload.type],
            payload.overlayOptions
          ),
          events: payload.events,
          id: `${String(payload.type)}_${key}`,
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

    return function WithModal(props: P) {
      const [openedModals, dispatch] = useReducer(
        reducer,
        [] as EnhancedModalPayload<R, keyof R>[]
      );
      const modalActions = {
        openModal: (payload: OpenModalPayload<R, keyof R>) => {
          const action = openModal(payload);
          dispatch(action);
          return action.payload.id;
        },
        closeModal: bindActionCreator(closeModal, dispatch),
        closeAll: bindActionCreator(closeAll, dispatch),
      };

      // can open modal with window.postMessage
      useEffect(() => {
        if (typeof window === "undefined") return;
        const messageHandler = (e: MessageEvent) => {
          // message to @reactleaf/react-modal
          if (e.data?.to && e.data?.to === "@reactleaf/react-modal") {
            modalActions.openModal(
              e.data.payload as OpenModalPayload<R, keyof R>
            );
          }
        };
        window.addEventListener("message", messageHandler);
        return () => window.removeEventListener("message", messageHandler);
      }, []);

      const TypedModalContext = ModalContext as React.Context<
        ModalContextType<R>
      >;

      return (
        <TypedModalContext.Provider value={{ openedModals, ...modalActions }}>
          <Component {...props} />
          <ModalContainer register={register} openedModals={openedModals} />
        </TypedModalContext.Provider>
      );
    };
  };

export const createModalHook = <R extends Register>() => {
  return () => useContext(ModalContext as React.Context<ModalContextType<R>>);
};

export const createModalPreloader = <R extends Register>(register: R) => {
  return (...modalNames: (keyof R)[]) => {
    modalNames.forEach((key) => register[key]());
  };
};
