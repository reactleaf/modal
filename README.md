# @reactleaf/react-modal

React modal with context and hooks

- [한국어](./README-ko.md)

## Concept

This library uses HoC to provide context and container, and provide hooks to open and close modal.
Main Concept of this library is providing **type-safe** method to open **any** modals on **anywhere** of your code.
Second object ismodal code will not be loaded until modal is opened: Reduce bundle size. This is important for faster web.

## Installation and Usage

```sh
npm install @reactleaf/react-modal
# or
yarn add @reactleaf/react-modal
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
This HoC will provide modalContext to your app, and also modal container, that modals will be rendered.
**How Simple!**

```typescript
import { withModal } from "@reactleaf/react-modal";
import register from "./modals/register";

function App() {
  ...
}

export default withModal(register, App);
```

### useModal Hook

To open modal, you should use useModal hook.
for **type-safe** of your code, do not use useModal directly.

#### Don't

If you are non-typescript user, it's okay to use this way.

```typescript
import { useModal } from "@reactleaf/react-modal";

const { openModal } = useModal();
function openAlert() {
  // openModal cannot check types.
  openModal({ type: "Alert", props: { title: "Hello" } });
}
```

#### Recommended Way

With this way, you can check type and props are properly provided.

```typescript
// useModal.ts
import { createModalHook } from "@reactleaf/react-modal";
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
import { createModalPreloader } from "@reactleaf/react-modal";
const preloadModal = createModalPreloader(register);

// when component mounted, load relative modals.
useEffect(() => {
  preloadModal("Alert", "Confirm");
}, []);
```

## Props

#### withModal(register, App)

- `register` - your modal register
- `App` - your App
- `returns` - Higher ordered App

#### createModalHook<Register>()

```typescript
const useModal = createModalHook<typeof yourModalRegister>();
```

#### useModal()

```typescript
const { openModal, closeAll } = useModal();
```

#### openModal(payload)

open selected typed modal with given props

```typescript
function openModal(payload: {
  type: keyof Register;
  props: Props;
  overlayOptions?: OverlayOptions;
});
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

#### closeAll()

close all opened modals

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
See [Slideup Example](https://github.com/reactleaf/react-modal/tree/main/examples/with-cra/src/modals/Slideup).

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

Modal can only closed by modal itself. see more on [below](#BasicModalProps)

But there are 2 exceptions.

- `closeAll()`
- `closeOnOverlayClick: true` - if user click outside of modal (may be darken with dim color), top modal is closed.

### BasicModalProps

When modal is opened by `openModal`, 2 more props are injected to your modal.

- `close(): void`
- `visible: boolean`

So, When implementing modal, you can consider `close` props like this.

```tsx
import { BasicModalProps } from "@reactleaf/react-modal";

interface Props extends BasicModalProps {
  title: string;
  message: string;
}
const Alert = ({
  title,
  message,
  visible, // injected by react-modal
  close, // injected by react-modal
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

There is [default style file](https://github.com/reactleaf/react-modal/blob/main/style.css)
You can import this

```javascript
import "@reactleaf/react-modal/style.css";
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

See more on [Examples](https://github.com/reactleaf/react-modal/tree/main/examples)
