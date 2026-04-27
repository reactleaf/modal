import cx from "classnames";
import React, { useEffect, useRef, useState } from "react";

import { ModalInstanceProvider } from "./context";
import ModalManager from "./manager";
import { CloseRequest, LayerOptions, ModalState, StackOptions } from "./types";

const DEFAULT_LAYER_OPTIONS: LayerOptions = {
  closeDelay: 0,
};

const DEFAULT_STACK_OPTIONS: Required<StackOptions> = {
  shade: true,
  preventScroll: true,
};

interface Props {
  manager: ModalManager;
  defaultLayerOptions?: Partial<LayerOptions>;
  stackOptions?: Partial<StackOptions>;
  children: React.ReactNode;
}

export function ModalProvider({ manager, defaultLayerOptions, stackOptions, children }: Props) {
  const [modalStack, setModalStack] = useState<ModalState[]>([]);
  const [closeRequests, setCloseRequests] = useState<Record<string, CloseRequest>>({});
  const [modalVisibility, setModalVisibility] = useState<Record<string, boolean>>({});
  const finalStackOptions = getFinalStackOptions(stackOptions);
  const shouldPreventScroll = modalStack.length > 0 && finalStackOptions.preventScroll;
  const topModal = modalStack[modalStack.length - 1];
  const shadeVisible = modalStack.length > 0;

  useEffect(() => manager.subscribe(setModalStack), [manager]);

  useEffect(() => {
    return manager.setCloseRequestListener((request) => {
      setCloseRequests((prev) => {
        if (prev[request.id]) return prev;
        return { ...prev, [request.id]: request };
      });

      return true;
    });
  }, [manager]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        manager.closeTop();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [manager]);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      manager.handlePopState(event.state);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [manager]);

  useEffect(() => {
    if (!shouldPreventScroll) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [shouldPreventScroll]);

  return (
    <>
      {children}

      {/* 통합된 Modal Container */}
      <div id="modal-root" data-class="reactleaf">
        {finalStackOptions.shade && <div className={cx("modal-shade", { visible: shadeVisible })} data-class="reactleaf" />}
        {modalStack.map((modal, index) => (
          <ModalLayer
            key={modal.id}
            manager={manager}
            modal={modal}
            layerOptions={defaultLayerOptions}
            closeRequest={closeRequests[modal.id]}
            isTop={modal.id === topModal?.id}
            stackIndex={index}
            onVisibleChange={(nextVisible) => {
              setModalVisibility((prev) => {
                if (prev[modal.id] === nextVisible) return prev;
                return { ...prev, [modal.id]: nextVisible };
              });
            }}
            onCloseRequestHandled={() => {
              setCloseRequests((prev) => {
                const { [modal.id]: _handledRequest, ...next } = prev;
                return next;
              });
            }}
          />
        ))}
      </div>
    </>
  );
}

function getFinalStackOptions(stackOptions: Partial<StackOptions> | undefined): Required<StackOptions> {
  return {
    ...DEFAULT_STACK_OPTIONS,
    ...stackOptions,
  };
}

function getFinalLayerOptions(modal: ModalState, layerOptions: Partial<LayerOptions> | undefined): LayerOptions {
  return {
    ...DEFAULT_LAYER_OPTIONS,
    ...layerOptions,
    ...modal.options,
  };
}

// 모달 레이어 컴포넌트
interface LayerProps {
  manager: ModalManager;
  modal: ModalState;
  layerOptions: Partial<LayerOptions> | undefined;
  closeRequest: CloseRequest | undefined;
  isTop: boolean;
  stackIndex: number;
  onVisibleChange: (visible: boolean) => void;
  onCloseRequestHandled: () => void;
}

function ModalLayer({
  manager,
  modal,
  layerOptions,
  closeRequest,
  isTop,
  stackIndex,
  onVisibleChange,
  onCloseRequestHandled,
}: LayerProps) {
  const [visible, setVisible] = useState(false);
  const isClosingRef = useRef(false);

  useEffect(() => {
    void window.requestAnimationFrame(() => setVisible(true));
  }, []);

  useEffect(() => {
    onVisibleChange(visible);
  }, [visible, onVisibleChange]);

  const finalOptions = getFinalLayerOptions(modal, layerOptions);

  useEffect(() => {
    if (!closeRequest) return;

    void closeWithTransition(closeRequest.result, closeRequest.options, closeRequest.historySettled).then(
      onCloseRequestHandled,
    );
  }, [closeRequest]);

  function closeWithTransition(
    result?: unknown,
    options?: CloseRequest["options"],
    historySettled?: Promise<void>,
  ): Promise<void> {
    const delay = finalOptions.closeDelay || 0;

    if (isClosingRef.current) return Promise.resolve();

    isClosingRef.current = true;
    setVisible(false);

    const animationSettled =
      delay > 0
        ? new Promise<void>((resolve) => {
            window.requestAnimationFrame(() => {
              setTimeout(resolve, delay);
            });
          })
        : Promise.resolve();
    const finalHistorySettled = historySettled || manager.prepareClose(modal.id, options);

    return Promise.all([animationSettled, finalHistorySettled]).then(() => {
      manager.completeCloseWithResult(modal.id, result, { ...options, historyBack: true });
    });
  }

  function closeSelf(result?: unknown): Promise<void> {
    return closeWithTransition(result);
  }

  function handleLayerClick(e: React.MouseEvent) {
    if (!isTop) return;
    if (finalOptions.closeOnOutsideClick === false) return;
    if (e.target === e.currentTarget) {
      void closeSelf();
    }
  }

  return (
    <div
      className={cx("modal-layer", finalOptions.className, {
        "is-top": isTop,
        visible,
      })}
      data-class="reactleaf"
      onClick={handleLayerClick}
      style={{ zIndex: 1001 + stackIndex }}
    >
      <ModalInstanceProvider visible={visible} closeSelf={closeSelf}>
        <modal.Component {...modal.props} />
      </ModalInstanceProvider>
    </div>
  );
}
