import React from "react";

export type Importer = () => Promise<{ default: React.ComponentType<any> }>;
export interface Register {
  [key: string]: Importer;
}

type Await<T> = T extends PromiseLike<infer U> ? U : T;

export type ModalProps<I extends Importer> = React.ComponentProps<
  Await<ReturnType<I>>["default"]
>;

export type ModalOwnProps<I extends Importer> = I extends Importer
  ? Omit<ModalProps<I>, keyof BasicModalProps>
  : never;

export interface BasicModalProps {
  close: () => void;
  visible: boolean; // for animation
}
