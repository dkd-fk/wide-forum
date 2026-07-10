// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WIDE Forum — api.js
// GAS 프록시 통신 전담
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const GAS_PROXY_URL = 'https://script.google.com/macros/s/AKfycbyOb4p3RdtCmS50zRlObmj5Ck7UzKR4sboRyYgE4G0uvdBAFEsjsQ2HD2VBZc4Z_GxI/exec';

async function gasPost(body) {
  const res = await fetch(GAS_PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`GAS 오류 (${res.status})`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'GAS 요청 실패');
  return data;
}

async function gasGet(action) {
  const res = await fetch(`${GAS_PROXY_URL}?action=${action}`);
  if (!res.ok) throw new Error(`GAS 오류 (${res.status})`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'GAS 요청 실패');
  return data;
}

export async function callGroq(rawText) {
  const data = await gasPost({ action: 'refine', text: rawText });
  return data.refined;
}

export async function fetchPosts(includeTest = false) {
  const data = await gasGet('getPosts');
  return includeTest
    ? data.posts
    : data.posts.filter(p => !p.is_test);
}

export async function fetchQuestions() {
  const data = await gasGet('getQuestions');
  return data.questions;
}

export async function savePost(post) {
  return await gasPost({ action: 'savePost', ...post });
}

export async function sendVote(id, vote) {
  return await gasPost({ action: 'vote', id, vote });
}

export async function sendComment(id, comment) {
  return await gasPost({ action: 'saveComment', id, comment });
}

export async function deletePost(id) {
  return await gasPost({ action: 'deletePost', id });
}

export async function updateStatus(id, status) {
  return await gasPost({ action: 'updateStatus', id, status });
}