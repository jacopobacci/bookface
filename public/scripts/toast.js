const toastTimeOut = (selector) => {
  const toastError = document.querySelector(selector);
  setTimeout(() => {
    toastError.style.opacity = '0';
  }, 4500);
  setTimeout(() => {
    toastError.style.display = 'none';
  }, 5000);
};

toastTimeOut('.success-msg');
toastTimeOut('.error-msg');
