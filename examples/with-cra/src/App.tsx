import "./App.css";
import "@reactleaf/react-modal/style.css";
import { withModal } from "@reactleaf/react-modal";
import { useModal } from "./modals/useModal";
import register from "./modals/register";

function App() {
  const { openModal } = useModal();

  function openAlert() {
    openModal({
      type: "Alert",
      props: { title: "This is Alert", message: "Hello" },
      overlayOptions: {
        transitionDuration: 300,
      },
    });
  }

  function openConfirm() {
    openModal({
      type: "Confirm",
      props: {
        title: "This is Confirm",
        message: "Which one will you choose?",
        onConfirm: () => window.alert("Confirmed"),
        onCancel: () => window.alert("Canceled"),
      },
    });
  }

  return (
    <div className="App">
      <button onClick={openAlert}>Open Alert</button>
      <button onClick={openConfirm}>Open Confirm</button>
    </div>
  );
}

export default withModal(register, App);
