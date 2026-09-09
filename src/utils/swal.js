import Swal from 'sweetalert2';

/**
 * Universal SweetAlert confirmation dialog
 * Returns a Promise that resolves to true if confirmed, false otherwise.
 */
export const confirmDialog = async ({
  title = 'Are you sure?',
  text = '',
  html = '',
  icon = 'warning',
  confirmButtonText = 'Yes, Proceed',
  cancelButtonText = 'Cancel',
  confirmButtonColor = '#dc2626',
  cancelButtonColor = '#64748b',
  reverseButtons = true,
  focusCancel = true,
} = {}) => {
  const options = {
    title,
    icon,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    confirmButtonColor,
    cancelButtonColor,
    reverseButtons,
    focusCancel,
    customClass: {
      container: 'swal2-topmost-container',
      popup: 'swal2-custom-popup',
      confirmButton: 'swal2-custom-confirm',
      cancelButton: 'swal2-custom-cancel'
    }
  };

  if (html) {
    options.html = html;
  } else if (text) {
    options.text = text;
  }

  const result = await Swal.fire(options);
  return result.isConfirmed;
};

export default Swal;
