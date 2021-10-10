import "./App.css";
import "@reactleaf/react-modal/style.css";
import { withModal } from "@reactleaf/react-modal";
import { useModal } from "./modals/useModal";
import register from "./modals/register";

function App() {
  const { openModal } = useModal();

  function openAlert() {
    openModal({ type: "Alert", props: { title: "", message: "Hello" } });
  }
  return (
    <div className="App">
      <button onClick={openAlert}>Open Alert</button>
    </div>
  );
}

export default withModal(register, App);
