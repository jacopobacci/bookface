const toastTimeOut = (selector) => {
  const toastError = document.querySelector(selector);
  setTimeout(() => {
    toastError.style.opacity = '0';
  }, 2500);
  setTimeout(() => {
    toastError.style.display = 'none';
  }, 3000);
};

toastTimeOut('.success-msg');
toastTimeOut('.error-msg');
