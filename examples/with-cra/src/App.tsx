import "./App.css";
import { withModal, useModal } from "@reactleaf/react-modal";
import register from "./modals/register";

function App() {
  const { openModal } = useModal();

  function openAlert() {
    openModal({ type: "" });
  }
  return (
    <div className="App">
      <button onClick={openAlert}>Open Alert</button>
    </div>
  );
}

export default withModal(register, App);
