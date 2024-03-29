import React from "react";

type Await<T> = T extends PromiseLike<infer U> ? U : T;
type PromiseOr<T> = T | Promise<T>;

export type Importer = () => Promise<{
  default: React.ComponentType<any>;
  defaultOverlayOptions?: Partial<OverlayOptions>;
}>;
export interface Register {
  [key: string]: Importer;
}

export type ModalProps<I extends Importer> = React.ComponentProps<Await<ReturnType<I>>["default"]>;

export type ModalOwnProps<I extends Importer> = I extends Importer ? Omit<ModalProps<I>, keyof BasicModalProps> : never;

export interface BasicModalProps {
  close(): Promise<unknown>;
  visible: boolean; // for animation
}

// from @type-challenges/utils
type Equals<X, Y> = (() => Y extends X ? 1 : 2) extends () => X extends Y ? 1 : 2 ? true : false;

export type OpenModalPayload<R extends Register, T extends keyof R> = Equals<ModalOwnProps<R[T]>, {}> extends true
  ? {
      type: T;
      props?: ModalOwnProps<R[T]>;
      overlayOptions?: OverlayOptions;
      events?: ModalEvents<R, T>;
    }
  : {
      type: T;
      props: ModalOwnProps<R[T]>;
      overlayOptions?: OverlayOptions;
      events?: ModalEvents<R, T>;
    };

export type EnhancedModalPayload<R extends Register, T extends keyof R> = OpenModalPayload<R, T> & {
  id: string;
};

export interface CloseModalPayload {
  id: string;
}

export interface OverlayOptions {
  className?: string;
  closeDelay?: number;
  closeOnOverlayClick?: boolean;
  dim?: boolean | string;
  preventScroll?: boolean;
}

export type ModalEvents<R extends Register, T extends keyof R> = {
  onOpen?(payload: Pick<OpenModalPayload<R, T>, "type" | "props"> & { id: string }): void;
  beforeClose?(): PromiseOr<unknown>;
  onClose?(): unknown;
};
