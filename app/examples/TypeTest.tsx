import { useModalInstance } from '../context';
import { ModalManager } from '../index';

// 빈 props 컴포넌트 (void props) - 명시적 타입 지정
const EmptyPropsModal = () => {
  const { closeSelf } = useModalInstance();
  return <div onClick={() => closeSelf()}>Empty Props Modal</div>;
};

// 필수 props 컴포넌트 - 명시적 타입 지정
const RequiredPropsModal = (props: { message: string }) => {
  const { closeSelf } = useModalInstance();
  return <div onClick={() => closeSelf()}>{props.message}</div>;
};

// 선택적 props 컴포넌트  
function OptionalPropsModal(props: { message?: string }) {
  const { closeSelf } = useModalInstance();
  return <div onClick={() => closeSelf()}>{props.message || 'No message'}</div>;
}

// 타입 테스트 함수
export function testTypes() {
  const modal = new ModalManager();

  // ✅ 이것들은 에러가 나지 않아야 함
  modal.open(EmptyPropsModal);
  modal.open(OptionalPropsModal);
  modal.open(OptionalPropsModal, { message: 'Hello' });
  modal.open(RequiredPropsModal, { message: 'Hello' });

  // ❌ 이것은 에러가 나야 함 - 필수 props를 전달하지 않음
  // @ts-expect-error 필수 props를 전달하지 않음
  modal.open(RequiredPropsModal);
}