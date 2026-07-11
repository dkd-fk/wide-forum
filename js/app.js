// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WIDE Forum — app.js
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import {
  posts, activeCodeHash, myPostsMap,
  pendingRefinedText, pendingSubmit, currentPromptIdx, testMode,
  MICRO_QUESTIONS, LS_CODE, LS_CODE_SKIP,
  addMyPost, savePostsToSession, setPosts, setMicroQuestions,
  genBarcode, setActiveCodeHash, setPendingSubmit,
  setPendingRefinedText, setCurrentPromptIdx, setTestMode
} from './store.js';

import {
  callGroq, fetchPosts, fetchQuestions,
  savePost, deletePost, updateStatus
} from './api.js';

import {
  updateCodeUI, openCodeOverlay, handleCodeConfirm, isAdmin
} from './auth.js';

import { renderFeed } from './components/feed.js';
import { showToast, closeModal, submitComment } from './components/modal.js';

export function refreshFeed() { renderFeed(); }
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 작성 시트 열기/닫기
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function openSheet() {
  document.getElementById('write-sheet').classList.add('active');
  document.getElementById('btn-fab').style.display = 'none';
  setTimeout(() => document.getElementById('post-input').focus(), 300);
}
function closeSheet() {
  document.getElementById('write-sheet').classList.remove('active');
  document.getElementById('btn-fab').style.display = 'flex';
  document.getElementById('ai-preview').classList.remove('visible');
  setPendingRefinedText(null);
}

document.getElementById('btn-fab').addEventListener('click', openSheet);
document.getElementById('btn-sheet-close').addEventListener('click', closeSheet);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 테스트 모드
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function toggleTestMode() {
  setTestMode(!testMode);
  const banner = document.getElementById('test-mode-banner');
  const btn    = document.getElementById('menu-test-mode');
  if (testMode) {
    banner.classList.remove('hidden');
    btn.textContent = '테스트 모드 OFF';
  } else {
    banner.classList.add('hidden');
    btn.textContent = '테스트 모드 ON';
  }
  document.getElementById('header-menu-dropdown').classList.remove('active');
  renderFeed();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 관리자 UI
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function updateAdminUI() {
  const row      = document.querySelector('.type-select-row');
  const existing = document.querySelector('.type-select-btn[data-type="notice"]');
  if (isAdmin()) {
    if (!existing) {
      const btn = document.createElement('button');
      btn.className   = 'type-select-btn notice';
      btn.dataset.type = 'notice';
      btn.textContent = '공지';
      btn.addEventListener('click', () => {
        document.querySelectorAll('.type-select-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedPostType = 'notice';
      });
      row.prepend(btn);
    }
  } else {
    existing?.remove();
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 안건 삭제
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function handleDeletePost(id) {
  if (!confirm('이 안건을 삭제하시겠습니까?')) return;
  const idx = posts.findIndex(p => p.id === id);
  if (idx === -1) return;
  posts.splice(idx, 1);
  savePostsToSession();
  renderFeed();
  if (!testMode) {
    try { await deletePost(id); }
    catch (e) { showToast('Sheets 삭제 실패: ' + e.message); }
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 상태 변경
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function handleUpdateStatus(id, status) {
  const post = posts.find(p => p.id === id);
  if (!post) return;
  post.status = status;
  savePostsToSession();
  renderFeed();
  try { await updateStatus(id, status); }
  catch (e) { showToast('상태 변경 실패: ' + e.message); }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AI 버튼
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const btnAi         = document.getElementById('btn-ai');
const aiPreview     = document.getElementById('ai-preview');
const aiPreviewText = document.getElementById('ai-preview-text');
const postInput     = document.getElementById('post-input');

btnAi.addEventListener('click', async () => {
  const val = postInput.value.trim();
  if (!val) { showToast('내용을 먼저 입력해주세요.'); return; }
  btnAi.classList.add('loading');
  btnAi.disabled = true;
  aiPreview.classList.remove('visible');
  try {
    const refined = await callGroq(val);
    setPendingRefinedText(refined);
    aiPreviewText.textContent = refined;
    aiPreview.classList.add('visible');
  } catch (e) {
    showToast('AI 정제 실패: ' + e.message);
  } finally {
    btnAi.classList.remove('loading');
    btnAi.disabled = false;
  }
});

document.getElementById('btn-ai-use').addEventListener('click', () => {
  if (!pendingRefinedText) return;
  doSubmit(pendingRefinedText, selectedPostType);
  aiPreview.classList.remove('visible');
  setPendingRefinedText(null);
});
document.getElementById('btn-ai-cancel').addEventListener('click', () => {
  aiPreview.classList.remove('visible');
  setPendingRefinedText(null);
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 글 등록
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
let selectedPostType = 'general';

document.querySelectorAll('.type-select-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.type-select-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedPostType = btn.dataset.type;

    // 마중물 질문 placeholder 타입별 변경
    const placeholders = {
      vote:    '찬성/반대로 결정할 안건을 입력하세요...',
      idea:    '다양한 의견을 모을 안건을 입력하세요...',
      general: MICRO_QUESTIONS[currentPromptIdx] || '자유롭게 의견을 남겨주세요...',
      notice:  '공지 내용을 입력하세요...'
    };
    postInput.placeholder = placeholders[btn.dataset.type] || '';
  });
});

async function doSubmit(text, type = 'general') {
  const val = (text || postInput.value).trim();
  if (!val) return;

  const newId   = 'post_' + Date.now();
  const newPost = {
    id: newId, type, pinned: type === 'notice',
    barcode: genBarcode(), time: '방금 전',
    title: val, status: '',
    agree: 0, disagree: 0, comments: [], nextIdx: 1,
    created_at: new Date().toISOString().slice(0, 10),
    is_test: testMode,
    _createdAt: Date.now()
  };

  posts.unshift(newPost);
  addMyPost(newId);
  savePostsToSession();
  postInput.value = '';
  setPendingRefinedText(null);

  // 타입 초기화
  document.querySelectorAll('.type-select-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('.type-select-btn[data-type="general"]')?.classList.add('active');
  selectedPostType = 'general';

  closeSheet();
  renderFeed();

  if (!testMode) {
    try { await savePost(newPost); }
    catch (e) { showToast('저장 실패: ' + e.message); }
  } else {
    showToast('테스트 모드 — Sheets에 저장되지 않았습니다.');
  }
}

document.getElementById('btn-submit').addEventListener('click', () => {
  const val = postInput.value.trim();
  if (!val) { showToast('내용을 입력해주세요!'); return; }
  if (pendingRefinedText) {
    doSubmit(pendingRefinedText, selectedPostType);
  } else {
    setPendingSubmit(true);
    document.getElementById('guide-overlay').classList.remove('hidden');
  }
});

document.getElementById('popup-cancel').addEventListener('click', () => {
  document.getElementById('guide-overlay').classList.add('hidden');
  setPendingSubmit(false);
});
document.getElementById('popup-ok').addEventListener('click', async () => {
  document.getElementById('guide-overlay').classList.add('hidden');
  if (pendingSubmit) { await doSubmit(null, selectedPostType); setPendingSubmit(false); }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 헤더 메뉴
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
document.getElementById('btn-header-menu').addEventListener('click', e => {
  e.stopPropagation();
  document.getElementById('header-menu-dropdown').classList.toggle('active');
});
document.addEventListener('click', () =>
  document.getElementById('header-menu-dropdown').classList.remove('active')
);
document.getElementById('menu-code-set').addEventListener('click',   () => openCodeOverlay('set'));
document.getElementById('menu-code-login').addEventListener('click', () => openCodeOverlay('login'));
document.getElementById('menu-test-mode').addEventListener('click',  () => toggleTestMode());

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 익명 코드
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
document.getElementById('btn-code-logout').addEventListener('click', () => {
  setActiveCodeHash(null);
  localStorage.removeItem(LS_CODE);
  updateCodeUI();
  updateAdminUI();
  renderFeed();
});
document.getElementById('code-cancel').addEventListener('click', () =>
  document.getElementById('code-overlay').classList.add('hidden')
);
document.getElementById('code-input-field').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('code-confirm').click();
});
document.getElementById('code-confirm').addEventListener('click', () => {
  handleCodeConfirm(() => { updateCodeUI(); updateAdminUI(); renderFeed(); });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 모달
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
document.getElementById('btn-close-modal').addEventListener('click', closeModal);
document.getElementById('btn-comment-submit').addEventListener('click', submitComment);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 초기화
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const sessionPosts = JSON.parse(sessionStorage.getItem('wide_session_posts') || '[]');
if (!activeCodeHash && sessionPosts.length) {
  if (!myPostsMap['session_anon']) myPostsMap['session_anon'] = [];
  sessionPosts.forEach(id => {
    if (!myPostsMap['session_anon'].includes(id)) myPostsMap['session_anon'].push(id);
  });
}

async function init() {
  updateCodeUI();
  updateAdminUI();

  const cached = sessionStorage.getItem('wide_forum_posts');
  if (cached) {
    setPosts(JSON.parse(cached));
    renderFeed();
  } else {
    document.getElementById('feed').innerHTML =
      '<div style="text-align:center;padding:40px;color:var(--text-sub)">불러오는 중...</div>';
  }

  try {
    const [freshPosts, questions] = await Promise.all([fetchPosts(), fetchQuestions()]);
    setPosts(freshPosts);
    savePostsToSession();
    renderFeed();
    if (questions.length) {
      setMicroQuestions(questions.map(q => q.question));
      postInput.placeholder = questions[0].question;
    }
  } catch (e) {
    showToast('데이터 로드 실패: ' + e.message);
  }
}

init();
