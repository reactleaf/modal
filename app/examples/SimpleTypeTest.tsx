import { ModalManager } from '../index';
import { ModalComponent } from '../types';
import { useModalInstance } from '../context';

// 정확히 void props인 컴포넌트
const VoidModal: ModalComponent<void> = () => {
  const { closeSelf } = useModalInstance();
  return <div onClick={() => closeSelf()}>Void Modal</div>;
};

// 정확히 undefined props인 컴포넌트  
const UndefinedModal: ModalComponent<undefined> = () => {
  const { closeSelf } = useModalInstance();
  return <div onClick={() => closeSelf()}>Undefined Modal</div>;
};

// 필수 props 컴포넌트
const RequiredModal: ModalComponent<{ msg: string }> = ({ msg }) => {
  const { closeSelf } = useModalInstance();
  return <div onClick={() => closeSelf()}>{msg}</div>;
};

export function simpleTest() {
  const modal = new ModalManager();

  modal.open(VoidModal);
  modal.open(UndefinedModal);
  modal.open(RequiredModal, { msg: 'test' });
  
  // @ts-expect-error 필수 props를 전달하지 않음
  modal.open(RequiredModal);
}