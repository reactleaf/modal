import React from 'react';
import { useModalInstance } from '../context';
import { ModalComponent } from '../types';

interface AlertProps {
  message: string;
  confirmText?: string;
}

const Alert: ModalComponent<AlertProps> = ({ 
  message, 
  confirmText = '확인'
}) => {
  const { closeSelf } = useModalInstance();
  
  const handleConfirm = () => {
    closeSelf('confirmed');
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
      <button 
        onClick={handleConfirm}
        style={{
          padding: '8px 16px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        {confirmText}
      </button>
    </div>
  );
};

// 컴포넌트별 기본 옵션 설정
Alert.modalOptions = {
  closeOnOverlayClick: false,
  dim: true
};

export default Alert;