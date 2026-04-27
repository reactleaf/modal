/** @jest-environment jsdom */

import { fireEvent, render, waitFor } from "@testing-library/react";
import { act } from "react";

import { ModalProvider } from "./ModalProvider";
import { useModalInstance } from "./context";
import ModalManager, { MODAL_REPLACED } from "./manager";
import type { ModalComponent } from "./types";

const TestModal: ModalComponent<Record<string, never>> = Object.assign(
  function TestModalInner() {
    return <div data-testid="modal-inner">inner</div>;
  },
  { displayName: "TestModal" },
) as ModalComponent<Record<string, never>>;

const ReplacementModal: ModalComponent<{ label: string }> = ({ label }) => {
  return <div data-testid="replacement-modal">{label}</div>;
};

const SelfReplacingModal: ModalComponent<{ onReplace: (promise: Promise<unknown>) => void }> = ({ onReplace }) => {
  const { replaceSelf } = useModalInstance();

  return (
    <button
      type="button"
      data-testid="replace-self"
      onClick={() => {
        onReplace(replaceSelf(ReplacementModal, { label: "self-next" }, { dim: "self-dim" }));
      }}
    >
      replace
    </button>
  );
};

function mockHistoryChain() {
  const stack: unknown[] = [null];

  const pushState = jest.fn((state: unknown) => {
    stack.push(state);
  });

  const back = jest.fn(() => {
    if (stack.length > 1) {
      stack.pop();
    }
    const state = stack[stack.length - 1];
    // ModalProvider가 window.popstate에서 manager.handlePopState(event.state)를 호출하는 경로를 탄다.
    window.dispatchEvent(new PopStateEvent("popstate", { state }));
  });

  jest.spyOn(window.history, "pushState").mockImplementation(pushState as typeof window.history.pushState);
  jest.spyOn(window.history, "back").mockImplementation(back);

  return { pushState, back, stack };
}

/** TestModal open 결과용 (manager.open 오버로드는 ReturnType이 unknown으로 뭉개짐) */
type TestModalPromise = Promise<void | null | undefined | string | typeof MODAL_REPLACED>;

/**
 * manager.open → notifyListeners → setModalStack 은 동기이므로 act 안에서 호출.
 * open()이 반환하는 Promise(닫힐 때까지 pending)는 그대로 반환해야 하며, 이 헬퍼를 async로 두면
 * `await actOpenTestModal()`이 모달 종료까지 기다려 데드락/타임아웃이 난다.
 */
function actOpenTestModal(manager: ModalManager): TestModalPromise {
  let p!: TestModalPromise;
  act(() => {
    p = manager.open(TestModal) as TestModalPromise;
  });
  return p;
}

function actOpenTwoTestModals(manager: ModalManager): [TestModalPromise, TestModalPromise] {
  let p1!: TestModalPromise;
  let p2!: TestModalPromise;
  act(() => {
    p1 = manager.open(TestModal) as TestModalPromise;
    p2 = manager.open(TestModal) as TestModalPromise;
  });
  return [p1, p2];
}

/**
 * prepareClose가 걸어둔 programmatic history.back()을 끝내기 위해 한 번 더 뒤로 간다.
 * manager.handlePopState를 직접 부르지 않고 mock history.back → PopStateEvent → ModalProvider 리스너 순으로 간다.
 */
async function settleHistoryCloseViaPopstate() {
  await act(async () => {
    window.history.back();
  });
}

async function flushClosePipeline(manager: ModalManager) {
  await settleHistoryCloseViaPopstate();
  await waitFor(() => {
    expect(manager.hasOpenModals()).toBe(false);
  });
}

beforeEach(() => {
  document.body.style.overflow = "";
  jest.spyOn(window, "requestAnimationFrame").mockImplementation((cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

test("default dim adds dim class to modal layer", async () => {
  mockHistoryChain();
  const manager = new ModalManager();

  render(
    <ModalProvider manager={manager}>
      <span>app</span>
    </ModalProvider>,
  );

  expect(document.querySelector(".modal-layer")).toBeNull();

  await act(async () => {
    void manager.open(TestModal);
  });

  expect(document.querySelector(".modal-layer")?.classList.contains("dim")).toBe(true);
});

test("dim: false does not add dim class to modal layer", async () => {
  mockHistoryChain();
  const manager = new ModalManager();

  render(
    <ModalProvider manager={manager} defaultLayerOptions={{ dim: false }}>
      <span>app</span>
    </ModalProvider>,
  );

  await act(async () => {
    void manager.open(TestModal);
  });

  expect(document.querySelector(".modal-layer")?.classList.contains("dim")).toBe(false);
});

test("dim string adds custom dim class to modal layer", async () => {
  mockHistoryChain();
  const manager = new ModalManager();

  render(
    <ModalProvider manager={manager} defaultLayerOptions={{ dim: "custom-dim" }}>
      <span>app</span>
    </ModalProvider>,
  );

  await act(async () => {
    void manager.open(TestModal);
  });

  expect(document.querySelector(".modal-layer")?.classList.contains("custom-dim")).toBe(true);
});

test("modal layer is removed when stack becomes empty", async () => {
  mockHistoryChain();
  const manager = new ModalManager();

  render(
    <ModalProvider manager={manager}>
      <span>app</span>
    </ModalProvider>,
  );

  const p = actOpenTestModal(manager);
  await waitFor(() => expect(document.querySelector(".modal-layer")).toBeTruthy());

  const id = manager.getSnapshot()[0]!.id;
  await act(async () => {
    manager.closeWithResult(id, null);
  });
  await flushClosePipeline(manager);

  expect(document.querySelector(".modal-layer")).toBeNull();
  await expect(p).resolves.toBeNull();
});

test("preventScroll: true sets body overflow hidden while stack non-empty, restores when empty", async () => {
  mockHistoryChain();
  document.body.style.overflow = "scroll";
  const manager = new ModalManager();

  render(
    <ModalProvider manager={manager} rootOptions={{ preventScroll: true }}>
      <span>app</span>
    </ModalProvider>,
  );

  expect(document.body.style.overflow).toBe("scroll");

  await act(async () => {
    void manager.open(TestModal);
  });

  expect(document.body.style.overflow).toBe("hidden");

  const id = manager.getSnapshot()[0]!.id;
  await act(async () => {
    manager.closeWithResult(id, null);
  });
  await flushClosePipeline(manager);

  expect(document.body.style.overflow).toBe("scroll");
});

test("preventScroll: false does not change body overflow", async () => {
  mockHistoryChain();
  document.body.style.overflow = "auto";
  const manager = new ModalManager();

  render(
    <ModalProvider manager={manager} rootOptions={{ preventScroll: false }}>
      <span>app</span>
    </ModalProvider>,
  );

  await act(async () => {
    void manager.open(TestModal);
  });

  expect(document.body.style.overflow).toBe("auto");

  const id = manager.getSnapshot()[0]!.id;
  await act(async () => {
    manager.closeWithResult(id, null);
  });
  await flushClosePipeline(manager);

  expect(document.body.style.overflow).toBe("auto");
});

test("unmounting ModalProvider restores body overflow when preventScroll was active", () => {
  mockHistoryChain();
  document.body.style.overflow = "clip";
  const manager = new ModalManager();

  const { unmount } = render(
    <ModalProvider manager={manager} rootOptions={{ preventScroll: true }}>
      <span>app</span>
    </ModalProvider>,
  );

  act(() => {
    void manager.open(TestModal);
  });
  expect(document.body.style.overflow).toBe("hidden");

  unmount();
  expect(document.body.style.overflow).toBe("clip");
});

test("dim: false keeps manager stack and modal layers in sync through open and close", async () => {
  mockHistoryChain();
  const manager = new ModalManager();

  render(
    <ModalProvider manager={manager} defaultLayerOptions={{ dim: false }}>
      <span>app</span>
    </ModalProvider>,
  );

  const p = actOpenTestModal(manager);
  await waitFor(() => expect(manager.getSnapshot()).toHaveLength(1));
  expect(document.querySelectorAll(".modal-layer")).toHaveLength(1);
  expect(document.querySelector(".modal-layer")?.classList.contains("dim")).toBe(false);

  const id = manager.getSnapshot()[0]!.id;
  await act(async () => {
    manager.closeWithResult(id, "bye");
  });
  await flushClosePipeline(manager);

  expect(manager.getSnapshot()).toHaveLength(0);
  expect(document.querySelectorAll(".modal-layer")).toHaveLength(0);
  await expect(p).resolves.toBe("bye");
});

test("closeOnOutsideClick: true closes when clicking the modal layer backdrop", async () => {
  mockHistoryChain();
  const manager = new ModalManager();

  render(
    <ModalProvider manager={manager} defaultLayerOptions={{ closeOnOutsideClick: true }}>
      <span>app</span>
    </ModalProvider>,
  );

  const p = actOpenTestModal(manager);
  const layer = await waitFor(() => document.querySelector('.modal-layer[data-top="true"]'));
  expect(layer).toBeTruthy();
  if (!layer) throw new Error("layer");

  await act(async () => {
    fireEvent.click(layer!);
  });

  await flushClosePipeline(manager);
  await expect(p).resolves.toBeUndefined();
});

test("closeOnOutsideClick: false does not close on layer click", async () => {
  mockHistoryChain();
  const manager = new ModalManager();

  render(
    <ModalProvider manager={manager} defaultLayerOptions={{ closeOnOutsideClick: false }}>
      <span>app</span>
    </ModalProvider>,
  );

  const p = actOpenTestModal(manager);
  const layer = await waitFor(() => document.querySelector('.modal-layer[data-top="true"]'));
  expect(layer).toBeTruthy();
  if (!layer) throw new Error("layer");

  await act(async () => {
    fireEvent.click(layer!);
  });

  expect(manager.hasOpenModals()).toBe(true);
  let settled = false;
  void p.then(() => {
    settled = true;
  });
  await act(async () => {
    await Promise.resolve();
  });
  expect(settled).toBe(false);
});

test("non-top modal layer does not close on outside click", async () => {
  mockHistoryChain();
  const manager = new ModalManager();

  render(
    <ModalProvider manager={manager} defaultLayerOptions={{ closeOnOutsideClick: true }}>
      <span>app</span>
    </ModalProvider>,
  );

  const [p1, p2] = actOpenTwoTestModals(manager);

  const layers = await waitFor(() => document.querySelectorAll(".modal-layer"));
  expect(layers.length).toBe(2);

  const bottom = layers[0]!;
  await act(async () => {
    fireEvent.click(bottom);
  });

  expect(manager.getSnapshot()).toHaveLength(2);
  let p2Settled = false;
  void p2.then(() => {
    p2Settled = true;
  });
  await act(async () => {
    await Promise.resolve();
  });
  expect(p2Settled).toBe(false);

  await act(async () => {
    manager.closeWithResult(manager.getSnapshot()[1]!.id, null, { historyBack: true });
  });
  await waitFor(() => expect(manager.getSnapshot()).toHaveLength(1));
  await act(async () => {
    manager.closeWithResult(manager.getSnapshot()[0]!.id, undefined, { historyBack: true });
  });
  await waitFor(() => expect(manager.hasOpenModals()).toBe(false));
  await expect(p2).resolves.toBeNull();
  await expect(p1).resolves.toBeUndefined();
});

test("closeDelay > 0: layer loses visible before stack clears; stack clears after delay", async () => {
  mockHistoryChain();
  jest.useFakeTimers();
  // useFakeTimers가 rAF를 덮어쓰므로, 열기/visible과 동일하게 동기 rAF 유지
  jest.spyOn(window, "requestAnimationFrame").mockImplementation((cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  });

  const manager = new ModalManager();

  render(
    <ModalProvider manager={manager} defaultLayerOptions={{ closeDelay: 80 }}>
      <span>app</span>
    </ModalProvider>,
  );

  act(() => {
    void manager.open(TestModal);
  });

  const layer = document.querySelector('.modal-layer[data-top="true"]');
  expect(layer).toBeTruthy();
  expect(layer?.classList.contains("visible")).toBe(true);

  const id = manager.getSnapshot()[0]!.id;
  await act(async () => {
    manager.closeWithResult(id, "done");
  });

  await act(async () => {
    await Promise.resolve();
  });

  expect(manager.hasOpenModals()).toBe(true);
  expect(layer?.classList.contains("visible")).toBe(false);

  await act(async () => {
    jest.advanceTimersByTime(80);
  });
  await settleHistoryCloseViaPopstate();

  expect(manager.hasOpenModals()).toBe(false);

  jest.useRealTimers();
});

test("closeDelay > 0: visible off then delayed close; prepareClose reaches manager via PopStateEvent", async () => {
  mockHistoryChain();
  jest.useFakeTimers();
  jest.spyOn(window, "requestAnimationFrame").mockImplementation((cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  });

  const handlePopStateSpy = jest.spyOn(ModalManager.prototype, "handlePopState");

  const manager = new ModalManager();

  render(
    <ModalProvider manager={manager} defaultLayerOptions={{ closeDelay: 60 }}>
      <span>app</span>
    </ModalProvider>,
  );

  const p = actOpenTestModal(manager);
  const layer = document.querySelector('.modal-layer[data-top="true"]');
  expect(layer).toBeTruthy();
  expect(layer?.classList.contains("visible")).toBe(true);

  const handlePopStateCallsAfterOpen = handlePopStateSpy.mock.calls.length;

  const id = manager.getSnapshot()[0]!.id;
  await act(async () => {
    manager.closeWithResult(id, "delayed");
  });
  await act(async () => {
    await Promise.resolve();
  });

  // prepareClose → history.back() → mock dispatches PopStateEvent → ModalProvider → handlePopState(event.state)
  expect(handlePopStateSpy.mock.calls.length).toBeGreaterThan(handlePopStateCallsAfterOpen);

  expect(manager.hasOpenModals()).toBe(true);
  expect(layer?.classList.contains("visible")).toBe(false);

  await act(async () => {
    jest.advanceTimersByTime(60);
  });
  await settleHistoryCloseViaPopstate();

  expect(manager.hasOpenModals()).toBe(false);
  await expect(p).resolves.toBe("delayed");

  jest.useRealTimers();
});

test("closeDelay 0 closes without extra delay", async () => {
  mockHistoryChain();
  const manager = new ModalManager();

  render(
    <ModalProvider manager={manager} defaultLayerOptions={{ closeDelay: 0 }}>
      <span>app</span>
    </ModalProvider>,
  );

  const p = actOpenTestModal(manager);
  await waitFor(() => expect(document.querySelector('.modal-layer[data-top="true"]')).toBeTruthy());

  const id = manager.getSnapshot()[0]!.id;
  await act(async () => {
    manager.closeWithResult(id, "x");
  });
  await flushClosePipeline(manager);

  await expect(p).resolves.toBe("x");
});

test("replace keeps the same layer while swapping content after closeDelay", async () => {
  mockHistoryChain();
  jest.useFakeTimers();
  jest.spyOn(window, "requestAnimationFrame").mockImplementation((cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  });

  const manager = new ModalManager();

  render(
    <ModalProvider manager={manager} defaultLayerOptions={{ closeDelay: 50 }}>
      <span>app</span>
    </ModalProvider>,
  );

  const previous = actOpenTestModal(manager);
  const id = manager.getSnapshot()[0]!.id;
  const layer = document.querySelector(".modal-layer");
  expect(layer).toBeTruthy();
  expect(layer?.classList.contains("dim")).toBe(true);
  expect(layer?.classList.contains("visible")).toBe(true);
  expect(layer?.getAttribute("data-content-visible")).toBe("true");

  let next!: Promise<unknown>;
  await act(async () => {
    next = manager.replaceById(id, ReplacementModal, { label: "next" }, { dim: "replacement-dim" });
  });
  await act(async () => {
    await Promise.resolve();
  });

  expect(manager.getSnapshot()[0]?.id).toBe(id);
  expect(manager.getSnapshot()[0]?.Component).toBe(TestModal);
  expect(layer?.classList.contains("visible")).toBe(true);
  expect(layer?.classList.contains("dim")).toBe(true);
  expect(layer?.getAttribute("data-content-visible")).toBeNull();

  await act(async () => {
    jest.advanceTimersByTime(50);
  });
  await waitFor(() => expect(manager.getSnapshot()[0]?.Component).toBe(ReplacementModal));

  const replacedLayer = document.querySelector(".modal-layer");
  expect(replacedLayer).toBe(layer);
  expect(replacedLayer?.classList.contains("replacement-dim")).toBe(true);
  expect(replacedLayer?.classList.contains("visible")).toBe(true);
  expect(replacedLayer?.getAttribute("data-content-visible")).toBe("true");
  expect(await waitFor(() => document.querySelector('[data-testid="replacement-modal"]')?.textContent)).toBe("next");
  await expect(previous).resolves.toBe(MODAL_REPLACED);

  await act(async () => {
    manager.closeWithResult(id, "done");
  });
  await flushClosePipeline(manager);
  await expect(next).resolves.toBe("done");

  jest.useRealTimers();
});

test("replaceSelf replaces the current layer without looking up the top modal externally", async () => {
  mockHistoryChain();
  jest.useFakeTimers();
  jest.spyOn(window, "requestAnimationFrame").mockImplementation((cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  });

  const manager = new ModalManager();
  let next!: Promise<unknown>;

  render(
    <ModalProvider manager={manager} defaultLayerOptions={{ closeDelay: 50 }}>
      <span>app</span>
    </ModalProvider>,
  );

  let previous!: Promise<unknown>;
  act(() => {
    previous = manager.open(SelfReplacingModal, {
      onReplace: (promise) => {
        next = promise;
      },
    });
  });

  const id = manager.getSnapshot()[0]!.id;
  const layer = document.querySelector(".modal-layer");
  expect(layer).toBeTruthy();

  const replaceButton = await waitFor(() => {
    const button = document.querySelector('[data-testid="replace-self"]');
    expect(button).toBeTruthy();
    return button as HTMLElement;
  });

  await act(async () => {
    fireEvent.click(replaceButton);
  });
  await act(async () => {
    await Promise.resolve();
  });

  expect(manager.getSnapshot()[0]?.id).toBe(id);
  expect(manager.getSnapshot()[0]?.Component).toBe(SelfReplacingModal);
  expect(layer?.classList.contains("visible")).toBe(true);
  expect(layer?.getAttribute("data-content-visible")).toBeNull();

  await act(async () => {
    jest.advanceTimersByTime(50);
  });
  await waitFor(() => expect(manager.getSnapshot()[0]?.Component).toBe(ReplacementModal));

  const replacedLayer = document.querySelector(".modal-layer");
  expect(replacedLayer).toBe(layer);
  expect(replacedLayer?.classList.contains("self-dim")).toBe(true);
  expect(replacedLayer?.getAttribute("data-content-visible")).toBe("true");
  expect(await waitFor(() => document.querySelector('[data-testid="replacement-modal"]')?.textContent)).toBe(
    "self-next",
  );
  await expect(previous).resolves.toBe(MODAL_REPLACED);

  await act(async () => {
    manager.closeWithResult(id, "self-done");
  });
  await flushClosePipeline(manager);
  await expect(next).resolves.toBe("self-done");

  jest.useRealTimers();
});

test("close request path: closeWithResult does not remove modal until history + transition complete", async () => {
  mockHistoryChain();
  jest.useFakeTimers();
  jest.spyOn(window, "requestAnimationFrame").mockImplementation((cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  });

  const manager = new ModalManager();

  render(
    <ModalProvider manager={manager} defaultLayerOptions={{ closeDelay: 40 }}>
      <span>app</span>
    </ModalProvider>,
  );

  const p = actOpenTestModal(manager);
  const id = manager.getSnapshot()[0]!.id;

  await act(async () => {
    manager.closeWithResult(id, "intercepted");
  });

  expect(manager.getSnapshot()).toHaveLength(1);

  await act(async () => {
    jest.advanceTimersByTime(40);
  });
  await settleHistoryCloseViaPopstate();

  expect(manager.hasOpenModals()).toBe(false);
  expect(manager.getSnapshot()).toHaveLength(0);
  await expect(p).resolves.toBe("intercepted");

  jest.useRealTimers();
});

test("unmounting ModalProvider clears close listener so later closes are direct", async () => {
  mockHistoryChain();
  const manager = new ModalManager();

  const { unmount } = render(
    <ModalProvider manager={manager}>
      <span>app</span>
    </ModalProvider>,
  );

  unmount();

  const p = actOpenTestModal(manager);
  const id = manager.getSnapshot()[0]!.id;

  await act(async () => {
    // Provider 제거 후에는 popstate로 programmatic back을 풀어줄 리스너가 없으므로 history 대기에 걸리지 않게 한다.
    expect(manager.closeWithResult(id, "direct", { historyBack: true })).toBe(true);
  });

  expect(manager.getSnapshot()).toHaveLength(0);
  await expect(p).resolves.toBe("direct");
});
