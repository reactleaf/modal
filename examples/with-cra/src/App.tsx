import "./App.css";
import "@reactleaf/react-modal/style.css";
import { ModalProvider } from "@reactleaf/react-modal";
import { useModal, preloadModal } from "./modals/useModal";
import register from "./modals/register";
import { useEffect } from "react";

function App() {
  const { openModal } = useModal();

  useEffect(() => {
    preloadModal("Slideup");
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

export default function AppWithProviders() {
  return (
    <ModalProvider
      register={register}
      defaultOverlayOptions={{ Slideup: { closeDelay: 500 } }}
    >
      <App />
    </ModalProvider>
  );
}
