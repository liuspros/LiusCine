// ── LIUSCINE SHARED JS ──

// Scroll reveal
function initReveal() {
  const els = document.querySelectorAll('.reveal');
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((e, i) => {
      if (e.isIntersecting) {
        setTimeout(() => e.target.classList.add('visible'), i * 80);
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.08 });
  els.forEach(el => obs.observe(el));
}

// Genre pills
function initGenrePills() {
  document.querySelectorAll('.genre-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.genre-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
    });
  });
}

// Navbar scroll
function initNavScroll() {
  const nav = document.querySelector('.navbar');
  if (!nav) return;
  window.addEventListener('scroll', () => {
    nav.style.borderBottomColor = window.scrollY > 40
      ? 'rgba(108,0,255,0.3)'
      : 'var(--border)';
  });
}

// Toast
function showToast(msg, type = 'success') {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  toast.textContent = `${icons[type] || ''} ${msg}`;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// Copy to clipboard
function copyText(text, label = 'Copied!') {
  navigator.clipboard.writeText(text).then(() => showToast(label));
}

// Format naira
function formatNaira(amount) {
  return '₦' + Number(amount).toLocaleString('en-NG');
}

// Fake auth state (replace with Firebase)
const Auth = {
  user: null,
  isLoggedIn() { return !!localStorage.getItem('liuscine_user'); },
  getUser() {
    try { return JSON.parse(localStorage.getItem('liuscine_user')); }
    catch { return null; }
  },
  login(userData) { localStorage.setItem('liuscine_user', JSON.stringify(userData)); },
  logout() { localStorage.removeItem('liuscine_user'); window.location.href = '/pages/login.html'; }
};

// Init on load
document.addEventListener('DOMContentLoaded', () => {
  initReveal();
  initGenrePills();
  initNavScroll();
});
