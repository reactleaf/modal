const modalRegister = {
  Alert: () => import("./Alert"),
  Confirm: () => import("./Confirm"),
};

export type Modals = typeof modalRegister;
