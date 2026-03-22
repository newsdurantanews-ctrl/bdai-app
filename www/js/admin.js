// BDAi Admin System
const BDAiAdmin = {

  // ── CHECK ROLE ──
  getRole() {
    return BDAiUser.getRole();
  },

  isSuperAdmin() { return this.getRole() === 'super_admin'; },
  isAdmin() { return ['super_admin','admin'].includes(this.getRole()); },
  isDistributor() { return ['super_admin','admin','distributor'].includes(this.getRole()); },

  // ══════════════════════════════
  // BRAND MANAGEMENT (Super Admin)
  // ══════════════════════════════
  async updateBrand(data) {
    if (!this.isSuperAdmin()) return;
    await _db.collection('settings').doc('brand').set(data, { merge: true });
  },

  async updateIcon(feature, icon) {
    if (!this.isAdmin()) return;
    await _db.collection('settings').doc('brand').update({
      [`icons.${feature}`]: icon
    });
  },

  // ══════════════════════════════
  // WELCOME MESSAGE (Admin)
  // ══════════════════════════════
  async updateWelcome(free_msg, premium_msg) {
    if (!this.isAdmin()) return;
    await _db.collection('settings').doc('brand').update({
      welcome_free: free_msg,
      welcome_premium: premium_msg
    });
  },

  // ══════════════════════════════
  // PAYMENT MANAGEMENT (Super Admin)
  // ══════════════════════════════
  async getPaymentMethods() {
    const doc = await _db.collection('settings').doc('payment').get();
    return doc.exists ? (doc.data().methods || []) : [];
  },

  async addPaymentMethod(method) {
    // method = { type, name, number, account_name, note, active }
    if (!this.isSuperAdmin()) return;
    const methods = await this.getPaymentMethods();
    methods.push({ ...method, id: Date.now().toString() });
    await _db.collection('settings').doc('payment').set({ methods });
  },

  async updatePaymentMethod(id, data) {
    if (!this.isSuperAdmin()) return;
    const methods = await this.getPaymentMethods();
    const idx = methods.findIndex(m => m.id === id);
    if (idx !== -1) {
      methods[idx] = { ...methods[idx], ...data };
      await _db.collection('settings').doc('payment').set({ methods });
    }
  },

  async deletePaymentMethod(id) {
    if (!this.isSuperAdmin()) return;
    const methods = await this.getPaymentMethods();
    const filtered = methods.filter(m => m.id !== id);
    await _db.collection('settings').doc('payment').set({ methods: filtered });
  },

  // Get payment method for specific admin/distributor
  async getAssignedPayment(adminUid) {
    const doc = await _db.collection('settings').doc('payment').get();
    const methods = doc.data()?.methods || [];
    return methods.filter(m => m.assigned_to === adminUid || !m.assigned_to);
  },

  // ══════════════════════════════
  // OFFERS (Super Admin)
  // ══════════════════════════════
  async addOffer(offer) {
    // offer = { title, discount_percent, code, valid_until, description }
    if (!this.isSuperAdmin()) return;
    await _db.collection('settings').doc('offers').set({
      list: firebase.firestore.FieldValue.arrayUnion({
        ...offer,
        id: Date.now().toString(),
        active: true
      })
    }, { merge: true });
  },

  async getOffers() {
    const doc = await _db.collection('settings').doc('offers').get();
    return doc.exists ? (doc.data().list || []).filter(o => o.active) : [];
  },

  // ══════════════════════════════
  // PAYMENT VERIFICATION (Admin)
  // ══════════════════════════════
  async getPendingPayments() {
    const snap = await _db.collection('payment_requests')
      .where('status', '==', 'pending')
      .orderBy('created', 'desc')
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async verifyPayment(requestId, approve = true) {
    if (!this.isAdmin()) return;
    const ref = _db.collection('payment_requests').doc(requestId);
    const doc = await ref.get();
    const data = doc.data();

    if (approve && data) {
      // Activate premium
      const planDays = { monthly: 30, quarterly: 90, yearly: 365 };
      const days = planDays[data.plan] || 30;
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + days);

      await _db.collection('users').doc(data.uid).update({
        plan: 'premium',
        premium_expiry: expiry,
        activated_by: BDAiAuth.getCurrentUser().uid
      });
    }

    await ref.update({
      status: approve ? 'approved' : 'rejected',
      processed_by: BDAiAuth.getCurrentUser().uid,
      processed_at: firebase.firestore.FieldValue.serverTimestamp()
    });
  },

  // ══════════════════════════════
  // USER MANAGEMENT (Admin)
  // ══════════════════════════════
  async getUsers(limit = 50) {
    const snap = await _db.collection('users')
      .orderBy('created', 'desc')
      .limit(limit)
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async activatePremium(uid, plan, note) {
    if (!this.isAdmin() && !this.isDistributor()) return;

    const planDays = { monthly: 30, quarterly: 90, yearly: 365 };
    const days = planDays[plan] || 30;
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + days);

    await _db.collection('users').doc(uid).update({
      plan: 'premium',
      premium_expiry: expiry,
      activated_by: BDAiAuth.getCurrentUser().uid
    });

    // Log activation
    await _db.collection('activations').add({
      uid,
      plan,
      note,
      activated_by: BDAiAuth.getCurrentUser().uid,
      created: firebase.firestore.FieldValue.serverTimestamp()
    });

    // If distributor — check limit
    if (this.getRole() === 'distributor') {
      await this._useDistributorSlot();
    }
  },

  async banUser(uid) {
    if (!this.isAdmin()) return;
    await _db.collection('users').doc(uid).update({ plan: 'banned' });
  },

  // ══════════════════════════════
  // DISTRIBUTOR SYSTEM
  // ══════════════════════════════
  async getDistributorInfo(uid) {
    const doc = await _db.collection('distributors').doc(uid).get();
    return doc.exists ? doc.data() : null;
  },

  async _useDistributorSlot() {
    const uid = BDAiAuth.getCurrentUser().uid;
    const ref = _db.collection('distributors').doc(uid);
    await ref.update({
      used_slots: firebase.firestore.FieldValue.increment(1)
    });
  },

  async checkDistributorLimit() {
    const uid = BDAiAuth.getCurrentUser().uid;
    const doc = await _db.collection('distributors').doc(uid).get();
    if (!doc.exists) return false;
    const data = doc.data();
    return (data.used_slots || 0) < (data.max_slots || 10);
  },

  async requestMoreSlots(reason) {
    const uid = BDAiAuth.getCurrentUser().uid;
    await _db.collection('slot_requests').add({
      uid,
      reason,
      status: 'pending',
      created: firebase.firestore.FieldValue.serverTimestamp()
    });
  },

  // Super admin: set distributor slots
  async setDistributorSlots(distUid, maxSlots) {
    if (!this.isSuperAdmin()) return;
    await _db.collection('distributors').doc(distUid).set({
      max_slots: maxSlots,
      used_slots: 0,
      updated_by: BDAiAuth.getCurrentUser().uid
    }, { merge: true });
  },

  async getSlotRequests() {
    if (!this.isSuperAdmin()) return [];
    const snap = await _db.collection('slot_requests')
      .where('status', '==', 'pending').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async approveSlotRequest(reqId, newSlots) {
    if (!this.isSuperAdmin()) return;
    const ref = _db.collection('slot_requests').doc(reqId);
    const doc = await ref.get();
    if (doc.exists) {
      await this.setDistributorSlots(doc.data().uid, newSlots);
      await ref.update({ status: 'approved' });
    }
  },

  // ══════════════════════════════
  // KNOWLEDGE BOX (Admin)
  // ══════════════════════════════
  async getUnanswered() {
    const snap = await _db.collection('knowledge')
      .where('answered', '==', false)
      .orderBy('count', 'desc')
      .limit(20)
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async getAnswered() {
    const snap = await _db.collection('knowledge')
      .where('answered', '==', true)
      .limit(50)
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async answerQuestion(id, answer) {
    if (!this.isAdmin()) return;
    await _db.collection('knowledge').doc(id).update({
      answer,
      answered: true,
      answered_by: BDAiAuth.getCurrentUser().uid
    });
  },

  async logUnknownQuestion(question) {
    // Check if already exists
    const snap = await _db.collection('knowledge')
      .where('question', '==', question).get();
    
    if (snap.empty) {
      await _db.collection('knowledge').add({
        question,
        answered: false,
        count: 1,
        created: firebase.firestore.FieldValue.serverTimestamp()
      });
    } else {
      await snap.docs[0].ref.update({
        count: firebase.firestore.FieldValue.increment(1)
      });
    }
  },

  async getAnswer(question) {
    const snap = await _db.collection('knowledge')
      .where('question', '==', question)
      .where('answered', '==', true)
      .get();
    if (!snap.empty) return snap.docs[0].data().answer;
    return null;
  },

  // ══════════════════════════════
  // STATS (Admin)
  // ══════════════════════════════
  async getStats() {
    const [usersSnap, premSnap, pendSnap] = await Promise.all([
      _db.collection('users').get(),
      _db.collection('users').where('plan', '==', 'premium').get(),
      _db.collection('payment_requests').where('status', '==', 'pending').get()
    ]);

    return {
      total_users: usersSnap.size,
      premium_users: premSnap.size,
      pending_payments: pendSnap.size,
      monthly_revenue: premSnap.size * 299
    };
  },

  // ══════════════════════════════
  // AI PROVIDERS (Super Admin/Admin)
  // ══════════════════════════════
  async addProvider(provider) {
    if (!this.isAdmin()) return;
    await _db.collection('settings').doc('providers').update({
      custom: firebase.firestore.FieldValue.arrayUnion(provider)
    });
  },

  // ══════════════════════════════
  // PUSH NOTIFICATIONS
  // ══════════════════════════════
  async sendNotification(title, body, target = 'all') {
    if (!this.isAdmin()) return;
    await _db.collection('notifications').add({
      title,
      body,
      target,
      created: firebase.firestore.FieldValue.serverTimestamp(),
      sent_by: BDAiAuth.getCurrentUser().uid
    });
  }
};

window.BDAiAdmin = BDAiAdmin;
