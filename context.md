# Modal API 개선 논의

## 개요

현재 reactleaf/modal의 register 기반 시스템에서 Next.js Fast Refresh가 제대로 동작하지 않는 문제를 해결하고, 더 직관적이고 타입 안전한 API로 개선하기 위한 논의 내용을 정리합니다.

## 현재 문제점

### 1. Fast Refresh 비호환성
- **동적 import 캐싱**: `useState`로 모듈을 캐싱하여 업데이트된 컴포넌트가 로드되지 않음
- **register 함수 레퍼런스 고정**: `register` 객체의 importer 함수들이 동일한 레퍼런스를 유지
- **의존성 배열 한계**: `useEffect([type])`에서 같은 모달 타입이면 재실행되지 않음

### 2. 개발자 경험 (DX) 문제
- **간접적 import**: register.ts에서 관리하는 중간 레이어 필요
- **개발 불편**: Fast Refresh가 제대로 동작하지 않음

## 제안하는 해결책

### 1. 직접 컴포넌트 전달 방식

#### 현재 방식:
```typescript
// register.ts
export const register = {
  Alert: () => import('./Alert'),
};

// 사용하는 곳
const { openModal } = useModal();
openModal('Alert', { message: 'Hello' });
```

#### 개선된 방식:
```typescript
// 사용하는 곳
import Alert from './modals/Alert';

openModal(Alert, { message: 'Hello' }, options);
```

##### 추가 요구사항
- globalOptions 를 정의할 수 있어야 함
- Alert 등 모달 타입별로 옵션을 정의할 수 있어야 함

### 2. 함수형 API

#### Hook 방식의 한계:
- React 컴포넌트 외부에서 사용 불편
  - postMessage 지원하나, 타입 매칭이 동작하지 않음
- useModal()을 항상 호출해야 하는 번거로움

#### 제안하는 함수형 API:
```typescript
import { openModal, closeModal } from '@reactleaf/modal';

// 어디서든 호출 가능
openModal(Alert, { message: 'Hello' }, { closeOnOverlayClick: true });

// 비동기 함수에서도
const handleAsync = async () => {
  const confirmed = await openModal(Confirm, { message: 'Delete?' });
  if (confirmed) deleteItem();
};
```

## 유지해야 하는 기능

### 1. 모달 스택 관리
- **뒤로가기 지원**: 브라우저 뒤로가기 시 모든 모달 닫기
- **ESC 키 지원**: ESC 누를 때 최상위 모달만 선택적으로 닫기
- **다중 모달**: 여러 모달을 스택처럼 쌓아서 열 수 있어야 함

### 2. close props 자동 주입
현재 방식처럼 모달 컴포넌트에 `close` 함수를 자동으로 주입하는 기능 유지:

```typescript
function Alert({ message, closeSelf }) {
  return (
    <div>
      <p>{message}</p>
      <button onClick={() => closeSelf('confirmed')}>닫기</button>
    </div>
  );
}
```

#### 수정 요구 사항
`close()`가 global `window.close()` 와 이름이 겹치는 문제가 있어, `closeSelf()`로 리네이밍

## 지원 불가한 기능

### 1. 코드 스플리팅 지원
- 사용하는 곳에서 import하여 번들 크기 최적화
- 대체 방식으로, Lazy loading 지원 (가능하다면)

## 구현 방향

### 1. 모듈 레벨 상태 관리
```typescript
// modalManager.ts
let modalStack: ModalState[] = [];

export const openModal = <ResultType = unknown, Result = ResultType | null | undefined>(Component, props, options): Promise<Result> => {
  return new Promise<Result>((resolve, reject) => {
    const id = generateId();
    
    const closeSelf = (result?: Result) => {
      closeModal(id);
      resolve(result);
    };
    
    // closeSelf props 자동 주입
    const enhancedComponent = React.cloneElement(
      <Component {...props} />, 
      { closeSelf }
    );
    
    // AbortController 지원
    if (options?.abortController) {
      options.abortController.signal.addEventListener('abort', () => {
        closeModal(id);
        resolve(null);
      });
    }
    
    modalStack.push({ id, component: enhancedComponent, options, resolve, reject });
  });
};
```

### 2. Promise 기반 API

#### await openModal() 지원
모달 내에서 `closeSelf(value)` 가 불리면, `const result = await openModal() // result == value`

```typescript
// 사용 예시
const confirmed = await openModal(Confirm, { 
  message: 'Delete this item?' 
});
if (confirmed) deleteItem();

const formData = await openModal(UserForm, { userId: 123 });
console.log(formData); // { name: 'John', email: 'john@...' }
```

#### 특정 모달을 강제로 닫기
기존에는 id를 리턴하여 id를 통해 특정 모달을 닫을 수 있었으나, Promise 방식에서는 AbortController 활용:

```typescript
const controller = new AbortController();
const promise = openModal(Component, props, { 
  abortController: controller 
});

// 다른 곳에서 중단
controller.abort();

// 결과 처리 : abort 된 경우 null 반환. 빈 close()가 undefined를 반환하는 것과 구분할 수 있음.
const result = await promise;
if (result === null) {
  // 중단된 경우 처리
}
```

### 3. 옵션 시스템

#### Provider 레벨 기본 옵션
```typescript
<ModalProvider 
  defaultOverlayOptions={{ 
    closeOnOverlayClick: true,
    dim: true,
    preventScroll: true 
  }}
>
  <App />
</ModalProvider>
```

#### 컴포넌트별 기본 옵션 (타입 안전)
```typescript
// Alert/index.tsx
function Alert({ message, closeSelf }) { 
  // ... 
}

Alert.layerOptions = {
  closeOnOverlayClick: false,
  dim: false
};

export default Alert;
```

#### 호출 시점 옵션 (최종 우선순위)
```typescript
openModal(Alert, props, { 
  closeOnOverlayClick: true  // 컴포넌트 기본값 override
});
```

**옵션 우선순위**: 호출 시점 > 컴포넌트 기본값 > Provider 기본값

### 4. 뒤로가기 동작
- **최상위 모달만 닫기**: 모달을 하나의 페이지로 간주하여 Android 물리 백버튼처럼 동작
- 모든 모달을 닫지 않고 스택의 최상위만 제거

## 예상되는 변경사항

### 1. ModalProvider 대폭 간소화
```typescript
// 현재
<ModalProvider register={register} defaultOverlayOptions={...}>

// 새 구조  
<ModalProvider defaultOverlayOptions={...}>
```

**주요 변경점:**
- `register` prop 완전 제거
- `useModalReducer` 제거
- `modalManager.subscribe()`로 상태 구독
- Context에서 openModal 함수 제거 (전역 함수로 대체)

### 2. Container 50% 이상 코드 감소
**제거될 기능들:**
- 동적 import 로직 완전 제거
- `useState`로 module 관리 제거
- `useEffect`로 importer 호출 제거
- `OpenedModal` 컴포넌트 복잡성 대폭 감소

**새로운 Container:**
```typescript
function ModalContainer() {
  return (
    <div id="modal-root">
      {modalStack.map(modal => (
        <ModalOverlay key={modal.id} {...modal.options}>
          {modal.component} {/* 이미 closeSelf가 주입된 상태 */}
        </ModalOverlay>
      ))}
    </div>
  );
}
```

### 3. hooks.ts 파일 제거
- `createModalHook` 함수 제거
- `useModal` 훅 제거
- `createModalPreloader` 함수 제거

### 4. 새로운 파일 추가
**modalManager.ts**: 모든 모달 로직의 핵심
- 모듈 레벨 상태 관리
- openModal, closeModal 등 전역 함수들
- AbortController 지원
- Promise 기반 API

### 5. types.ts 업데이트
**제거될 타입들:**
- `Register` 인터페이스
- `Importer` 타입
- `OpenModalPayload` 등

**새로운 타입들:**
```typescript
interface ModalState {
  id: string;
  component: ReactElement;
  options: OverlayOptions;
  resolve: (value: any) => void;
  reject: (reason: any) => void;
}

interface ModalOptions extends OverlayOptions {
  abortController?: AbortController;
}
```

### 6. 기존 API 호환성
기존 register 방식도 지원할지 결정 필요:
- **완전 제거**: Breaking change, 마이그레이션 가이드 필요
