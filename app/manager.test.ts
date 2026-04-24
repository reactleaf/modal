import ModalManager from './manager';
import type { ModalComponent, ModalOptions } from './types';

function installWindowMock() {
  const historyBack = jest.fn();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).window = {
    location: { href: 'https://example.test/' },
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
const Required: ModalComponent<{ message: string }> = (() => null) as unknown as ModalComponent<{ message: string }>;

function componentWithModalOptions(
  options: Partial<ModalOptions>,
): ModalComponent<Record<string, never>> {
  return Object.assign((() => null) as unknown as ModalComponent<Record<string, never>>, {
    modalOptions: options,
  });
}

beforeEach(() => {
  installWindowMock();
});

afterEach(() => {
  removeWindowMock();
  jest.clearAllMocks();
});

test('open resolves on close and updates snapshot', async () => {
  const manager = new ModalManager();

  const p = manager.open(Required, { message: 'hi' });
  expect(manager.hasOpenModals()).toBe(true);
  expect(manager.getSnapshot()).toHaveLength(1);

  const [first] = manager.getSnapshot();
  expect(first).toBeDefined();
  if (!first) throw new Error('expected modal');

  const resultPromise = p.then((value) => value);

  manager.closeWithResult(first.id, 'ok');

  await expect(resultPromise).resolves.toBe('ok');
  expect(manager.hasOpenModals()).toBe(false);
  expect(manager.getSnapshot()).toHaveLength(0);
});

test('getSnapshot does not expose close and entries are new objects per call', () => {
  const manager = new ModalManager();
  void manager.open(Empty);

  const a = manager.getSnapshot();
  const b = manager.getSnapshot();

  expect(a).not.toBe(b);
  expect(a[0]).not.toBe(b[0]);
  expect('close' in (a[0] as object)).toBe(false);
  expect(a).toEqual(b);
});

test('mutating a previous snapshot does not change the next snapshot', () => {
  const manager = new ModalManager();
  void manager.open(Required, { message: 'x' });

  const prev = manager.getSnapshot();
  if (!prev[0]) throw new Error('expected modal');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (prev[0] as any).id = 'tampered';

  expect(manager.getSnapshot()[0]!.id).not.toBe('tampered');
});

test('closeAll closes all modals and resolves all promises', async () => {
  const manager = new ModalManager();

  const p1 = manager.open(Required, { message: 'a' });
  const p2 = manager.open(Required, { message: 'b' });

  expect(manager.getSnapshot().length).toBe(2);

  manager.closeAll();

  await expect(p1).resolves.toBeUndefined();
  await expect(p2).resolves.toBeUndefined();
  expect(manager.getSnapshot().length).toBe(0);
});

test('closeTop closes the top modal and resolves only its promise', async () => {
  const manager = new ModalManager();

  const p1 = manager.open(Required, { message: 'a' });
  const p2 = manager.open(Required, { message: 'b' });

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

  manager.closeWithResult(manager.getSnapshot()[0]!.id, 'done');
  await expect(p1).resolves.toBe('done');
});

test('closeTop on empty stack returns false', () => {
  const manager = new ModalManager();
  expect(manager.closeTop()).toBe(false);
});

test('open pushes history state once per modal', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pushState = (globalThis as any).window.history.pushState as jest.Mock;
  const manager = new ModalManager();
  void manager.open(Empty);
  void manager.open(Empty);
  expect(pushState).toHaveBeenCalledTimes(2);
});

test('closeWithResult triggers history back when closing a modal', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const back = (globalThis as any).window.history.back as jest.Mock;
  const manager = new ModalManager();
  void manager.open(Empty);
  const id = manager.getSnapshot()[0]!.id;
  manager.closeWithResult(id, null);
  expect(back).toHaveBeenCalledTimes(1);
});

test('closeWithResult is a no-op for unknown id', () => {
  const manager = new ModalManager();
  void manager.open(Empty);
  expect(manager.closeWithResult('nonexistent')).toBe(false);
  expect(manager.getSnapshot()).toHaveLength(1);
});

test('close closes a modal with undefined result', async () => {
  const manager = new ModalManager();
  const p = manager.open(Empty);
  const id = manager.getSnapshot()[0]!.id;

  expect(manager.close(id)).toBe(true);
  await expect(p).resolves.toBeUndefined();
});

test('closeWithResult can skip history back via options', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const back = (globalThis as any).window.history.back as jest.Mock;
  const manager = new ModalManager();
  void manager.open(Empty);
  const id = manager.getSnapshot()[0]!.id;

  expect(manager.closeWithResult(id, 'ok', { historyBack: true })).toBe(true);
  expect(back).not.toHaveBeenCalled();
});

test('subscribe does not call listener when stack is empty', () => {
  const manager = new ModalManager();
  const listener = jest.fn();
  manager.subscribe(listener);
  expect(listener).not.toHaveBeenCalled();
});

test('subscribe receives stack updates after each open', () => {
  const manager = new ModalManager();
  const listener = jest.fn();
  manager.subscribe(listener);
  void manager.open(Empty);
  void manager.open(Empty);
  expect(listener).toHaveBeenCalledTimes(2);
  expect(listener.mock.calls[0]![0]).toHaveLength(1);
  expect(listener.mock.calls[1]![0]).toHaveLength(2);
});

test('subscribe receives immediate snapshot when stack is non-empty', () => {
  const manager = new ModalManager();
  void manager.open(Empty);

  const listener = jest.fn();
  manager.subscribe(listener);

  expect(listener).toHaveBeenCalledTimes(1);
  expect(listener.mock.calls[0]![0]).toHaveLength(1);
});

test('unsubscribe stops further notifications', () => {
  const manager = new ModalManager();
  const listener = jest.fn();
  const unsub = manager.subscribe(listener);
  void manager.open(Empty);
  expect(listener).toHaveBeenCalledTimes(1);
  unsub();
  void manager.open(Empty);
  expect(listener).toHaveBeenCalledTimes(1);
});

test('open merges Component.modalOptions with call options (later wins)', () => {
  const dimFalse = componentWithModalOptions({ dim: false });
  const manager = new ModalManager();
  void manager.open(dimFalse, null, { closeOnOverlayClick: true });

  const [entry] = manager.getSnapshot();
  expect(entry?.options).toEqual(
    expect.objectContaining({
      dim: false,
      closeOnOverlayClick: true,
    }),
  );
});

test('abort on AbortController resolves open with null and clears stack', async () => {
  const manager = new ModalManager();
  const abortController = new AbortController();
  const p = manager.open(Empty, null, { abortController });

  abortController.abort();
  await expect(p).resolves.toBeNull();
  expect(manager.getSnapshot()).toHaveLength(0);
});
