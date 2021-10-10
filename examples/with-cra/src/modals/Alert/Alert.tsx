import { BasicModalProps } from "@reactleaf/react-modal";
import "../modal.css";

interface Props extends BasicModalProps {
  title: string;
  message: string;
  confirmText?: string;
  onConfirm?(): void;
}
const Alert = ({
  title,
  message,
  confirmText = "확인",
  onConfirm,
  close,
}: Props) => {
  function handleConfirm() {
    onConfirm?.();
    close();
  }
  return (
    <div className="modal">
      <p className="modal-title">{title}</p>
      <div className="modal-body">
        <p className="message">{message}</p>
      </div>
      <div className="modal-buttons">
        <button onClick={handleConfirm}>{confirmText}</button>
      </div>
    </div>
  );
};

export default Alert;
