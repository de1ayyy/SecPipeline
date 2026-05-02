document.addEventListener("DOMContentLoaded", () => {
    // Flash Toast 자동 Dismiss
    const toasts = document.querySelectorAll('.toast');
    toasts.forEach(toast => {
        setTimeout(() => {
            toast.classList.add('show');
            setTimeout(() => {
                toast.classList.remove('show');
            }, 3000); // 3초 후 숨김
        }, 100);
    });
});
