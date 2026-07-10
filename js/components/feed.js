// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WIDE Forum — components/feed.js
// 피드 카드 렌더링
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import {
  posts, myVotes, testMode,
  isMyPost, isNew, voteRatio,
  getTypeInfo, getStatusBadge,
  saveMyVotes, savePostsToSession
} from '../store.js';
import { showToast, openModal } from './modal.js';
import { sendVote } from '../api.js';
import { isAdmin } from '../auth.js';

function sharePostToKakao(postId) {
  const post = posts.find(p => p.id === postId);
  if (!post) return;
  if (post.isShared) { showToast('⚠️ 이미 공유된 안건입니다.'); return; }
  if (typeof Kakao === 'undefined' || !Kakao.isInitialized()) {
    showToast('⚠️ 카카오 SDK가 초기화되지 않았습니다.'); return;
  }
  Kakao.Share.sendDefault({
    objectType: 'feed',
    content: {
      title: `[WIDE 포럼 안건] ${post.title}`,
      description: '새로운 안건이 등록되었습니다. 포럼에서 의견을 남겨주세요.',
      imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500',
      link: {
        mobileWebUrl: `${window.location.href.split('?')[0]}?id=${post.id}`,
        webUrl:       `${window.location.href.split('?')[0]}?id=${post.id}`
      }
    },
    buttons: [{ title: '안건 참여하기', link: {
      mobileWebUrl: `${window.location.href.split('?')[0]}?id=${post.id}`,
      webUrl:       `${window.location.href.split('?')[0]}?id=${post.id}`
    }}]
  });
  post.isShared = true;
  savePostsToSession();
  renderFeed();
  showToast('💬 카카오톡 공유가 실행되었습니다.');
}

export function renderFeed() {
  const feed = document.getElementById('feed');
  feed.innerHTML = '';
  const ordered = [...posts.filter(p => p.pinned), ...posts.filter(p => !p.pinned)];
  const admin    = isAdmin();

  ordered.forEach(post => {
    const ti       = getTypeInfo(post.type);
    const ratio    = voteRatio(post);
    const voted    = myVotes[post.id];
    const mine     = isMyPost(post.id);
    const newBadge = isNew(post) ? '<span class="new-badge">NEW</span>' : '';

    // 삭제 버튼: 관리자 OR (테스트모드) OR 내 안건
    const canDelete = admin || testMode || mine;
    const deleteBtn = canDelete
      ? `<button class="btn-delete-post" data-id="${post.id}">🗑️</button>`
      : '';

    // 상태 변경 (관리자만)
    const statusSelect = admin
      ? `<select class="admin-status-select" data-id="${post.id}">
           <option value=""     ${!post.status          ? 'selected' : ''}>상태 없음</option>
           <option value="review"  ${post.status==='review'  ? 'selected' : ''}>수뇌부 검토 중</option>
           <option value="done"    ${post.status==='done'    ? 'selected' : ''}>의견 수렴 완료</option>
           <option value="applied" ${post.status==='applied' ? 'selected' : ''}>동아리 반영 완료</option>
         </select>`
      : '';

    const voteBar = `
      <div class="vote-bar-wrap">
        <div class="vote-bar-bg"><div class="vote-bar-fill" style="width:${ratio}%"></div></div>
        <div class="vote-ratio-text">찬성 ${ratio}% · 찬성 ${post.agree} 반대 ${post.disagree}</div>
      </div>`;

    const voteBtns = voted
      ? `<div class="voted-label">✅ ${voted === 'agree' ? '찬성' : '반대'} 투표 완료</div>`
      : `<div class="vote-btns">
           <button class="btn-agree" data-id="${post.id}" data-v="agree">👍 찬성</button>
           <button class="btn-disagree" data-id="${post.id}" data-v="disagree">👎 반대</button>
         </div>`;

    const shareBtn = post.isShared
      ? `<button class="btn-share-kakao" data-id="${post.id}" disabled
           style="background:#cbd5e1;color:#64748b;cursor:not-allowed;opacity:0.75;">✅ 공유 완료</button>`
      : `<button class="btn-share-kakao" data-id="${post.id}">💬 단톡방 공유</button>`;

    const mineTag = mine ? '<span style="color:#16a34a;font-size:0.75rem">✏️ 내 안건</span>' : '';
    const testTag = post.is_test ? '<span style="color:#d97706;font-size:0.72rem">🧪 테스트</span>' : '';

    let bottom = '';
    if (post.type === 'notice') {
      bottom = `<div class="card-stats"><span>📌 주요 공지사항</span>${shareBtn}</div>`;
    } else if (post.type === 'vote') {
      bottom = voteBar + voteBtns + `<div class="card-stats" style="margin-top:8px"><span>💬 토론 ${post.comments.length}</span>${mineTag}${testTag}${shareBtn}</div>`;
    } else if (post.type === 'idea') {
      bottom = `<div class="card-stats"><span>💬 대안 ${post.comments.length}개</span>${mineTag}${testTag}${shareBtn}</div>
                <button class="btn-idea" data-id="${post.id}">💡 새로운 대안 / 장소 제안하기</button>`;
    } else {
      bottom = voteBar + voteBtns + `<div class="card-stats" style="margin-top:8px"><span>💬 댓글 ${post.comments.length}</span>${mineTag}${testTag}${shareBtn}</div>`;
    }

    const card = document.createElement('div');
    card.className  = 'card' + (post.pinned ? ' pinned' : '');
    card.dataset.id = post.id;
    card.innerHTML  = `
      <div class="card-top">
        <span class="barcode">${post.barcode}</span>
        <div style="display:flex;align-items:center;gap:6px">
          <span class="card-time">${post.time}${newBadge}</span>
          ${deleteBtn}
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:4px">
        <span class="type-tag ${ti.cls}">${ti.text}</span>${getStatusBadge(post.status)}
        ${statusSelect}
      </div>
      <div class="card-title">${post.title}</div>
      ${bottom}`;
    feed.appendChild(card);
  });

  // ── 이벤트 바인딩 ──
  feed.querySelectorAll('.btn-agree, .btn-disagree').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      const { id, v } = btn.dataset;
      if (myVotes[id]) return;
      const p = posts.find(x => x.id === id);
      if (!p) return;
      if (v === 'agree') p.agree++; else p.disagree++;
      myVotes[id] = v;
      saveMyVotes();
      savePostsToSession();
      renderFeed();
      try { await sendVote(id, v); } catch(e) { console.warn('투표 저장 실패:', e.message); }
    });
  });

  feed.querySelectorAll('.btn-delete-post').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      const { handleDeletePost } = await import('../app.js');
      handleDeletePost(btn.dataset.id);
    });
  });

  feed.querySelectorAll('.admin-status-select').forEach(sel => {
    sel.addEventListener('click', e => e.stopPropagation());
    sel.addEventListener('change', async e => {
      e.stopPropagation();
      const { handleUpdateStatus } = await import('../app.js');
      handleUpdateStatus(sel.dataset.id, sel.value);
    });
  });

  feed.querySelectorAll('.btn-idea').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); openModal(btn.dataset.id); });
  });

  feed.querySelectorAll('.btn-share-kakao').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      if (btn.disabled) return;
      sharePostToKakao(btn.dataset.id);
    });
  });

  feed.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', () => openModal(card.dataset.id));
  });
}