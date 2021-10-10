# @reactleaf/react-modal

React modal with context and hooks

## Concept

This library uses HoC to provide context and container, and provide hooks to open and close modal.
Main Concept of this library is providing **type-safe** method to open specific modals on anywhere of your code.

More details are on below

## Installation and Usage

```sh
npm install @reactleaf/react-modal
# or
yarn add @reactleaf/react-modal
```

### Modal Register

At first, you should make a your own modal register.
we are using dynamic import, to reduce initial loading size.
Any modals registered will be loaded on when modal is called to open, not on initialize sequence.

```typescript
const register = {
  Alert: () => import("./Alert"),
  Confirm: () => import("./Confirm"),
};

export default register;
```

### Modal Context

Now provide this register to your app.
This HoC will provide modalContext to your app, and also modal container, that modals will be rendered.
So Simple!

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
              ^^^^
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
