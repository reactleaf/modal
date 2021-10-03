import React, { useEffect, useState, cloneElement } from "react";
import { Importer, Register } from "./types";
import { useModal, EnhancedModalPayload, OverlayOptions } from "./withModal";

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
        const importer = register[modalState.type];
        return (
          <OpenedModal
            key={modalState.id}
            importer={importer}
            {...modalState}
          />
        );
      })}
    </div>
  );
}
interface ImportedModule {
  default: React.ComponentType;
}

interface OpenedModalProps<R extends Register>
  extends EnhancedModalPayload<R, keyof R> {
  importer: Importer;
}
function OpenedModal<R extends Register>({
  importer,
  type,
  id,
  props,
  overlayOptions,
}: OpenedModalProps<R>) {
  const { closeModal } = useModal();
  const [Component, setComponent] = useState<React.ComponentType>();

  // asynchronously import modal file: for reduce bundle size.
  // this may trigger initial openModal could be delayed.
  // if you don't want to be delayed, use usePreloadModal hook
  useEffect(() => {
    void importer().then((modal: ImportedModule) => {
      setComponent(() => modal.default);
    });
  }, [type]);

  const close = () => closeModal({ id });

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
  dim = true,
  closeDelay = 0,
  closeOnOverlayClick = true,
  preventScroll = true,
  children,
  closeSelf,
}) => {
  // animated close
  const [visible, setVisible] = useState(false);
  useEffect(() => setVisible(true), []);

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
      // dim={dim}
      // visible={visible}
      onClick={onClick}
      style={{ transitionDuration: `${closeDelay}ms` }}
    >
      {cloneElement(children, { close: delayedClose, visible })}
    </div>
  );
};
export default ModalContainer;
