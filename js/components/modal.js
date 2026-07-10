// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WIDE Forum — components/modal.js
// 안건 상세 모달, 댓글, 토스트
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import {
  posts, currentPostId,
  setCurrentPostId,
  isMyPost, getTypeInfo, getStatusBadge,
  savePostsToSession
} from '../store.js';
import { sendComment } from '../api.js';

// ── 토스트 ──
export function showToast(msg, duration = 2500) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), duration);
}

// ── 댓글 렌더링 ──
export function renderComments(post) {
  const list = document.getElementById('comment-list');
  list.innerHTML = '';

  if (!post.comments.length) {
    list.innerHTML = `<div style="font-size:0.85rem;color:#94a3b8;padding:8px 0">
      ${post.type === 'idea' ? '아직 제시된 대안이 없습니다.' : '아직 댓글이 없습니다. 첫 의견을 남겨보세요.'}
    </div>`;
    return;
  }

  post.comments.forEach(c => {
    const d = document.createElement('div');
    d.className = 'comment-item';
    d.innerHTML = `
      <div class="comment-author ${c.isWriter ? 'author-writer' : 'author-anon'}">${c.author}</div>
      <div>${c.text}</div>`;
    list.appendChild(d);
  });
  list.scrollTop = list.scrollHeight;
}

// ── 모달 열기 ──
export function openModal(id) {
  const post = posts.find(p => p.id === id);
  if (!post) return;

  setCurrentPostId(id);
  const ti   = getTypeInfo(post.type);
  const mine = isMyPost(id);

  document.getElementById('modal-post-box').innerHTML = `
    <div style="margin-bottom:6px">
      <span class="type-tag ${ti.cls}">${ti.text}</span>${getStatusBadge(post.status)}
    </div>
    <div class="card-title" style="margin-bottom:4px">${post.title}</div>
    <div style="font-size:0.78rem;color:#94a3b8">${post.barcode} · ${post.time}</div>`;

  if (post.type === 'notice') {
    document.getElementById('modal-discussion-area').style.display  = 'none';
    document.getElementById('role-row').style.display               = 'none';
    document.getElementById('comment-input-row').style.display      = 'none';
  } else {
    document.getElementById('modal-discussion-area').style.display  = 'block';
    document.getElementById('role-row').style.display               = 'flex';
    document.getElementById('comment-input-row').style.display      = 'flex';
    document.getElementById('comment-input').placeholder =
      post.type === 'idea'
        ? '기존 안건에 탑승할 세부 대안을 입력하세요...'
        : '익명 댓글을 입력하세요...';

    const writerLabel = document.getElementById('role-writer-label');
    const writerRadio = document.getElementById('role-writer');
    if (mine) {
      writerLabel.classList.remove('disabled');
      writerRadio.disabled = false;
    } else {
      writerLabel.classList.add('disabled');
      writerRadio.disabled = true;
      document.querySelector('input[name="role"][value="anonymous"]').checked = true;
    }
    renderComments(post);
  }

  document.getElementById('detail-modal').classList.add('active');
}

// ── 모달 닫기 ──
export function closeModal() {
  document.getElementById('detail-modal').classList.remove('active');
}

// ── 댓글 등록 ──
export async function submitComment() {
  const text = document.getElementById('comment-input').value.trim();
  if (!text) return;

  const post = posts.find(p => p.id === currentPostId);
  if (!post) return;

  const role = document.querySelector('input[name="role"]:checked').value;
  let author, isWriter;

  if (role === 'writer') {
    author   = '[작성자]';
    isWriter = true;
  } else {
    author   = `[익명 ${post.nextIdx}]`;
    post.nextIdx++;
    isWriter = false;
  }

  const comment = { author, text, isWriter };
  post.comments.push(comment);
  renderComments(post);
  savePostsToSession();
  document.getElementById('comment-input').value = '';

  // feed 리렌더 (순환 참조 방지용 동적 import)
  import('../app.js').then(m => m.refreshFeed?.());

  // Sheets에 댓글 저장
  try {
    await sendComment(currentPostId, comment);
  } catch (e) {
    console.warn('댓글 저장 실패:', e.message);
  }
}