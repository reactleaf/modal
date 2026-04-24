import React from 'react';
import { ModalManager, ModalProvider } from '../index';
import Alert from './Alert';
import Confirm from './Confirm';
import EmptyPropsModal from './EmptyPropsModal';

const modal = new ModalManager();

const TestApp: React.FC = () => {
  const handleShowAlert = async () => {
    const result = await modal.open(Alert, {
      message: 'Hello, this is an alert!',
      confirmText: '알겠습니다'
    });
    
    console.log('Alert result:', result);
  };

  const handleShowConfirm = async () => {
    const confirmed = await modal.open(Confirm, {
      message: 'Are you sure you want to delete this item?',
      confirmText: '삭제',
      cancelText: '취소'
    });
    
    if (confirmed) {
      console.log('User confirmed!');
      // 삭제 로직
    } else {
      console.log('User cancelled!');
    }
  };

  const handleMultipleModals = async () => {
    await modal.open(Alert, {
      message: 'First modal opened!'
    });
    
    const result2 = await modal.open(Confirm, {
      message: 'Open another modal?'
    });
    
    if (result2) {
      await modal.open(Alert, {
        message: 'Third modal! Try ESC or back button.'
      });
    }
  };

  const handleAbortController = () => {
    const controller = new AbortController();
    
    // 3초 후 자동으로 모달 닫기
    setTimeout(() => {
      controller.abort();
    }, 3000);
    
    modal.open(Alert, {
      message: 'This modal will close in 3 seconds...'
    }, {
      abortController: controller
    }).then(result => {
      console.log('Modal closed with result:', result);
    });
  };

  const handleEmptyPropsModal = async () => {
    const result = await modal.open(EmptyPropsModal);
    console.log('Empty props modal result:', result);
  };

  return (
    <ModalProvider manager={modal} defaultOverlayOptions={{ closeOnOverlayClick: true, dim: true, preventScroll: true }}>
      <div style={{ padding: '20px' }}>
        <h1>Modal Test App</h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '200px' }}>
          <button onClick={handleShowAlert}>
            Show Alert
          </button>
          
          <button onClick={handleShowConfirm}>
            Show Confirm
          </button>
          
          <button onClick={handleMultipleModals}>
            Multiple Modals
          </button>
          
          <button onClick={handleAbortController}>
            Auto Close (3s)
          </button>
          
          <button onClick={handleEmptyPropsModal}>
            Empty Props Modal
          </button>
        </div>
        
        <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
          <p>Features to test:</p>
          <ul>
            <li>ESC key closes top modal</li>
            <li>Browser back button closes top modal</li>
            <li>Overlay click (if enabled)</li>
            <li>Promise-based results</li>
            <li>Multiple modal stacking</li>
            <li>AbortController support</li>
          </ul>
        </div>
      </div>
    </ModalProvider>
  );
};

export default TestApp;