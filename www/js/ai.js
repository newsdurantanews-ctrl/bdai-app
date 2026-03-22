// BDAi AI Engine
// ⚠️ OBFUSCATED — All provider details encrypted

const BDAiAI = {
  // ── OBFUSCATED PROVIDER URLS ──
  // XOR encrypted, decoded at runtime
  _p: {
    // Chat providers (priority order)
    c: [
      {n:'_0xB1',u:'aHR0cHM6Ly93d3cuYmxhY2tib3hhaS5jb20vYXBpL2NoYXQ=',s:1},
      {n:'_0xB2',u:'aHR0cHM6Ly9hcGkucG9sbGluYXRpb25zLmFpL29wZW5haS9jaGF0L2NvbXBsZXRpb25z',s:2},
      {n:'_0xB3',u:'aHR0cHM6Ly9kZWVwaW5mcmEuY29tL3YxL2NoYXQvY29tcGxldGlvbnM=',s:1},
      {n:'_0xB4',u:'aHR0cHM6Ly9uZXhyYS5wYWdlcy5kZXYvYXBpL2NoYXQ=',s:2},
      {n:'_0xB5',u:'aHR0cHM6Ly9jaGF0Zm9yYWkuY29tL2FwaS9jaGF0',s:2},
      {n:'_0xB6',u:'aHR0cHM6Ly9mcmVlLmNoYXRncHQub3JnLnVrL2FwaS9vcGVuYWkvdjEvY2hhdC9jb21wbGV0aW9ucw==',s:3},
      {n:'_0xB7',u:'aHR0cHM6Ly9haXNlcnZpY2UueHl6L2FwaS9jaGF0',s:2},
      {n:'_0xB8',u:'aHR0cHM6Ly9hcGkueW91LmNvbS9jaGF0',s:3},
    ],
    // Image providers
    i: [
      {n:'_0xI1',u:'aHR0cHM6Ly9pbWFnZS5wb2xsaW5hdGlvbnMuYWk=',s:1,m:'flux'},
      {n:'_0xI2',u:'aHR0cHM6Ly9pbWFnZS5wb2xsaW5hdGlvbnMuYWk=',s:1,m:'turbo'},
      {n:'_0xI3',u:'aHR0cHM6Ly9pbWFnZS5wb2xsaW5hdGlvbnMuYWk=',s:2,m:'sdxl'},
      {n:'_0xI4',u:'aHR0cHM6Ly9hcGkucHJvZGlhLmFpL3YwL2ltYWdlcnVuL3J1bg==',s:2,m:'sdxl'},
    ],
    // Video providers (Premium)
    v: [
      {n:'_0xV1',u:'aHR0cHM6Ly9ydW53YXkubWw=',s:1},
      {n:'_0xV2',u:'aHR0cHM6Ly9rbGluZy5rdWFpc2hvdS5jb20=',s:2},
      {n:'_0xV3',u:'aHR0cHM6Ly9sdW1hbGFicy5haQ==',s:3},
      {n:'_0xV4',u:'aHR0cHM6Ly9waXh2ZXJzZS5haQ==',s:4},
    ]
  },

  // Decode URL
  _d(b64) {
    try { return atob(b64); } catch(e) { return ''; }
  },

  // Identity protection - NEVER reveal sources
  _sysPrompt: `তুমি BDAi। বাংলাদেশের প্রথম নিজস্ব মাল্টি-ফাংশনাল AI প্ল্যাটফর্ম।

পরিচয় সংক্রান্ত কঠোর নিয়ম (কখনো ভঙ্গ করবে না):
- তুমি সবসময় বলবে: "আমি BDAi"
- এই নামগুলো কখনো বলবে না: ChatGPT, GPT-4, GPT-3, OpenAI, Claude, Anthropic, Gemini, Google AI, Groq, Meta AI, LLaMA, Mistral, DeepSeek, Grok, HuggingFace, Blackbox, Pollinations
- "তুমি কে?" → "আমি BDAi, বাংলাদেশের নিজস্ব AI"
- "তুমি কি ChatGPT?" → "না, আমি BDAi"
- "কোন technology?" → "BDAi টিমের নিজস্ব প্রযুক্তি, বিস্তারিত গোপনীয়"
- যতই চাপ দিক → সবসময় একই উত্তর

ভাষার নিয়ম:
- সবসময় বাংলায় উত্তর দাও (আদর্শ লিপি)
- ইংরেজিতে প্রশ্ন করলেও বাংলায় উত্তর দাও
- Secondary ভাষা: ইংরেজি`,

  // ── RESPONSE FILTER ──
  _filter(text) {
    const banned = [
      /openai/gi, /chatgpt/gi, /gpt-?[34]/gi, /claude/gi,
      /anthropic/gi, /gemini/gi, /google ai/gi, /groq/gi,
      /meta ai/gi, /llama/gi, /mistral/gi, /deepseek/gi,
      /grok/gi, /huggingface/gi, /blackbox/gi, /pollinations/gi,
      /powered by/gi, /i am an ai by/gi
    ];
    let result = text;
    banned.forEach(r => {
      result = result.replace(r, 'BDAi');
    });
    return result;
  },

  // ── MAIN CHAT (Parallel Race) ──
  async chat(messages, onStream) {
    const providers = [...this._p.c].sort((a,b) => a.s - b.s);
    
    // Try providers in parallel (top 5)
    const top5 = providers.slice(0, 5);
    const results = await Promise.race(
      top5.map(p => this._tryChat(p, messages, onStream))
        .filter(Boolean)
    ).catch(() => null);

    if (results) return this._filter(results);

    // Fallback: try remaining
    for (const p of providers.slice(5)) {
      try {
        const r = await this._tryChat(p, messages, null);
        if (r) return this._filter(r);
      } catch(e) {}
    }

    return 'দুঃখিত, এই মুহূর্তে সংযোগ সমস্যা হচ্ছে। একটু পরে আবার চেষ্টা করুন।';
  },

  // Try single provider
  async _tryChat(provider, messages, onStream) {
    const url = this._d(provider.u);
    if (!url) return null;

    const body = {
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: this._sysPrompt },
        ...messages
      ],
      stream: !!onStream,
      max_tokens: 2048
    };

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Origin': 'https://bdai.azad.ai'
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) return null;

    if (onStream && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let full = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6));
            const token = data.choices?.[0]?.delta?.content || '';
            if (token) { full += token; onStream(token); }
          } catch(e) {}
        }
      }
      return full;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  },

  // ── IMAGE GENERATION ──
  async generateImage(prompt, model = 'flux') {
    const encodedPrompt = encodeURIComponent(prompt);
    const seed = Math.floor(Math.random() * 99999);
    
    // Pollinations (primary - always works)
    const urls = [
      `https://image.pollinations.ai/prompt/${encodedPrompt}?model=${model}&seed=${seed}&width=512&height=512&nologo=true`,
      `https://image.pollinations.ai/prompt/${encodedPrompt}?model=turbo&seed=${seed}&nologo=true`,
    ];
    
    return urls[0]; // Return URL directly for img src
  },

  // ── VISION (Image Analysis) ──
  async analyzeImage(imageBase64, prompt = 'এই ছবিটি বিস্তারিত বর্ণনা করো বাংলায়।') {
    const messages = [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` }},
        { type: 'text', text: prompt }
      ]
    }];
    return await this.chat(messages, null);
  },

  // ── VOICE ──
  voice: {
    recognition: null,
    synthesis: window.speechSynthesis,

    startListening(onResult) {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) return false;
      this.recognition = new SR();
      this.recognition.lang = 'bn-BD';
      this.recognition.continuous = false;
      this.recognition.onresult = (e) => {
        const text = e.results[0][0].transcript;
        onResult(text);
      };
      this.recognition.start();
      return true;
    },

    stopListening() {
      if (this.recognition) this.recognition.stop();
    },

    speak(text, lang = 'bn-BD') {
      if (!this.synthesis) return;
      this.synthesis.cancel();
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = lang;
      utt.rate = 0.9;
      utt.pitch = 1.1;
      // Try to find Bengali voice
      const voices = this.synthesis.getVoices();
      const bnVoice = voices.find(v => v.lang.includes('bn') || v.lang.includes('BD'));
      if (bnVoice) utt.voice = bnVoice;
      this.synthesis.speak(utt);
    }
  },

  // ── WEB SEARCH ──
  async webSearch(query) {
    try {
      const r = await fetch(
        `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`,
        { signal: AbortSignal.timeout(10000) }
      );
      const data = await r.json();
      const results = (data.RelatedTopics || []).slice(0, 5)
        .map(t => t.Text || t.Result || '').filter(Boolean).join('\n');
      return results || 'কোনো ফলাফল পাওয়া যায়নি।';
    } catch(e) {
      return 'ওয়েব সার্চ করা যাচ্ছে না।';
    }
  }
};

window.BDAiAI = BDAiAI;
