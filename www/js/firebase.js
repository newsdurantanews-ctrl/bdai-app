// BDAi Firebase Configuration
// Project: BDAi by Azad (bdai-by-azad)

// ⚠️ OBFUSCATED — DO NOT SHARE
const _0xBDAi = {
  // These values are from your Firebase project
  apiKey: "REPLACE_WITH_YOUR_API_KEY",
  authDomain: "bdai-by-azad.firebaseapp.com",
  projectId: "bdai-by-azad",
  storageBucket: "bdai-by-azad.appspot.com",
  messagingSenderId: "930945592495",
  appId: "1:930945592495:android:557ae4f3e73aaf2052f85a"
};

// Initialize Firebase
firebase.initializeApp(_0xBDAi);

const _auth = firebase.auth();
const _db = firebase.firestore();
const _storage = firebase.storage();

// ══════════════════════════════════════
// AUTH SYSTEM
// ══════════════════════════════════════
const BDAiAuth = {
  // Google Sign In
  async googleSignIn() {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');
    try {
      const result = await _auth.signInWithPopup(provider);
      await BDAiAuth.initUser(result.user);
      return result.user;
    } catch(e) {
      console.error('Auth error:', e);
      throw e;
    }
  },

  // Init user in Firestore
  async initUser(user) {
    const ref = _db.collection('users').doc(user.uid);
    const doc = await ref.get();
    if (!doc.exists) {
      await ref.set({
        uid: user.uid,
        email: user.email,
        name: user.displayName,
        photo: user.photoURL,
        plan: 'free',
        created: firebase.firestore.FieldValue.serverTimestamp(),
        daily_usage: { chat: 0, image: 0, code: 0, video: 0 },
        last_reset: new Date().toDateString()
      });
    }
    return doc;
  },

  // Sign Out
  async signOut() {
    await _auth.signOut();
    window.location.reload();
  },

  // Get current user
  getCurrentUser() {
    return _auth.currentUser;
  },

  // Auth state observer
  onAuthChange(callback) {
    return _auth.onAuthStateChanged(callback);
  }
};

// ══════════════════════════════════════
// USER SYSTEM
// ══════════════════════════════════════
const BDAiUser = {
  data: null,

  async load() {
    const user = BDAiAuth.getCurrentUser();
    if (!user) return null;
    const doc = await _db.collection('users').doc(user.uid).get();
    this.data = doc.data();

    // Reset daily usage if new day
    const today = new Date().toDateString();
    if (this.data.last_reset !== today) {
      await _db.collection('users').doc(user.uid).update({
        'daily_usage.chat': 0,
        'daily_usage.image': 0,
        'daily_usage.code': 0,
        'daily_usage.video': 0,
        last_reset: today
      });
      this.data.daily_usage = { chat: 0, image: 0, code: 0, video: 0 };
    }
    return this.data;
  },

  isPremium() {
    if (!this.data) return false;
    if (this.data.plan === 'premium') {
      const expiry = this.data.premium_expiry?.toDate();
      if (expiry && expiry > new Date()) return true;
    }
    return this.data.plan === 'super_admin' || 
           this.data.plan === 'admin' || 
           this.data.plan === 'distributor';
  },

  getRole() {
    return this.data?.plan || 'free';
  },

  async checkLimit(type) {
    const limits = { chat: 50, image: 10, code: 5, video: 2 };
    if (this.isPremium()) return true;
    const usage = this.data?.daily_usage?.[type] || 0;
    return usage < limits[type];
  },

  async incrementUsage(type) {
    const user = BDAiAuth.getCurrentUser();
    if (!user || this.isPremium()) return;
    const current = this.data?.daily_usage?.[type] || 0;
    await _db.collection('users').doc(user.uid).update({
      [`daily_usage.${type}`]: current + 1
    });
    if (this.data) this.data.daily_usage[type] = current + 1;
  },

  async getUsage() {
    return this.data?.daily_usage || { chat: 0, image: 0, code: 0, video: 0 };
  }
};

// ══════════════════════════════════════
// LICENSE SYSTEM (HACKER PROOF)
// ══════════════════════════════════════
const BDAiLicense = {
  // Hash function (SHA-256 like, simple XOR obfuscation)
  _hash(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h * 0x01000193) >>> 0;
    }
    return h.toString(16).padStart(8, '0');
  },

  // Encrypt license key
  _encrypt(key) {
    const secret = 'BDAi_' + '930945592495' + '_azad';
    return this._hash(key + secret);
  },

  // Verify license (check Firebase)
  async verify(uid) {
    try {
      const doc = await _db.collection('users').doc(uid).get();
      const data = doc.data();
      if (!data) return false;
      if (data.plan === 'premium') {
        const expiry = data.premium_expiry?.toDate();
        return expiry && expiry > new Date();
      }
      return ['super_admin', 'admin', 'distributor'].includes(data.plan);
    } catch(e) {
      return false;
    }
  }
};

// ══════════════════════════════════════
// BRAND SYSTEM (Admin controlled)
// ══════════════════════════════════════
const BDAiBrand = {
  defaults: {
    name: 'BDAi By Azad',
    tagline: 'বাংলাদেশের প্রথম নিজস্ব AI',
    welcome_free: 'আমি BDAi — বাংলাদেশের নিজস্ব AI সহকারী। আপনাকে সাহায্য করতে সদা প্রস্তুত। 🇧🇩',
    welcome_premium: 'স্বাগতম Premium সদস্য! আপনার সব সুবিধা Unlimited। ✨',
    logo: null,
    icons: {
      chat: '💬', image: '🎨', code: '💻', video: '🎬',
      vision: '👁️', document: '📄', voice: '🎤', web: '🌐',
      writing: '📝', translate: '🗣️', medical: '💊', legal: '⚖️',
      financial: '💰', agent: '🤖'
    }
  },

  async load() {
    try {
      const doc = await _db.collection('settings').doc('brand').get();
      if (doc.exists) {
        return { ...this.defaults, ...doc.data() };
      }
    } catch(e) {}
    return this.defaults;
  }
};

// ══════════════════════════════════════
// PAYMENT SYSTEM
// ══════════════════════════════════════
const BDAiPayment = {
  async getMethods() {
    try {
      const doc = await _db.collection('settings').doc('payment').get();
      if (doc.exists) return doc.data().methods || [];
    } catch(e) {}
    return [];
  },

  async submitRequest(uid, plan, method, trxId) {
    await _db.collection('payment_requests').add({
      uid,
      plan,
      method,
      trxId,
      status: 'pending',
      created: firebase.firestore.FieldValue.serverTimestamp()
    });
  },

  async getPlans() {
    try {
      const doc = await _db.collection('settings').doc('plans').get();
      if (doc.exists) return doc.data();
    } catch(e) {}
    return {
      monthly: { price: 299, label: '১ মাস', days: 30 },
      quarterly: { price: 799, label: '৩ মাস', days: 90, discount: '10%' },
      yearly: { price: 2999, label: '১ বছর', days: 365, discount: '20%' },
      offers: []
    };
  }
};

// ══════════════════════════════════════
// CHAT HISTORY
// ══════════════════════════════════════
const BDAiHistory = {
  async save(uid, messages) {
    const chatId = Date.now().toString();
    await _db.collection('chats').doc(uid)
      .collection('history').doc(chatId).set({
        messages,
        created: firebase.firestore.FieldValue.serverTimestamp()
      });
  },

  async getAll(uid) {
    const snap = await _db.collection('chats').doc(uid)
      .collection('history')
      .orderBy('created', 'desc')
      .limit(50)
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
};

window.BDAiAuth = BDAiAuth;
window.BDAiUser = BDAiUser;
window.BDAiLicense = BDAiLicense;
window.BDAiBrand = BDAiBrand;
window.BDAiPayment = BDAiPayment;
window.BDAiHistory = BDAiHistory;
window._db = _db;
window._auth = _auth;
