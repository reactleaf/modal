# @reactleaf/modal

[![npm version](https://badge.fury.io/js/@reactleaf%2Fmodal.svg)](https://badge.fury.io/js/@reactleaf%2Fmodal)

React modal library for opening and closing type-safe modals from anywhere in your code.

- [한국어](./README-ko.md)
- [Migration Guide](./MIGRATION_TO_V2.md)

## Concept

`@reactleaf/modal` v2 removes the register system and hook factory from v1.
You create a `ModalManager`, pass the same instance to `ModalProvider`, and call `modal.open(...)` anywhere you need.

## Goals

- Open any modal component directly from anywhere in your code.
- Keep modal props and resolved results type-safe.
- Let each modal own its custom UI while `ModalProvider` owns the stack, shade, and scroll behavior.

### What changed in v2

- No `register.ts`
- No `useModal()` or `createModalHook()`
- No string modal names
- No `BasicModalProps`
- `modal.open(Component, props?, options?)` returns a `Promise`
- Modal components read `closeSelf` and `visible` from `useModalInstance()`

## Installation

```sh
npm install @reactleaf/modal
# or
yarn add @reactleaf/modal
```

## Quick Start

### 1. Create a manager and connect it to the provider

```tsx
import { ModalManager, ModalProvider } from '@reactleaf/modal';

const modal = new ModalManager();

function App() {
  return (
    <ModalProvider
      manager={modal}
      defaultLayerOptions={{ closeOnOutsideClick: true }}
      stackOptions={{ shade: true, preventScroll: true }}
    >
      <YourApp />
    </ModalProvider>
  );
}
```

The `ModalProvider` and every `modal.open(...)` call must use the same `ModalManager` instance.

### 2. Create a modal component

```tsx
import { useModalInstance } from '@reactleaf/modal';

interface AlertProps {
  message: string;
}

export default function Alert({ message }: AlertProps) {
  const { closeSelf, visible } = useModalInstance();

  return (
    <div className={visible ? 'visible' : undefined}>
      <p>{message}</p>
      <button onClick={() => closeSelf('confirmed')}>OK</button>
    </div>
  );
}
```

### 3. Open the modal

```tsx
import { ModalManager } from '@reactleaf/modal';
import Alert from './modals/Alert';

const modal = new ModalManager();

async function handleClick() {
  const result = await modal.open(Alert, { message: 'Hello!' });
  console.log(result); // 'confirmed'
}
```

## API

### `new ModalManager()`

Creates a modal controller instance.

```ts
import { ModalManager } from '@reactleaf/modal';

const modal = new ModalManager();
```

### `<ModalProvider manager={...} />`

Renders the modal container for a specific manager instance.

```tsx
import { ModalManager, ModalProvider } from '@reactleaf/modal';

const modal = new ModalManager();

<ModalProvider manager={modal} defaultLayerOptions={{ closeDelay: 300 }}>
  <App />
</ModalProvider>;
```

Props:

- `manager: ModalManager`
- `defaultLayerOptions?: LayerOptions`
- `stackOptions?: StackOptions`
- `children: React.ReactNode`

### `modal.open(Component, props?, options?)`

Opens a modal and resolves when that modal closes.

```ts
const confirmed = await modal.open(Confirm, {
  message: 'Delete this item?',
});
```

Return value rules:

- `closeSelf(value)` -> resolves to `value`
- `closeSelf()` -> resolves to `undefined`
- overlay click / `Escape` / browser back -> resolves to `undefined`
- `modal.closeWithResult(id, value)` -> resolves to `value`
- `modal.close(id)` / `modal.closeTop()` / `modal.closeAll()` -> resolves to `undefined`
- `abortController.abort()` -> resolves to `MODAL_ABORTED`

Props rules:

- If the modal has required props, pass them as the second argument.
- If the modal has no props or only optional props, the second argument may be omitted.
- If the modal has no props and you want to pass options, use `null` as the second argument.

```ts
await modal.open(EmptyPropsModal);
await modal.open(EmptyPropsModal, null, { abortController: controller });
```

### `modal.closeWithResult(id, result, options?)`

Closes the modal with the given id and resolves its pending `open()` promise with `result`.

```ts
modal.closeWithResult(id, { confirmed: true });
modal.closeWithResult(id, { confirmed: true }, { historyBack: true });
```

### `modal.close(id, options?)`

Closes the modal with the given id and resolves its pending `open()` promise with `undefined`.

```ts
modal.close(id);
```

### `modal.closeTop(options?)`

Closes the top-most modal and resolves its pending `open()` promise with `undefined`.

```ts
modal.closeTop();
modal.closeTop({ historyBack: true });
```

### `modal.closeAll(options?)`

Closes all currently open modals and resolves their pending `open()` promises with `undefined`.

```ts
modal.closeAll();
```

### `modal.hasOpenModals()`

Returns whether any modal is currently open.

```ts
if (modal.hasOpenModals()) {
  console.log('A modal is open');
}
```

### `modal.getSnapshot()`

Returns a readonly snapshot of the currently opened modal stack.

```ts
const opened = modal.getSnapshot();

if (opened.some((item) => item.Component === Alert)) {
  console.log('Alert is already open');
}
```

### `modal.subscribe(listener)`

Advanced escape hatch for observing stack changes.

```ts
const unsubscribe = modal.subscribe((stack) => {
  console.log('opened modals:', stack.length);
});

unsubscribe();
```

### `useModalInstance()`

Use this inside a modal component to access modal state.

```tsx
const { closeSelf, visible } = useModalInstance();
```

Exposed values:

- `visible: boolean`
- `closeSelf(result?): Promise<void>`

## Modal Options

```ts
export interface LayerOptions {
  className?: string;
  closeDelay?: number;
  closeOnOutsideClick?: boolean;
}

export interface StackOptions {
  shade?: boolean;
  preventScroll?: boolean;
}

export interface ModalOptions extends LayerOptions {
  abortController?: AbortController;
}
```

### Option priority

Options are merged in this order:

1. Provider layer defaults
2. Component defaults
3. Call-time options

```tsx
<ModalProvider
  manager={modal}
  defaultLayerOptions={{ closeOnOutsideClick: true }}
  stackOptions={{ shade: true, preventScroll: true }}
>
  <App />
</ModalProvider>

Alert.layerOptions = {
  closeOnOutsideClick: false,
};

await modal.open(Alert, { message: 'Hello' }, { className: 'alert-layer' });
```

### Component-level defaults

You can define defaults on the modal component itself.

```tsx
import { ModalComponent } from '@reactleaf/modal';

type AlertProps = { message: string };

const Alert: ModalComponent<AlertProps> = ({ message }) => {
  // ...
};

Alert.layerOptions = {
  closeOnOutsideClick: false,
};
```

## Promise-based flows

### Confirmation

```tsx
const confirmed = await modal.open(Confirm, {
  message: 'Are you sure you want to delete this item?',
});

if (confirmed) {
  deleteItem();
}
```

### AbortController support

```tsx
import { MODAL_ABORTED } from '@reactleaf/modal';

const controller = new AbortController();

setTimeout(() => controller.abort(), 5000);

const result = await modal.open(
  Alert,
  { message: 'This will auto-close...' },
  { abortController: controller },
);

if (result === MODAL_ABORTED) {
  console.log('Modal was aborted');
}
```

### Outside React components

```ts
document.addEventListener('error', () => {
  modal.open(Alert, { message: 'An error occurred!' });
});
```

## Animation

The layer becomes visible one frame after mount, so opening animations can use the `.visible` class.
For closing animations, set `closeDelay` to match your transition duration.

```css
.modal-layer {
  opacity: 0;
  transition: opacity 0.3s;
}

.modal-layer.visible {
  opacity: 1;
}
```

Inside your modal component, use `visible` from `useModalInstance()`.

```tsx
const { visible } = useModalInstance();
```

## Built-in behaviors

- Pressing `Escape` closes the top modal
- Browser back closes the top modal
- Outside click closes the modal when `closeOnOutsideClick` is enabled
- Multiple modals stack in open order

## Styling

You can import the default stylesheet:

```js
import '@reactleaf/modal/style.css';
```

Main selectors:

- `.modal-layer`
- `.modal-layer.visible`
- `.modal-shade`
- `.modal-shade.visible`

```css
.modal-layer {
  opacity: 0;
  transition: opacity 0.3s;
}

.modal-shade {
  background-color: rgba(0, 0, 0, 0.5);
}

.modal-layer.visible {
  opacity: 1;
}
```

## Working examples

See the examples in [`docs/app`](./docs/app).
