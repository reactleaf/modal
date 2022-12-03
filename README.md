# @reactleaf/modal

[![npm version](https://badge.fury.io/js/@reactleaf%2Fmodal.svg)](https://badge.fury.io/js/@reactleaf%2Fmodal)

React modal with context and hooks

- [한국어](./README-ko.md)

## Concept

This library uses HoC to provide context and container, and provide hooks to open and close modal.
Main Concept of this library is providing **type-safe** method to open **any** modals on **anywhere** of your code.
Second object ismodal code will not be loaded until modal is opened: Reduce bundle size. This is important for faster web.

## Installation and Usage

```sh
npm install @reactleaf/modal
# or
yarn add @reactleaf/modal
```

### Modal Register

At first, you should make a your own modal register.
we are using dynamic import, to reduce initial loading size.
Any modals registered will be loaded on when modal is called to open, not bundled on app/page code.

```typescript
const register = {
  Alert: () => import("./Alert"),
  Confirm: () => import("./Confirm"),
};

export default register;
```

But in some cases, you may need to pre-load some modals before they are opened. Then see [below](#preload-modals)

### Modal Context

Now provide this register to your app.
This Provider will provide modalContext to your app, and also modal container, that modals will be rendered.
**How Simple!**

```tsx
import { ModalProvider } from "@reactleaf/modal";
import register from "./modals/register";

function App() {
  ...
  return <ModalProvider register={register}>{...}</ModalProvider>
}
```

### useModal Hook

You cannot import useModal directly. call `createModalHook()` to make the hook.

It is intended to inject type of register, to check modal type and props are properly provided.

```typescript
// useModal.ts
import { createModalHook } from "@reactleaf/modal";
import register from "./register";

export const useModal = createModalHook<typeof register>();
```

`openModal` will check modal type

```typescript
import { useModal } from './modals/useModal'

const { openModal } = useModal()
function openAlert() {
  openModal({ type: 'Confrim', props: { title: 'Hello', message: 'Wow' } })
              ^^^^       ^^
              type 'Confrim' is not assignable to type 'Alert' | 'Confirm'
}
```

`openModal` will check props type for the matching type

```typescript
import { useModal } from './modals/useModal'

const { openModal } = useModal()
function openAlert() {
  openModal({ type: 'Alert', props: { title: 'Hello' } })
                             ^^^^^
                             property 'message' is missing
}
```

### Preload modals

We use dynamic import to load modals when modal opens. It makes code-splitting easier, and initial bundle size smaller.
But sometimes, you may need synchronous imports, for instantly open modals.
It might for mounting animation, or modal has large dependencies to load on open.
Then, you can preload modals before user click the button that opens modal.
This calls `import()` from your register, to ensure `openModal()` runs synchronously.

```typescript
import { createModalPreloader } from "@reactleaf/modal";
const preloadModal = createModalPreloader(register);

// when component mounted, load relative modals.
useEffect(() => {
  preloadModal("Alert", "Confirm");
}, []);
```

## Props

#### <ModalProvider />

- `register` - your modal register
- `defaultOverlayOptions` - Set default value of overlayOptions.

How to use `defaultOverlayOptions`:

```tsx
type defaultOverlayOptions = {
  [key in keyof Register]?: Partial<OverlayOptions>;
} & { default?: Partial<OverlayOptions> };

// just use as default. default values are decribed on openModal()'s description.
return (
  <ModalProvider register={register}>
    <App />
  </ModalProvider>
);
// apply to every modal
return (
  <ModalProvider
    register={register}
    defaultOverlayOptions={{ default: { closeDelay: 300 } }}
  >
    <App />
  </ModalProvider>
);
// or apply to specific modal
return (
  <ModalProvider
    register={register}
    defaultOverlayOptions={{ MyAnimatingModal: { closeDelay: 500 } }}
  >
    <App />
  </ModalProvider>
);

// or both. surely, settings on specific modal will override default
return (
  <ModalProvider
    register={register}
    defaultOverlayOptions={{
      default: { closeDelay: 300 },
      MyAnimatingModal: { closeDelay: 500 },
    }}
  >
    <App />
  </ModalProvider>
);
```

#### createModalHook<Register>()

```typescript
const useModal = createModalHook<typeof yourModalRegister>();
const { openModal, closeModal, closeAll, openedModals } = useModal();
```

#### openModal(payload)

open selected typed modal with given props

```typescript
interface OpenModalPayload {
  type: keyof Register;
  props?: Props;
  overlayOptions?: OverlayOptions;
  events?: ModalEvents;
}

function openModal(payload: OpenModalPayload);
```

- `Props` - Matching Props as type. if `type === "Alert"`, props should be `React.ComponentProps<Alert>`
- `OverlayOptions`

```typescript
export interface OverlayOptions {
  className?: string; // to distinguish each overlay element: make different animation per modal.
  closeDelay?: number; // default: 0, as ms. this will make modal close(unmount) delayed. Useful if you want to add closing animation.
  closeOnOverlayClick?: boolean; // default: true
  dim?: boolean; // default: true
  preventScroll?: boolean; // default: true, when modal is opened, body scroll is blocked.
}
```

- `ModalEvents`

```typescript
export interface ModalEvents {
  onClose?: () => void; // a callback that called on modal closed.
}
```

- `returns` - It returns unique "ID" of opened modal. You can use it to close that specific modal.

#### closeModal({ id: string })

Close specifig modal. This action requires the "ID" that `openModal()` returns.

#### closeAll()

Close all opened modals

#### openedModals: OpenModalPayload[]

Returns opened modals. It is an array of the OpenModalPayload, so you can check any modal is opened, or some type of modal is opened or not.

## How to add opening / closing animation?

For animation, modal opening is delayed for a frame.
You can add Overlay styles like this.

```css
.modal-overlay {
  opacity: 0;
  transition: opacity 0.3s;
}
.modal-overlay.visible {
  opacity: 1;
}
```

and also in your custom modal, has `visible` props. See [below](#BasicModalProps) to know more about visible props.
Be sure that `closeDelay` option is properly set, if you want to animate on closing.
See [Slideup Example](https://github.com/reactleaf/modal/tree/main/examples/with-cra/src/modals/Slideup).

```css
.slideup {
  transition: transform 500ms;
  transform: translateY(100%);
}

.slideup.visible {
  transform: translateY(0);
}
```

## How to close opened modal?

Recommended way to close modal is closing by modal itself. see more on [below](#BasicModalProps)

But there are some other ways.

- `const id = openModal(); closeModal({ id });`
- `closeAll()`
- `closeOnOverlayClick: true` - if user click outside of modal (may be darken with dim color), top modal is closed.

## Can I open modals without hooks?

`@reactleaf/modal` recieves message, so you can use `window.postMessage()` to open modal. This is useful when you use third-party state control libraries, like redux-saga.

But be careful: `postMessage` is NOT GOOD for type checking, and cannot message functions. If your modal has props like `onConfirm`, `postMessage` cannot handle the props.

postMessage only can receive `openModal` payload. CANNOT CLOSE modals.

```typescript
window.postMessage({
  to: "@reactleaf/modal",
  payload: {
    type: "Example",
    props: { warning: "postMessage only can send SERIALIZABLE values." },
  },
});
```

### BasicModalProps

When modal is opened by `openModal`, 2 more props are injected to your modal.

- `close(): void`
- `visible: boolean`

So, When implementing modal, you can consider `close` props like this.

```tsx
import { BasicModalProps } from "@reactleaf/modal";

interface Props extends BasicModalProps {
  title: string;
  message: string;
}
const Alert = ({
  title,
  message,
  visible, // injected by modal
  close, // injected by modal
}: Props) => {
  return (
    <div className={cx("alert", "modal", { visible })}>
      <p className="modal-title">{title}</p>
      <div className="modal-body">
        <p className="message">{message}</p>
      </div>
      <div className="modal-buttons">
        <button onClick={close}>Close</button>
      </div>
    </div>
  );
};
```

## Styling

There is [default style file](https://github.com/reactleaf/modal/blob/main/style.css)
You can import this

```javascript
import "@reactleaf/modal/style.css";
```

or make or override your own styles.

- `.modal-overlay` - Each modal's overlay element.
- `.modal-overlay.dim` - When you applied `overlayOption: { dim: true }`. This option is `true` by default.
- `.modal-overlay.visible` - `.visible` is attatched after a frame after mount. This is for mounting animation.

Here is some basic overriding example you can use

```css
.modal-overlay {
  opacity: 0;
  transition: opacity 0.3s;
}
.modal-overlay.dim {
  background-color: rgba(0, 0, 0, 0.5);
}
.modal-overlay.visible {
  opacity: 1;
}
```

Also, OverlayOptions has `className` parameter, to distinguish each overlay.
You can add className to each modal, so every overlay element can have different animation or dim colors.

## Working Examples

See more on [Examples](https://github.com/reactleaf/modal/tree/main/examples)
