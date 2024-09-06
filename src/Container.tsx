import React, { useEffect, useState, cloneElement } from "react";
import cx from "classnames";
import { Importer, Register, EnhancedModalPayload, OverlayOptions } from "./types";
import { createModalHook } from "./hooks";
import { ModalContext } from "./context";

const useModal = createModalHook();

interface Props<R extends Register> {
  register: R;
  openedModals: EnhancedModalPayload<R, keyof R>[];
}
function ModalContainer<R extends Register>({ register, openedModals }: Props<R>) {
  return (
    <div id="modal-root" data-class="reactleaf">
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
function OpenedModal<R extends Register>({ importer, type, id, props, overlayOptions, events }: OpenedModalProps<R>) {
  const context = useModal();
  const [module, setModule] = useState<Awaited<ReturnType<Importer>>>();

  // asynchronously import modal file: for reduce bundle size.
  // this may trigger initial openModal could be delayed.
  // if you don't want to be delayed, use usePreloadModal hook
  useEffect(() => {
    void importer().then(setModule);
  }, [type]);

  useEffect(() => {
    events?.onOpen?.({ type, id, props });
  }, []);

  async function close() {
    await events?.beforeClose?.();
    context.closeModal({ id });
    return events?.onClose?.();
  }

  if (!module) return null;

  const Component = module.default;
  const overlayProps = Object.assign({}, context.defaultOverlayOptions, module.defaultOverlayOptions, overlayOptions);

  return (
    <ModalContext.Provider value={{ ...context, closeSelf: close }}>
      <ModalOverlay {...overlayProps} closeSelf={close}>
        <Component {...props} />
      </ModalOverlay>
    </ModalContext.Provider>
  );
}

interface OverlayProps extends OverlayOptions {
  closeSelf: () => void | PromiseLike<unknown>;
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
  const [isClosing, setClosing] = useState(false);
  useEffect(() => void window.requestAnimationFrame(() => setVisible(true)), []);

  async function delayedClose() {
    // prevent duplicated closing call, especially for delayed close.
    if (isClosing) return;
    setClosing(true);
    setVisible(false);
    await sleep(closeDelay);
    return closeSelf();
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
    <div className={cx("modal-overlay", className, { dim, visible })} data-class="reactleaf" onClick={onClick}>
      {cloneElement(children, { close: delayedClose, visible })}
    </div>
  );
};

export default ModalContainer;

function sleep(ms: number) {
  if (ms === 0) return;
  return new Promise((res) => setTimeout(res, ms));
}
