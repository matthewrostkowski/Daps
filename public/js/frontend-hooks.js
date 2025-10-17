// public/js/frontend-hooks.js
(() => {
  const API = '/api/users';

  // little toast helper (works with user.html below)
  function toast(msg) {
    const t = document.getElementById('toast');
    if (!t) return alert(msg);
    t.textContent = msg;
    t.style.display = 'block';
    setTimeout(() => (t.style.display = 'none'), 2500);
  }

  // read + write JWT
  let token = localStorage.getItem('jwt') || '';
  function setToken(t) {
    token = t || '';
    if (token) localStorage.setItem('jwt', token);
    else localStorage.removeItem('jwt');
  }

  // hook "Create account" form (user.html)
  const regForm = document.getElementById('registerForm');
  if (regForm) {
    regForm.addEventListener('submit', async (e) => {
      e.preventDefault(); // STOP default GET /user?... behavior
      const fd = new FormData(regForm);
      const firstName = (fd.get('firstName') || '').toString().trim();
      const lastName = (fd.get('lastName') || '').toString().trim();
      const email = (fd.get('email') || '').toString().trim();
      const password = (fd.get('password') || '').toString();
      const passwordConfirm = (fd.get('passwordConfirm') || '').toString();

      // client validation
      if (!email || !password || !passwordConfirm) {
        toast('Please fill all required fields.');
        return;
      }
      if (password !== passwordConfirm) {
        toast('Passwords do not match.');
        return;
      }

      // server call
      try {
        const res = await fetch(`${API}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, passwordConfirm, firstName, lastName })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          toast('We’ll email you a verification link.');
          regForm.reset();
        } else {
          toast(data.error || 'Could not create account.');
        }
      } catch (err) {
        console.error('register error', err);
        toast('Network error while registering.');
      }
    });
  }

  // hook "Sign in" form (user.html)
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(loginForm);
      const email = (fd.get('email') || '').toString().trim();
      const password = (fd.get('password') || '').toString();
      if (!email || !password) {
        toast('Email and password required.');
        return;
      }
      try {
        const res = await fetch(`${API}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          setToken(data.token);
          toast('Signed in.');
          // optional: update “me” box if present
          loadMe?.();
        } else {
          toast(data.error || 'Could not sign in.');
        }
      } catch (err) {
        console.error('login error', err);
        toast('Network error while signing in.');
      }
    });
  }

  // resend verification (optional button in user.html)
  const btnResend = document.getElementById('btnResend');
  if (btnResend) {
    btnResend.addEventListener('click', async () => {
      const email = document.getElementById('loginEmail')?.value.trim();
      if (!email) return toast('Enter your email in the Sign in form first.');
      const res = await fetch(`${API}/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (res.ok) toast('Verification email sent (if account exists).');
      else toast('Could not resend verification email.');
    });
  }

  // forgot password (optional button in user.html)
  const btnForgot = document.getElementById('btnForgot');
  if (btnForgot) {
    btnForgot.addEventListener('click', async () => {
      const email = document.getElementById('loginEmail')?.value.trim();
      if (!email) return toast('Enter your email in the Sign in form first.');
      const res = await fetch(`${API}/request-password-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (res.ok) toast('Password reset email sent (if account exists).');
      else toast('Could not send password reset email.');
    });
  }

  // simple /me debug (user.html)
  window.loadMe = async function loadMe() {
    const box = document.getElementById('meBox');
    if (!box) return;
    if (!token) {
      box.textContent = 'Not signed in.';
      return;
    }
    const res = await fetch(`${API}/me`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) box.textContent = JSON.stringify(await res.json(), null, 2);
    else box.textContent = 'Unauthorized';
  };
})();
