# @reactleaf/react-modal

[![npm version](https://badge.fury.io/js/@reactleaf%2Freact-modal.svg)](https://badge.fury.io/js/@reactleaf%2Freact-modal)

컨텍스트와 훅을 사용하는 리액트 모달 라이브러리

## 목적

이 라이브러리는 고차 컴포넌트를 사용해 컨텍스트와 모달 컨테이너를 제공합니다. 또한 모달을 열고 닫는 데 필요한 함수를 훅을 통해 제공합니다.
주된 목적은 **어떤** 모달이든 당신의 코드 **어디서든** 열 수 있는 **타입-세이프**한 방식을 제공하는 것입니다.
거기에 더해, 당신이 작성한 모달 코드가 모달이 열리기 전까지는 로드되지 않는 목표가 있습니다: 번들 사이즈를 줄이기 위한 것이죠.

## 설치 및 사용

```sh
npm install @reactleaf/react-modal
# 또는
yarn add @reactleaf/react-modal
```

### 모달 레지스터

이 라이브러리를 사용하기 위해서는 우선, 당신만의 모달 레지스터를 만들어야 합니다.
초기 로딩에 필요한 파일을 줄이기 위해, 동적 import 를 사용합니다.
레지스터에 등록된 모든 모달은 `openModal` 호출로 열릴 때 코드를 불러옵니다. app이나 page 코드에 번들링되지 않습니다.

```typescript
const register = {
  Alert: () => import("./Alert"),
  Confirm: () => import("./Confirm"),
};

export default register;
```

하지만 특수한 경우에는 모달을 열기 전에 미리 로드시켜두는 것이 유리할 수 있습니다. 그런 경우, [아래](#preload-modals)를 확인해주세요.

### 컨텍스트 사용하기

이제 만들어둔 레지스터를 당신의 앱에 넣어주세요.
react-modal은 이를 위해 `withModal`이란 이름의 고차 컴포넌트를 제공합니다. 이 컴포넌트는 모달 컨텍스트와 모달이 렌더링 될 모달 컨테이너를 한 번에 제공합니다.
**얼마나 간단한가요!**

```typescript
import { withModal } from "@reactleaf/react-modal";
import register from "./modals/register";

function App() {
  ...
}

export default withModal(register)(App);
```

### useModal 훅

모달을 열기 위해서는, `useModal` 훅을 사용해야 합니다.
코드의 **타입-세이프**함을 유지하기 위해, `useModal`을 직접 import하지 마세요.

#### 하지 마세요

타입스크립트를 사용하지 않는다면, 이 방식을 사용해도 큰 차이가 없습니다.

```typescript
import { useModal } from "@reactleaf/react-modal";

const { openModal } = useModal();
function openAlert() {
  // openModal cannot check types.
  openModal({ type: "Alert", props: { title: "Hello" } });
}
```

#### 추천하는 방법

아래 방식을 사용하면, 모달의 type과 props가 서로 알맞게 입력되었는지 타입스크립트를 통해 체크할 수 있습니다.

```typescript
// useModal.ts
import { createModalHook } from "@reactleaf/react-modal";
import register from "./register";

export const useModal = createModalHook<typeof register>();
```

이렇게 생성된 `openModal` 훅은 당신이 register에 등록한 모달 type을 제대로 지정했는지 체크합니다.

```typescript
import { useModal } from './modals/useModal'

const { openModal } = useModal()
function openAlert() {
  openModal({ type: 'Confrim', props: { title: 'Hello', message: 'Wow' } })
              ^^^^       ^^
              type 'Confrim' is not assignable to type 'Alert' | 'Confirm'
}
```

또한 `openModal` 훅은 적절한 타입에 맞는 적절한 props를 입력했는지 체크할 수 있습니다.

```typescript
import { useModal } from './modals/useModal'

const { openModal } = useModal()
function openAlert() {
  openModal({ type: 'Alert', props: { title: 'Hello' } })
                             ^^^^^
                             property 'message' is missing
}
```

### 모달 미리 불러오기

`react-modal`은 모달을 열 때, dynamic import를 통해 모달을 불러옵니다. 이 방식을 통해 code-splitting이 쉬워지고, 초기 번들 사이즈도 줄일 수 있습니다.
하지만 어떤 경우에는, 모달 코드가 페이지나 컴포넌트가 로딩될 시점에 함께 로드 되어있어야 할 수도 있습니다.
가령 모달이 열리는 애니메이션을 넣은 경우, 혹은 모달이나 모달이 의존하는 라이브러리가 너무 커서 불러오는 데에 시간이 좀 걸리는 경우, 등이 있겠죠.
그런 경우, 유저가 버튼을 클릭해 모달을 열기 전에, 모달 코드를 미리 불러와둘 수 있습니다.
`preloadModal`을 사용하면, 레지스터에 등록된 `import()` 구문을 미리 실행해두어, `openModal()` 실행 시 코드를 불러오는데에 걸리는 시간을 없앱니다.

```typescript
import { createModalPreloader } from "@reactleaf/react-modal";
const preloadModal = createModalPreloader(register);

// 이 컴포넌트가 불러와졌을 때, 컴포넌트에서 사용할 모달을 미리 불러옵니다.
useEffect(() => {
  preloadModal("Alert", "Confirm");
}, []);
```

## Props

#### withModal(register)(App)

- `register` - 위에서 만든 레지스터를 넣습니다.
- `App` - 당신의 앱 컴포넌트입니다.
- `returns` - 고차 컴포넌트로 감싸진 컴포넌트를 반환합니다.

#### createModalHook<Register>()

```typescript
const useModal = createModalHook<typeof yourModalRegister>();
```

#### useModal()

```typescript
const { openModal, closeAll } = useModal();
```

#### openModal(payload)

지정된 타입의 모달을 열고, 주어진 props를 모달에 전달합니다.

```typescript
function openModal(payload: {
  type: keyof Register;
  props?: Props;
  overlayOptions?: OverlayOptions;
});
```

- `Props` - type에 맞는 props를 제공합니다. 만약 `type === "Alert"` 이라면, props는 `React.ComponentProps<Alert>` 타입의 값이어야 합니다.
- `OverlayOptions`

```typescript
export interface OverlayOptions {
  className?: string; // 만약 서로 다른 모달을 구분하고 싶다면: 대개 모달마다 다른 애니메이션을 주고 싶다면, className을 통해 구분할 수 있습니다.
  closeDelay?: number; // 기본값은 0 입니다. ms 단위를 사용합니다. 이 옵션을 설정할 경우, close()가 불린 뒤 모달이 실제로 unmount 되기까지 지연이 생깁니다. 모달을 닫는 애니메이션 같은 걸 구현할 때 굉장히 유용합니다.
  closeOnOverlayClick?: boolean; // 기본값은 true 입니다. 모달 바깥, dim 영역을 클릭할 때 모달을 닫습니다.
  dim?: boolean; // 기본값은 true 입니다. 오버레이 요소에 .dim 클래스를 포함합니다. 기본으로 제공되는 css 스타일을 사용한다면, 모달이 열렸을 때 모달 바깥이 어둡게 가려집니다.
  preventScroll?: boolean; // 기본값은 true 입니다. 모달이 열렸을 때, body 의 스크롤을 막습니다.
}
```

- `returns` - 방금 열었던 모달의 유니크한 "ID"를 반환합니다. 이 아이디를 closeModal에 전달하여, 특정 모달을 지정해서 닫을 수 있습니다.

#### closeAll()

모든 열려있는 모달을 닫습니다.

## 모달이 열리고 닫히는 애니메이션을 넣으려면 어떻게 해야 하나요?

애니메이션이 돌아가게 하기 위해, 모달은 사실 `openModal()` 실행 시점보다 한 프레임 뒤늦게 열립니다.
그 덕분에, 오버레이에 아래와 같은 스타일을 줄 수 있습니다.

```css
.modal-overlay {
  opacity: 0;
  transition: opacity 0.3s;
}
.modal-overlay.visible {
  opacity: 1;
}
```

당신만의 커스텀 모달을 구현할 때에는, `visible` 속성을 활용하세요. [아래](#BasicModalProps) 에서 visible 속성에 대해 더 자세히 알아보세요.
닫히는 애니메이션을 구현할 때엔, `closeDelay` 옵션을 제대로 설정했는지 확인하세요.
애니메이션이 동작하는 예제는 [Slideup 예제](https://github.com/reactleaf/react-modal/tree/main/examples/with-cra/src/modals/Slideup)에서 확인할 수 있습니다.

```css
.slideup {
  transition: transform 500ms;
  transform: translateY(100%);
}

.slideup.visible {
  transform: translateY(0);
}
```

## 모달을 닫는 방법

유저 경험을 위해, 웬만하면 모달은 스스로 닫는 방식으로 구현하는 것을 권장합니다. [아래](#BasicModalProps)에서 더 알아보세요.

물론 바깥에서도 닫을 수 있습니다.

- `const id = openModal(); closeModal({ id });`
- `closeAll()`
- `closeOnOverlayClick: true` - 유저가 모달 바깥(보통 어두운 색으로 가려두는)을 클릭한 경우, 가장 위에 열린 모달이 닫힙니다.

### BasicModalProps

모달이 `openModal()`에 의해 열리면, props로 전달했던 것 외에 두 가지 props가 추가로 삽입됩니다.

- `close(): void`
- `visible: boolean`

이 props를 활용하기 위해서, 다음 방식으로 구현하시기를 추천합니다.

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

## 스타일링

[기본 스타일 CSS 파일](https://github.com/reactleaf/react-modal/blob/main/style.css)을 제공하고 있습니다.
커스텀 스타일링이 필요 없으신 경우, 아래와 같이 import해서 사용할 수 있습니다.

```javascript
import "@reactleaf/react-modal/style.css";
```

혹은, 아래 클래스에 대한 스타일을 정의해, 당신만의 스타일링을 적용할 수 있습니다.

- `.modal-overlay` - 모달 오버레이 요소
- `.modal-overlay.dim` - 모달을 열 때 `overlayOption: { dim: true }` 옵션을 설정한 경우 사용할 수 있습니다. dim 옵션은 기본값이 `true`입니다.
- `.modal-overlay.visible` - `.visible` 클래스는 모달이 열리고 한 프레임 뒤에 추가됩니다. 모달의 열리는 애니메이션을 적용할 경우, 이 셀렉터를 사용하세요.

아래 예제와 같은 방식으로 당신만의 스타일링을 정의할 수 있습니다.

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

`OverlayOptions`에는 `className` 옵션도 있습니다. 열리는 각각의 모달을 구분하고, 서로 다른 애니메이션이나 dim 색상을 적용하기 위해 사용할 수 있습니다.

## 동작하는 예제

[예제 폴더](https://github.com/reactleaf/react-modal/tree/main/examples)에서 확인하세요.
