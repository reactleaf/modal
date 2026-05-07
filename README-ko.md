# @reactleaf/modal

[![npm version](https://badge.fury.io/js/@reactleaf%2Fmodal.svg)](https://badge.fury.io/js/@reactleaf%2Fmodal)

React 코드 어디에서나 모달 컴포넌트를 직접 열고, 닫힐 때의 결과를 `Promise`로 받을 수 있는 타입-세이프한 모달 라이브러리입니다.

- [English](./README.md)
- [마이그레이션 가이드](./MIGRATION_TO_V2.md)

## 개요

`@reactleaf/modal`은 코드 어디에서나 모달을 열고, 여러 모달을 중첩해서 띄울 수 있는 React 모달 매니저입니다. 이미 열린 모달 위에 확인, 입력, 경고 모달을 다시 열 수 있고, 각 모달은 열린 순서대로 stack에 쌓입니다.

### v2에서 바뀐 점

`@reactleaf/modal` v2는 v1의 register 기반 구조를 제거하고, 모달 컴포넌트를 직접 전달하는 방식으로 동작합니다.

앱에서 `ModalManager` 인스턴스를 하나 만들고, 그 인스턴스를 `ModalProvider`에 연결한 뒤, 필요한 곳에서 `modal.open(Component, props, options)`를 호출합니다. 모달 내부에서는 `useModalInstance()`로 현재 모달의 표시 상태, 자기 자신을 닫는 함수, 자기 자신을 다음 모달로 교체하는 함수를 가져옵니다.

### 해결하려던 문제들

- 문자열 이름이나 register 파일 없이 모달 컴포넌트를 직접 엽니다. SSR 과정에서 import가 파악되지 않아 스타일을 추출할 수 없던 문제를 해결합니다.
- Browser Back button을 눌렀을 때 모달이 닫히는 동작을 할 수 있도록, 기능을 추가합니다. (특히, Android 디바이스에서)

### 변경사항

- `register.ts`가 필요하지 않습니다.
- `useModal()`과 `createModalHook()`이 제거되었습니다.
- 문자열 기반 모달 이름 대신 컴포넌트를 직접 전달합니다.
- `BasicModalProps`가 제거되었습니다.
- `modal.open(Component, props?, options?)`는 모달이 닫힐 때 resolve되는 `Promise`를 반환합니다.
- 모달 컴포넌트는 `useModalInstance()`로 `visible`, `closeSelf`, `replaceSelf`를 읽습니다.

## 설치

```sh
npm install @reactleaf/modal
# 또는
yarn add @reactleaf/modal
# 또는
pnpm add @reactleaf/modal
```

기본 레이어와 dim 스타일을 사용하려면 앱 엔트리에서 스타일시트를 한 번 import합니다.

```ts
import "@reactleaf/modal/style.css";
```

## 빠른 시작

### 1. manager 인스턴스 만들기

`ModalProvider`와 `modal.open(...)` 호출부는 같은 `ModalManager` 인스턴스를 사용해야 합니다. 보통 별도 파일에서 하나만 만들고 export합니다.

```ts
// modal.ts
import { ModalManager } from "@reactleaf/modal";

export const modal = new ModalManager();
```

### 2. Provider 연결하기

만들어진 Manager를 Provider에 연결합니다.

```tsx
import { ModalProvider } from "@reactleaf/modal";
import { modal } from "./modal";

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

`ModalProvider`는 children을 그대로 렌더링하면서, 열린 모달들을 위한 레이어 컨테이너를 함께 렌더링합니다.

### 3. 모달 컴포넌트 만들기

모달은 일반 React 컴포넌트입니다. `visible`은 열림/닫힘 애니메이션 상태에 사용할 수 있고, `closeSelf(result)`는 현재 모달을 닫으면서 `modal.open(...)`의 `Promise`를 `result`로 resolve합니다. `useModalInstance<Result>()`에 전달하는 제네릭은 `closeSelf(...)`가 받을 수 있는 값의 타입을 제한하는 용도입니다.

```tsx
import { ModalComponent, useModalInstance } from "@reactleaf/modal";

export type ConfirmProps = {
  message: string;
};

export const Confirm: ModalComponent<ConfirmProps, boolean> = ({ message }) => {
  const { visible, closeSelf } = useModalInstance<boolean>();

  return (
    <div className={visible ? "confirm visible" : "confirm"}>
      <p>{message}</p>
      <button onClick={() => closeSelf(false)}>취소</button>
      <button onClick={() => closeSelf(true)}>확인</button>
    </div>
  );
};

// 이 타입 모달에만 적용되는 특정한 옵션을 설정할 수 있습니다.
Confirm.layerOptions = {
  closeOnOutsideClick: false,
};
```

### 4. 모달 열고 결과 받기

```tsx
import { modal } from "./modal";
import Confirm from "./modals/Confirm";

async function deleteItem() {
  const confirmed = await modal.open(Confirm, {
    message: "정말 삭제할까요?",
  });

  if (!confirmed) return;

  await requestDelete();
}
```

## API

### `new ModalManager()`

모달 stack을 관리하는 controller 인스턴스를 만듭니다.

```ts
import { ModalManager } from "@reactleaf/modal";

export const modal = new ModalManager();
```

한 앱에서 여러 manager를 만들 수도 있지만, 어떤 `ModalProvider`에 연결된 manager인지 호출부가 명확해야 합니다.

### `<ModalProvider manager={...} />`

특정 manager의 모달 stack을 렌더링합니다.

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

모달을 열고, 닫힐 때 resolve되는 `Promise`를 반환합니다.

```ts
const result = await modal.open(Alert, {
  message: "저장되었습니다.",
});
```

필수 props가 있는 모달은 두 번째 인자로 props를 전달해야 합니다. props가 없거나 모두 optional이면 두 번째 인자를 생략할 수 있습니다. props가 없는 모달에 options만 전달하려면 두 번째 인자에 `null`을 넣습니다.

```ts
await modal.open(EmptyModal);
await modal.open(EmptyModal, null, { closeOnOutsideClick: false });
```

모달 컴포넌트가 `ModalComponent<Props, Result>`로 타입 지정되어 있으면 `modal.open(...)`은 props와 결과 타입을 함께 추론합니다. 타입 지정되지 않은 컴포넌트에서 결과 타입을 직접 명시하고 싶을 때는 두 번째 제네릭 인자를 사용할 수 있습니다. 실제 반환 타입에는 사용자 지정 결과 타입에 더해 `ModalAborted | ModalReplaced | undefined`가 포함될 수 있습니다.

```ts
const name = await modal.open(Prompt, {
  title: "이름을 입력하세요.",
});
```

Resolve 결과는 다음과 같습니다:

- 모달 내부에서 닫는 플로우
  - `closeSelf(value)` -> `value`
  - `closeSelf()` -> `undefined`
- 모달 외부에서 닫을 때
  - 바깥 영역 클릭 / `Escape` / 브라우저 뒤로가기 -> `undefined`
  - `modal.closeWithResult(id, value)` -> `value`
  - `modal.close(id)` / `modal.closeTop()` / `modal.closeAll()` -> `undefined`
- 별도의 Abort Controller를 통해 닫는 경우
  - `abortController.abort()` -> `MODAL_ABORTED`
- `replaceSelf(...)`로 교체되는 경우
  - 교체되는 이전 모달의 `open()` Promise -> `MODAL_REPLACED`

### `modal.closeWithResult(id, result, options?)`

지정한 id의 모달을 닫고, 해당 `open()` Promise를 `result`로 resolve합니다.

```ts
modal.closeWithResult(id, { confirmed: true });
modal.closeWithResult(id, { confirmed: true }, { historyBack: true });
```

### `modal.close(id, options?)`

지정한 id의 모달을 닫고, 해당 `open()` Promise를 `undefined`로 resolve합니다.

```ts
modal.close(id);
```

### `modal.closeTop(options?)`

가장 위에 있는 모달을 닫습니다.

```ts
modal.closeTop();
modal.closeTop({ historyBack: true });
```

`closeWithResult(id, result)`, `close(id)`, `closeTop()` 등의 모달 닫기 요청 함수는
닫을 수 있는 모달이 없는 경우 아무 일도 하지 않습니다.

### `modal.closeAll(options?)`

현재 열려 있는 모든 모달을 닫습니다.

```ts
modal.closeAll();
```

### `modal.hasOpenModals()`

열려 있는 모달이 하나라도 있는지 확인합니다.

```ts
if (modal.hasOpenModals()) {
  console.log("모달이 열려 있습니다.");
}
```

### `modal.getSnapshot()`

현재 모달 stack의 읽기 전용 스냅샷을 반환합니다.

```ts
const opened = modal.getSnapshot();

if (opened.some((item) => item.Component === Confirm)) {
  console.log("Confirm이 이미 열려 있습니다.");
}
```

스냅샷 항목에는 `id`, `Component`, `props`, `options`가 포함됩니다.

### `modal.subscribe(listener)`

모달 stack 변화를 구독합니다. 일반적인 사용에서는 필요하지 않지만, 디버깅 패널이나 외부 상태 연동처럼 stack을 관찰해야 하는 경우 사용할 수 있습니다.

```ts
const unsubscribe = modal.subscribe((stack) => {
  console.log("열린 모달 수:", stack.length);
});

unsubscribe();
```

### `useModalInstance()`

모달 컴포넌트 내부에서 현재 모달 인스턴스의 상태와 닫기 함수를 읽습니다.

```tsx
const { visible, closeSelf, replaceSelf } = useModalInstance();
```

제공 값:

- `visible: boolean`
- `closeSelf(result?): Promise<void>`
- `replaceSelf(Component, props?, options?): Promise`

`useModalInstance()`는 컨텍스트를 사용하므로, `modal.open(...)`으로 열린 모달 컴포넌트 안에서만 사용할 수 있습니다.

### `replaceSelf(Component, props?, options?)`

현재 모달 인스턴스의 layer를 유지한 채 content만 새 모달로 교체합니다.

```tsx
import { useModalInstance } from "@reactleaf/modal";
import CodeModal from "./CodeModal";

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

`replaceSelf(...)`는 새 모달이 닫힐 때 그 결과로 resolve됩니다. 교체되는 이전 모달의 `open()` Promise는 `MODAL_REPLACED`로 resolve됩니다.

## 모달 옵션

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

### 옵션 우선순위

레이어 옵션은 아래 순서로 병합됩니다. 뒤의 값이 앞의 값을 덮어씁니다.

1. `ModalProvider`의 `defaultLayerOptions`
2. 모달 컴포넌트의 `layerOptions`
3. `modal.open(...)` 호출 시 전달한 options

```tsx
<ModalProvider manager={modal} defaultLayerOptions={{ closeOnOutsideClick: true, dim: true }}>
  <App />
</ModalProvider>;

Confirm.layerOptions = {
  closeOnOutsideClick: false,
};

await modal.open(Confirm, { message: "진행할까요?" }, { className: "confirm-layer" });
```

### 컴포넌트 기본 옵션

`ModalComponent<Props, Result>` 타입을 사용하면 컴포넌트에 `layerOptions`를 선언하고, `modal.open(...)`이 추론할 결과 타입을 함께 노출할 수 있습니다.

```tsx
import { ModalComponent } from "@reactleaf/modal";

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

## Promise 기반 사용 예시

### 확인 모달

```tsx
const confirmed = await modal.open(Confirm, {
  message: "정말 삭제하시겠습니까?",
});

if (confirmed) {
  await deleteItem();
}
```

### 입력 모달

```tsx
const title = await modal.open(Prompt, {
  title: "문서 제목",
  placeholder: "제목을 입력하세요.",
});

if (title) {
  await saveTitle(title);
}
```

### AbortController

```tsx
import { MODAL_ABORTED } from "@reactleaf/modal";

const controller = new AbortController();
const timer = window.setTimeout(() => controller.abort(), 3000);

const result = await modal.open(Alert, { message: "3초 후 자동으로 닫힙니다." }, { abortController: controller });

window.clearTimeout(timer);

if (result === MODAL_ABORTED) {
  console.log("모달이 abort로 닫혔습니다.");
}
```

### React 컴포넌트 밖에서 열기

manager 인스턴스를 import할 수 있는 곳이라면 React 컴포넌트 밖에서도 모달을 열 수 있습니다.

```ts
import { modal } from "./modal";
import Alert from "./modals/Alert";

window.addEventListener("error", () => {
  void modal.open(Alert, { message: "에러가 발생했습니다." });
});
```

## 애니메이션

모달 레이어는 마운트 직후 한 프레임 뒤에 `visible` 상태가 됩니다. 레이어의 dim fade는 `.modal-layer.visible`로, 모달 content의 열림/닫힘 애니메이션은 `.modal-layer[data-content-visible="true"]`로 구현할 수 있습니다.

닫힘 애니메이션이 필요하면 `closeDelay`를 CSS transition 시간과 맞춥니다.

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

.modal-layer[data-content-visible="true"] > * {
  transform: translateY(0) scale(1);
}
```

모달 내부 UI에도 같은 상태를 사용할 수 있습니다.

```tsx
const { visible } = useModalInstance();
```

## 기본 동작

- `Escape` 키를 누르면 가장 위의 모달이 닫힙니다.
- 브라우저 뒤로가기를 누르면 가장 위의 모달이 닫힙니다.
- `closeOnOutsideClick`을 `false`로 설정하지 않으면 최상위 모달의 바깥 영역 클릭으로 닫힙니다.
- 여러 모달은 열린 순서대로 stack에 쌓입니다.
- `rootOptions.preventScroll`이 `true`이면 모달이 열려 있는 동안 body scroll을 막습니다.
- `dim`이 `true`이면 해당 모달 layer에 `dim` class를 추가합니다.
- `dim`에 문자열을 전달하면 해당 문자열을 모달 layer의 custom dim class로 추가합니다.

## 스타일링

기본 스타일시트를 import해서 사용할 수 있습니다.

```ts
import "@reactleaf/modal/style.css";
```

주요 selector:

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

.modal-layer[data-content-visible="true"] > * {
  transform: translateY(0) scale(1);
}
```

레이어 자체에 커스텀 class를 추가하려면 `className` 옵션을 사용합니다.

```ts
await modal.open(Confirm, { message: "진행할까요?" }, { className: "danger-modal-layer" });
```

기본 dim class 대신 다른 class를 사용하려면 `dim`에 문자열을 전달합니다.

```ts
await modal.open(Confirm, { message: "진행할까요?" }, { dim: "danger-dim" });
```

## Smooth Sequential Flow

`replaceSelf(...)`를 사용하면 현재 모달의 layer와 dim을 유지한 채 content만 다음 모달로 교체할 수 있습니다. 이메일 입력 후 인증번호 입력으로 넘어가는 것처럼 한 흐름 안에서 단계가 바뀌는 UI에 적합합니다.

```tsx
import { type ModalComponent, useModalInstance } from "@reactleaf/modal";
import { modal } from "./modal";
import CodeModal from "./CodeModal";
import EmailModal from "./EmailModal";

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

이전 모달의 `open()` Promise는 `MODAL_REPLACED`로 resolve되고, `replaceSelf()`가 반환한 Promise는 새 모달의 결과로 resolve됩니다. replace 중에는 layer가 유지되므로 dim이 사라졌다가 다시 나타나지 않고, content만 닫힌 뒤 새 content가 열립니다.

## 동작 예제

GitHub Pages에서 실행 가능한 예제를 확인할 수 있습니다:

https://reactleaf.github.io/modal/

로컬에서 실행하려면 다음 명령어를 사용하세요.

```sh
pnpm install
pnpm dev:docs
```
