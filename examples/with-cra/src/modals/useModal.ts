import { createModalHook } from "@reactleaf/react-modal";
import register from "./register";

export const useModal = createModalHook<typeof register>();
