import { ModalManager } from "./manager";
import { MODAL_ABORTED, MODAL_REPLACED } from "./signals";
import type { LayerOptions, ModalComponent } from "./types";

function installWindowMock() {
  const historyBack = jest.fn();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).window = {
    location: { href: "https://example.test/" },
    history: {
      pushState: jest.fn(),
      back: historyBack,
    },
  };
}

function removeWindowMock() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (globalThis as any).window;
}

const Empty: ModalComponent<Record<string, never>> = (() => null) as unknown as ModalComponent<Record<string, never>>;
const Required: ModalComponent<{ message: string }> = (() => null) as unknown as ModalComponent<{
  message: string;
}>;

function componentWithLayerOptions(options: Partial<LayerOptions>): ModalComponent<Record<string, never>> {
  return Object.assign((() => null) as unknown as ModalComponent<Record<string, never>>, {
    layerOptions: options,
  });
}

beforeEach(() => {
  installWindowMock();
});

afterEach(() => {
  removeWindowMock();
  jest.clearAllMocks();
});

test("open resolves on close and updates snapshot", async () => {
  const manager = new ModalManager();

  const p = manager.open(Required, { message: "hi" });
  expect(manager.hasOpenModals()).toBe(true);
  expect(manager.getSnapshot()).toHaveLength(1);

  const [first] = manager.getSnapshot();
  expect(first).toBeDefined();
  if (!first) throw new Error("expected modal");

  const resultPromise = p.then((value) => value);

  manager.closeWithResult(first.id, "ok");

  await expect(resultPromise).resolves.toBe("ok");
  expect(manager.hasOpenModals()).toBe(false);
  expect(manager.getSnapshot()).toHaveLength(0);
});

test("getSnapshot does not expose close and entries are new objects per call", () => {
  const manager = new ModalManager();
  void manager.open(Empty);

  const a = manager.getSnapshot();
  const b = manager.getSnapshot();

  expect(a).not.toBe(b);
  expect(a[0]).not.toBe(b[0]);
  expect("close" in (a[0] as object)).toBe(false);
  expect(a).toEqual(b);
});

test("mutating a previous snapshot does not change the next snapshot", () => {
  const manager = new ModalManager();
  void manager.open(Required, { message: "x" });

  const prev = manager.getSnapshot();
  if (!prev[0]) throw new Error("expected modal");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (prev[0] as any).id = "tampered";

  expect(manager.getSnapshot()[0]!.id).not.toBe("tampered");
});

test("closeAll closes all modals and resolves all promises", async () => {
  const manager = new ModalManager();

  const p1 = manager.open(Required, { message: "a" });
  const p2 = manager.open(Required, { message: "b" });

  expect(manager.getSnapshot().length).toBe(2);

  manager.closeAll();

  await expect(p1).resolves.toBeUndefined();
  await expect(p2).resolves.toBeUndefined();
  expect(manager.getSnapshot().length).toBe(0);
});

test("closeTop closes the top modal and resolves only its promise", async () => {
  const manager = new ModalManager();

  const p1 = manager.open(Required, { message: "a" });
  const p2 = manager.open(Required, { message: "b" });

  expect(manager.closeTop()).toBe(true);

  await expect(p2).resolves.toBeUndefined();
  expect(manager.getSnapshot()).toHaveLength(1);

  let p1Settled = false;
  void p1.then(
    () => {
      p1Settled = true;
    },
    () => {
      p1Settled = true;
    },
  );
  await Promise.resolve();
  expect(p1Settled).toBe(false);

  manager.closeWithResult(manager.getSnapshot()[0]!.id, "done");
  await expect(p1).resolves.toBe("done");
});

test("closeTop on empty stack returns false", () => {
  const manager = new ModalManager();
  expect(manager.closeTop()).toBe(false);
});

test("open pushes history state once per modal", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pushState = (globalThis as any).window.history.pushState as jest.Mock;
  const manager = new ModalManager();
  void manager.open(Empty);
  void manager.open(Empty);
  expect(pushState).toHaveBeenCalledTimes(2);
  expect(pushState.mock.calls[0]![0]).toEqual({
    __reactleafModal: {
      id: manager.getSnapshot()[0]!.id,
    },
  });
  expect(pushState.mock.calls[1]![0]).toEqual({
    __reactleafModal: {
      id: manager.getSnapshot()[1]!.id,
    },
  });
});

test("closeWithResult triggers history back when closing a modal", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const back = (globalThis as any).window.history.back as jest.Mock;
  const manager = new ModalManager();
  void manager.open(Empty);
  const id = manager.getSnapshot()[0]!.id;
  manager.closeWithResult(id, null);
  expect(back).toHaveBeenCalledTimes(1);
});

test("programmatic close does not let the next popstate close another modal", async () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).window.addEventListener = jest.fn();
  const manager = new ModalManager();
  const p1 = manager.open(Required, { message: "a" });
  const p2 = manager.open(Required, { message: "b" });

  const topId = manager.getSnapshot()[1]!.id;
  expect(manager.closeWithResult(topId, "done")).toBe(true);
  expect(manager.getSnapshot()).toHaveLength(1);

  let p2Settled = false;
  void p2.then(() => {
    p2Settled = true;
  });
  await Promise.resolve();
  expect(p2Settled).toBe(false);

  expect(
    manager.handlePopState({
      __reactleafModal: {
        id: manager.getSnapshot()[0]!.id,
      },
    }),
  ).toBe(false);
  await expect(p2).resolves.toBe("done");
  expect(manager.getSnapshot()).toHaveLength(1);

  manager.close(manager.getSnapshot()[0]!.id, { historyBack: true });
  await expect(p1).resolves.toBeUndefined();
});

test("manual popstate closes only the top modal", async () => {
  const manager = new ModalManager();
  const p1 = manager.open(Required, { message: "a" });
  const p2 = manager.open(Required, { message: "b" });

  const destinationState = {
    __reactleafModal: {
      id: manager.getSnapshot()[0]!.id,
    },
  };

  expect(manager.handlePopState(destinationState)).toBe(true);
  await expect(p2).resolves.toBeUndefined();
  expect(manager.getSnapshot()).toHaveLength(1);

  manager.close(manager.getSnapshot()[0]!.id, { historyBack: true });
  await expect(p1).resolves.toBeUndefined();
});

test("manual popstate to base closes the top modal", async () => {
  const manager = new ModalManager();
  const p = manager.open(Required, { message: "a" });

  expect(manager.handlePopState(null)).toBe(true);
  await expect(p).resolves.toBeUndefined();
  expect(manager.getSnapshot()).toHaveLength(0);
});

test("closeWithResult is a no-op for unknown id", () => {
  const manager = new ModalManager();
  void manager.open(Empty);
  expect(manager.closeWithResult("nonexistent")).toBe(false);
  expect(manager.getSnapshot()).toHaveLength(1);
});

test("close closes a modal with undefined result", async () => {
  const manager = new ModalManager();
  const p = manager.open(Empty);
  const id = manager.getSnapshot()[0]!.id;

  expect(manager.close(id)).toBe(true);
  await expect(p).resolves.toBeUndefined();
});

test("closeWithResult can skip history back via options", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const back = (globalThis as any).window.history.back as jest.Mock;
  const manager = new ModalManager();
  void manager.open(Empty);
  const id = manager.getSnapshot()[0]!.id;

  expect(manager.closeWithResult(id, "ok", { historyBack: true })).toBe(true);
  expect(back).not.toHaveBeenCalled();
});

test("closeWithResult delegates to close request listener when installed", async () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const back = (globalThis as any).window.history.back as jest.Mock;
  const manager = new ModalManager();
  const p = manager.open(Empty);
  const id = manager.getSnapshot()[0]!.id;
  const listener = jest.fn(() => true);

  const unsetListener = manager.setCloseRequestListener(listener);

  expect(manager.closeWithResult(id, "ok")).toBe(true);
  expect(listener).toHaveBeenCalledWith({
    id,
    result: "ok",
    options: undefined,
    historySettled: expect.any(Promise),
  });
  expect(manager.getSnapshot()).toHaveLength(1);
  expect(back).toHaveBeenCalledTimes(1);

  let settled = false;
  void p.then(() => {
    settled = true;
  });
  await Promise.resolve();
  expect(settled).toBe(false);

  expect(manager.completeCloseWithResult(id, "ok")).toBe(true);
  await expect(p).resolves.toBe("ok");
  unsetListener();
});

test("unsetting close request listener restores direct close behavior", async () => {
  const manager = new ModalManager();
  const p = manager.open(Empty);
  const id = manager.getSnapshot()[0]!.id;
  const listener = jest.fn(() => true);

  const unsetListener = manager.setCloseRequestListener(listener);
  unsetListener();

  expect(manager.close(id)).toBe(true);
  expect(listener).not.toHaveBeenCalled();
  await expect(p).resolves.toBeUndefined();
});

test("subscribe does not call listener when stack is empty", () => {
  const manager = new ModalManager();
  const listener = jest.fn();
  manager.subscribe(listener);
  expect(listener).not.toHaveBeenCalled();
});

test("subscribe receives stack updates after each open", () => {
  const manager = new ModalManager();
  const listener = jest.fn();
  manager.subscribe(listener);
  void manager.open(Empty);
  void manager.open(Empty);
  expect(listener).toHaveBeenCalledTimes(2);
  expect(listener.mock.calls[0]![0]).toHaveLength(1);
  expect(listener.mock.calls[1]![0]).toHaveLength(2);
});

test("subscribe receives immediate snapshot when stack is non-empty", () => {
  const manager = new ModalManager();
  void manager.open(Empty);

  const listener = jest.fn();
  manager.subscribe(listener);

  expect(listener).toHaveBeenCalledTimes(1);
  expect(listener.mock.calls[0]![0]).toHaveLength(1);
});

test("unsubscribe stops further notifications", () => {
  const manager = new ModalManager();
  const listener = jest.fn();
  const unsub = manager.subscribe(listener);
  void manager.open(Empty);
  expect(listener).toHaveBeenCalledTimes(1);
  unsub();
  void manager.open(Empty);
  expect(listener).toHaveBeenCalledTimes(1);
});

test("open merges Component.layerOptions with call options (later wins)", () => {
  const layerClickDisabled = componentWithLayerOptions({ closeOnOutsideClick: false });
  const manager = new ModalManager();
  void manager.open(layerClickDisabled, null, { closeOnOutsideClick: true });

  const [entry] = manager.getSnapshot();
  expect(entry?.options).toEqual(
    expect.objectContaining({
      closeOnOutsideClick: true,
    }),
  );
});

test("replaceById with unknown id resolves with MODAL_REPLACED and does not open a modal", async () => {
  const manager = new ModalManager();
  await expect(manager.replaceById("nonexistent", Required, { message: "hi" })).resolves.toBe(MODAL_REPLACED);
  expect(manager.getSnapshot()).toHaveLength(0);
});

test("replaceById keeps layer id and resolves previous modal with MODAL_REPLACED", async () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pushState = (globalThis as any).window.history.pushState as jest.Mock;
  const manager = new ModalManager();
  const previous = manager.open(Required, { message: "before" });
  const previousId = manager.getSnapshot()[0]!.id;

  const next = manager.replaceById(previousId, Empty);

  expect(pushState).toHaveBeenCalledTimes(1);
  expect(manager.getSnapshot()).toHaveLength(1);
  expect(manager.getSnapshot()[0]?.id).toBe(previousId);
  expect(manager.getSnapshot()[0]?.Component).toBe(Empty);
  await expect(previous).resolves.toBe(MODAL_REPLACED);

  manager.closeWithResult(previousId, "after");
  await expect(next).resolves.toBe("after");
});

test("second replaceById before completeReplace supersedes first pending promise", async () => {
  const manager = new ModalManager();
  const unsetReplace = manager.setReplaceRequestListener(() => true);

  void manager.open(Required, { message: "a" });
  const id = manager.getSnapshot()[0]!.id;

  const pFirstPending = manager.replaceById(id, Empty);
  const pSecondPending = manager.replaceById(id, Required, { message: "b" });

  await expect(pFirstPending).resolves.toBe(MODAL_REPLACED);

  expect(manager.completeReplace(id)).toBe(true);
  expect(manager.getSnapshot()[0]?.Component).toBe(Required);

  manager.closeWithResult(id, "done");
  await expect(pSecondPending).resolves.toBe("done");

  unsetReplace();
});

test("replaceById recalculates options from replacement component and call options", () => {
  const previousComponent = componentWithLayerOptions({
    dim: "old-dim",
    closeOnOutsideClick: false,
  });
  const nextComponent = componentWithLayerOptions({ dim: "next-dim", closeOnOutsideClick: false });
  const manager = new ModalManager();
  void manager.open(previousComponent);
  const id = manager.getSnapshot()[0]!.id;

  void manager.replaceById(id, nextComponent, null, { closeOnOutsideClick: true });

  expect(manager.getSnapshot()[0]?.options).toEqual(
    expect.objectContaining({
      dim: "next-dim",
      closeOnOutsideClick: true,
    }),
  );
});

test("abort on AbortController resolves open with MODAL_ABORTED and clears stack", async () => {
  const manager = new ModalManager();
  const abortController = new AbortController();
  const p = manager.open(Empty, null, { abortController });

  abortController.abort();
  await expect(p).resolves.toBe(MODAL_ABORTED);
  expect(manager.getSnapshot()).toHaveLength(0);
});

test("abort on AbortController delegates through close request listener when installed", async () => {
  const manager = new ModalManager();
  const abortController = new AbortController();
  const listener = jest.fn(() => true);
  const unsetListener = manager.setCloseRequestListener(listener);
  const p = manager.open(Empty, null, { abortController });
  const id = manager.getSnapshot()[0]!.id;

  abortController.abort();

  expect(listener).toHaveBeenCalledWith({
    id,
    result: MODAL_ABORTED,
    options: undefined,
    historySettled: expect.any(Promise),
  });
  expect(manager.getSnapshot()).toHaveLength(1);

  expect(manager.completeCloseWithResult(id, MODAL_ABORTED)).toBe(true);
  await expect(p).resolves.toBe(MODAL_ABORTED);
  unsetListener();
});

test("normal close removes abort listener before the signal aborts", async () => {
  const manager = new ModalManager();
  const abortController = new AbortController();
  const removeSpy = jest.spyOn(abortController.signal, "removeEventListener");
  const p = manager.open(Empty, null, { abortController });
  const id = manager.getSnapshot()[0]!.id;

  expect(manager.close(id)).toBe(true);
  await expect(p).resolves.toBeUndefined();
  expect(removeSpy).toHaveBeenCalledWith("abort", expect.any(Function));

  abortController.abort();
  expect(manager.getSnapshot()).toHaveLength(0);
});

test("already-aborted signal resolves without opening a modal", async () => {
  const manager = new ModalManager();
  const abortController = new AbortController();
  abortController.abort();

  await expect(manager.open(Empty, null, { abortController })).resolves.toBe(MODAL_ABORTED);
  expect(manager.getSnapshot()).toHaveLength(0);
});
