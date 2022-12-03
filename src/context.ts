import { createContext } from "react";
import { OpenModalPayload, Register } from "./types";

export type ModalContextType<R extends Register> = {
  openedModals: OpenModalPayload<R, keyof R>[];
  openModal: <T extends keyof R>(payload: OpenModalPayload<R, T>) => string;
  closeModal: (payload: { id: string }) => void;
  closeAll: () => void;
};

export const ModalContext = createContext({
  openedModals: [] as unknown[],
  openModal: (payload: any) => "",
  closeModal: (payload: { id: string }) => void 0,
  closeAll: () => void 0,
});
