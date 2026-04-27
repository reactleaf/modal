# @reactleaf/modal

[![npm version](https://badge.fury.io/js/@reactleaf%2Fmodal.svg)](https://badge.fury.io/js/@reactleaf%2Fmodal)

코드 어디에서나 type-safe하게 모달을 열고 닫기 위한 리액트 모달 라이브러리입니다.

- [English](./README.md)
- [마이그레이션 가이드](./MIGRATION_TO_V2.md)

## 개요

`@reactleaf/modal` v2는 v1의 register 시스템과 hook factory를 제거했습니다.
이제 사용자가 `ModalManager`를 직접 생성하고, 같은 인스턴스를 `ModalProvider`에 연결한 뒤 `modal.open(...)`으로 모달을 엽니다.

## 목표

- 코드 어디에서나 원하는 모달 컴포넌트를 직접 열 수 있게 합니다.
- 모달 props와 닫힐 때 resolve되는 결과값을 type-safe하게 유지합니다.
- 각 모달은 커스텀 UI를 직접 소유하고, `ModalProvider`는 stack, shade, scroll 동작을 소유합니다.

### v2에서 바뀐 점

- `register.ts` 제거
- `useModal()` / `createModalHook()` 제거
- 문자열 기반 모달 이름 제거
- `BasicModalProps` 제거
- `modal.open(Component, props?, options?)`는 `Promise`를 반환
- 모달 내부에서는 `useModalInstance()`로 `closeSelf`, `visible` 사용

## 설치

```sh
npm install @reactleaf/modal
# 또는
yarn add @reactleaf/modal
```

## 빠른 시작

### 1. manager를 만들고 Provider에 연결하기

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

`ModalProvider`에 전달한 manager와 `modal.open(...)`을 호출하는 manager는 반드시 같은 인스턴스여야 합니다.

### 2. 모달 컴포넌트 만들기

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
      <button onClick={() => closeSelf('confirmed')}>확인</button>
    </div>
  );
}
```

### 3. 모달 열기

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

모달 제어 인스턴스를 생성합니다.

```ts
import { ModalManager } from '@reactleaf/modal';

const modal = new ModalManager();
```

### `<ModalProvider manager={...} />`

특정 manager 인스턴스의 모달 컨테이너를 렌더링합니다.

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

모달을 열고, 해당 모달이 닫힐 때 resolve되는 Promise를 반환합니다.

```ts
const confirmed = await modal.open(Confirm, {
  message: '정말 삭제할까요?',
});
```

반환값 규칙:

- `closeSelf(value)` -> `value`
- `closeSelf()` -> `undefined`
- 오버레이 클릭 / `Escape` / 브라우저 뒤로가기 -> `undefined`
- `modal.closeWithResult(id, value)` -> `value`
- `modal.close(id)` / `modal.closeTop()` / `modal.closeAll()` -> `undefined`
- `abortController.abort()` -> `null`

props 전달 규칙:

- 필수 props가 있는 모달은 두 번째 인자로 props를 전달합니다.
- props가 없거나 전부 optional인 모달은 두 번째 인자를 생략할 수 있습니다.
- props가 없는 모달에 options만 전달하고 싶다면 두 번째 인자에 `null`을 넣습니다.

```ts
await modal.open(EmptyPropsModal);
await modal.open(EmptyPropsModal, null, { abortController: controller });
```

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

가장 위의 모달을 닫고, 해당 `open()` Promise를 `undefined`로 resolve합니다.

```ts
modal.closeTop();
modal.closeTop({ historyBack: true });
```

### `modal.closeAll(options?)`

현재 열려 있는 모든 모달을 닫고, 각 `open()` Promise를 `undefined`로 resolve합니다.

```ts
modal.closeAll();
```

### `modal.hasOpenModals()`

현재 열려 있는 모달이 하나라도 있는지 반환합니다.

```ts
if (modal.hasOpenModals()) {
  console.log('모달이 열려 있습니다.');
}
```

### `modal.getSnapshot()`

현재 열려 있는 모달 스택의 읽기 전용 스냅샷을 반환합니다.

```ts
const opened = modal.getSnapshot();

if (opened.some((item) => item.Component === Alert)) {
  console.log('Alert가 이미 열려 있습니다.');
}
```

### `modal.subscribe(listener)`

스택 변화를 관찰하는 고급 API입니다.

```ts
const unsubscribe = modal.subscribe((stack) => {
  console.log('열린 모달 수:', stack.length);
});

unsubscribe();
```

### `useModalInstance()`

모달 컴포넌트 내부에서 모달 상태를 읽을 때 사용합니다.

```tsx
const { closeSelf, visible } = useModalInstance();
```

제공 값:

- `visible: boolean`
- `closeSelf(result?): Promise<void>`

## 모달 옵션

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

### 옵션 우선순위

옵션은 아래 순서로 병합됩니다.

1. Provider layer 기본값
2. 컴포넌트 기본값
3. 호출 시점 옵션

```tsx
<ModalProvider
  manager={modal}
  defaultLayerOptions={{ closeOnOutsideClick: true }}
  stackOptions={{ shade: true, preventScroll: true }}
>
  <App />
</ModalProvider>

Alert.modalOptions = {
  closeOnOutsideClick: false,
};

await modal.open(Alert, { message: 'Hello' }, { className: 'alert-layer' });
```

### 컴포넌트 기본 옵션

모달 컴포넌트 자체에 기본 옵션을 설정할 수 있습니다.

```tsx
import { ModalComponent } from '@reactleaf/modal';

type AlertProps = { message: string };

const Alert: ModalComponent<AlertProps> = ({ message }) => {
  // ...
};

Alert.modalOptions = {
  closeOnOutsideClick: false,
};
```

## Promise 기반 사용 예시

### 확인 모달

```tsx
const confirmed = await modal.open(Confirm, {
  message: '정말 삭제하시겠습니까?',
});

if (confirmed) {
  deleteItem();
}
```

### AbortController

```tsx
const controller = new AbortController();

setTimeout(() => controller.abort(), 5000);

const result = await modal.open(
  Alert,
  { message: '5초 후 자동으로 닫힙니다.' },
  { abortController: controller },
);

if (result === null) {
  console.log('모달이 abort로 닫혔습니다.');
}
```

### React 컴포넌트 밖에서 열기

```ts
document.addEventListener('error', () => {
  modal.open(Alert, { message: '에러가 발생했습니다.' });
});
```

## 애니메이션

레이어는 마운트 후 한 프레임 뒤에 `.visible` 클래스를 가지므로, 열리는 애니메이션을 쉽게 붙일 수 있습니다.
닫히는 애니메이션을 쓰려면 `closeDelay`를 transition 길이에 맞춰 설정하세요.

```css
.modal-layer {
  opacity: 0;
  transition: opacity 0.3s;
}

.modal-layer.visible {
  opacity: 1;
}
```

모달 내부에서는 `useModalInstance()`의 `visible` 값을 사용하면 됩니다.

```tsx
const { visible } = useModalInstance();
```

## 기본 동작

- `Escape` 키를 누르면 최상위 모달이 닫힙니다.
- 브라우저 뒤로가기를 누르면 최상위 모달이 닫힙니다.
- `closeOnOutsideClick`이 켜져 있으면 바깥 영역 클릭으로 닫힙니다.
- 여러 모달을 스택처럼 쌓아 열 수 있습니다.

## 스타일링

기본 스타일시트를 import해서 사용할 수 있습니다.

```js
import '@reactleaf/modal/style.css';
```

주요 셀렉터:

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

## 동작 예제

[`docs/app`](./docs/app)를 참고하세요.
