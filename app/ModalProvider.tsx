import cx from 'classnames';
import React, { useEffect, useState } from 'react';

import { ModalInstanceProvider } from './context';
import ModalManager from './manager';
import { ModalState, OverlayOptions } from './types';

const DEFAULT_OVERLAY_OPTIONS: OverlayOptions = {
  closeOnOverlayClick: true,
  dim: true,
  preventScroll: true,
};

interface Props {
  manager: ModalManager;
  defaultOverlayOptions?: OverlayOptions;
  children: React.ReactNode;
}

export function ModalProvider({ manager, defaultOverlayOptions, children }: Props) {
  const [modalStack, setModalStack] = useState<ModalState[]>([]);
  const shouldPreventScroll = modalStack.some((modal) => {
    const finalOptions = {
      ...DEFAULT_OVERLAY_OPTIONS,
      ...defaultOverlayOptions,
      ...modal.options,
    };

    return finalOptions.preventScroll;
  });

  useEffect(() => manager.subscribe(setModalStack), [manager]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        manager.closeTop();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [manager]);

  useEffect(() => {
    const handlePopState = () => {
      manager.handlePopState();
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [manager]);

  useEffect(() => {
    if (!shouldPreventScroll) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [shouldPreventScroll]);

  return (
    <>
      {children}

      {/* 통합된 Modal Container */}
      <div id='modal-root' data-class='reactleaf'>
        {modalStack.map((modal) => (
          <ModalOverlay
            key={modal.id}
            manager={manager}
            modal={modal}
            overlayOptions={defaultOverlayOptions}
          />
        ))}
      </div>
    </>
  );
}

// 모달 오버레이 컴포넌트
interface OverlayProps {
  manager: ModalManager;
  modal: ModalState;
  overlayOptions: OverlayOptions | undefined;
}

function ModalOverlay({ manager, modal, overlayOptions }: OverlayProps) {
  const [visible, setVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    void window.requestAnimationFrame(() => setVisible(true));
  }, []);

  const finalOptions = {
    ...DEFAULT_OVERLAY_OPTIONS,
    ...overlayOptions,
    ...modal.options,
  };

  function closeSelf(result?: unknown): Promise<void> {
    const delay = finalOptions.closeDelay || 0;

    if (isClosing) return Promise.resolve();

    if (delay > 0) {
      setIsClosing(true);
      setVisible(false);

      return new Promise((resolve) => {
        setTimeout(() => {
          manager.closeWithResult(modal.id, result);
          resolve();
        }, delay);
      });
    }

    manager.closeWithResult(modal.id, result);
    return Promise.resolve();
  }

  function handleOverlayClick(e: React.MouseEvent) {
    if (!finalOptions.closeOnOverlayClick) return;
    if (e.target === e.currentTarget) {
      void closeSelf();
    }
  }

  return (
    <div
      className={cx('modal-overlay', finalOptions.className, {
        dim: finalOptions.dim,
        visible,
      })}
      data-class='reactleaf'
      onClick={handleOverlayClick}
    >
      <ModalInstanceProvider visible={visible} closeSelf={closeSelf}>
        <modal.Component {...modal.props} />
      </ModalInstanceProvider>
    </div>
  );
}
