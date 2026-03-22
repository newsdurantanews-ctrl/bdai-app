// BDAi App Main Logic
'use strict';

// ── STATE ──
let currentScreen = 'login';
let currentAdminScreen = 'main';
let selectedPlan = 'monthly';
let selectedPlanPrice = 299;
let selectedPayMethod = null;
let selectedImgModel = 'flux';
let chatHistory = [];
let isVoiceActive = false;
let brandData = {};

// ── INIT ──
document.addEventListener('DOMContentLoaded', async () => {
  // Auth state
  BDAiAuth.onAuthChange(async (user) => {
    if (user) {
      await onLoggedIn(user);
    } else {
      showLoading(false);
      goTo('login');
    }
  });
});

async function onLoggedIn(user) {
  try {
    await BDAiUser.load();
    brandData = await BDAiBrand.load();
    applyBrand();
    await loadUsage();
    const role = BDAiUser.getRole();
    if (['admin','super_admin','distributor'].includes(role)) {
      await loadAdminStats();
    }
    showLoading(false);
    goTo('home');
    loadPaymentMethods();
    loadOffers();
  } catch(e) {
    console.error(e);
    showLoading(false);
    goTo('home');
  }
}

function showLoading(show) {
  document.getElementById('loading').style.display = show ? 'flex' : 'none';
  document.getElementById('app').classList.toggle('hidden', show);
}

// ── BRAND ──
function applyBrand() {
  const b = brandData;
  // App name
  const name = b.name || 'BDAi By Azad';
  document.title = name;
  const parts = name.split(' By ');
  if (document.getElementById('homeAppName')) {
    document.getElementById('homeAppName').innerHTML = parts[0] + (parts[1] ? ` <span>By ${parts[1]}</span>` : '');
  }
  if (document.getElementById('loginTitle')) {
    document.getElementById('loginTitle').textContent = name;
  }
  // Welcome messages
  const role = BDAiUser.getRole();
  const isPrem = BDAiUser.isPremium();
  const wMsg = isPrem ? (b.welcome_premium || 'স্বাগতম Premium সদস্য!') : (b.welcome_free || 'আমি BDAi — বাংলাদেশের নিজস্ব AI। 🇧🇩');
  if (document.getElementById('homeWelcomeMsg')) {
    document.getElementById('homeWelcomeMsg').textContent = wMsg;
  }
  // Icons
  if (b.icons) {
    Object.keys(b.icons).forEach(key => {
      const el = document.getElementById(`icon-${key}`);
      if (el) el.textContent = b.icons[key];
    });
  }
  // Plan pills
  updatePlanPills();
}

function updatePlanPills() {
  const role = BDAiUser.getRole();
  const roleLabels = {
    'free': 'Free',
    'premium': '⭐ Premium',
    'admin': '🛡️ Admin',
    'super_admin': '👑 Super Admin',
    'distributor': '🤝 Distributor'
  };
  const roleClasses = {
    'free': 'pp-free',
    'premium': 'pp-prem',
    'admin': 'pp-admin',
    'super_admin': 'pp-sa',
    'distributor': 'pp-dist'
  };
  const label = roleLabels[role] || 'Free';
  const cls = roleClasses[role] || 'pp-free';
  ['homePlanPill','chatPlanPill','imgPlanPill','profPlanPill'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.textContent = label; el.className = `plan-pill ${cls}`; }
  });
  // Hide upgrade btn for premium/admin
  const upBtn = document.getElementById('upgradeBtn');
  if (upBtn && (role !== 'free')) upBtn.style.display = 'none';
  // Admin items in profile
  if (['admin','super_admin','distributor'].includes(role)) {
    const sub = document.getElementById('adminSubTxt');
    if (sub) sub.textContent = roleLabels[role];
  }
}

// ── NAVIGATION ──
function goTo(screen) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('on'));
  const el = document.getElementById(`sc-${screen}`);
  if (el) {
    el.classList.add('on');
    currentScreen = screen;
  }
  // Add welcome message on chat first load
  if (screen === 'chat' && document.getElementById('chatMsgs').children.length === 0) {
    addAiMessage('আস্‌সালামু আলাইকুম! আমি BDAi। বাংলাদেশের নিজস্ব AI সহকারী। কীভাবে সাহায্য করব? 😊');
  }
}

function goAdminSc(sc) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('on'));
  if (sc === 'main') {
    document.getElementById('sc-admin').classList.add('on');
    loadAdminStats();
  } else {
    const el = document.getElementById(`sc-admin-${sc}`);
    if (el) el.classList.add('on');
    // Load data for specific screens
    if (sc === 'payment-mng') loadPayMethodCards();
    if (sc === 'knowledge') loadKnowledgeBox();
    if (sc === 'users') loadUserList();
    if (sc === 'pending') loadPendingPayments();
    if (sc === 'distributors') loadSlotRequests();
    if (sc === 'welcome') loadWelcomeEdit();
    if (sc === 'brand') loadBrandEdit();
    if (sc === 'offers') {}
  }
}

function showAdminOption() {
  const role = BDAiUser.getRole();
  if (['admin','super_admin','distributor'].includes(role)) {
    // Show SA-only items
    if (role === 'super_admin') {
      ['brand','providers','offers','distributors'].forEach(id => {
        const el = document.getElementById(`saOnly-${id}`);
        if (el) el.style.display = 'flex';
      });
    }
    // Set role badge
    const badges = { admin:'rb-a', super_admin:'rb-sa', distributor:'rb-d' };
    const labels = { admin:'🛡️ Admin', super_admin:'👑 Super Admin', distributor:'🤝 Distributor' };
    const badge = document.getElementById('adminRoleBadge');
    if (badge) { badge.className = `role-badge ${badges[role]}`; badge.textContent = labels[role]; }
    goAdminSc('main');
  } else {
    toast('🔒 এই section শুধু Admin/Distributor এর জন্য');
  }
}

// ── AUTH ──
async function doGoogleLogin() {
  try {
    toast('🔄 Login হচ্ছে...');
    await BDAiAuth.googleSignIn();
  } catch(e) {
    toast('❌ Login হয়নি। আবার চেষ্টা করুন।');
  }
}

function showEmailLogin() {
  toast('📧 Email login শীঘ্রই আসছে।');
}

async function doSignOut() {
  if (confirm('Logout করবেন?')) {
    await BDAiAuth.signOut();
  }
}

// ── CHAT ──
function addUserMessage(text) {
  const area = document.getElementById('chatMsgs');
  const user = BDAiAuth.getCurrentUser();
  const initial = user?.displayName?.charAt(0)?.toUpperCase() || 'আ';
  const div = document.createElement('div');
  div.className = 'msg-wrap user';
  div.innerHTML = `
    <div class="msg-av user-av">${initial}</div>
    <div class="msg-body">
      <div class="msg-bub user">${text.replace(/\n/g,'<br>')}</div>
    </div>`;
  area.appendChild(div);
  area.scrollTop = area.scrollHeight;
}

function addAiMessage(text) {
  const area = document.getElementById('chatMsgs');
  const formatted = formatText(text);
  const div = document.createElement('div');
  div.className = 'msg-wrap';
  div.innerHTML = `
    <div class="msg-av ai-av"><img src="assets/logo.png" onerror="this.outerHTML='🌟'"></div>
    <div class="msg-body">
      <div class="msg-name">BDAi</div>
      <div class="msg-bub ai">${formatted}</div>
      <div class="msg-actions">
        <button class="ma-btn" onclick="speakText(this)">🔊</button>
        <button class="ma-btn" onclick="copyText(this)">📋</button>
        <button class="ma-btn" onclick="likeMsg(this)">👍</button>
      </div>
    </div>`;
  area.appendChild(div);
  area.scrollTop = area.scrollHeight;
  return div;
}

function addTyping() {
  const area = document.getElementById('chatMsgs');
  const div = document.createElement('div');
  div.className = 'msg-wrap';
  div.id = 'typingIndicator';
  div.innerHTML = `
    <div class="msg-av ai-av"><img src="assets/logo.png" onerror="this.outerHTML='🌟'"></div>
    <div class="msg-body">
      <div class="msg-name">BDAi</div>
      <div class="typing-bub"><div class="dot-t"></div><div class="dot-t"></div><div class="dot-t"></div></div>
    </div>`;
  area.appendChild(div);
  area.scrollTop = area.scrollHeight;
  return div;
}

function removeTyping() {
  const t = document.getElementById('typingIndicator');
  if (t) t.remove();
}

async function sendChat() {
  const inp = document.getElementById('chatInput');
  const msg = inp.value.trim();
  if (!msg) return;
  inp.value = '';
  inp.style.height = 'auto';

  // Check limit
  const ok = await BDAiUser.checkLimit('chat');
  if (!ok) {
    toast('⚠️ দৈনিক limit শেষ। Premium নিন।');
    return;
  }

  addUserMessage(msg);
  chatHistory.push({ role: 'user', content: msg });

  // Check knowledge base first
  const knownAnswer = await BDAiAdmin.getAnswer(msg).catch(() => null);
  
  addTyping();

  let reply;
  if (knownAnswer) {
    reply = knownAnswer;
    await new Promise(r => setTimeout(r, 800));
  } else {
    try {
      reply = await BDAiAI.chat(chatHistory, null);
      // Log unknown questions about identity
      const isIdentityQ = /কে|কোম্পানি|technology|গোপন|তৈরি|openai|chatgpt|api/i.test(msg);
      if (isIdentityQ) {
        BDAiAdmin.logUnknownQuestion(msg).catch(() => {});
      }
    } catch(e) {
      reply = 'দুঃখিত, এই মুহূর্তে সংযোগ সমস্যা। একটু পরে চেষ্টা করুন।';
    }
  }

  removeTyping();
  addAiMessage(reply);
  chatHistory.push({ role: 'assistant', content: reply });
  await BDAiUser.incrementUsage('chat');
  updateChatCounter();
}

async function sendQuick(text) {
  document.getElementById('chatInput').value = text;
  await sendChat();
}

function clearChat() {
  if (confirm('Chat মুছে ফেলবেন?')) {
    document.getElementById('chatMsgs').innerHTML = '';
    chatHistory = [];
    addAiMessage('চ্যাট পরিষ্কার করা হয়েছে। নতুন কথোপকথন শুরু করুন! 😊');
  }
}

function updateChatCounter() {
  const usage = BDAiUser.data?.daily_usage?.chat || 0;
  const isPrem = BDAiUser.isPremium();
  const pill = document.getElementById('chatPlanPill');
  if (pill && !isPrem) pill.textContent = `${usage}/৫০`;
}

// Format text (code blocks etc)
function formatText(text) {
  return text
    .replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre>$2</pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');
}

function speakText(btn) {
  const bub = btn.closest('.msg-body').querySelector('.msg-bub');
  if (bub) BDAiAI.voice.speak(bub.innerText);
}

function copyText(btn) {
  const bub = btn.closest('.msg-body').querySelector('.msg-bub');
  if (bub) {
    navigator.clipboard.writeText(bub.innerText).then(() => toast('✅ কপি হয়েছে!'));
    btn.textContent = '✅';
    setTimeout(() => btn.textContent = '📋', 2000);
  }
}

function likeMsg(btn) {
  btn.textContent = '👍 ধন্যবাদ!';
}

// ── VOICE ──
function toggleVoice() {
  const btn = document.getElementById('voiceBtn');
  if (!isVoiceActive) {
    const started = BDAiAI.voice.startListening((text) => {
      document.getElementById('chatInput').value = text;
      isVoiceActive = false;
      btn.classList.remove('active');
      btn.textContent = '🎤';
      sendChat();
    });
    if (started) {
      isVoiceActive = true;
      btn.classList.add('active');
      btn.textContent = '⏹️';
      toast('🎤 বাংলায় বলুন...');
    } else {
      toast('❌ Voice সাপোর্ট নেই।');
    }
  } else {
    BDAiAI.voice.stopListening();
    isVoiceActive = false;
    btn.classList.remove('active');
    btn.textContent = '🎤';
  }
}

// ── IMAGE ──
let imgModel = 'flux';

function selImgOpt(el, model) {
  document.querySelectorAll('.img-opt').forEach(b => {
    if (['Flux','Turbo','SDXL','Anime'].some(m => b.textContent.includes(m))) b.classList.remove('sel');
  });
  el.classList.add('sel');
  imgModel = model;
}

function selSize(el, size) {
  document.querySelectorAll('.img-opt').forEach(b => {
    if (['1:1','16:9','9:16'].includes(b.textContent)) b.classList.remove('sel');
  });
  el.classList.add('sel');
}

async function generateImage() {
  const prompt = document.getElementById('imgPrompt').value.trim();
  if (!prompt) { toast('⚠️ ছবির বিবরণ দিন'); return; }

  const ok = await BDAiUser.checkLimit('image');
  if (!ok) { toast('⚠️ দৈনিক limit শেষ। Premium নিন।'); return; }

  toast('🎨 ছবি তৈরি হচ্ছে...');
  const result = document.getElementById('imgResult');
  result.innerHTML = '<div class="img-card" style="grid-column:span 2;aspect-ratio:auto;padding:20px;text-align:center;color:var(--mut)">⏳ তৈরি হচ্ছে...</div>';

  const models = ['flux', 'turbo', 'stable-diffusion', 'animagine'];
  result.innerHTML = '';
  
  models.forEach(m => {
    const seed = Math.floor(Math.random() * 99999);
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?model=${m}&seed=${seed}&width=512&height=512&nologo=true`;
    const card = document.createElement('div');
    card.className = 'img-card';
    card.innerHTML = `<img src="${url}" loading="lazy" onclick="viewImage(this.src)" onerror="this.parentElement.innerHTML='<div class=img-ph>❌</div>'">`;
    result.appendChild(card);
  });

  await BDAiUser.incrementUsage('image');
  toast('✅ ছবি তৈরি হচ্ছে, কিছুক্ষণ অপেক্ষা করুন');
}

function viewImage(src) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.9);z-index:2000;display:flex;align-items:center;justify-content:center;padding:20px';
  overlay.innerHTML = `<img src="${src}" style="max-width:100%;max-height:100%;border-radius:12px"><button onclick="this.parentElement.remove()" style="position:absolute;top:20px;right:20px;background:rgba(255,255,255,.2);border:none;color:#fff;font-size:20px;cursor:pointer;padding:8px 12px;border-radius:8px">✕</button>`;
  document.body.appendChild(overlay);
}

// ── PAYMENT ──
async function loadPaymentMethods() {
  try {
    const methods = await BDAiPayment.getMethods();
    const container = document.getElementById('paymentMethodsList');
    if (!container) return;
    
    if (methods.length === 0) {
      container.innerHTML = '<div style="padding:14px;color:var(--mut);font-size:12.5px;text-align:center">পেমেন্ট method লোড হচ্ছে...</div>';
      return;
    }

    container.innerHTML = methods.filter(m => m.active !== false).map((m, i) => `
      <div class="pm-card ${i===0?'sel':''}" onclick="selectPayMethod(this,'${m.id}','${m.number}')">
        <div class="pm-head">
          <div class="pm-icon">${getPayIcon(m.type)}</div>
          <div class="pm-info">
            <div class="pm-name">${m.name || m.type}</div>
            <div class="pm-num">${m.number}</div>
          </div>
        </div>
        <div class="pm-note">${m.note || ''}</div>
      </div>`).join('');
    
    if (methods.length > 0) {
      selectedPayMethod = methods[0].id;
    }
  } catch(e) {
    // Show defaults if Firebase not ready
    document.getElementById('paymentMethodsList').innerHTML = `
      <div class="pm-card sel" onclick="selectPayMethod(this,'bkash','01712-XXXXXX')">
        <div class="pm-head"><div class="pm-icon">💗</div><div class="pm-info"><div class="pm-name">bKash</div><div class="pm-num">লোড হচ্ছে...</div></div></div>
      </div>`;
  }
}

function getPayIcon(type) {
  const icons = { bkash:'💗', nagad:'🟠', rocket:'💜', bank:'🏦', other:'📱' };
  return icons[type] || '💳';
}

function selectPayMethod(el, id, num) {
  document.querySelectorAll('.pm-card').forEach(c => c.classList.remove('sel'));
  el.classList.add('sel');
  selectedPayMethod = id;
}

function selPlan(el, plan, price) {
  document.querySelectorAll('.plan-card').forEach(c => c.classList.remove('sel'));
  el.classList.add('sel');
  selectedPlan = plan;
  selectedPlanPrice = price;
}

async function loadOffers() {
  try {
    const offers = await BDAiPayment.getOffers();
    if (offers.length > 0) {
      const offer = offers[0];
      const banner = document.getElementById('offerBanner');
      if (banner) {
        banner.classList.remove('hidden');
        document.getElementById('offerTitle').textContent = `🎉 ${offer.title}`;
        document.getElementById('offerDesc').textContent = `${offer.discount_percent}% ছাড়! Code: ${offer.code}`;
      }
    }
  } catch(e) {}
}

async function submitPayment() {
  const trx = document.getElementById('trxInput').value.trim();
  if (!trx) { toast('⚠️ Transaction ID লিখুন'); return; }
  
  const user = BDAiAuth.getCurrentUser();
  if (!user) { toast('❌ Login করুন'); return; }

  try {
    await BDAiPayment.submitRequest(user.uid, selectedPlan, selectedPayMethod, trx);
    toast('✅ Submit হয়েছে! Admin verify করবেন। ২৪ ঘন্টার মধ্যে Premium হবে।');
    document.getElementById('trxInput').value = '';
  } catch(e) {
    toast('❌ Submit হয়নি। আবার চেষ্টা করুন।');
  }
}

// ── USAGE ──
async function loadUsage() {
  const usage = await BDAiUser.getUsage();
  const isPrem = BDAiUser.isPremium();
  const limits = { chat: 50, image: 10, code: 5, video: 2 };
  
  Object.keys(limits).forEach(key => {
    const used = usage[key] || 0;
    const limit = limits[key];
    const pct = isPrem ? 0 : Math.min(100, (used/limit)*100);
    const fillEl = document.getElementById(`uf-${key === 'image' ? 'img' : key === 'video' ? 'vid' : key}`);
    const numEl = document.getElementById(`un-${key === 'image' ? 'img' : key === 'video' ? 'vid' : key}`);
    if (fillEl) fillEl.style.width = pct + '%';
    if (numEl) numEl.textContent = isPrem ? `∞` : `${used}/${limit}`;
  });

  // Profile info
  const user = BDAiAuth.getCurrentUser();
  if (user) {
    const initial = user.displayName?.charAt(0)?.toUpperCase() || 'আ';
    const av = document.getElementById('profAv');
    const nm = document.getElementById('profName');
    const em = document.getElementById('profEmail');
    if (av) av.textContent = initial;
    if (nm) nm.textContent = user.displayName || 'BDAi User';
    if (em) em.textContent = user.email || '';
  }
}

// ── ADMIN FUNCTIONS ──
async function loadAdminStats() {
  try {
    const stats = await BDAiAdmin.getStats();
    ['stat-total','stat-prem','stat-pending','stat-rev'].forEach((id, i) => {
      const el = document.getElementById(id);
      if (!el) return;
      const vals = [stats.total_users, stats.premium_users, stats.pending_payments, `৳${stats.monthly_revenue.toLocaleString()}`];
      el.textContent = vals[i];
    });
    const pb = document.getElementById('pendingBadge');
    if (pb) pb.textContent = stats.pending_payments;
  } catch(e) {}
}

async function loadPayMethodCards() {
  const container = document.getElementById('payMethodCards');
  if (!container) return;
  try {
    const methods = await BDAiAdmin.getPaymentMethods();
    if (methods.length === 0) {
      container.innerHTML = '<div style="color:#56568a;font-size:12px;padding:10px 0">কোনো payment method নেই। নিচে যোগ করুন।</div>';
      return;
    }
    container.innerHTML = methods.map(m => `
      <div class="pmc">
        <div class="pmc-h"><div class="pmc-ic">${getPayIcon(m.type)}</div><div class="pmc-n">${m.name || m.type}</div><span class="abadge ${m.active!==false?'ab-g':'ab-r'}">${m.active!==false?'Active':'Disabled'}</span></div>
        <div class="pmc-num">${m.number}</div>
        <div class="pmc-note">${m.note || ''}</div>
        <div class="pmc-acts">
          <button class="pmc-btn" style="background:rgba(0,212,170,.1);border-color:rgba(0,212,170,.3);color:#00d4aa" onclick="editPayNum('${m.id}','${m.number}')">✏️ Edit</button>
          <button class="pmc-btn" style="background:rgba(255,170,0,.1);border-color:rgba(255,170,0,.3);color:#ffaa00" onclick="togglePayMethod('${m.id}',${m.active!==false})">⏸ ${m.active!==false?'Disable':'Enable'}</button>
          <button class="pmc-btn" style="background:rgba(255,64,96,.1);border-color:rgba(255,64,96,.3);color:#ff4060" onclick="deletePayMethod('${m.id}')">🗑️ Delete</button>
        </div>
      </div>`).join('');
  } catch(e) { container.innerHTML = '<div style="color:#ff4060;font-size:12px">Error loading methods</div>'; }
}

async function addPaymentMethod() {
  const type = document.getElementById('newPmType').value;
  const number = document.getElementById('newPmNum').value.trim();
  const name = document.getElementById('newPmName').value.trim();
  const note = document.getElementById('newPmNote').value.trim();
  const assign = document.getElementById('newPmAssign').value;
  
  if (!number) { toast('⚠️ নম্বর দিন'); return; }
  
  const typeLabels = { bkash:'bKash', nagad:'Nagad', rocket:'Rocket', bank:'Bank', other:'Other' };
  
  try {
    await BDAiAdmin.addPaymentMethod({ type, number, name: name||typeLabels[type], note, assigned_to: assign, active: true });
    toast('✅ Payment method যোগ হয়েছে!');
    loadPayMethodCards();
    loadPaymentMethods();
    ['newPmNum','newPmName','newPmNote'].forEach(id => document.getElementById(id).value = '');
  } catch(e) { toast('❌ Error: ' + e.message); }
}

async function editPayNum(id, current) {
  const newNum = prompt(`নতুন নম্বর দিন (বর্তমান: ${current})`);
  if (newNum) {
    await BDAiAdmin.updatePaymentMethod(id, { number: newNum });
    toast('✅ নম্বর update হয়েছে!');
    loadPayMethodCards();
    loadPaymentMethods();
  }
}

async function togglePayMethod(id, isActive) {
  await BDAiAdmin.updatePaymentMethod(id, { active: !isActive });
  toast(isActive ? '⏸ Disabled' : '✅ Enabled');
  loadPayMethodCards();
}

async function deletePayMethod(id) {
  if (confirm('মুছে ফেলবেন?')) {
    await BDAiAdmin.deletePaymentMethod(id);
    toast('🗑️ Deleted');
    loadPayMethodCards();
    loadPaymentMethods();
  }
}

async function loadKnowledgeBox() {
  try {
    const [pending, answered] = await Promise.all([
      BDAiAdmin.getUnanswered(),
      BDAiAdmin.getAnswered()
    ]);
    
    const pEl = document.getElementById('kbPending');
    const aEl = document.getElementById('kbAnswered');
    
    if (pEl) pEl.innerHTML = pending.length === 0 ? '<div style="color:#56568a;font-size:12px;padding:10px 0">কোনো pending নেই ✅</div>' :
      pending.map(q => `
        <div class="kb-card">
          <div class="kb-q">❓ ${q.question}<span class="kb-tag kt-p">pending</span><span style="font-size:10px;color:#56568a;margin-left:4px">${q.count||1} বার</span></div>
          <textarea class="ata" id="ans-${q.id}" placeholder="উত্তর লিখুন..."></textarea>
          <button class="abtn ab-a" style="margin:0" onclick="saveKbAnswer('${q.id}')">💾 Save</button>
        </div>`).join('');
    
    if (aEl) aEl.innerHTML = answered.slice(0,10).map(q => `
      <div class="kb-card">
        <div class="kb-q">❓ ${q.question}<span class="kb-tag kt-a">answered</span></div>
        <div class="kb-a">${q.answer}</div>
      </div>`).join('');
  } catch(e) {}
}

async function saveKbAnswer(id) {
  const inp = document.getElementById(`ans-${id}`);
  if (!inp?.value.trim()) { toast('⚠️ উত্তর লিখুন'); return; }
  await BDAiAdmin.answerQuestion(id, inp.value.trim());
  toast('✅ Save হয়েছে!');
  loadKnowledgeBox();
}

async function loadUserList() {
  const container = document.getElementById('userList');
  if (!container) return;
  try {
    const users = await BDAiAdmin.getUsers(20);
    container.innerHTML = users.map(u => `
      <div class="a-row">
        <div class="a-ic" style="background:rgba(0,212,170,.1)">👤</div>
        <div class="a-main"><div class="a-title">${u.name||'Unknown'}</div><div class="a-sub">${u.email||u.uid}</div></div>
        <span class="abadge ${u.plan==='premium'?'ab-g':u.plan==='banned'?'ab-r':'ab-y'}">${u.plan||'free'}</span>
      </div>`).join('');
  } catch(e) { container.innerHTML = '<div style="color:#ff4060;font-size:12px">Error</div>'; }
}

function searchUsers(val) {
  // TODO: implement search
}

async function manualActivate() {
  const email = document.getElementById('activateEmail').value.trim();
  const plan = document.getElementById('activatePlan').value;
  const note = document.getElementById('activateNote').value.trim();
  if (!email) { toast('⚠️ Email দিন'); return; }
  
  // Find user by email
  try {
    const snap = await _db.collection('users').where('email','==',email).get();
    if (snap.empty) { toast('❌ User পাওয়া যায়নি'); return; }
    const uid = snap.docs[0].id;
    await BDAiAdmin.activatePremium(uid, plan, note);
    toast('✅ Premium activated!');
    document.getElementById('activateEmail').value = '';
    loadAdminStats();
  } catch(e) { toast('❌ Error: ' + e.message); }
}

async function loadPendingPayments() {
  const container = document.getElementById('pendingList');
  if (!container) return;
  try {
    const pending = await BDAiAdmin.getPendingPayments();
    if (pending.length === 0) {
      container.innerHTML = '<div style="color:#56568a;font-size:12px;text-align:center;padding:20px">কোনো pending payment নেই ✅</div>';
      return;
    }
    container.innerHTML = pending.map(p => `
      <div class="pmc" style="margin-bottom:10px">
        <div style="font-size:12.5px;color:#dde0f5;font-weight:600;margin-bottom:4px">${p.uid?.slice(0,20)}...</div>
        <div style="font-size:11.5px;color:#00d4aa">Plan: ${p.plan} | TXN: ${p.trxId}</div>
        <div class="pmc-acts" style="margin-top:8px">
          <button class="pmc-btn" style="background:rgba(0,212,170,.1);border-color:rgba(0,212,170,.3);color:#00d4aa" onclick="verifyPay('${p.id}',true)">✅ Approve</button>
          <button class="pmc-btn" style="background:rgba(255,64,96,.1);border-color:rgba(255,64,96,.3);color:#ff4060" onclick="verifyPay('${p.id}',false)">❌ Reject</button>
        </div>
      </div>`).join('');
  } catch(e) { container.innerHTML = '<div style="color:#ff4060">Error</div>'; }
}

async function verifyPay(id, approve) {
  await BDAiAdmin.verifyPayment(id, approve);
  toast(approve ? '✅ Approved! Premium activated.' : '❌ Rejected.');
  loadPendingPayments();
  loadAdminStats();
}

function loadWelcomeEdit() {
  const brand = brandData;
  const fEl = document.getElementById('welcomeFreeEdit');
  const pEl = document.getElementById('welcomePremEdit');
  if (fEl) fEl.value = brand.welcome_free || '';
  if (pEl) pEl.value = brand.welcome_premium || '';
}

async function saveWelcome() {
  const fMsg = document.getElementById('welcomeFreeEdit').value.trim();
  const pMsg = document.getElementById('welcomePremEdit').value.trim();
  await BDAiAdmin.updateWelcome(fMsg, pMsg);
  brandData.welcome_free = fMsg;
  brandData.welcome_premium = pMsg;
  applyBrand();
  toast('✅ Welcome message update হয়েছে!');
}

function loadBrandEdit() {
  const b = brandData;
  if (document.getElementById('brandName')) document.getElementById('brandName').value = b.name || '';
  if (document.getElementById('brandTagline')) document.getElementById('brandTagline').value = b.tagline || '';
  if (document.getElementById('brandAbout')) document.getElementById('brandAbout').value = b.about || '';
  
  // Icon grid
  const grid = document.getElementById('iconGrid');
  if (grid && b.icons) {
    grid.innerHTML = Object.keys(b.icons).map(k => `
      <div style="background:#0d0d1a;border:1px solid #1e1e38;border-radius:10px;padding:10px;text-align:center;cursor:pointer" onclick="changeIcon('${k}')">
        <div style="font-size:22px;margin-bottom:4px" id="igrid-${k}">${b.icons[k]}</div>
        <div style="font-size:10px;color:#56568a">${k}</div>
      </div>`).join('');
  }
}

function changeIcon(feature) {
  const newIcon = prompt(`"${feature}" এর নতুন icon দিন (emoji):`);
  if (newIcon) {
    BDAiAdmin.updateIcon(feature, newIcon).then(() => {
      if (brandData.icons) brandData.icons[feature] = newIcon;
      const el = document.getElementById(`igrid-${feature}`);
      if (el) el.textContent = newIcon;
      const homeEl = document.getElementById(`icon-${feature}`);
      if (homeEl) homeEl.textContent = newIcon;
      toast('✅ Icon update হয়েছে!');
    });
  }
}

async function saveBrand() {
  const name = document.getElementById('brandName').value.trim();
  const tagline = document.getElementById('brandTagline').value.trim();
  const about = document.getElementById('brandAbout').value.trim();
  await BDAiAdmin.updateBrand({ name, tagline, about });
  brandData = { ...brandData, name, tagline, about };
  applyBrand();
  toast('✅ Brand update হয়েছে!');
}

function changeLogo() {
  toast('📸 Logo change: Firebase Storage এ upload করুন এবং URL দিন।');
}

async function createOffer() {
  const title = document.getElementById('offerTitle2').value.trim();
  const disc = parseInt(document.getElementById('offerDisc').value);
  const code = document.getElementById('offerCode').value.trim();
  const desc = document.getElementById('offerDesc2').value.trim();
  if (!title||!disc||!code) { toast('⚠️ সব field পূরণ করুন'); return; }
  await BDAiAdmin.addOffer({ title, discount_percent: disc, code, description: desc });
  toast('🎁 Offer তৈরি হয়েছে!');
  loadOffers();
}

async function sendNotification() {
  const title = document.getElementById('notifTitle').value.trim();
  const body = document.getElementById('notifBody').value.trim();
  const target = document.getElementById('notifTarget').value;
  if (!title||!body) { toast('⚠️ Title ও message দিন'); return; }
  await BDAiAdmin.sendNotification(title, body, target);
  toast('📢 Notification পাঠানো হয়েছে!');
  document.getElementById('notifTitle').value = '';
  document.getElementById('notifBody').value = '';
}

async function loadSlotRequests() {
  const container = document.getElementById('slotRequests');
  if (!container) return;
  try {
    const requests = await BDAiAdmin.getSlotRequests();
    if (requests.length === 0) {
      container.innerHTML = '<div style="color:#56568a;font-size:12px;padding:10px 14px">কোনো request নেই।</div>';
      return;
    }
    container.innerHTML = requests.map(r => `
      <div class="a-row">
        <div class="a-main"><div class="a-title">${r.uid?.slice(0,15)}...</div><div class="a-sub">${r.reason||'More slots needed'}</div></div>
        <button onclick="approveSlots('${r.id}')" style="padding:5px 10px;background:rgba(0,212,170,.15);border:1px solid rgba(0,212,170,.3);border-radius:7px;cursor:pointer;font-size:10.5px;color:#00d4aa;font-family:var(--font)">Approve</button>
      </div>`).join('');
  } catch(e) {}
}

async function approveSlots(reqId) {
  const slots = prompt('কতটা slot দেবেন?', '20');
  if (slots) {
    await BDAiAdmin.approveSlotRequest(reqId, parseInt(slots));
    toast(`✅ ${slots} slots approved!`);
    loadSlotRequests();
  }
}

async function addDistributor() {
  const email = document.getElementById('distEmail').value.trim();
  const area = document.getElementById('distArea').value.trim();
  const slots = parseInt(document.getElementById('distSlots').value) || 10;
  if (!email) { toast('⚠️ Email দিন'); return; }
  
  try {
    const snap = await _db.collection('users').where('email','==',email).get();
    if (snap.empty) { toast('❌ User পাওয়া যায়নি। আগে register করতে হবে।'); return; }
    const uid = snap.docs[0].id;
    await _db.collection('users').doc(uid).update({ plan: 'distributor', area });
    await BDAiAdmin.setDistributorSlots(uid, slots);
    toast(`✅ ${email} Distributor হয়েছে! Slots: ${slots}`);
    document.getElementById('distEmail').value = '';
    document.getElementById('distArea').value = '';
  } catch(e) { toast('❌ Error: ' + e.message); }
}

// ── MISC ──
function attachFile() { toast('📎 File upload শীঘ্রই আসছে'); }
function attachImage() { toast('🖼️ Image upload শীঘ্রই আসছে'); }
function showHistory() { toast('📜 Chat history Firebase এ সংরক্ষিত'); }
function showNotifications() { toast('🔔 কোনো নতুন notification নেই'); }
function showAbout() { toast('BDAi — বাংলাদেশের নিজস্ব AI প্ল্যাটফর্ম। © 2025 BDAi by Azad'); }
function applyOffer() { toast('🎉 Offer code কপি করুন ও payment এ ব্যবহার করুন'); }

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 3000);
}

// Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
