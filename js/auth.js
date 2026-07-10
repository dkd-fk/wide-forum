// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WIDE Forum — auth.js
// 익명 코드 & 관리자 코드 검증
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import {
  LS_CODE, LS_CODE_SKIP, LS_MY_POSTS,
  activeCodeHash, myPostsMap,
  simpleHash, saveMyPosts,
  setActiveCodeHash
} from './store.js';

// ── 관리자 코드 해시 목록 (수뇌부 3명) ──
// 실제 배포 전 반드시 변경할 것
const ADMIN_CODE_HASHES = new Set([
  simpleHash('ADMIN01'),
  simpleHash('ADMIN02'),
  simpleHash('ADMIN03'),
]);

export function isAdmin() {
  return activeCodeHash ? ADMIN_CODE_HASHES.has(activeCodeHash) : false;
}

// ── 코드 UI 상태 업데이트 ──
export function updateCodeUI() {
  const banner  = document.getElementById('code-banner');
  const status  = document.getElementById('code-status');
  const skipped = localStorage.getItem(LS_CODE_SKIP);

  if (activeCodeHash) {
    banner.classList.add('hidden');
    status.classList.remove('hidden');
    document.getElementById('code-status-text').textContent =
      isAdmin()
        ? '🔑 관리자 코드 활성 중 — 공지 작성 및 상태 변경 가능'
        : '🔑 익명 코드 활성 중 — 내 안건에서 [작성자] 댓글 가능';
  } else {
    status.classList.add('hidden');
    skipped
      ? banner.classList.add('hidden')
      : banner.classList.remove('hidden');
  }
}

// ── 코드 오버레이 열기 ──
let codeOverlayMode = 'set';

export function openCodeOverlay(mode) {
  codeOverlayMode = mode;
  const texts = {
    set: {
      title: '🔑 익명 코드 설정',
      body: '본인만 기억하는 4~8자리 코드를 설정해 주세요.<br>이 코드는 서버에 저장되지 않으며, 분실 시 복구가 불가능합니다.',
      label: '코드 입력 (영문·숫자 4~8자)',
      hint: '코드는 이 기기의 브라우저에만 저장됩니다.'
    },
    login: {
      title: '🔑 익명 코드로 복원',
      body: '이전에 설정한 코드를 입력하면<br>내 안건에서 [작성자] 권한이 복원됩니다.',
      label: '기존 코드 입력',
      hint: '코드를 분실한 경우 복구가 불가능합니다.'
    }
  };
  const t = texts[mode];
  document.getElementById('code-popup-title').textContent  = t.title;
  document.getElementById('code-popup-body').innerHTML     = t.body;
  document.getElementById('code-input-label').textContent  = t.label;
  document.getElementById('code-hint').textContent         = t.hint;
  document.getElementById('code-input-field').value        = '';
  document.getElementById('code-error').style.display      = 'none';
  document.getElementById('code-overlay').classList.remove('hidden');
  setTimeout(() => document.getElementById('code-input-field').focus(), 100);
}

// ── 코드 확인 버튼 로직 ──
export function handleCodeConfirm(onSuccess) {
  const val    = document.getElementById('code-input-field').value.trim().toUpperCase();
  const errEl  = document.getElementById('code-error');

  if (val.length < 4) {
    errEl.textContent     = '4자리 이상 입력해 주세요.';
    errEl.style.display   = 'block';
    return;
  }

  const hash = simpleHash(val);

  if (codeOverlayMode === 'set') {
    if (activeCodeHash && activeCodeHash !== hash) {
      if (!confirm('기존 코드를 새 코드로 교체하시겠습니까?')) return;
    }
    // 임시 세션 게시물 → 새 코드로 이전
    if (myPostsMap['session_anon']?.length) {
      if (!myPostsMap[hash]) myPostsMap[hash] = [];
      const merged = new Set([...myPostsMap[hash], ...myPostsMap['session_anon']]);
      myPostsMap[hash] = Array.from(merged);
      myPostsMap['session_anon'] = [];
      saveMyPosts();
    }
    setActiveCodeHash(hash);
    localStorage.setItem(LS_CODE, hash);

  } else {
  // 관리자 코드면 안건 없어도 통과
  const isAdminCode = ADMIN_CODE_HASHES.has(hash);
  if (!isAdminCode && !myPostsMap[hash]?.length) {
    errEl.textContent   = '해당 코드로 등록된 안건이 없습니다.';
    errEl.style.display = 'block';
    return;
  }
  setActiveCodeHash(hash);
  localStorage.setItem(LS_CODE, hash);
}

  document.getElementById('code-overlay').classList.add('hidden');
  document.getElementById('code-banner').classList.add('hidden');
  onSuccess?.();
}