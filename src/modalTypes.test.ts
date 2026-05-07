import type { ModalInstanceContextType, ReplaceSelf } from "./context";
import { ModalManager } from "./manager";
import type { ModalClosedSignal } from "./signals";
import type { ModalComponent, ModalOpenResult, ModalReplaceResult } from "./types";

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

type Expect<T extends true> = T;

function typeOnlyBlock(): boolean {
  return false;
}

type ConfirmProps = {
  message: string;
};

const Confirm: ModalComponent<ConfirmProps, boolean> = ({ message }) => {
  void message;
  return null;
};

const OptionalPropsModal: ModalComponent<{ message?: string }, number> = ({ message }) => {
  void message;
  return null;
};

function PlainModal({ message }: ConfirmProps) {
  void message;
  return null;
}

test("ModalComponent result type is inferred by modal.open", () => {
  const manager = new ModalManager();

  const result = manager.open(Confirm, { message: "Delete?" });

  type _Result = Expect<Equal<typeof result, ModalOpenResult<typeof Confirm>>>;
  type _OpenResult = Expect<Equal<ModalOpenResult<typeof Confirm>, Promise<boolean | ModalClosedSignal | undefined>>>;
});

test("modal.open keeps props validation from the modal component type", () => {
  const manager = new ModalManager();

  void manager.open(Confirm, { message: "Delete?" });

  // @ts-expect-error Confirm requires props.
  void manager.open(Confirm);

  // @ts-expect-error Confirm requires a message prop.
  void manager.open(Confirm, {});

  // @ts-expect-error Confirm does not accept unknown props.
  void manager.open(Confirm, { message: "Delete?", extra: true });
});

test("modal.open allows omitted props for optional-props modals", () => {
  const manager = new ModalManager();

  const result = manager.open(OptionalPropsModal);
  const resultWithOptions = manager.open(OptionalPropsModal, null, { closeOnOutsideClick: false });

  type _Result = Expect<Equal<typeof result, ModalOpenResult<typeof OptionalPropsModal>>>;
  type _ResultWithOptions = Expect<Equal<typeof resultWithOptions, ModalOpenResult<typeof OptionalPropsModal>>>;
});

test("modal.open rejects options-only calls for required-props modals", () => {
  const manager = new ModalManager();

  // @ts-expect-error Confirm requires props before options.
  void manager.open(Confirm, null, { closeOnOutsideClick: false });

  // @ts-expect-error Confirm requires props before options.
  void manager.open(Confirm, undefined, { closeOnOutsideClick: false });
});

test("plain React components are treated as untyped components with unknown result type", () => {
  const manager = new ModalManager();

  const result = manager.open(PlainModal, { message: "Plain" });

  type _Result = Expect<Equal<typeof result, ModalOpenResult<typeof PlainModal>>>;
  type _OpenResult = Expect<Equal<ModalOpenResult<typeof PlainModal>, Promise<unknown>>>;
});

test("untyped ModalComponent values fall back to unknown result type", () => {
  const manager = new ModalManager();
  const UntypedConfirm: ModalComponent<ConfirmProps> = Confirm;

  const result = manager.open(UntypedConfirm, { message: "Untyped" });

  type _Result = Expect<Equal<typeof result, ModalOpenResult<typeof UntypedConfirm>>>;
  type _UnknownResult = Expect<Equal<typeof result, Promise<unknown>>>;
});

test("untyped ModalComponent values can still use explicit result generics", () => {
  const manager = new ModalManager();
  const UntypedConfirm: ModalComponent<ConfirmProps> = Confirm;

  const result = manager.open<ConfirmProps, string>(UntypedConfirm, { message: "Untyped" });

  type _Result = Expect<Equal<typeof result, Promise<string | ModalClosedSignal | undefined>>>;
});

test("ModalComponent result type is inferred by replaceSelf", () => {
  if (typeOnlyBlock()) {
    const replaceSelf = undefined as unknown as ReplaceSelf;
    const result = replaceSelf(Confirm, { message: "Replace?" });

    type _Result = Expect<Equal<typeof result, ModalReplaceResult<typeof Confirm>>>;
    type _ReplaceResult = Expect<
      Equal<ModalReplaceResult<typeof Confirm>, Promise<boolean | ModalClosedSignal | undefined>>
    >;
  }
});

test("replaceSelf keeps props validation from the replacement component type", () => {
  if (typeOnlyBlock()) {
    const replaceSelf = undefined as unknown as ReplaceSelf;

    void replaceSelf(Confirm, { message: "Replace?" });

    // @ts-expect-error Confirm requires props.
    void replaceSelf(Confirm);

    // @ts-expect-error Confirm requires a message prop.
    void replaceSelf(Confirm, {});

    // @ts-expect-error Confirm does not accept unknown props.
    void replaceSelf(Confirm, { message: "Replace?", extra: true });

    // @ts-expect-error Confirm requires props before options.
    void replaceSelf(Confirm, null, { closeOnOutsideClick: false });
  }
});

test("useModalInstance can type closeSelf with an explicit result type", () => {
  type Instance = ModalInstanceContextType<boolean>;
  type CloseSelfParameter = Parameters<Instance["closeSelf"]>[0];

  type _CloseSelfParameter = Expect<Equal<CloseSelfParameter, boolean | undefined>>;
});

test("useModalInstance closeSelf rejects values outside the explicit result type", () => {
  type Instance = ModalInstanceContextType<boolean>;
  const closeSelf = undefined as unknown as Instance["closeSelf"];

  if (typeOnlyBlock()) {
    void closeSelf(true);

    // @ts-expect-error closeSelf only accepts boolean results for this instance type.
    void closeSelf("wrong");
  }
});
