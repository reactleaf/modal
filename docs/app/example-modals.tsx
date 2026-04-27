import React from 'react';
import { ModalComponent, useModalInstance } from '@reactleaf/modal';

interface AlertProps {
  message: string;
  confirmText?: string;
}

export const Alert: ModalComponent<AlertProps> = ({ message, confirmText = 'OK' }) => {
  const { closeSelf } = useModalInstance();

  return (
    <div style={modalStyle}>
      <div style={contentStyle}>
        <p style={{ margin: 0, fontSize: '16px' }}>{message}</p>
      </div>
      <div style={actionsStyle}>
        <button onClick={() => closeSelf('confirmed')} style={primaryButtonStyle}>
          {confirmText}
        </button>
      </div>
    </div>
  );
};

Alert.layerOptions = {
  closeOnOutsideClick: false,
};

interface ConfirmProps {
  message: string;
  confirmText?: string;
  cancelText?: string;
}

export const Confirm: ModalComponent<ConfirmProps> = ({
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
}) => {
  const { closeSelf } = useModalInstance();

  return (
    <div style={modalStyle}>
      <div style={contentStyle}>
        <p style={{ margin: 0, fontSize: '16px' }}>{message}</p>
      </div>
      <div style={actionsStyle}>
        <button onClick={() => closeSelf(false)} style={secondaryButtonStyle}>
          {cancelText}
        </button>
        <button onClick={() => closeSelf(true)} style={dangerButtonStyle}>
          {confirmText}
        </button>
      </div>
    </div>
  );
};

Confirm.layerOptions = {
  closeOnOutsideClick: false,
};

export interface PromptProps {
  title: string;
  placeholder?: string;
}

export const Prompt: ModalComponent<PromptProps> = ({ title, placeholder = 'Type here' }) => {
  const { closeSelf } = useModalInstance();
  const [value, setValue] = React.useState('');

  return (
    <div style={modalStyle}>
      <div style={contentStyle}>
        <p style={{ margin: 0, fontSize: '16px' }}>{title}</p>
      </div>
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        style={inputStyle}
      />
      <div style={actionsStyle}>
        <button onClick={() => closeSelf(null)} style={secondaryButtonStyle}>
          Cancel
        </button>
        <button onClick={() => closeSelf(value)} style={primaryButtonStyle}>
          Submit
        </button>
      </div>
    </div>
  );
};

const modalStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  background: 'white',
  padding: '20px',
  borderRadius: '8px',
  minWidth: '280px',
  minHeight: '180px',
  maxWidth: '400px',
};

const contentStyle: React.CSSProperties = {
  flex: 1,
  marginBottom: '20px',
  textAlign: 'left',
};

const actionsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '10px',
  justifyContent: 'flex-end',
};

const primaryButtonStyle: React.CSSProperties = {
  padding: '8px 16px',
  backgroundColor: '#007bff',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
};

const secondaryButtonStyle: React.CSSProperties = {
  ...primaryButtonStyle,
  backgroundColor: '#6c757d',
};

const dangerButtonStyle: React.CSSProperties = {
  ...primaryButtonStyle,
  backgroundColor: '#dc3545',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  marginBottom: '16px',
  padding: '10px 12px',
  border: '1px solid #d0d7de',
  borderRadius: '4px',
};
