import toast from 'react-hot-toast';

export const toastSuccess = (msg: string) => {
  toast.success(msg, { duration: 4500 });
};

export const toastError = (msg: string) => {
  toast.error(msg, { duration: 6000 });
};

export const toastLoading = (msg: string) => {
  return toast.loading(msg);
};

export const toastDismiss = (id?: string) => {
  if (id) toast.dismiss(id);
  else toast.dismiss();
};
