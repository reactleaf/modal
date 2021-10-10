import { BasicModalProps } from "@reactleaf/react-modal";
import "../modal.css";
import "./style.css";

interface ConfirmProps extends BasicModalProps {
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

const Confirm: React.FC<ConfirmProps> = ({
  title,
  message,
  confirmText = "OK",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  close,
}) => {
  function handleConfirm() {
    onConfirm?.();
    close();
  }
  function handleCancel() {
    onCancel?.();
    close();
  }
  return (
    <div className="confirm modal">
      <p className="modal-title">{title}</p>
      <div className="modal-body">
        <p className="message">{message}</p>
      </div>
      <div className="modal-buttons">
        <button onClick={handleCancel}>{cancelText}</button>
        <button onClick={handleConfirm}>{confirmText}</button>
      </div>
    </div>
  );
};

export default Confirm;
