/* ============================================================
   app.js — ことばずかん アプリロジック
   ============================================================ */

// ========== タブ切り替え ==========
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(target).classList.add('active');
  });
});

// ========== ことばをしらべる ==========
const searchInput = document.getElementById('searchInput');
const acList      = document.getElementById('autocomplete');
const resultArea  = document.getElementById('resultArea');

// ── オートコンプリート ──
searchInput.addEventListener('input', () => {
  const q = searchInput.value.trim();
  if (!q) { acList.classList.remove('show'); return; }

  const hits = DICTIONARY.filter(d =>
    d.word.includes(q) || d.read.includes(q) || d.en.toLowerCase().includes(q.toLowerCase())
  ).slice(0, 6);

  if (!hits.length) { acList.classList.remove('show'); return; }

  acList.innerHTML = hits.map(d => `
    <li class="autocomplete-item" data-word="${d.word}">
      <span>${d.word} <small class="read">（${d.read}）</small></span>
      <span class="ac-subject badge-${d.subject}">${d.subject}</span>
    </li>`).join('');
  acList.classList.add('show');
});

acList.addEventListener('click', e => {
  const item = e.target.closest('.autocomplete-item');
  if (!item) return;
  searchInput.value = item.dataset.word;
  acList.classList.remove('show');
  doSearch();
});

document.addEventListener('click', e => {
  if (!e.target.closest('.search-box')) acList.classList.remove('show');
});

// ── Enterキー ──
searchInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    acList.classList.remove('show');
    searchInput.blur();
    doSearch();
  }
});

// ── 検索ボタン ──
document.getElementById('searchBtn').addEventListener('click', doSearch);

// ── タグ検索 ──
document.querySelectorAll('.tag-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    searchInput.value = btn.dataset.q;
    acList.classList.remove('show');
    doSearch();
  });
});

// ── 教科バッジ色取得 ──
function badgeColor(subject) {
  const map = {
    '算数': '#FF9A3C',
    '国語': '#FF6B9D',
    '理科': '#6BCB77',
    '社会': '#4D96FF',
    '生活': '#56CFE1',
  };
  return map[subject] || '#999';
}

// ── 検索実行 ──
function doSearch() {
  const q = searchInput.value.trim();
  if (!q) {
    showMsg('🔍', 'ことばを入力してください');
    return;
  }

  const hits = DICTIONARY.filter(d =>
    d.word === q ||
    d.read === q ||
    d.en.toLowerCase() === q.toLowerCase()
  );

  // 完全一致がなければ部分一致
  const results = hits.length
    ? hits
    : DICTIONARY.filter(d =>
        d.word.includes(q) || d.read.includes(q) ||
        d.en.toLowerCase().includes(q.toLowerCase())
      );

  if (!results.length) {
    showMsg('😥', `「${q}」は辞書に見つかりませんでした。<br>ちがうことばで試してみてね。`);
    return;
  }

  resultArea.innerHTML = `<div class="multi-result-list">${results.map(buildCard).join('')}</div>`;

  // コピーボタンのイベント設定
  resultArea.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const text = btn.dataset.text;
      navigator.clipboard.writeText(text).then(() => {
        btn.textContent = '✅ コピーした！';
        setTimeout(() => { btn.textContent = '📋 コピーする'; }, 2000);
      }).catch(() => {
        btn.textContent = 'エラー';
      });
    });
  });
}

function buildCard(d) {
  const copyText = `【${d.word}（${d.read}）】\n英語：${d.en}\n意味：${d.mean}\n説明：${d.desc}`;
  return `
    <div class="result-card subject-${d.subject}">
      <div class="result-word">
        ${d.word}
        <span class="result-read">（${d.read}）</span>
        <span class="subject-badge badge-${d.subject}">${d.subject}</span>
      </div>
      <div class="result-en">🌍 ${d.en}</div>
      <div class="result-mean">📖 ${d.mean}</div>
      <div class="result-desc">${d.desc}</div>
      <button class="copy-btn" data-text="${escapeAttr(copyText)}">📋 コピーする</button>
    </div>`;
}

function showMsg(icon, text) {
  resultArea.innerHTML = `
    <div class="msg-box">
      <div class="icon">${icon}</div>
      <p>${text}</p>
    </div>`;
}

function escapeAttr(str) {
  return str.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ========== かんじにする ==========
const convertInput  = document.getElementById('convertInput');
const convertResult = document.getElementById('convertResult');
const rubyToggle    = document.getElementById('rubyToggle');

document.getElementById('convertBtn').addEventListener('click', doConvert);
document.getElementById('convertClearBtn').addEventListener('click', () => {
  convertInput.value = '';
  convertResult.innerHTML = '';
  convertInput.focus();
});

convertInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.ctrlKey) doConvert();
});

// ── ひらがな → 漢字 変換ロジック ──
function doConvert() {
  const input = convertInput.value.trim();
  if (!input) {
    convertResult.innerHTML = `
      <div class="msg-box">
        <div class="icon">✏️</div>
        <p>ひらがなの文を入力してください。</p>
      </div>`;
    return;
  }

  // 長い語を先に並べたマップ（1回だけソート）
  const sortedMap = [...CONVERT_MAP]
    .filter(([k]) => k && k.length > 0)
    .sort((a, b) => b[0].length - a[0].length);

  const showRuby = rubyToggle.checked;

  // 変換実行
  const { plain, ruby } = convertText(input, sortedMap, showRuby);

  convertResult.innerHTML = `
    <div class="convert-result-card">
      <div class="convert-section-title">📝 もとの文</div>
      <div class="convert-original">${escapeHtml(input)}</div>
      <div class="convert-section-title">📖 かんじに変換</div>
      <div class="convert-output">${showRuby ? ruby : escapeHtml(plain)}</div>
      <button class="convert-copy-btn" id="convertCopyBtn">📋 コピーする</button>
    </div>`;

  document.getElementById('convertCopyBtn').addEventListener('click', () => {
    navigator.clipboard.writeText(plain).then(() => {
      document.getElementById('convertCopyBtn').textContent = '✅ コピーした！';
      setTimeout(() => {
        document.getElementById('convertCopyBtn').textContent = '📋 コピーする';
      }, 2000);
    });
  });
}

/**
 * 一回通過方式（Left-to-right longest match）で変換
 * 左から1文字ずつ見て、その位置で最長一致するエントリーを使う
 * → 変換済みの漢字が再度変換されることがない
 */
function convertText(input, sortedMap, buildRuby) {
  let plainResult = '';
  let rubyResult  = '';
  let i = 0;

  while (i < input.length) {
    let matched = false;

    for (const [kana, kanji] of sortedMap) {
      if (input.startsWith(kana, i)) {
        plainResult += kanji;
        if (buildRuby) {
          // かな → 変換後がそのままの場合はrubyなし
          if (kana === kanji) {
            rubyResult += escapeHtml(kanji);
          } else {
            rubyResult += `<ruby>${escapeHtml(kanji)}<rt>${escapeHtml(kana)}</rt></ruby>`;
          }
        }
        i += kana.length;
        matched = true;
        break; // 最長一致なのでsortedMapの先頭ヒットでOK
      }
    }

    if (!matched) {
      // 変換できない文字はそのまま出力
      const ch = input[i];
      plainResult += ch;
      if (buildRuby) rubyResult += escapeHtml(ch);
      i++;
    }
  }

  return { plain: plainResult, ruby: rubyResult };
}


function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
