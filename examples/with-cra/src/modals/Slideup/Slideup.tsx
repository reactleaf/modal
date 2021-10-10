import { BasicModalProps } from "@reactleaf/react-modal";

import "./style.css";

interface Props extends BasicModalProps {
  message: string;
  confirmText?: string;
}
const Slideup: React.FC<Props> = ({
  visible,
  message,
  confirmText = "Close",
  close,
}) => {
  const classNames = ["slideup modal", visible && "visible"]
    .filter((e) => e)
    .join(" ");

  return (
    <div className={classNames}>
      <div className="modal-body">
        <p className="message">{message}</p>
      </div>
      <div className="modal-buttons">
        <button onClick={close}>{confirmText}</button>
      </div>
    </div>
  );
};

export default Slideup;
