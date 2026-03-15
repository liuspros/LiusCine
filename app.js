// ═══════════════════════════════════════════
//  LiusCine — Firebase App (app.js)
//  Shared across all pages
// ═══════════════════════════════════════════

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  increment,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// ── CONFIG ──────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyBnPxRn13A1bEo901P8O3VE5X_nKvclFpI",
  authDomain: "liuspros.firebaseapp.com",
  projectId: "liuspros",
  storageBucket: "liuspros.firebasestorage.app",
  messagingSenderId: "1072846880138",
  appId: "1:1072846880138:web:d095b5196563844e9edc73"
};

const ADMIN_EMAIL    = "liuscreatives@gmail.com";
const PAYSTACK_KEY   = "pk_live_051bcbe2840110639b09a2ef72b70fdbcf6a6220";
const MIN_WITHDRAWAL = 5000;
const PREMIUM_AMOUNT = 1000;
const REFERRAL_BONUS = 500;
const TASK_REWARD    = 100;
const CHECKIN_REWARD = 50;

// ── INIT ────────────────────────────────────
const firebaseApp   = initializeApp(firebaseConfig);
const auth          = getAuth(firebaseApp);
const db            = getFirestore(firebaseApp);
const googleProvider = new GoogleAuthProvider();

// ── SCROLL REVEAL ───────────────────────────
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

function initGenrePills() {
  document.querySelectorAll('.genre-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.genre-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
    });
  });
}

function initNavScroll() {
  const nav = document.querySelector('.navbar');
  if (!nav) return;
  window.addEventListener('scroll', () => {
    nav.style.borderBottomColor = window.scrollY > 40
      ? 'rgba(108,0,255,0.3)' : 'var(--border)';
  });
}

// ── TOAST ───────────────────────────────────
window.showToast = function(msg, type = 'success') {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  const icons = { success:'✅', error:'❌', info:'ℹ️', warning:'⚠️' };
  toast.textContent = `${icons[type]||''} ${msg}`;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
};

window.copyText = function(text, label = 'Copied!') {
  navigator.clipboard.writeText(text).then(() => showToast(label, 'success'));
};

window.formatNaira = function(amount) {
  return '₦' + Number(amount).toLocaleString('en-NG');
};

window.toggleMenu = function() {
  const menu = document.getElementById('mobileMenu');
  const btn  = document.getElementById('hamburger');
  if (menu) menu.classList.toggle('open');
  if (btn)  btn.classList.toggle('open');
};

// ── CREATE USER RECORD ──────────────────────
async function createUserRecord(user, refCode = null) {
  const userRef  = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  // ── User already exists — never credit referral again ──
  if (userSnap.exists()) {
    return false; // existing user, do nothing
  }

  // ── New user — create their record first ──
  await setDoc(userRef, {
    name:           user.displayName || user.email.split('@')[0],
    email:          user.email,
    photo:          user.photoURL || null,
    uid:            user.uid,
    balance:        0,
    referrals:      0,
    tasksCompleted: [],
    lastCheckin:    null,
    premium:        false,
    referredBy:     refCode || null,
    joinedAt:       serverTimestamp()
  });

  // ── Referral validation on registration ──
  // We only store referredBy here — ₦500 is credited ONLY when they pay premium
  if (refCode) {
    try {
      // Validate referrer exists
      const refSnap = await getDoc(doc(db, "users", refCode));
      if (!refSnap.exists()) {
        // Invalid code — clear it so no credit ever happens
        await updateDoc(userRef, { referredBy: null });
        console.log("Referral code invalid — cleared");
      }
      // Self-referral — clear it
      if (refCode === user.uid) {
        await updateDoc(userRef, { referredBy: null });
        console.log("Self-referral rejected — cleared");
      }
    } catch(e) {
      console.log("Referral validation error:", e);
    }
  }

  return true; // new user created — referral credited later on premium payment
}

// ── GOOGLE AUTH ──────────────────────────────
window.handleGoogleAuth = async function() {
  const btn = document.querySelector('.google-btn');
  try {
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Signing in...'; }
    const result  = await signInWithPopup(auth, googleProvider);
    const refCode = new URLSearchParams(window.location.search).get('ref') || null;
    await createUserRecord(result.user, refCode);
    showToast('Welcome to LiusCine! 🎬', 'success');
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);
  } catch(error) {
    showToast('Sign in failed: ' + error.message, 'error');
    if (btn) { btn.disabled = false; btn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg> Continue with Google'; }
  }
};

// ── EMAIL REGISTER ───────────────────────────
window.handleRegister = async function() {
  const name     = document.getElementById('regName')?.value?.trim();
  const email    = document.getElementById('regEmail')?.value?.trim();
  const password = document.getElementById('regPass')?.value;
  const refCode  = document.getElementById('refCode')?.value?.trim() || null;
  if (!name || !email || !password) { showToast('Please fill all required fields', 'error'); return; }
  if (password.length < 6) { showToast('Password must be at least 6 characters', 'error'); return; }
  const btn = document.querySelector('#registerPanel .btn-primary');
  try {
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating account...'; }
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await createUserRecord({ ...result.user, displayName: name }, refCode);
    showToast('Account created! Welcome to LiusCine 🎬', 'success');
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);
  } catch(error) {
    let msg = error.message;
    if (error.code === 'auth/email-already-in-use') msg = 'Email already registered. Sign in instead.';
    if (error.code === 'auth/weak-password') msg = 'Password too weak. Use 6+ characters.';
    showToast(msg, 'error');
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Create Free Account'; }
  }
};

// ── EMAIL LOGIN ──────────────────────────────
window.handleEmailLogin = async function() {
  const email    = document.querySelector('#loginPanel input[type="email"]')?.value?.trim();
  const password = document.querySelector('#loginPanel input[type="password"]')?.value;
  if (!email || !password) { showToast('Please enter email and password', 'error'); return; }
  const btn = document.querySelector('#loginPanel .btn-primary');
  try {
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Signing in...'; }
    await signInWithEmailAndPassword(auth, email, password);
    showToast('Welcome back! 🎬', 'success');
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);
  } catch(error) {
    let msg = 'Invalid email or password.';
    if (error.code === 'auth/user-not-found')    msg = 'No account found with this email.';
    if (error.code === 'auth/wrong-password')    msg = 'Incorrect password. Try again.';
    if (error.code === 'auth/invalid-credential') msg = 'Invalid email or password.';
    showToast(msg, 'error');
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Sign In'; }
  }
};

// ── SIGN OUT ─────────────────────────────────
window.handleSignOut = async function() {
  await signOut(auth);
  window.location.href = 'index.html';
};

// ── LOAD DASHBOARD ───────────────────────────
window.loadDashboard = async function() {
  onAuthStateChanged(auth, async (user) => {
    if (!user) { window.location.href = 'login.html'; return; }
    try {
      const userSnap = await getDoc(doc(db, "users", user.uid));
      if (!userSnap.exists()) { window.location.href = 'login.html'; return; }
      const u         = userSnap.data();
      const balance   = u.balance || 0;
      const referrals = u.referrals || 0;
      const name      = u.name || user.displayName || 'User';
      const isPremium = u.premium || false;

      document.querySelectorAll('.user-name').forEach(el => el.textContent = name.split(' ')[0]);
      document.querySelectorAll('.user-plan').forEach(el => {
        el.textContent = isPremium ? 'Premium' : 'Free Plan';
        el.style.color  = isPremium ? 'var(--gold)' : 'var(--muted)';
      });

      // ── PREMIUM GATE: referral + tasks ──────
      const refLockOverlay  = document.getElementById('refLockOverlay');
      const tasksLockBanner = document.getElementById('tasksLockBanner');
      const tasksList       = document.getElementById('tasksList');
      const tasksRemBadge   = document.getElementById('tasksRemainingBadge');

      if (!isPremium) {
        // Show referral lock overlay
        if (refLockOverlay) refLockOverlay.style.display = 'flex';

        // Show tasks lock banner, grey out all tasks
        if (tasksLockBanner) tasksLockBanner.style.display = 'flex';
        if (tasksRemBadge) tasksRemBadge.innerHTML = '<i class="fa-solid fa-lock"></i> Premium Only';
        if (tasksList) {
          tasksList.querySelectorAll('.task-item').forEach(item => {
            item.classList.add('locked-task');
            // Replace task buttons with locked state
            const btn = item.querySelector('.task-btn');
            if (btn && !btn.classList.contains('done')) {
              btn.innerHTML = '<i class="fa-solid fa-lock"></i> Locked';
              btn.style.background = 'var(--card2)';
              btn.style.color = 'var(--muted)';
              btn.style.cursor = 'not-allowed';
              btn.onclick = () => showToast('Upgrade to Premium to earn with tasks 👑', 'info');
            }
          });
        }
      } else {
        // Premium member — hide all locks
        if (refLockOverlay) refLockOverlay.style.display = 'none';
        if (tasksLockBanner) tasksLockBanner.style.display = 'none';
        if (tasksRemBadge) tasksRemBadge.innerHTML = '<i class="fa-solid fa-clock"></i> 3 tasks remaining';
        if (tasksList) tasksList.querySelectorAll('.task-item').forEach(item => {
          item.classList.remove('locked-task');
        });
      }

      const walletEl = document.querySelector('.wc-balance');
      if (walletEl) walletEl.textContent = formatNaira(balance);

      const subEl = document.querySelector('.wc-sub');
      if (subEl) {
        const remaining = Math.max(MIN_WITHDRAWAL - balance, 0);
        subEl.textContent = remaining > 0
          ? `${formatNaira(remaining)} more to unlock withdrawal`
          : 'You can withdraw now! 🎉';
      }

      const progress = Math.min((balance / MIN_WITHDRAWAL) * 100, 100);
      const fillEl   = document.querySelector('.wc-progress-fill');
      if (fillEl) fillEl.style.width = progress + '%';
      const pctEl    = document.querySelector('.wc-progress-label span:last-child');
      if (pctEl) pctEl.textContent = Math.round(progress) + '%';

      const refCountEl = document.querySelector('.ref-count');
      if (refCountEl) refCountEl.textContent = referrals;
      const refSubEl   = document.querySelector('.ref-sub');
      if (refSubEl) refSubEl.textContent = `Total referrals · ${formatNaira(referrals * REFERRAL_BONUS)} earned`;

      const refLinkEl = document.getElementById('refLink');
      const fullRefLink = `https://${window.location.host}/login.html?ref=${user.uid}`;
      if (refLinkEl) refLinkEl.textContent = fullRefLink;

      // Copy referral link button
      const copyBtn = document.getElementById('refCopyBtn');
      if (copyBtn) copyBtn.onclick = () => {
        if (!isPremium) { showToast('Upgrade to Premium to use referral links 👑', 'info'); return; }
        copyText(fullRefLink, 'Referral link copied! 🔗');
      };

      // Share buttons — only work for premium
      const shareWA = document.getElementById('shareWA');
      const shareIG = document.getElementById('shareIG');
      const shareTT = document.getElementById('shareTT');
      const shareText = `🎬 Watch free Nollywood movies & earn real money on LiusCine!\n\n✅ 500+ free movies\n💰 Earn ₦500 per referral\n📥 HD downloads\n\nJoin now 👇\n${fullRefLink}`;

      if (shareWA) shareWA.onclick = () => {
        if (!isPremium) { showToast('Upgrade to Premium to share referral links 👑', 'info'); return; }
        window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
      };
      if (shareIG) shareIG.onclick = () => {
        if (!isPremium) { showToast('Upgrade to Premium to share referral links 👑', 'info'); return; }
        copyText(fullRefLink, 'Link copied! Paste in your Instagram bio 📸');
      };
      if (shareTT) shareTT.onclick = () => {
        if (!isPremium) { showToast('Upgrade to Premium to share referral links 👑', 'info'); return; }
        copyText(fullRefLink, 'Link copied! Paste in your TikTok bio 🎵');
      };

      await loadTransactions(user.uid);
      await loadLeaderboard(user.uid);
      await checkDailyCheckin(user.uid, u);

      // Check premium expiry
      if (isPremium) await window.checkPremiumExpiry(user.uid);

      // Show referral earned notification if new referral since last visit
      const lastVisit = localStorage.getItem('lc_last_visit');
      const now       = Date.now();
      localStorage.setItem('lc_last_visit', now);
      if (lastVisit && isPremium) {
        const newRefQ = query(
          collection(db,'transactions'),
          where('userId','==',user.uid),
          where('type','==','referral')
        );
        const newRefSnap = await getDocs(newRefQ);
        const newRefs    = newRefSnap.docs.filter(d => {
          const t = d.data().createdAt?.toDate?.()?.getTime?.() || 0;
          return t > parseInt(lastVisit);
        });
        if (newRefs.length > 0) {
          const total = newRefs.reduce((s,d) => s + (d.data().amount||0), 0);
          window.showNotification(
            `${newRefs.length} new referral${newRefs.length > 1 ? 's' : ''}! 🎉`,
            `You earned ${formatNaira(total)} while you were away.`,
            'referral'
          );
        }
      }

    } catch(err) {
      console.error("Dashboard error:", err);
      showToast("Error loading dashboard", "error");
    }
  });
};

// ── TRANSACTIONS ─────────────────────────────
async function loadTransactions(uid) {
  try {
    const q    = query(collection(db,"transactions"), where("userId","==",uid), orderBy("createdAt","desc"), limit(5));
    const snap = await getDocs(q);
    if (snap.empty) return;

    const iconMap = {
      referral:   { icon:'fa-user-plus',            cls:'plus' },
      task:       { icon:'fa-check',                cls:'plus' },
      checkin:    { icon:'fa-calendar-day',          cls:'plus' },
      withdrawal: { icon:'fa-arrow-up-from-bracket', cls:'minus' },
      premium:    { icon:'fa-crown',                 cls:'minus' }
    };

    const rows = snap.docs.map(d => {
      const t    = d.data();
      const ico  = iconMap[t.type] || { icon:'fa-circle', cls:'plus' };
      const plus = ico.cls === 'plus';
      const date = t.createdAt?.toDate?.()?.toLocaleDateString('en-NG', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }) || 'Just now';
      return `<div class="txn-row">
        <div class="txn-dot ${ico.cls}"><i class="fa-solid ${ico.icon}"></i></div>
        <div class="txn-info">
          <div class="txn-info-title">${t.description || t.type}</div>
          <div class="txn-info-date">${date}</div>
        </div>
        <span class="txn-info-amt" style="color:var(--${plus?'green':'red'})">${plus?'+':'-'}${formatNaira(t.amount)}</span>
      </div>`;
    }).join('');

    const card   = document.querySelector('.txn-section-card');
    if (card) card.innerHTML = `<div class="section-card-header"><h3><i class="fa-solid fa-clock-rotate-left" style="color:var(--accent)"></i> Transaction History</h3><a href="#" style="font-size:12px;color:var(--accent);text-decoration:none;font-weight:600;">View All <i class="fa-solid fa-arrow-right"></i></a></div>${rows}`;
  } catch(e) { console.log("Transactions error:", e); }
}

// ── LEADERBOARD ──────────────────────────────
async function loadLeaderboard(currentUid) {
  try {
    const q    = query(collection(db,"users"), orderBy("referrals","desc"), limit(5));
    const snap = await getDocs(q);
    const medals = ['🥇','🥈','🥉'];

    const rows = snap.docs.map((d, i) => {
      const u    = d.data();
      const isMe = d.id === currentUid;
      const rank = i < 3
        ? `<div class="lb-rank top">${medals[i]}</div>`
        : `<div class="lb-rank">${i+1}</div>`;
      return `<div class="lb-row" ${isMe?'style="background:rgba(108,0,255,0.06)"':''}>
        ${rank}
        <div class="lb-avatar" ${isMe?'style="background:var(--purple-deep)"':''}><i class="fa-solid fa-user"></i></div>
        <div class="lb-name" ${isMe?'style="color:var(--accent)"':''}>${isMe?'You ('+u.name?.split(' ')[0]+')' : u.name?.split(' ')[0]||'User'}</div>
        <div class="lb-refs">${u.referrals||0} refs</div>
      </div>`;
    }).join('');

    const lb = document.querySelector('.lb-section-card');
    if (lb && rows) lb.innerHTML = `<div class="section-card-header"><h3><i class="fa-solid fa-trophy" style="color:var(--gold)"></i> Top Referrers</h3><a href="#" style="font-size:12px;color:var(--accent);text-decoration:none;font-weight:600;">Full board <i class="fa-solid fa-arrow-right"></i></a></div>${rows}`;
  } catch(e) { console.log("Leaderboard error:", e); }
}

// ── DAILY CHECK-IN ───────────────────────────
async function checkDailyCheckin(uid, userData) {
  try {
    const today      = new Date().toDateString();
    const lastCheckin = userData.lastCheckin?.toDate?.()?.toDateString?.() || null;
    const checkinBtn  = document.querySelector('.checkin-task .task-btn');

    if (lastCheckin === today) {
      if (checkinBtn) { checkinBtn.innerHTML = '<i class="fa-solid fa-check"></i> Done'; checkinBtn.className = 'task-btn done'; checkinBtn.closest('.task-item').classList.add('completed'); }
      return;
    }
    await updateDoc(doc(db,"users",uid), { balance: increment(CHECKIN_REWARD), lastCheckin: serverTimestamp() });
    await addDoc(collection(db,"transactions"), { userId:uid, type:"checkin", amount:CHECKIN_REWARD, description:"Daily Check-in Bonus", createdAt:serverTimestamp() });
    if (checkinBtn) { checkinBtn.innerHTML = '<i class="fa-solid fa-check"></i> Done'; checkinBtn.className = 'task-btn done'; checkinBtn.closest('.task-item').classList.add('completed'); }
    showToast(`+${formatNaira(CHECKIN_REWARD)} daily check-in bonus! 🎉`, 'success');
  } catch(e) { console.log("Checkin error:", e); }
}

// ── COMPLETE TASK ────────────────────────────
window.completeTask = async function(btn, taskId, taskName) {
  const user = auth.currentUser;
  if (!user) { showToast('Please sign in first', 'error'); return; }
  try {
    // Premium check — only premium members can earn from tasks
    const premSnap = await getDoc(doc(db, "users", user.uid));
    if (!premSnap.data()?.premium) {
      showToast('Upgrade to Premium to earn from tasks 👑', 'info');
      return;
    }
    const userRef  = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    const done     = userSnap.data().tasksCompleted || [];
    if (done.includes(taskId)) { showToast('Already completed this task', 'info'); return; }

    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    btn.disabled  = true;

    await updateDoc(userRef, { balance: increment(TASK_REWARD), tasksCompleted: [...done, taskId] });
    await addDoc(collection(db,"transactions"), { userId:user.uid, type:"task", amount:TASK_REWARD, description:`Task: ${taskName}`, createdAt:serverTimestamp() });

    btn.innerHTML = '<i class="fa-solid fa-check"></i> Done';
    btn.className = 'task-btn done';
    btn.closest('.task-item').classList.add('completed');
    showToast(`+${formatNaira(TASK_REWARD)} task reward! 💰`, 'success');

    const newSnap  = await getDoc(userRef);
    const walletEl = document.querySelector('.wc-balance');
    if (walletEl) walletEl.textContent = formatNaira(newSnap.data().balance || 0);
  } catch(e) {
    showToast('Error: ' + e.message, 'error');
    btn.innerHTML = '<i class="fa-solid fa-play"></i> Start';
    btn.disabled  = false;
  }
};

// ── WITHDRAWAL ───────────────────────────────
window.requestWithdrawal = async function() {
  const user    = auth.currentUser;
  if (!user) { showToast('Please sign in', 'error'); return; }
  const bank    = document.querySelector('#withdrawModal .bank-input')?.value?.trim();
  const account = document.querySelector('#withdrawModal .account-input')?.value?.trim();
  const amount  = parseInt(document.querySelector('#withdrawModal .amount-input')?.value);
  if (!bank || !account) { showToast('Please fill in bank details', 'error'); return; }
  if (!amount || amount < MIN_WITHDRAWAL) { showToast(`Minimum withdrawal is ${formatNaira(MIN_WITHDRAWAL)}`, 'error'); return; }
  if (account.length !== 10) { showToast('Account number must be 10 digits', 'error'); return; }
  try {
    const userSnap = await getDoc(doc(db,"users",user.uid));
    const userData = userSnap.data();
    const balance  = userData.balance || 0;
    if (balance < MIN_WITHDRAWAL) { showToast(`Balance too low. You have ${formatNaira(balance)}`, 'error'); return; }
    if (amount > balance) { showToast(`Max you can withdraw is ${formatNaira(balance)}`, 'error'); return; }

    const btn = document.querySelector('#withdrawModal .btn-primary');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...'; }

    // Save withdrawal + deduct balance
    await updateDoc(doc(db,"users",user.uid), { balance: increment(-amount) });
    const withdrawalRef = await addDoc(collection(db,"withdrawals"), {
      userId: user.uid,
      userName: userData.name,
      userEmail: user.email,
      userPhone: userData.phone || 'N/A',
      amount, bank, accountNumber: account,
      status: "pending",
      requestedAt: serverTimestamp()
    });
    await addDoc(collection(db,"transactions"), {
      userId: user.uid, type:"withdrawal", amount,
      description:`Withdrawal — ${bank}`, createdAt:serverTimestamp()
    });

    // ── NOTIFY ADMIN VIA WHATSAPP ──────────────
    const waMsg = encodeURIComponent(
      `🚨 *NEW WITHDRAWAL REQUEST — LiusCine*

` +
      `👤 *Name:* ${userData.name}
` +
      `📧 *Email:* ${user.email}
` +
      `🏦 *Bank:* ${bank}
` +
      `🔢 *Account:* ${account}
` +
      `💰 *Amount:* ${formatNaira(amount)}
` +
      `🆔 *Request ID:* ${withdrawalRef.id}

` +
      `➡️ Login to approve: liuscine.vercel.app/admin-login.html`
    );
    // Open WhatsApp notification in background
    const waLink = `https://wa.me/2349161976673?text=${waMsg}`;
    const waWindow = window.open(waLink, '_blank');
    // Auto-close after 2 seconds if opened
    if (waWindow) setTimeout(() => waWindow.close(), 2000);

    // ── NOTIFY ADMIN VIA EMAIL (EmailJS) ──────
    await sendWithdrawalEmail({
      userName:      userData.name,
      userEmail:     user.email,
      bank,
      accountNumber: account,
      amount:        formatNaira(amount),
      requestId:     withdrawalRef.id,
      adminUrl:      'https://liuscine.vercel.app/admin-login.html'
    });

    document.getElementById('withdrawModal').classList.remove('open');
    showToast('Withdrawal submitted! Admin has been notified. Processing within 24hrs ✅', 'success');

    const newSnap  = await getDoc(doc(db,"users",user.uid));
    const walletEl = document.querySelector('.wc-balance');
    if (walletEl) walletEl.textContent = formatNaira(newSnap.data().balance || 0);
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Request Withdrawal'; }
  } catch(e) {
    showToast('Error: ' + e.message, 'error');
  }
};

// ── EMAIL NOTIFICATION VIA EMAILJS ──────────
async function sendWithdrawalEmail(data) {
  try {
    // EmailJS config — replace with your own after signing up at emailjs.com
    const EMAILJS_SERVICE_ID  = 'YOUR_EMAILJS_SERVICE_ID';
    const EMAILJS_TEMPLATE_ID = 'YOUR_EMAILJS_TEMPLATE_ID';
    const EMAILJS_PUBLIC_KEY  = 'YOUR_EMAILJS_PUBLIC_KEY';

    // Skip if not configured yet
    if (EMAILJS_SERVICE_ID === 'YOUR_EMAILJS_SERVICE_ID') {
      console.log('EmailJS not configured yet — skipping email notification');
      return;
    }

    await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id:  EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id:     EMAILJS_PUBLIC_KEY,
        template_params: {
          to_email:       'liuscreatives@gmail.com',
          to_name:        'Julius',
          user_name:      data.userName,
          user_email:     data.userEmail,
          bank:           data.bank,
          account_number: data.accountNumber,
          amount:         data.amount,
          request_id:     data.requestId,
          admin_url:      data.adminUrl,
          subject:        `🚨 New Withdrawal Request — ${data.amount} from ${data.userName}`
        }
      })
    });
    console.log('Email notification sent');
  } catch(e) {
    console.log('Email notification failed (non-critical):', e.message);
  }
}

// ── PREMIUM PAYMENT ──────────────────────────
window.handleUpgrade = async function() {
  const user = auth.currentUser;
  if (!user) {
    showToast('Please sign in first', 'info');
    setTimeout(() => { window.location.href = 'login.html'; }, 800);
    return;
  }

  // Check if already premium
  const userSnap = await getDoc(doc(db,"users",user.uid));
  const userData  = userSnap.data();
  if (userData?.premium) {
    showToast('You are already a Premium member! 👑', 'info');
    return;
  }

  // Show loading on the button that was clicked
  const clickedBtn = document.activeElement;
  const originalHTML = clickedBtn?.innerHTML || '';
  if (clickedBtn && clickedBtn.tagName === 'BUTTON') {
    clickedBtn.disabled = true;
    clickedBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Loading payment...';
  }

  // Ensure Paystack is loaded — load it dynamically if not present
  function loadPaystackAndPay() {
    return new Promise((resolve, reject) => {
      if (window.PaystackPop) { resolve(); return; }
      const script = document.createElement('script');
      script.src   = 'https://js.paystack.co/v1/inline.js';
      script.onload  = () => resolve();
      script.onerror = () => reject(new Error('Paystack failed to load'));
      document.head.appendChild(script);
    });
  }

  try {
    await loadPaystackAndPay();

    if (clickedBtn && clickedBtn.tagName === 'BUTTON') {
      clickedBtn.disabled  = false;
      clickedBtn.innerHTML = originalHTML;
    }

    const handler = window.PaystackPop.setup({
      key:      PAYSTACK_KEY,
      email:    user.email,
      amount:   PREMIUM_AMOUNT * 100,
      currency: 'NGN',
      ref:      'LC-PREM-' + user.uid + '-' + Date.now(),
      metadata: { userId: user.uid, type: 'premium', name: userData?.name || user.email },
      callback: async function(response) {
        try {
          // Show processing state
          showToast('Payment confirmed! Activating Premium...', 'info');

          // 1. Upgrade user to premium
          await updateDoc(doc(db,"users",user.uid), {
            premium:              true,
            premiumActivatedAt:   serverTimestamp()
          });

          // 2. Log premium transaction
          await addDoc(collection(db,"transactions"), {
            userId:      user.uid,
            type:        "premium",
            amount:      PREMIUM_AMOUNT,
            description: "Premium Subscription Activated",
            paystackRef: response.reference,
            createdAt:   serverTimestamp()
          });

          // 3. Credit the referrer ₦500
          const referredBy = userData?.referredBy || null;
          if (referredBy && referredBy !== user.uid) {
            await creditReferrer(referredBy, user);
          }

          showToast('🎉 You are now Premium! Reloading...', 'success');
          setTimeout(() => window.location.reload(), 1500);

        } catch(e) {
          // Payment went through but DB update failed — still show success
          showToast('Payment received! If Premium is not active in 1 minute, contact support.', 'warning');
          console.error("Premium upgrade DB error:", e);
        }
      },
      onClose: function() {
        showToast('Payment cancelled', 'info');
        if (clickedBtn && clickedBtn.tagName === 'BUTTON') {
          clickedBtn.disabled  = false;
          clickedBtn.innerHTML = originalHTML;
        }
      }
    });

    handler.openIframe();

  } catch(e) {
    showToast('Payment system unavailable. Please check your internet and try again.', 'error');
    if (clickedBtn && clickedBtn.tagName === 'BUTTON') {
      clickedBtn.disabled  = false;
      clickedBtn.innerHTML = originalHTML;
    }
    console.error("Paystack load error:", e);
  }
};

// ── CREDIT REFERRER AFTER PREMIUM PAYMENT ───────
async function creditReferrer(referrerId, newPremiumUser) {
  try {
    // PROTECTION 1: Referrer must still exist
    const refRef  = doc(db, "users", referrerId);
    const refSnap = await getDoc(refRef);
    if (!refSnap.exists()) {
      console.log("Referral credit skipped: referrer not found");
      return;
    }

    // PROTECTION 2: Check this user hasn't already triggered a referral credit
    // (prevents duplicate payments if someone somehow pays twice)
    const dupQ = query(
      collection(db, "transactions"),
      where("userId",        "==", referrerId),
      where("type",          "==", "referral"),
      where("referredUid",   "==", newPremiumUser.uid),
      limit(1)
    );
    const dupSnap = await getDocs(dupQ);
    if (!dupSnap.empty) {
      console.log("Referral credit skipped: already credited for this user");
      return;
    }

    // PROTECTION 3: Daily cap — max 50 referral credits per day
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const dailyQ    = query(
      collection(db, "transactions"),
      where("userId", "==", referrerId),
      where("type",   "==", "referral")
    );
    const dailySnap = await getDocs(dailyQ);
    const todayCount = dailySnap.docs.filter(d => {
      const t = d.data().createdAt?.toDate?.();
      return t && t >= todayStart;
    }).length;
    if (todayCount >= 50) {
      console.log("Referral credit skipped: daily cap reached");
      return;
    }

    // ── All checks passed — credit ₦500 to referrer ──
    await updateDoc(refRef, {
      balance:   increment(REFERRAL_BONUS),
      referrals: increment(1)
    });

    await addDoc(collection(db, "transactions"), {
      userId:        referrerId,
      type:          "referral",
      amount:        REFERRAL_BONUS,
      description:   `Referral Bonus — ${newPremiumUser.displayName || newPremiumUser.email} went Premium`,
      referredUid:   newPremiumUser.uid,
      referredEmail: newPremiumUser.email,
      createdAt:     serverTimestamp()
    });

    console.log("Referral credited ₦500 to:", referrerId);

  } catch(e) {
    console.log("Referral credit error:", e);
  }
}

// ── MOVIE REQUEST ────────────────────────────
window.submitMovieRequest = async function() {
  const user  = auth.currentUser;
  const input = document.querySelector('.movie-request-input');
  if (!input?.value?.trim()) { showToast('Please enter a movie title', 'error'); return; }
  if (!user) { showToast('Please sign in first', 'error'); return; }
  try {
    await addDoc(collection(db,"movieRequests"), { userId:user.uid, userName:user.displayName||user.email, title:input.value.trim(), status:"pending", requestedAt:serverTimestamp() });
    input.value = '';
    showToast("Request sent! We'll add it soon ✅", 'success');
  } catch(e) { showToast('Error submitting request', 'error'); }
};

// ── ADMIN GUARD ──────────────────────────────
window.initAdminGuard = function() {
  onAuthStateChanged(auth, (user) => {
    if (!user || user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      window.location.href = 'index.html';
    }
  });
};

// ── ADMIN — ADD MOVIE ────────────────────────
window.addMovieToDb = async function() {
  const g    = sel => document.querySelector(sel)?.value?.trim();
  const title = g('.movie-title-input');
  const year  = g('.movie-year-input');
  const genre = g('.movie-genre-input');
  if (!title || !year || !genre) { showToast('Title, year and genre are required', 'error'); return; }
  const btn = document.querySelector('.add-movie-btn');
  try {
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Adding...'; }
    await addDoc(collection(db,"movies"), {
      title, year:parseInt(year), genre,
      language:   g('.movie-lang-input'),
      director:   g('.movie-director-input'),
      duration:   g('.movie-duration-input'),
      synopsis:   g('.movie-synopsis-input'),
      access:     g('.movie-access-input') || 'free',
      rating:     parseFloat(document.querySelector('.movie-rating-input')?.value) || 0,
      link360:    g('.movie-link360-input'),
      link480:    g('.movie-link480-input'),
      link720:    g('.movie-link720-input'),
      youtubeLink:g('.movie-youtube-input'),
      downloads:  0,
      createdAt:  serverTimestamp()
    });
    showToast(`"${title}" added! ✅`, 'success');
    document.querySelectorAll('.add-movie-form input, .add-movie-form textarea').forEach(el => { if(el.type!=='submit') el.value=''; });
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-plus"></i> Add Movie'; }
  } catch(e) {
    showToast('Error: ' + e.message, 'error');
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-plus"></i> Add Movie'; }
  }
};

// ── ADMIN — WITHDRAWAL ACTION ────────────────
window.handleWithdrawal = async function(docId, action) {
  try {
    await updateDoc(doc(db,"withdrawals",docId), { status:action, processedAt:serverTimestamp() });
    showToast(`Withdrawal ${action}! ✅`, action==='approved'?'success':'error');
    document.querySelector(`[data-wid="${docId}"]`)?.remove();
  } catch(e) { showToast('Error: ' + e.message, 'error'); }
};

// ── WATCHLIST ────────────────────────────────
window.addToWatchlist = async function(movieId, title, year, rating, genre) {
  const user = auth.currentUser;
  if (!user) { showToast('Sign in to save to watchlist', 'info'); return; }
  try {
    // Check not already in watchlist
    const q    = query(collection(db,'watchlist'), where('userId','==',user.uid), where('movieId','==',movieId), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) { showToast('Already in your watchlist', 'info'); return; }
    await addDoc(collection(db,'watchlist'), {
      userId: user.uid, movieId, title, year, rating, genre,
      addedAt: serverTimestamp()
    });
    showToast('Added to watchlist! 🔖', 'success');
  } catch(e) { showToast('Error: ' + e.message, 'error'); }
};

// ── PREMIUM EXPIRY CHECK ──────────────────────
window.checkPremiumExpiry = async function(uid) {
  try {
    const userSnap = await getDoc(doc(db,'users',uid));
    const u        = userSnap.data();
    if (!u?.premium || !u?.premiumActivatedAt) return;

    const activatedAt = u.premiumActivatedAt?.toDate?.();
    if (!activatedAt) return;

    const now       = new Date();
    const expiresAt = new Date(activatedAt);
    expiresAt.setDate(expiresAt.getDate() + 30); // 30-day premium

    const daysLeft = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));

    if (daysLeft <= 0) {
      // Premium expired — downgrade to free
      await updateDoc(doc(db,'users',uid), { premium: false, premiumActivatedAt: null });
      showToast('Your Premium has expired. Renew to keep earning! 👑', 'warning');
      // Reload after short delay
      setTimeout(() => window.location.reload(), 3000);

    } else if (daysLeft <= 3) {
      // Expiring soon — show warning
      const expiryEl = document.getElementById('premiumExpiry');
      if (expiryEl) {
        expiryEl.style.display = 'flex';
        expiryEl.querySelector('.expiry-days').textContent = daysLeft;
      }
      showToast(`⚠️ Premium expires in ${daysLeft} day${daysLeft > 1 ? 's' : ''}! Renew now.`, 'warning');
    }
  } catch(e) { console.log('Expiry check error:', e); }
};

// ── IN-APP NOTIFICATION ───────────────────────
window.showNotification = function(title, message, type = 'info') {
  const notif = document.createElement('div');
  notif.style.cssText = `
    position:fixed; top:80px; right:20px; z-index:9999;
    background:var(--card); border:1px solid var(--border2);
    border-radius:14px; padding:16px 20px; max-width:320px;
    box-shadow:0 8px 32px rgba(0,0,0,0.4);
    animation:slideInRight 0.3s ease;
    display:flex; align-items:flex-start; gap:12px;
  `;
  const icons = { info:'fa-info-circle', success:'fa-check-circle', warning:'fa-triangle-exclamation', referral:'fa-user-plus' };
  const colors = { info:'var(--accent)', success:'var(--green)', warning:'var(--gold)', referral:'var(--green)' };
  notif.innerHTML = `
    <i class="fa-solid ${icons[type]||icons.info}" style="color:${colors[type]||colors.info};font-size:18px;margin-top:1px;flex-shrink:0"></i>
    <div>
      <div style="font-size:13px;font-weight:700;margin-bottom:3px;">${title}</div>
      <div style="font-size:12px;color:var(--muted);font-weight:400;">${message}</div>
    </div>
    <button onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:14px;padding:0;margin-left:auto;flex-shrink:0"><i class="fa-solid fa-xmark"></i></button>
  `;
  document.body.appendChild(notif);
  setTimeout(() => notif.remove(), 6000);
};

// Inject notification slide-in animation
const notifStyle = document.createElement('style');
notifStyle.textContent = '@keyframes slideInRight{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}';
document.head.appendChild(notifStyle);

// ── INIT ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initReveal();
  initGenrePills();
  initNavScroll();

  // Auto-load dashboard if on dashboard page
  const page = window.location.pathname;
  if (page.includes('dashboard')) {
    window.loadDashboard();
  }
  // Auto-guard admin page
  if (page.includes('admin')) {
    window.initAdminGuard();
    if (window.loadAdminDashboard) window.loadAdminDashboard();
  }
});
