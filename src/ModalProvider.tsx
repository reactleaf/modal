import React, { useEffect, useState } from "react";

import { ModalManager } from "./manager";
import { ModalLayer } from "./modalLayer";
import type { ModalLayerTransitionRequest } from "./modalLayer";
import { mergeRootOptions } from "./modalOptions";
import type { LayerOptions, ModalState, RootOptions } from "./types";

interface Props {
  manager: ModalManager;
  defaultLayerOptions?: Partial<LayerOptions>;
  rootOptions?: Partial<RootOptions>;
  children: React.ReactNode;
}

export function ModalProvider({ manager, defaultLayerOptions, rootOptions, children }: Props) {
  const [modalStack, setModalStack] = useState<ModalState[]>([]);
  const [transitionRequests, setTransitionRequests] = useState<Record<string, ModalLayerTransitionRequest>>({});
  const finalRootOptions = mergeRootOptions(rootOptions);
  const shouldPreventScroll = modalStack.length > 0 && finalRootOptions.preventScroll;
  const topModal = modalStack[modalStack.length - 1];

  useEffect(() => manager.subscribe(setModalStack), [manager]);

  useEffect(() => {
    return manager.setCloseRequestListener((request) => {
      setTransitionRequests((prev) => ({
        ...prev,
        [request.id]: { type: "close", request },
      }));
      return true;
    });
  }, [manager]);

  useEffect(() => {
    return manager.setReplaceRequestListener((request) => {
      setTransitionRequests((prev) => ({
        ...prev,
        [request.id]: { type: "replace", request },
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

      <div id="modal-root" data-class="reactleaf">
        {modalStack.map((modal) => (
          <ModalLayer
            key={modal.id}
            manager={manager}
            modal={modal}
            layerOptions={defaultLayerOptions}
            transitionRequest={transitionRequests[modal.id]}
            isTop={modal.id === topModal?.id}
            onTransitionRequestHandled={(handledRequest) => {
              setTransitionRequests((prev) => {
                if (prev[modal.id] !== handledRequest) return prev;
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
