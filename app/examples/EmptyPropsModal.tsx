import React from 'react';
import { useModalInstance } from '../context';
import { ModalComponent } from '../types';

const EmptyPropsModal: ModalComponent<{}> = () => {
  const { closeSelf } = useModalInstance();
  
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
        <p style={{ margin: 0, fontSize: '16px' }}>This modal has no props!</p>
      </div>
      <button 
        onClick={() => closeSelf('ok')}
        style={{
          padding: '8px 16px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        OK
      </button>
    </div>
  );
};

export default EmptyPropsModal;