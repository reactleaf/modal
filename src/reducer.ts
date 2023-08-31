import { useReducer } from "react";
import {
  CloseModalPayload,
  EnhancedModalPayload,
  OpenModalPayload,
  Register,
} from "./types";

export default function useModalReducer<R extends Register>() {
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

  const [openedModals, dispatch] = useReducer(
    reducer,
    [] as EnhancedModalPayload<R, keyof R>[]
  );

  function openModal(payload: OpenModalPayload<R, keyof R>) {
    // simple random hex generator
    const id = Math.floor(Math.random() * 0xffffffff)
      .toString(16)
      .padStart(8, "0");
    return {
      type: "@modal/OPEN_MODAL" as const,
      payload: { ...payload, id } as EnhancedModalPayload<R, keyof R>,
    };
  }
  function closeModal(payload: CloseModalPayload) {
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

  const boundedActions = {
    openModal: (payload: OpenModalPayload<R, keyof R>) => {
      const action = openModal(payload);
      dispatch(action);
      return action.payload.id;
    },
    closeModal: (payload: CloseModalPayload) => dispatch(closeModal(payload)),
    closeAll: () => dispatch(closeAll()),
  };

  return { openedModals, ...boundedActions };
}
