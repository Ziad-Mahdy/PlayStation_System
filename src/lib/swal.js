import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

// ── Base PlayStation Dark Theme Config ─────────────
const darkSwalConfig = {
  background: '#171b26',
  color: '#dfe2f1',
  backdrop: 'rgba(0, 0, 0, 0.75)',
  customClass: {
    popup: 'rounded-2xl border border-[#434655]/50 shadow-2xl p-5 sm:p-6',
    title: 'text-[#dfe2f1] text-lg sm:text-xl font-bold font-sans',
    htmlContainer: 'text-[#c3c5d8] text-sm sm:text-base font-normal mt-2 leading-relaxed',
    confirmButton: 'rounded-xl px-5 py-2.5 font-bold text-sm shadow-lg transition-transform active:scale-95 cursor-pointer mx-1.5',
    cancelButton: 'rounded-xl px-5 py-2.5 font-bold text-sm bg-[#313540] text-[#dfe2f1] hover:bg-[#3c4150] shadow-md transition-transform active:scale-95 cursor-pointer mx-1.5',
  },
  buttonsStyling: false,
};

// ── Custom Confirm Dialog (Replaces window.confirm) ──
export const showConfirm = async ({
  title = 'هل أنت متأكد؟',
  text = '',
  icon = 'warning',
  confirmButtonText = 'نعم، تأكيد',
  cancelButtonText = 'إلغاء',
  isDanger = true,
}) => {
  const result = await Swal.fire({
    ...darkSwalConfig,
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    reverseButtons: true,
    customClass: {
      ...darkSwalConfig.customClass,
      confirmButton: `${darkSwalConfig.customClass.confirmButton} ${
        isDanger
          ? 'bg-[#dd3739] hover:bg-[#b82d2f] text-white'
          : 'bg-[#2e6bff] hover:bg-[#2558d6] text-white'
      }`,
    },
  });

  return result.isConfirmed;
};

// ── Custom Alert Dialog (Replaces window.alert) ───────
export const showAlert = async ({
  title = '',
  text = '',
  icon = 'info',
  confirmButtonText = 'حسناً',
}) => {
  return Swal.fire({
    ...darkSwalConfig,
    title,
    text,
    icon,
    confirmButtonText,
    customClass: {
      ...darkSwalConfig.customClass,
      confirmButton: `${darkSwalConfig.customClass.confirmButton} bg-[#2e6bff] hover:bg-[#2558d6] text-white`,
    },
  });
};

export const showSuccessAlert = ({ title = 'تم بنجاح!', text = '', confirmButtonText = 'حسناً' }) => {
  return showAlert({ title, text, icon: 'success', confirmButtonText });
};

export const showErrorAlert = ({ title = 'تنبيه خطأ', text = '', confirmButtonText = 'حسناً' }) => {
  return showAlert({ title, text, icon: 'error', confirmButtonText });
};

export default Swal;
