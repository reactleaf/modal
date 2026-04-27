import { ModalComponent, useModalInstance } from "@reactleaf/modal";
import React from "react";

interface AlertProps {
  message: string;
  onConfirm?: () => Promise<void> | void;
  confirmText?: string;
}

export const Alert: ModalComponent<AlertProps> = ({ message, onConfirm, confirmText = "OK" }) => {
  const { closeSelf } = useModalInstance();

  async function handleConfirm() {
    await onConfirm?.();
    closeSelf("confirmed");
  }

  return (
    <div style={modalStyle}>
      <div style={contentStyle}>
        <p style={{ margin: 0, fontSize: "16px" }}>{message}</p>
      </div>
      <div style={actionsStyle}>
        <button onClick={handleConfirm} style={primaryButtonStyle}>
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

export const Confirm: ModalComponent<ConfirmProps> = ({ message, confirmText = "Confirm", cancelText = "Cancel" }) => {
  const { closeSelf } = useModalInstance();

  return (
    <div style={modalStyle}>
      <div style={contentStyle}>
        <p style={{ margin: 0, fontSize: "16px" }}>{message}</p>
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

interface EmailVerificationProps {
  onComplete: (verified: boolean | undefined) => void;
}

export const EmailVerification: ModalComponent<EmailVerificationProps> = ({ onComplete }) => {
  const { replaceSelf } = useModalInstance();
  const [email, setEmail] = React.useState("");

  async function handleSubmit() {
    const verified = await replaceSelf<VerificationCodeProps, boolean>(VerificationCode, {
      email,
    });

    onComplete(typeof verified === "boolean" ? verified : undefined);
  }

  return (
    <div style={modalStyle}>
      <div style={contentStyle}>
        <p style={{ margin: 0, fontSize: "16px" }}>Enter your email address.</p>
      </div>
      <input
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="name@example.com"
        style={inputStyle}
      />
      <div style={actionsStyle}>
        <button onClick={handleSubmit} style={primaryButtonStyle}>
          Send code
        </button>
      </div>
    </div>
  );
};

EmailVerification.layerOptions = {
  closeOnOutsideClick: false,
};

interface VerificationCodeProps {
  email: string;
}

const VerificationCode: ModalComponent<VerificationCodeProps> = ({ email }) => {
  const { closeSelf } = useModalInstance();
  const [code, setCode] = React.useState("");

  return (
    <div style={modalStyle}>
      <div style={contentStyle}>
        <p style={{ margin: 0, fontSize: "16px" }}>Enter the code sent to {email || "your email"}.</p>
      </div>
      <input value={code} onChange={(event) => setCode(event.target.value)} placeholder="123456" style={inputStyle} />
      <div style={actionsStyle}>
        <button onClick={() => closeSelf(false)} style={secondaryButtonStyle}>
          Cancel
        </button>
        <button onClick={() => closeSelf(code.trim().length > 0)} style={primaryButtonStyle}>
          Verify
        </button>
      </div>
    </div>
  );
};

export interface PromptProps {
  title: string;
  placeholder?: string;
}

export const Prompt: ModalComponent<PromptProps> = ({ title, placeholder = "Type here" }) => {
  const { closeSelf } = useModalInstance();
  const [value, setValue] = React.useState("");

  return (
    <div style={modalStyle}>
      <div style={contentStyle}>
        <p style={{ margin: 0, fontSize: "16px" }}>{title}</p>
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
  display: "flex",
  flexDirection: "column",
  background: "white",
  padding: "20px",
  borderRadius: "8px",
  minWidth: "280px",
  minHeight: "180px",
  maxWidth: "400px",
};

const contentStyle: React.CSSProperties = {
  flex: 1,
  marginBottom: "20px",
  textAlign: "left",
};

const actionsStyle: React.CSSProperties = {
  display: "flex",
  gap: "10px",
  justifyContent: "flex-end",
};

const primaryButtonStyle: React.CSSProperties = {
  padding: "8px 16px",
  backgroundColor: "#007bff",
  color: "white",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  ...primaryButtonStyle,
  backgroundColor: "#6c757d",
};

const dangerButtonStyle: React.CSSProperties = {
  ...primaryButtonStyle,
  backgroundColor: "#dc3545",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  marginBottom: "16px",
  padding: "10px 12px",
  border: "1px solid #d0d7de",
  borderRadius: "4px",
};
