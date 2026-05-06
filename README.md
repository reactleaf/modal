# @reactleaf/modal

[![npm version](https://badge.fury.io/js/@reactleaf%2Fmodal.svg)](https://badge.fury.io/js/@reactleaf%2Fmodal)

A type-safe React modal library for opening modal components from anywhere in your code and receiving their results as `Promise` values when they close.

- [한국어](./README-ko.md)
- [Migration Guide](./MIGRATION_TO_V2.md)

## Overview

`@reactleaf/modal` is a React modal manager you can use to open modals from any layer of your app, including stacked modals. You can open confirmation, input, or alert modals on top of already open ones; each modal is pushed onto a stack in open order.

### What changed in v2

`@reactleaf/modal` v2 drops the v1 register-based model and works by passing modal components directly.

Create a single `ModalManager` instance, wire it to `ModalProvider`, and call `modal.open(Component, props, options)` where you need to open a UI. Inside a modal, use `useModalInstance()` to read the current layer’s display state, a function to close that layer, and a function to replace that layer with another modal component.

### Problems this aims to solve

- Open modal components directly—no string names or register files—so SSR can still see imports and extract styles where tooling expects it.
- Integrate with the browser Back button so the top modal can close when the user navigates back (especially relevant on Android devices).

### Changes at a glance

- No `register.ts` file.
- `useModal()` and `createModalHook()` are removed.
- Pass components directly instead of string modal names.
- `BasicModalProps` is removed.
- `modal.open(Component, props?, options?)` returns a `Promise` that resolves when the modal closes.
- Modal components use `useModalInstance()` for `visible`, `closeSelf`, and `replaceSelf`.

## Installation

```sh
npm install @reactleaf/modal
# or
yarn add @reactleaf/modal
# or
pnpm add @reactleaf/modal
```

Import the default stylesheet once in your app entry if you want the built-in layer and dim styles.

```ts
import '@reactleaf/modal/style.css';
```

## Quick start

### 1. Create a manager instance

`ModalProvider` and every `modal.open(...)` caller must share the same `ModalManager`. Usually you create one in a module and export it.

```ts
// modal.ts
import { ModalManager } from '@reactleaf/modal';

export const modal = new ModalManager();
```

### 2. Wire up the provider

Pass your manager into `ModalProvider`.

```tsx
import { ModalProvider } from '@reactleaf/modal';
import { modal } from './modal';

function App() {
  return (
    <ModalProvider
      manager={modal}
      defaultLayerOptions={{ closeDelay: 180, closeOnOutsideClick: true, dim: true }}
      rootOptions={{ preventScroll: true }}
    >
      <YourApp />
    </ModalProvider>
  );
}
```

`ModalProvider` renders `children` as-is and also renders a layer container for open modals.

### 3. Define a modal component

Modals are plain React components. `visible` is useful for open/close transitions; `closeSelf(result)` closes the current modal and resolves the `modal.open(...)` promise with `result`. The generic passed to `useModalInstance<Result>()` is only used to restrict the value accepted by `closeSelf(...)`.

```tsx
import { ModalComponent, useModalInstance } from '@reactleaf/modal';

export type ConfirmProps = {
  message: string;
};

export const Confirm: ModalComponent<ConfirmProps, boolean> = ({ message }) => {
  const { visible, closeSelf } = useModalInstance<boolean>();

  return (
    <div className={visible ? 'confirm visible' : 'confirm'}>
      <p>{message}</p>
      <button type="button" onClick={() => void closeSelf(false)}>
        Cancel
      </button>
      <button type="button" onClick={() => void closeSelf(true)}>
        OK
      </button>
    </div>
  );
};

// Per-component defaults (optional)
Confirm.layerOptions = {
  closeOnOutsideClick: false,
};
```

### 4. Open a modal and read the result

```tsx
import { modal } from './modal';
import Confirm from './modals/Confirm';

async function deleteItem() {
  const confirmed = await modal.open(Confirm, {
    message: 'Delete this item?',
  });

  if (!confirmed) return;

  await requestDelete();
}
```

## API

### `new ModalManager()`

Creates a controller that owns the modal stack.

```ts
import { ModalManager } from '@reactleaf/modal';

export const modal = new ModalManager();
```

You may use multiple managers in one app, but every `modal.open` call must use the manager attached to the `ModalProvider` that wraps that part of the tree.

### `<ModalProvider manager={...} />`

Renders the stack for a given manager.

```tsx
<ModalProvider
  manager={modal}
  defaultLayerOptions={{ closeDelay: 180, dim: true }}
  rootOptions={{ preventScroll: true }}
>
  <App />
</ModalProvider>
```

Props:

- `manager: ModalManager`
- `defaultLayerOptions?: Partial<LayerOptions>`
- `rootOptions?: Partial<RootOptions>`
- `children: React.ReactNode`

### `modal.open(Component, props?, options?)`

Opens a modal and returns a `Promise` that resolves when that layer closes.

```ts
const result = await modal.open(Alert, {
  message: 'Saved.',
});
```

If the modal has required props, pass them as the second argument. If it has no props or only optional props, you can omit the second argument. To pass only options for a no-props modal, use `null` as the second argument.

```ts
await modal.open(EmptyModal);
await modal.open(EmptyModal, null, { closeOnOutsideClick: false });
```

When a modal component is typed as `ModalComponent<Props, Result>`, `modal.open(...)` infers both its props and resolved value. For untyped components, use the second generic parameter when you want to spell out the resolved value. The actual resolved type can also include `ModalAborted | ModalReplaced | undefined` in addition to your result type.

```ts
const name = await modal.open(Prompt, {
  title: 'Enter a name',
});
```

What the `Promise` resolves to:

- Closed from **inside** the modal
  - `closeSelf(value)` → `value`
  - `closeSelf()` → `undefined`
- Closed from **outside**
  - Outside click (top layer) / `Escape` / browser back → `undefined`
  - `modal.closeWithResult(id, value)` → `value`
  - `modal.close(id)` / `modal.closeTop()` / `modal.closeAll()` → `undefined`
- `abortController.abort()` → `MODAL_ABORTED`
- Replaced with `replaceSelf(...)` from inside the current layer
  - The **previous** modal’s `open()` promise → `MODAL_REPLACED`

### `modal.closeWithResult(id, result, options?)`

Closes the modal with the given `id` and resolves its `open()` promise with `result`.

```ts
modal.closeWithResult(id, { confirmed: true });
modal.closeWithResult(id, { confirmed: true }, { historyBack: true });
```

### `modal.close(id, options?)`

Closes the modal with the given `id` and resolves its `open()` promise with `undefined`.

```ts
modal.close(id);
```

### `modal.closeTop(options?)`

Closes the top-most modal.

```ts
modal.closeTop();
modal.closeTop({ historyBack: true });
```

Close helpers like `closeWithResult`, `close`, and `closeTop` are no-ops when there is nothing applicable to close.

### `modal.closeAll(options?)`

Closes every open modal.

```ts
modal.closeAll();
```

### `modal.hasOpenModals()`

Returns whether at least one modal is open.

```ts
if (modal.hasOpenModals()) {
  console.log('A modal is open');
}
```

### `modal.getSnapshot()`

Returns a read-only snapshot of the current stack.

```ts
const opened = modal.getSnapshot();

if (opened.some((item) => item.Component === Confirm)) {
  console.log('Confirm is already open');
}
```

Each item includes `id`, `Component`, `props`, and `options`.

### `modal.subscribe(listener)`

Subscribes to stack changes. Uncommon in app code; useful for debug panels or external sync.

```ts
const unsubscribe = modal.subscribe((stack) => {
  console.log('open modals:', stack.length);
});

unsubscribe();
```

### `useModalInstance()`

Call inside a modal component to read state and close/replace helpers for **that** layer.

```tsx
const { visible, closeSelf, replaceSelf } = useModalInstance();
```

Exposed values:

- `visible: boolean`
- `closeSelf(result?): Promise<void>`
- `replaceSelf(Component, props?, options?): Promise`

`useModalInstance()` relies on context, so it only works inside components opened via `modal.open(...)`.

### `replaceSelf(Component, props?, options?)`

Keeps the current layer (same `id`, backdrop behavior) and swaps the rendered content to another modal component. Resolves with the **new** modal’s result when that layer eventually closes. The **previous** `open()` promise resolves to `MODAL_REPLACED`.

```tsx
import { useModalInstance } from '@reactleaf/modal';
import CodeModal from './CodeModal';

function EmailModal({ onVerified }: EmailModalProps) {
  const { replaceSelf } = useModalInstance();

  async function submitEmail(email: string) {
    await sendVerificationCode(email);

    const verified = await replaceSelf(CodeModal, {
      email,
    });

    if (verified) {
      await onVerified();
    }
  }
}
```

## Modal options

```ts
export interface LayerOptions {
  className?: string;
  closeDelay?: number;
  closeOnOutsideClick?: boolean;
  dim?: boolean | string;
}

export interface RootOptions {
  preventScroll?: boolean;
}

export interface ModalOptions extends LayerOptions {
  abortController?: AbortController;
}
```

### Option priority

Layer options merge in this order; later values override earlier ones.

1. `defaultLayerOptions` on `ModalProvider`
2. `Component.layerOptions` on the modal component
3. Options passed to `modal.open(...)`

```tsx
<ModalProvider
  manager={modal}
  defaultLayerOptions={{ closeOnOutsideClick: true, dim: true }}
>
  <App />
</ModalProvider>

Confirm.layerOptions = {
  closeOnOutsideClick: false,
};

await modal.open(Confirm, { message: 'Continue?' }, { className: 'confirm-layer' });
```

### Component-level defaults

`ModalComponent<Props, Result>` lets you attach `layerOptions` to the component and expose the result type that `modal.open(...)` should infer.

```tsx
import { ModalComponent } from '@reactleaf/modal';

type AlertProps = {
  message: string;
};

const Alert: ModalComponent<AlertProps> = ({ message }) => {
  return <div>{message}</div>;
};

Alert.layerOptions = {
  closeOnOutsideClick: false,
};
```

## Promise-based examples

### Confirmation

```tsx
const confirmed = await modal.open(Confirm, {
  message: 'Are you sure you want to delete this?',
});

if (confirmed) {
  await deleteItem();
}
```

### Prompt / input

```tsx
const title = await modal.open(Prompt, {
  title: 'Document title',
  placeholder: 'Enter a title',
});

if (title) {
  await saveTitle(title);
}
```

### `AbortController`

```tsx
import { MODAL_ABORTED } from '@reactleaf/modal';

const controller = new AbortController();
const timer = window.setTimeout(() => controller.abort(), 3000);

const result = await modal.open(
  Alert,
  { message: 'Closes automatically in 3s.' },
  { abortController: controller },
);

window.clearTimeout(timer);

if (result === MODAL_ABORTED) {
  console.log('Modal closed via abort');
}
```

### Outside React

Anywhere you can import the manager, you can open a modal even outside components.

```ts
import { modal } from './modal';
import Alert from './modals/Alert';

window.addEventListener('error', () => {
  void modal.open(Alert, { message: 'Something went wrong.' });
});
```

## Animation

A layer flips to the visible state one frame after mount. Use `.modal-layer.visible` for dim / fade, and `data-content-visible` for the inner content’s enter/exit animation.

When you need a close animation, set `closeDelay` to your CSS transition duration.

```tsx
<ModalProvider manager={modal} defaultLayerOptions={{ closeDelay: 180 }}>
  <App />
</ModalProvider>
```

```css
.modal-layer {
  opacity: 0;
  transition: opacity 180ms ease;
}

.modal-layer.visible {
  opacity: 1;
}

.modal-layer > * {
  transform: translateY(8px) scale(0.98);
  transition: transform 180ms ease;
}

.modal-layer[data-content-visible='true'] > * {
  transform: translateY(0) scale(1);
}
```

You can mirror the same `visible` flag inside the modal content.

```tsx
const { visible } = useModalInstance();
```

## Default behavior

- `Escape` closes the top modal.
- Browser back closes the top modal.
- Unless `closeOnOutsideClick` is `false`, a click on the top layer’s backdrop closes it.
- Modals stack in open order.
- When `rootOptions.preventScroll` is `true`, body scroll is locked while any modal is open.
- `dim: true` adds the `dim` class to that modal layer.
- A string `dim` value adds that string as a custom dim class on the layer.

## Styling

Import the default CSS:

```ts
import '@reactleaf/modal/style.css';
```

Useful selectors:

- `.modal-layer`
- `.modal-layer.visible`
- `.modal-layer[data-content-visible="true"]`
- `.modal-layer.dim`

```css
.modal-layer {
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-layer.dim {
  background: rgba(0, 0, 0, 0.6);
}

.modal-layer[data-content-visible='true'] > * {
  transform: translateY(0) scale(1);
}
```

Use `className` on a layer for custom wrapper classes.

```ts
await modal.open(Confirm, { message: 'Continue?' }, { className: 'danger-modal-layer' });
```

Use a string `dim` to replace the default dim class.

```ts
await modal.open(Confirm, { message: 'Continue?' }, { dim: 'danger-dim' });
```

## Smooth sequential flow

`replaceSelf(...)` is a good fit when a flow should move to the next step in the same shell—e.g. email field, then verification code—without the backdrop flashing off and on.

```tsx
import { type ModalComponent, useModalInstance } from '@reactleaf/modal';
import { modal } from './modal';
import CodeModal from './CodeModal';
import EmailModal from './EmailModal';

type EmailModalProps = {
  onVerified: () => Promise<void>;
};

function startEmailVerification() {
  void modal.open(EmailModal, {
    onVerified: completeSignIn,
  });
}

const EmailModal: ModalComponent<EmailModalProps, never> = ({ onVerified }) => {
  const { replaceSelf } = useModalInstance();

  async function submitEmail(email: string) {
    await sendVerificationCode(email);

    const verified = await replaceSelf(CodeModal, {
      email,
    });

    if (verified) {
      await onVerified();
    }
  }
};
```

The earlier `open()` promise resolves to `MODAL_REPLACED`; the promise returned from `replaceSelf()` resolves with the new modal’s result. The layer (and dim) stay mounted while only the inner content animates out and in.

## Live demo

Run the app under `[docs/app](./docs/app)`:

```sh
pnpm install
pnpm dev:docs
```
