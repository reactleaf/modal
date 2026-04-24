import React from 'react';
import { useModalInstance } from '../context';
import { ModalComponent } from '../types';

interface ConfirmProps {
  message: string;
  confirmText?: string;
  cancelText?: string;
}

const Confirm: ModalComponent<ConfirmProps> = ({ 
  message, 
  confirmText = '확인', 
  cancelText = '취소'
}) => {
  const { closeSelf } = useModalInstance();
  const handleConfirm = () => {
    closeSelf(true);
  };

  const handleCancel = () => {
    closeSelf(false);
  };

  return (
    <div style={{
      background: 'white',
      padding: '20px',
      borderRadius: '8px',
      maxWidth: '400px',
      margin: '20px',
      textAlign: 'center'
    }}>
      <div style={{ marginBottom: '20px' }}>
        <p style={{ margin: 0, fontSize: '16px' }}>{message}</p>
      </div>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
        <button 
          onClick={handleCancel}
          style={{
            padding: '8px 16px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {cancelText}
        </button>
        <button 
          onClick={handleConfirm}
          style={{
            padding: '8px 16px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {confirmText}
        </button>
      </div>
    </div>
  );
};

// 컴포넌트별 기본 옵션
Confirm.modalOptions = {
  closeOnOverlayClick: false,
  dim: true
};

export default Confirm;