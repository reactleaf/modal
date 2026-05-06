# Migration to v2.0 Guide

This guide helps you migrate from v1.x to v2.0 of `@reactleaf/modal`, which now uses **direct component imports**, a **user-owned `ModalManager` instance**, and **context-based modal state**.

## What's New in v2.0

### Major improvement: Fast Refresh friendly architecture

The new context-based modal state removes the old prop injection approach that interfered with Fast Refresh.

### Key improvements

- Direct component API instead of string modal names
- Promise-based results with `modal.open(...)`
- User-owned `ModalManager` for custom control and inspection
- `useModalInstance()` for `closeSelf` and `visible`
- Cleaner TypeScript types with no `BasicModalProps`

### Breaking changes

- `register.ts` is removed
- `useModal()` and `createModalHook()` are removed
- String modal names are removed
- `BasicModalProps` is removed

Why remove string modal names?

In v1, modals were looked up by name, so the actual modal component was often not imported at the SSR render boundary. That caused problems for styling systems that rely on import-based className analysis, such as Tailwind, because the modal component source might not be visible during analysis. v2 switches to direct component usage so the modal component is imported explicitly and those class names can be analyzed correctly.

## Installation

```bash
npm install @reactleaf/modal@2
```

## Step-by-step migration

### 1. Remove register files

**Before (v1.x):**

```ts
// modals/register.ts
export const register = {
  Alert: () => import('./Alert'),
  Confirm: () => import('./Confirm'),
};
```

**After (v2.0):**

```ts
// Delete this file completely
```

### 2. Create a manager and connect it to the provider

**Before (v1.x):**

```tsx
import { ModalProvider } from '@reactleaf/modal';
import register from './modals/register';

function App() {
  return (
    <ModalProvider register={register}>
      <YourApp />
    </ModalProvider>
  );
}
```

**After (v2.0):**

```tsx
import { ModalManager, ModalProvider } from '@reactleaf/modal';

const modal = new ModalManager();

function App() {
  return (
    <ModalProvider
      manager={modal}
      defaultLayerOptions={{ closeOnOutsideClick: true }}
      rootOptions={{ preventScroll: true }}
    >
      <YourApp />
    </ModalProvider>
  );
}
```

The `modal` instance passed to `ModalProvider` must be the same instance you call later with `modal.open(...)`.

### 3. Update modal components

**Before (v1.x):**

```tsx
import { BasicModalProps } from '@reactleaf/modal';

interface AlertProps extends BasicModalProps {
  message: string;
}

export default function Alert({ message, close }: AlertProps) {
  return (
    <div>
      <p>{message}</p>
      <button onClick={close}>OK</button>
    </div>
  );
}
```

**After (v2.0):**

```tsx
import { useModalInstance } from '@reactleaf/modal';

interface AlertProps {
  message: string;
}

const Alert = ({ message }: AlertProps) => {
  const { closeSelf, visible } = useModalInstance();

  return (
    <div className={visible ? 'visible' : undefined}>
      <p>{message}</p>
      <button onClick={() => closeSelf('confirmed')}>OK</button>
    </div>
  );
};

Alert.layerOptions = {
  closeOnOutsideClick: false,
};

export default Alert;
```

### 4. Update modal calls

**Before (v1.x):**

```tsx
import { useModal } from '@reactleaf/modal';

function MyComponent() {
  const { openModal } = useModal();

  const handleShowAlert = () => {
    openModal('Alert', { message: 'Hello!' });
  };
}
```

**After (v2.0):**

```tsx
import { ModalManager } from '@reactleaf/modal';
import Alert from './modals/Alert';

const modal = new ModalManager();

async function handleShowAlert() {
  const result = await modal.open(Alert, { message: 'Hello!' });
  console.log(result); // 'confirmed'
}
```

### 5. Promise-based flows

#### Confirmation

```tsx
const confirmed = await modal.open(Confirm, {
  message: 'Are you sure you want to delete this item?',
});

if (confirmed) {
  deleteItem();
}
```

#### AbortController

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

#### Empty props modal with options only

```tsx
await modal.open(EmptyPropsModal);
await modal.open(EmptyPropsModal, null, { abortController: controller });
```

## New capabilities

### 1. Option priority

Options are merged in this order:

1. Provider layer default options
2. Component default options
3. Call-time options

```tsx
<ModalProvider
  manager={modal}
  defaultLayerOptions={{ closeOnOutsideClick: true }}
  rootOptions={{ preventScroll: true }}
>
  <App />
</ModalProvider>

Alert.layerOptions = { closeOnOutsideClick: false };

await modal.open(Alert, { message: 'Hello' }, { className: 'alert-layer' });
```

### 2. Context-based modal props

Modal components now read `closeSelf` and `visible` from `useModalInstance()`:

```tsx
const MyModal = ({ title, message }: { title: string; message: string }) => {
  const { closeSelf, visible } = useModalInstance();

  return (
    <div className={`modal ${visible ? 'visible' : ''}`}>
      <h1>{title}</h1>
      <p>{message}</p>
      <button onClick={() => closeSelf('success')}>OK</button>
    </div>
  );
};
```

### 3. Stack inspection and observation

You can inspect current stack state with `getSnapshot()`:

```ts
const opened = modal.getSnapshot();
```

For advanced cases, `subscribe()` is also available:

```ts
const unsubscribe = modal.subscribe((stack) => {
  console.log(stack.length);
});
```

### 4. Built-in keyboard and history support

- `Escape` closes the top modal
- Browser back closes the top modal
- No extra setup required

## Common migration issues

### Issue 1: Import errors

```tsx
// Old
import { useModal } from '@reactleaf/modal';

// New
import { ModalManager, ModalProvider, useModalInstance } from '@reactleaf/modal';
```

### Issue 2: `BasicModalProps` errors

```tsx
// Old
interface AlertProps extends BasicModalProps {
  message: string;
}

// New
interface AlertProps {
  message: string;
}
```

### Issue 3: Manager and provider are disconnected

If `modal.open(...)` does nothing, check that:

1. You created a `ModalManager`
2. You passed that same instance to `ModalProvider`
3. You are calling `open()` on that same instance

### Issue 4: Context errors

If you get `useModalInstance must be used within a ModalInstanceProvider`:

1. Make sure the component is opened via `modal.open(...)`
2. Make sure `ModalProvider` is mounted with the same manager instance
3. Don't call `useModalInstance()` outside modal components

## Troubleshooting

### TypeScript issues

1. Update TypeScript to a recent version
2. Remove `BasicModalProps` from your component interfaces
3. Prefer `ModalComponent<Props, Result>` when you want `modal.open(Component, props)` to infer the resolved result type
4. Use `null` as the second argument when passing options to a no-props modal

### Missing modals

1. Check that the modal component is imported correctly
2. Verify the component is exported as default if your app expects that
3. Ensure `ModalProvider` is mounted
4. Ensure provider and call sites share the same manager instance

## Additional resources

- [README](./README.md)
- [Docs Examples](./docs/app/)
- [Migration Context](./context.md)
