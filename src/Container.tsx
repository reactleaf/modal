import React, { useEffect, useState, cloneElement } from "react";
import cx from "classnames";
import {
  Importer,
  Register,
  EnhancedModalPayload,
  OverlayOptions,
} from "./types";
import { createModalHook } from "./withModal";

const useModal = createModalHook();

interface Props<R extends Register> {
  register: R;
  openedModals: EnhancedModalPayload<R, keyof R>[];
}
function ModalContainer<R extends Register>({
  register,
  openedModals,
}: Props<R>) {
  return (
    <div id="modal-root">
      {openedModals.map((modalState) => {
        const props: OpenedModalProps<typeof register> = {
          importer: register[modalState.type],
          ...modalState,
        };
        return <OpenedModal key={modalState.id} {...props} />;
      })}
    </div>
  );
}

type OpenedModalProps<R extends Register> = EnhancedModalPayload<R, keyof R> & {
  importer: Importer;
};
function OpenedModal<R extends Register>({
  importer,
  type,
  id,
  props,
  overlayOptions,
  events,
}: OpenedModalProps<R>) {
  const { closeModal } = useModal();
  const [Component, setComponent] = useState<React.ComponentType>();

  // asynchronously import modal file: for reduce bundle size.
  // this may trigger initial openModal could be delayed.
  // if you don't want to be delayed, use usePreloadModal hook
  useEffect(() => {
    void importer().then((modal) => {
      setComponent(() => modal.default);
    });
  }, [type]);

  function close() {
    events?.onClose?.();
    closeModal({ id });
  }

  if (!Component) return null;
  return (
    <ModalOverlay {...overlayOptions} closeSelf={close}>
      <Component {...props} />
    </ModalOverlay>
  );
}

interface OverlayProps extends OverlayOptions {
  closeSelf: () => void;
  children: React.ReactElement;
}
const ModalOverlay: React.FC<OverlayProps> = ({
  className = "",
  closeDelay = 0,
  closeOnOverlayClick = true,
  dim = true,
  preventScroll = true,
  children,
  closeSelf,
}) => {
  // animated close
  const [visible, setVisible] = useState(false);
  useEffect(
    () => void window.requestAnimationFrame(() => setVisible(true)),
    []
  );

  function delayedClose() {
    setVisible(false);
    setTimeout(closeSelf, closeDelay);
  }

  const onClick = (e: React.MouseEvent) => {
    if (!closeOnOverlayClick) return;
    if (e.target === e.currentTarget) {
      delayedClose();
    }
  };

  useEffect(() => {
    if (preventScroll) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "initial";
      };
    }
  }, []);

  return (
    <div
      className={cx("modal-overlay", className, { dim, visible })}
      onClick={onClick}
    >
      {cloneElement(children, { close: delayedClose, visible })}
    </div>
  );
};
export default ModalContainer;
