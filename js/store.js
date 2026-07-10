// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WIDE Forum — store.js
// 전역 상태 & 데이터 관리
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const LS_CODE      = 'wide_anon_code';
export const LS_MY_POSTS  = 'wide_my_posts';
export const LS_MY_VOTES  = 'wide_my_votes';
export const LS_CODE_SKIP = 'wide_code_skipped';

export let MICRO_QUESTIONS = [];
export function setMicroQuestions(list) { MICRO_QUESTIONS = list; }

export let posts = [];
export function setPosts(data) {
  posts = data.map(p => ({
    ...p,
    nextIdx: p.next_idx || p.nextIdx || 1,
    comments: Array.isArray(p.comments) ? p.comments : []
  }));
}

export let currentPostId      = null;
export let pendingSubmit      = false;
export let pendingRefinedText = null;
export let currentPromptIdx   = 0;
export let testMode           = false;  // 테스트 모드 플래그

export let activeCodeHash = localStorage.getItem(LS_CODE) || null;
export let myPostsMap     = JSON.parse(localStorage.getItem(LS_MY_POSTS) || '{}');
export let myVotes        = JSON.parse(localStorage.getItem(LS_MY_VOTES) || '{}');
export const lastVisit    = sessionStorage.getItem('lastVisit') || null;
sessionStorage.setItem('lastVisit', Date.now().toString());

export function setCurrentPostId(id)       { currentPostId = id; }
export function setPendingSubmit(val)      { pendingSubmit = val; }
export function setPendingRefinedText(val) { pendingRefinedText = val; }
export function setCurrentPromptIdx(val)   { currentPromptIdx = val; }
export function setActiveCodeHash(val)     { activeCodeHash = val; }
export function setTestMode(val)           { testMode = val; }

export function savePostsToSession() {
  sessionStorage.setItem('wide_forum_posts', JSON.stringify(posts));
}
export function saveMyPosts() {
  localStorage.setItem(LS_MY_POSTS, JSON.stringify(myPostsMap));
}
export function saveMyVotes() {
  localStorage.setItem(LS_MY_VOTES, JSON.stringify(myVotes));
}

export function getMyPostIds() {
  if (!activeCodeHash) return myPostsMap['session_anon'] || [];
  return myPostsMap[activeCodeHash] || [];
}
export function addMyPost(id) {
  const key = activeCodeHash || 'session_anon';
  if (!myPostsMap[key]) myPostsMap[key] = [];
  myPostsMap[key].push(id);
  saveMyPosts();
  if (!activeCodeHash) {
    const sp = JSON.parse(sessionStorage.getItem('wide_session_posts') || '[]');
    if (!sp.includes(id)) {
      sp.push(id);
      sessionStorage.setItem('wide_session_posts', JSON.stringify(sp));
    }
  }
}
export function removeMyPost(id) {
  const key = activeCodeHash || 'session_anon';
  if (myPostsMap[key]) {
    myPostsMap[key] = myPostsMap[key].filter(p => p !== id);
    saveMyPosts();
  }
}
export function isMyPost(id) {
  return getMyPostIds().includes(id);
}

export function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return Math.abs(h).toString(16).padStart(8, '0');
}
export function genBarcode() {
  const c = ['┃', '│', '▌', '▐', '█'];
  let b = '';
  for (let i = 0; i < 6; i++) b += c[Math.floor(Math.random() * c.length)];
  return `${b} (익명_N${Math.floor(100 + Math.random() * 900)})`;
}
export function voteRatio(p) {
  const t = p.agree + p.disagree;
  return t ? Math.round(p.agree / t * 100) : 0;
}
export function isNew(post) {
  return lastVisit && post._createdAt && post._createdAt > parseInt(lastVisit);
}
export function getTypeInfo(type) {
  return ({
    notice:  { cls: 'type-notice',  text: '📢 수뇌부 공지' },
    vote:    { cls: 'type-vote',    text: '🗳️ Yes / No 투표' },
    idea:    { cls: 'type-idea',    text: '💡 의견 수렴 안건' },
    general: { cls: 'type-general', text: '자유 안건' }
  })[type] || { cls: 'type-general', text: '자유 안건' };
}
export function getStatusBadge(s) {
  if (!s) return '';
  const m = {
    review:  { cls: 's-review',  text: '수뇌부 검토 중' },
    done:    { cls: 's-done',    text: '의견 수렴 완료' },
    applied: { cls: 's-applied', text: '동아리 반영 완료' }
  };
  return m[s] ? `<span class="status-badge ${m[s].cls}">${m[s].text}</span>` : '';
}