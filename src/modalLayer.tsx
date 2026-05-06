import cx from "classnames";
import React, { useEffect, useRef, useState } from "react";

import type { ReplaceSelf } from "./context";
import { ModalInstanceProvider } from "./context";
import { ModalManager } from "./manager";
import { dimClassName, mergeModalLayerOptions } from "./modalOptions";
import type { CloseRequest, LayerOptions, ModalComponent, ModalOptions, ModalState, ReplaceRequest } from "./types";

export type ModalLayerTransitionRequest =
  | { type: "close"; request: CloseRequest }
  | { type: "replace"; request: ReplaceRequest };

interface ModalLayerProps {
  manager: ModalManager;
  modal: ModalState;
  layerOptions: Partial<LayerOptions> | undefined;
  transitionRequest: ModalLayerTransitionRequest | undefined;
  isTop: boolean;
  onTransitionRequestHandled: (request: ModalLayerTransitionRequest) => void;
}

export function ModalLayer({
  manager,
  modal,
  layerOptions,
  transitionRequest,
  isTop,
  onTransitionRequestHandled,
}: ModalLayerProps) {
  const [layerVisible, setLayerVisible] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);
  /** Serialize close/replace transitions per layer so overlapping requests are not dropped. */
  const transitionChainRef = useRef(Promise.resolve<void>(undefined));
  const finalOptions = mergeModalLayerOptions(modal, layerOptions);

  useEffect(() => {
    void window.requestAnimationFrame(() => {
      setLayerVisible(true);
      setContentVisible(true);
    });
  }, []);

  useEffect(() => {
    if (!transitionRequest) return;

    const transition =
      transitionRequest.type === "close"
        ? closeWithTransition(
            transitionRequest.request.result,
            transitionRequest.request.options,
            transitionRequest.request.historySettled,
          )
        : replaceWithTransition();
    void transition.then(() => onTransitionRequestHandled(transitionRequest));
  }, [transitionRequest]);

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

  function closeWithTransition(
    result?: unknown,
    options?: CloseRequest["options"],
    historySettled?: Promise<void>,
  ): Promise<void> {
    return scheduleTransition(async () => {
      setContentVisible(false);
      setLayerVisible(false);

      const animationSettled = delayPromise(finalOptions.closeDelay || 0);
      const finalHistorySettled = historySettled ?? manager.prepareClose(modal.id, options);

      await Promise.all([animationSettled, finalHistorySettled]);
      manager.completeCloseWithResult(modal.id, result, { ...options, historyBack: true });
    });
  }

  function replaceWithTransition(): Promise<void> {
    return scheduleTransition(async () => {
      setContentVisible(false);

      await delayPromise(finalOptions.closeDelay || 0);
      manager.completeReplace(modal.id);
      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => {
          setContentVisible(true);
          resolve();
        });
      });
    });
  }

  function scheduleTransition(run: () => Promise<void>): Promise<void> {
    const scheduled = transitionChainRef.current.then(run);
    transitionChainRef.current = scheduled.then(
      () => undefined,
      () => undefined,
    );
    return scheduled;
  }

  return (
    <div
      className={cx("modal-layer", dimClassName(finalOptions.dim), finalOptions.className, {
        visible: layerVisible,
      })}
      data-class="reactleaf"
      data-content-visible={contentVisible ? "true" : undefined}
      data-top={isTop ? "true" : undefined}
      onClick={handleLayerClick}
    >
      <ModalInstanceProvider visible={contentVisible} closeSelf={closeSelf} replaceSelf={replaceSelf}>
        <modal.Component {...modal.props} />
      </ModalInstanceProvider>
    </div>
  );
}

/** Matches CSS transition time configured via `LayerOptions.closeDelay`. */
function delayPromise(closeDelayMs: number): Promise<void> {
  if (closeDelayMs <= 0) return Promise.resolve();
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      setTimeout(resolve, closeDelayMs);
    });
  });
}
