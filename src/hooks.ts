import { useContext } from "react";
import { ModalContext, ModalContextType } from "./context";
import { Register } from "./types";

export const createModalHook = <R extends Register>() => {
  return () => useContext(ModalContext as React.Context<ModalContextType<R>>);
};

export const createModalPreloader = <R extends Register>(register: R) => {
  return (...modalNames: (keyof R)[]) => {
    modalNames.forEach((key) => register[key]());
  };
};
