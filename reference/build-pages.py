from pathlib import Path
root=Path('.')
header='''<!-- 공통 헤더: 메뉴 문구와 링크를 직접 수정할 수 있습니다. -->
<header class="site-header"><div class="header-inner">
  <a class="brand" href="index.html"><img src="assets/logo.svg" width="48" height="48" alt=""><span>세책</span></a>
  <nav aria-label="주 메뉴" id="main-nav">
    <a href="index.html">홈</a><a href="search.html">책 검색</a><a href="library.html">내 서재</a><a href="statistics.html">통계</a><a href="explore.html">탐색</a><a href="room.html">내 미니홈피</a><a href="shop.html">상점</a>
  </nav>
  <div class="header-actions">
    <button class="bookmark-ribbon" id="ledger-button"><span data-icon="bookmark"></span><span class="bookmark-label">책갈피</span><b class="bookmark-balance" id="balance">—</b></button>
    <button class="icon-button" id="notifications" aria-label="알림"><span data-icon="bell"></span></button>
    <a class="login-link" id="login-link" href="auth.html">로그인</a>
    <button class="icon-button logout-button" id="logout" aria-label="로그아웃" hidden><span data-icon="logout"></span></button>
    <button class="mobile-menu icon-button" id="menu-button" aria-label="메뉴 열기" aria-expanded="false"><span data-icon="menu"></span></button>
  </div>
</div></header>'''
common='''
<!-- 모든 페이지에서 사용하는 프로필 수정 창. -->
<dialog id="profile-dialog" class="modal"><div class="section-head"><h2>프로필 수정</h2><button type="button" class="icon-button" data-close aria-label="닫기">×</button></div>
  <form id="profile-form" class="form-stack">
    <input id="photo-file" type="file" accept="image/jpeg,image/png,image/webp" hidden>
    <button type="button" id="photo-picker" class="photo-upload-area"><span class="photo-preview"><span id="photo-preview"></span><span class="photo-add-badge">+</span></span><span class="photo-upload-copy"><strong>프로필 사진 추가 / 변경</strong><span>눌러서 원하는 사진을 선택하세요</span><small id="photo-name"></small></span></button>
    <p class="tiny">JPG · PNG · WebP, 10MB 이하 · 가운데를 정사각형으로 잘라 저장합니다.</p>
    <label>닉네임<input name="nickname" required maxlength="30"></label>
    <label>자기소개<textarea name="intro" maxlength="160" rows="3" placeholder="나를 소개하는 글을 남겨 주세요."></textarea><small>미니홈피 프로필에 표시됩니다.</small></label>
    <label class="check-label"><input type="checkbox" name="removePhoto">기본 프로필 사진으로 변경</label>
    <p class="auth-error" id="profile-error" role="alert"></p>
    <div class="row"><button class="button" type="submit">저장</button><button type="button" class="text-button" data-close>취소</button></div>
  </form>
</dialog>
<dialog id="generic-dialog" class="modal"><div class="section-head"><h2 id="dialog-title"></h2><button type="button" class="icon-button" data-close aria-label="닫기">×</button></div><div id="dialog-body"></div></dialog>
<div id="toast" class="toast" role="status" hidden></div>
'''
pages={
'index':('홈','''
<div class="home-grid">
  <div class="home-content">
    <form class="search-bar" action="search.html"><span data-icon="search"></span><input name="q" aria-label="책 또는 작가 검색" placeholder="책 제목 또는 작가 검색"><button aria-label="검색">↗</button></form>
    <div class="editorial"><aside class="editorial-aside">
      <section class="daily-quote"><h3>오늘의 문장</h3><div id="daily-quote"></div><a class="text-button" href="room.html?tab=diary">다이어리 열기 ↗</a></section>
      <section class="reviewer"><h3>추천 독자</h3><div id="recommended-readers"></div></section>
    </aside><section class="popular"><div class="section-head"><h2>인기차트</h2><a href="search.html">모든 책 ↗</a></div><p class="tiny">예스24 국내도서 종합 베스트셀러</p><ol id="home-chart" class="shelf-list"></ol><p id="chart-source" class="tiny"></p></section></div>
  </div>
  <aside class="home-sidebar"><section class="panel welcome">
    <div class="home-profile" id="home-profile"></div><div id="last-book"></div><a class="button" id="library-link" href="library.html">내 서재 ↗</a>
  </section><section class="panel calendar"><div class="section-head"><h3>독서 기록 달력</h3><span id="calendar-month"></span></div><div class="calendar-grid" id="calendar-grid"></div><p><span class="calendar-key"></span> 기록한 날</p><div class="calendar-records" id="calendar-records"></div></section></aside>
</div>'''),
'search':('책 검색','''
<div class="page-heading"><h1 id="search-title">인기차트 전체 목록</h1></div>
<form id="search-form" class="search-bar"><span data-icon="search"></span><input name="q" placeholder="제목 또는 저자" aria-label="제목 또는 저자"><button aria-label="검색">↗</button></form>
<p class="tiny">도서정보·표지 제공: 예스24</p><p id="search-count" aria-live="polite"></p><div id="search-results" class="book-grid"></div><nav class="catalog-pagination" id="pagination" aria-label="도서 목록 페이지"></nav>'''),
'auth':('로그인','''
<section class="panel auth-panel"><div class="tabs"><button data-mode="login" class="selected">로그인</button><button data-mode="signup">회원가입</button></div>
<form id="auth-form" class="form-stack"><label id="nickname-label" hidden>닉네임<input name="nickname" maxlength="30" autocomplete="nickname"></label><label>이메일<input type="email" name="email" required autocomplete="username"></label><label>비밀번호<input type="password" name="password" required autocomplete="current-password"></label><p id="password-rule" class="tiny" hidden>영문 대문자와 숫자를 포함해 10자 이상으로 입력해 주세요.</p><p id="auth-error" class="auth-error" role="alert"></p><button class="button" id="auth-submit">로그인</button></form></section>'''),
'library':('내 서재','''
<div class="page-heading"><h1>내 서재</h1><a class="button" href="search.html">책 추가</a></div>
<div class="tabs" id="library-tabs"><button data-kind="owned" class="selected">소장한 책</button><button data-kind="wishlist">찜한 책</button></div>
<div class="filter-row"><input id="library-query" placeholder="내 서재에서 검색" aria-label="내 서재에서 검색"><select id="library-status" aria-label="독서 상태"><option value="">모든 상태</option><option value="planned">읽을 예정</option><option value="reading">읽는 중</option><option value="finished">완독</option><option value="paused">중단</option></select></div><div id="library-list" class="library-grid"></div>'''),
'book':('책 상세','''
<a href="search.html" class="back-link">← 책 검색</a>
<div class="book-detail"><div id="book-cover"></div><article><h1 id="book-title"></h1><p id="book-author"></p><p id="book-publisher"></p><p id="book-pages"></p><p class="description" id="book-description"></p><a id="book-source" target="_blank" rel="noreferrer">예스24 도서정보 ↗</a></article>
<section class="panel"><h3>나의 서재에 담기</h3><form id="register-form" class="form-stack"><div class="tabs"><button type="button" data-kind="owned" class="selected">소장한 책</button><button type="button" data-kind="wishlist">찜한 책</button></div><div id="purchase-fields" class="form-stack"><label>구매 서점<select name="store" data-stores></select></label><div class="purchase-fields"><label>결제금액 (원)<input name="price" type="text" inputmode="numeric" data-digits maxlength="9" placeholder="예: 15000" required></label><label>구매일<input name="purchased_at" type="date" required></label></div></div><button id="register-submit" class="button">소장한 책으로 등록</button><p class="tiny">구매와 찜은 서로 독립적으로 보관됩니다.</p></form></section></div>
<div class="detail-bottom"><section class="panel"><h2>실구매가 비교</h2><div class="tabs" id="price-tabs"><button data-format="paper" class="selected">종이책</button><button data-format="ebook">전자책</button></div><div class="table-wrap" id="price-table"></div><p class="tiny">예상 결제액 = 정가 − 할인 − 쿠폰 − 포인트. 실제 가격은 서점에서 확인하세요.</p></section>
<section class="panel reviews"><h2>리뷰</h2><form id="review-form" class="form-stack"><label>리뷰<textarea name="content" required maxlength="5000"></textarea></label><label>별점<select name="rating" data-rating></select></label><label>공개 범위<select name="visibility" data-visibility></select></label><button class="button">리뷰 저장</button></form><div id="reviews"></div></section></div>'''),
'notebook':('독서 노트','''
<a href="library.html" class="back-link">← 내 서재</a><div class="page-heading"><h1 id="notebook-title">독서 노트</h1></div>
<div class="notebook-layout"><aside class="book-facts"><div id="note-cover"></div><h3>책 정보</h3><dl id="note-facts"></dl><details class="genre-picker"><summary>세부 장르 선택</summary><div id="genres" class="genre-options"></div></details><label>책 형태<select form="info-form" name="format"><option>종이책</option><option>전자책</option></select></label><label>소장 여부<select form="info-form" name="possession"><option>소장</option><option>대여</option><option>미소장</option></select></label></aside>
<section class="note-editor"><form id="note-form"><details class="note-toggle" open><summary>1. 요약</summary><textarea name="summary" rows="7" maxlength="10000" aria-label="요약"></textarea></details><details class="note-toggle"><summary>2. 스토리</summary><textarea name="story" rows="7" maxlength="10000" aria-label="스토리"></textarea></details><details class="note-toggle"><summary>3. 후기</summary><textarea name="impression" rows="7" maxlength="10000" aria-label="후기"></textarea></details><details class="note-toggle"><summary>4. 기억에 남는 문장</summary><div id="quotes"></div><button type="button" id="add-quote" class="text-button">+ 문장 추가</button></details><button class="button">노트 저장</button></form>
<details class="note-toggle log-toggle" open><summary>읽은 기록 <span class="chip">기록마다 +3</span></summary><form id="log-form" class="form-stack"><label>오늘 읽은 쪽수<input name="pages" type="text" inputmode="numeric" data-digits maxlength="9" required></label><label>오늘의 메모<textarea name="content" required maxlength="2000" rows="3"></textarea></label><button class="button">독서 기록 남기기</button></form><div id="logs"></div></details></section>
<form id="info-form" class="reading-info form-stack"><h3>독서 정보</h3><label>독서 상태<select name="status"><option value="planned">읽을 예정</option><option value="reading">읽는 중</option><option value="finished">완독</option><option value="paused">중단</option></select></label><label>읽은 페이지<input name="read_pages" type="text" inputmode="numeric" data-digits maxlength="9"></label><div id="reading-progress"></div><label>시작일<input name="started_at" type="date"></label><label>완독일<input name="finished_at" type="date"></label><label>별점<select name="rating" data-rating></select></label><div id="owned-info" class="form-stack"><label>구매 서점<select name="store" data-stores></select></label><label>결제금액 (원)<input name="price" type="text" inputmode="numeric" data-digits maxlength="9"></label><label>구매일<input name="purchased_at" type="date"></label></div><label class="check-label"><input name="is_public" type="checkbox">완독한 책을 미니홈피 책장에 공개</label><p class="tiny">노트·기록·구매 정보는 항상 비공개입니다.</p><button class="button">독서 정보 저장</button></form></div>'''),
'explore':('탐색','''<div class="page-heading"><h1>사용자 탐색</h1></div><div class="search-bar"><span data-icon="search"></span><input id="people-query" placeholder="닉네임 검색" aria-label="닉네임 검색"></div><div id="people" class="people-grid"></div>'''),
'statistics':('통계','''<div class="page-heading"><h1>독서 통계</h1><label>조회 연도<input id="stats-year" type="text" inputmode="numeric" data-digits maxlength="4"></label></div><div id="stats-content"><div class="stats-summary" id="stats-summary"></div><section class="panel"><h2>월별 독서 소비</h2><div id="stats-chart" class="chart"></div><p class="tiny">단위: 원 · 최고 구매월은 초록 테두리로 표시</p></section><div class="table-wrap" id="stats-table"></div></div>'''),
'room':('미니홈피','''
<div class="page-heading"><h1 id="room-title">미니홈피</h1><span class="visit-counter" id="visit-count"></span></div>
<div class="room-page"><aside class="room-sidebar"><section class="room-profile"><div class="room-profile-heading"><span id="room-photo"></span><div><h2 id="room-nickname"></h2><button class="text-button room-profile-settings" id="room-profile-settings" hidden>프로필 설정</button></div></div><p class="room-intro" id="room-intro"></p><hr><h3>대표 문장</h3><div id="featured-quote"></div></section><section class="room-friends panel"><div class="section-head"><h3>친구들</h3><span id="friends-count"></span></div><p class="tiny">팔로우한 독자</p><ul id="friends"></ul></section></aside>
<div class="room-main"><div class="tabs" id="room-tabs"><button data-tab="home" class="selected">홈</button><button data-tab="diary">다이어리</button><button data-tab="guest">방명록</button><button data-tab="shelf">책장</button></div>
<section data-room-panel="home"><div class="room-toolbar"><span id="room-help">책장을 누르면 공개한 완독 도서가 표시됩니다.</span><button id="decorate" class="secondary-button" hidden>방 꾸미기</button></div>
<!-- 미니룸 구조: 창문·액자·책장·아바타의 HTML을 직접 수정할 수 있습니다. -->
<div id="miniroom" class="miniroom" aria-label="나의 미니룸"><div class="wall-lines"></div><div class="room-floor"></div><div class="room-window"><div></div><div></div><div></div><div></div></div><div class="room-frames"><button class="room-frame" data-frame="0" aria-label="1번 액자">+</button><button class="room-frame" data-frame="1" aria-label="2번 액자">+</button><button class="room-frame" data-frame="2" aria-label="3번 액자">+</button></div><button class="fixed-shelf" id="fixed-shelf" aria-label="공개한 완독 책장 열기"><div><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div><div><span></span><span></span><span></span><span></span><span></span><span></span></div><small>나의 책장</small></button><div class="room-avatar" id="room-avatar"></div><div id="placed-items"></div></div>
<section id="inventory" class="inventory" hidden><div class="section-head"><h3>보유 아이템</h3><button id="cancel-decoration" class="text-button">변경 취소</button></div><div id="inventory-grid" class="inventory-grid"></div><p class="tiny">아이템을 누르면 배치·해제됩니다. 배치된 아이템은 드래그하거나 방향키로 옮기세요.</p><a href="shop.html">상점에서 더 둘러보기</a></section>
<div class="room-below"><section class="panel"><div class="section-head"><h3>이번 달의 책</h3><div class="row" id="pick-actions" hidden><button class="text-button monthly-pick-toggle" id="pick-toggle" aria-expanded="false" aria-controls="pick-editor">등록 <span>⌄</span></button><button id="pick-delete" class="text-button" hidden>삭제</button></div></div><div id="pick-editor" class="monthly-pick-collapse" inert><div><form id="pick-form" class="form-stack"><label>내 서재에서 추천<select name="book_id" required></select></label><label>추천 이유<textarea name="reason" required maxlength="500"></textarea></label><button class="button">저장</button></form></div></div><div id="pick-display" class="monthly-pick-collapse is-open"><div id="pick-content"></div></div></section></div></section>
<section class="panel" data-room-panel="diary" hidden><h2>다이어리</h2><form id="diary-form" class="form-stack" hidden><label>문장<textarea name="content" required maxlength="2000"></textarea></label><label>출처 도서<select name="book_id" required></select></label><label>공개 범위<select name="visibility" data-visibility></select></label><button class="button">문장 저장</button><button class="text-button" id="diary-cancel" type="button" hidden>수정 취소</button></form><div id="diary-list"></div></section>
<section class="panel" data-room-panel="guest" hidden><h2>방명록</h2><form id="guest-form" class="form-stack" hidden><label>추천할 책<select name="book_id" required></select></label><label>한마디<textarea name="content" required maxlength="1000"></textarea></label><button class="button">방명록 남기기</button></form><div id="guest-list"></div></section>
<section class="panel" data-room-panel="shelf" hidden><h2>공개한 완독 도서</h2><p>공개 설정한 완독 책만 방문자에게 보여요.</p><button id="open-shelf" class="button">책장 열기</button></section>
</div></div>'''),
'shop':('상점','''<div class="page-heading"><h1>책갈피 상점</h1><span id="shop-balance" class="chip"></span></div><div class="tabs" id="shop-tabs"><button data-theme="추리" class="selected">추리</button><button data-theme="SF">SF</button><button data-theme="로맨스">로맨스</button><button data-theme="판타지">판타지</button></div><section class="shop-set"><div><h2 id="set-title"></h2><p>이미 가진 아이템을 제외한 개별 합계에서 20% 할인</p></div><div><span id="set-price" class="set-price"></span><button id="buy-set" class="button">세트 구매</button></div></section><div id="shop-list" class="shop-grid"></div><div id="purchase-stamp" class="purchase-stamp" role="status" hidden><strong>구매 완료</strong><span>보유 아이템에 추가되었습니다</span></div>''')}
for page,(title,body) in pages.items():
 html='''<!doctype html>
<html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>세책 — '''+title+'''</title><link rel="icon" href="assets/logo.svg"><link rel="stylesheet" href="css/styles.css"><link rel="stylesheet" href="css/readability.css"><link rel="stylesheet" href="css/html-version.css"></head>
<body data-page="'''+page+'">\n'+header+'''
<main><div id="page-error" class="error-banner" role="alert" hidden></div><div id="page-loading" class="empty" role="status">불러오는 중입니다.</div><div id="page-content" hidden>
<!-- 이 아래가 이 페이지의 화면입니다. 문구와 배치는 여기에서 수정하세요. -->
'''+body+'''\n</div></main>'''+common+'''
<noscript>이 사이트의 로그인과 데이터 조회에는 JavaScript가 필요합니다.</noscript>
<script type="module" src="js/'''+page+'''.js"></script></body></html>'''
 (root/(page+'.html')).write_text(html,encoding='utf8')
print('10 editable HTML pages created')
