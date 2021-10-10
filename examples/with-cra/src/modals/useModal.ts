import { createModalHook, createModalPreloader } from "@reactleaf/react-modal";
import register from "./register";

export const useModal = createModalHook<typeof register>();
export const preloadModal = createModalPreloader(register);
