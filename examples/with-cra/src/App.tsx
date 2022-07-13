import "./App.css";
import "@reactleaf/react-modal/style.css";
import { withModal } from "@reactleaf/react-modal";
import { useModal, preloadModal } from "./modals/useModal";
import register from "./modals/register";
import { useEffect } from "react";

function App() {
  const { openModal } = useModal();

  useEffect(() => {
    preloadModal("Alert");
  }, []);

  function openAlert() {
    openModal({
      type: "Alert",
      props: { title: "This is Alert", message: "Hello" },
      overlayOptions: { closeDelay: 300 },
      events: { onClose: () => window.alert("Closed") },
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

  function openSlideup() {
    openModal({
      type: "Slideup",
      props: { message: "Tada!" },
      overlayOptions: { closeDelay: 500 },
    });
  }

  return (
    <div className="App">
      <button onClick={openAlert}>Open Alert</button>
      <button onClick={openConfirm}>Open Confirm</button>
      <button onClick={openSlideup}>Open Slideup</button>
    </div>
  );
}

export default withModal(register)(App);
