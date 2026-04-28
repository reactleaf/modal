import cx from "classnames";
import React, { useEffect, useRef, useState } from "react";

import { ModalInstanceProvider } from "./context";
import ModalManager from "./manager";
import type { ReplaceSelf } from "./context";
import {
  CloseRequest,
  LayerOptions,
  ModalComponent,
  ModalOptions,
  ModalState,
  ReplaceRequest,
  RootOptions,
} from "./types";

const DEFAULT_LAYER_OPTIONS: LayerOptions = {
  closeDelay: 0,
  dim: true,
};

const DEFAULT_ROOT_OPTIONS: Required<RootOptions> = {
  preventScroll: true,
};

interface Props {
  manager: ModalManager;
  defaultLayerOptions?: Partial<LayerOptions>;
  rootOptions?: Partial<RootOptions>;
  children: React.ReactNode;
}

export function ModalProvider({ manager, defaultLayerOptions, rootOptions, children }: Props) {
  const [modalStack, setModalStack] = useState<ModalState[]>([]);
  const [closeRequests, setCloseRequests] = useState<Record<string, CloseRequest>>({});
  const [replaceRequests, setReplaceRequests] = useState<Record<string, ReplaceRequest>>({});
  const finalRootOptions = getFinalRootOptions(rootOptions);
  const shouldPreventScroll = modalStack.length > 0 && finalRootOptions.preventScroll;
  const topModal = modalStack[modalStack.length - 1];

  useEffect(() => manager.subscribe(setModalStack), [manager]);

  useEffect(() => {
    return manager.setCloseRequestListener((request) => {
      setCloseRequests((prev) => ({
        ...prev,
        [request.id]: request,
      }));

      return true;
    });
  }, [manager]);

  useEffect(() => {
    return manager.setReplaceRequestListener((request) => {
      setReplaceRequests((prev) => ({
        ...prev,
        [request.id]: request,
      }));

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
        {modalStack.map((modal, index) => (
          <ModalLayer
            key={modal.id}
            manager={manager}
            modal={modal}
            layerOptions={defaultLayerOptions}
            closeRequest={closeRequests[modal.id]}
            replaceRequest={replaceRequests[modal.id]}
            isTop={modal.id === topModal?.id}
            stackIndex={index}
            onCloseRequestHandled={() => {
              setCloseRequests((prev) => {
                const { [modal.id]: _handledRequest, ...next } = prev;
                return next;
              });
            }}
            onReplaceRequestHandled={() => {
              setReplaceRequests((prev) => {
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

function getFinalRootOptions(rootOptions: Partial<RootOptions> | undefined): Required<RootOptions> {
  return {
    ...DEFAULT_ROOT_OPTIONS,
    ...rootOptions,
  };
}

function getFinalLayerOptions(modal: ModalState, layerOptions: Partial<LayerOptions> | undefined): LayerOptions {
  return {
    ...DEFAULT_LAYER_OPTIONS,
    ...layerOptions,
    ...modal.options,
  };
}

function getDimClassName(dim: LayerOptions["dim"]): string | undefined {
  if (dim === true) return "dim";
  if (typeof dim === "string") return dim;
  return undefined;
}

// 모달 레이어 컴포넌트
interface LayerProps {
  manager: ModalManager;
  modal: ModalState;
  layerOptions: Partial<LayerOptions> | undefined;
  closeRequest: CloseRequest | undefined;
  replaceRequest: ReplaceRequest | undefined;
  isTop: boolean;
  stackIndex: number;
  onCloseRequestHandled: () => void;
  onReplaceRequestHandled: () => void;
}

function ModalLayer({
  manager,
  modal,
  layerOptions,
  closeRequest,
  replaceRequest,
  isTop,
  stackIndex,
  onCloseRequestHandled,
  onReplaceRequestHandled,
}: LayerProps) {
  const [layerVisible, setLayerVisible] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);
  const isClosingRef = useRef(false);
  /** Serialize close/replace transitions per layer so overlapping requests are not dropped. */
  const transitionChainRef = useRef(Promise.resolve<void>(undefined));

  function scheduleTransition(run: () => Promise<void>): Promise<void> {
    const scheduled = transitionChainRef.current.then(run);
    transitionChainRef.current = scheduled.then(
      () => undefined,
      () => undefined,
    );
    return scheduled;
  }

  useEffect(() => {
    void window.requestAnimationFrame(() => {
      setLayerVisible(true);
      setContentVisible(true);
    });
  }, []);

  const finalOptions = getFinalLayerOptions(modal, layerOptions);

  useEffect(() => {
    if (!closeRequest) return;

    void closeWithTransition(closeRequest.result, closeRequest.options, closeRequest.historySettled).then(
      onCloseRequestHandled,
    );
  }, [closeRequest]);

  useEffect(() => {
    if (!replaceRequest) return;

    void replaceWithTransition().then(onReplaceRequestHandled);
  }, [replaceRequest]);

  function closeWithTransition(
    result?: unknown,
    options?: CloseRequest["options"],
    historySettled?: Promise<void>,
  ): Promise<void> {
    return scheduleTransition(async () => {
      const delay = finalOptions.closeDelay || 0;

      isClosingRef.current = true;
      setContentVisible(false);
      setLayerVisible(false);

      const animationSettled =
        delay > 0
          ? new Promise<void>((resolve) => {
              window.requestAnimationFrame(() => {
                setTimeout(resolve, delay);
              });
            })
          : Promise.resolve();
      const finalHistorySettled = historySettled ?? manager.prepareClose(modal.id, options);

      await Promise.all([animationSettled, finalHistorySettled]);
      manager.completeCloseWithResult(modal.id, result, { ...options, historyBack: true });
      isClosingRef.current = false;
    });
  }

  function replaceWithTransition(): Promise<void> {
    return scheduleTransition(async () => {
      const delay = finalOptions.closeDelay || 0;

      isClosingRef.current = true;
      setContentVisible(false);

      const animationSettled =
        delay > 0
          ? new Promise<void>((resolve) => {
              window.requestAnimationFrame(() => {
                setTimeout(resolve, delay);
              });
            })
          : Promise.resolve();

      await animationSettled;
      manager.completeReplace(modal.id);
      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => {
          isClosingRef.current = false;
          setContentVisible(true);
          resolve();
        });
      });
    });
  }

  function closeSelf(result?: unknown): Promise<void> {
    return closeWithTransition(result);
  }

  const replaceSelf = ((Component: ModalComponent<unknown>, props?: unknown, options?: ModalOptions) => {
    return manager.replaceById(modal.id, Component as never, props as never, options);
  }) as ReplaceSelf;

  function handleLayerClick(e: React.MouseEvent) {
    if (!isTop) return;
    if (finalOptions.closeOnOutsideClick === false) return;
    if (e.target === e.currentTarget) {
      void closeSelf();
    }
  }

  return (
    <div
      className={cx("modal-layer", getDimClassName(finalOptions.dim), finalOptions.className, {
        visible: layerVisible,
      })}
      data-class="reactleaf"
      data-content-visible={contentVisible ? "true" : undefined}
      data-top={isTop ? "true" : undefined}
      onClick={handleLayerClick}
      style={{ zIndex: 1001 + stackIndex }}
    >
      <ModalInstanceProvider visible={contentVisible} closeSelf={closeSelf} replaceSelf={replaceSelf}>
        <modal.Component {...modal.props} />
      </ModalInstanceProvider>
    </div>
  );
}
