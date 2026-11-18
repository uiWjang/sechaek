# 픽셀 미니룸 — 2026-11-16

내장 image_gen 도구로 만든 프로젝트용 배경 4개와 투명 아바타 스프라이트입니다. CLI/API 키는 사용하지 않았습니다.

## 파일
- assets/rooms/library.png: 햇살 서재
- assets/rooms/attic.png: 숲속 다락방
- assets/rooms/train.png: 책 읽는 기차
- assets/rooms/camp.png: 물가의 캠핑
- assets/rooms/reader-walk.png: 투명한 4프레임 걷기 스프라이트(2172×724)

## 생성 프롬프트 사양
공통: finished square isometric pixel-art game background, detailed nostalgic 1990s cozy mini-homepage game art, fine brown outlines, warm cream surrounding background. No people, animals, text, labels or UI. Furniture along back/side perimeter, clear central/front floor for animated avatar. Crisp pixel clusters, material textures, not flat vector or smooth 3D.

서재: richly detailed reading room diorama, tall bookcase with muted multicolored books, pale window and linen curtains, small plants, empty frames, low cream sofa and blanket, writing desk and teacup; flat woven sage rug; warm amber light and woodgrain.
다락방: tiny forest attic reading hideaway, sloped dark timber roof, circular sunlit window, ivy and distant treetops, quilts and cushions, writing desk and bookcase; moss and walnut palette.
기차: nostalgic sleeper train reading compartment, cutaway walls, forest windows, olive upholstered bench, vintage luggage rack, bookshelf, lantern, suitcase; muted olive, walnut and dusty burgundy.
캠핑: cream vintage camper on grassy island, open door, books and lantern on shelf, small wooden deck with folded chair and thermos, turquoise stream and moss rocks; clear grass center; sunset peach light and sage/teal palette.
아바타: transparent 4-cell horizontal game sprite sheet, same chibi reader in every cell, chestnut bob haircut, cream knitted cardigan, sage overalls, brown shoes, rosy cheeks; full body three-quarter right, left-foot / feet-together / right-foot / feet-together walk cycle, identical baseline, no floor/background/labels; actual alpha transparency.

## 분리한 배경과 가구 — 2026-11-16
- assets/rooms/*-empty.png: 위 4개 배경에서 소파·의자·책상·조명·화분·러그·책장을 지운 빈 방. 카메라, 창문과 벽, 목재 질감, 캠핑카·데크·계곡은 유지했습니다.
- assets/furniture/{sofa,chair,plant,lamp,shelf}.png: 실제 알파 투명 배경의 독립 가구 이미지.
- 생성 사양: warm detailed isometric pixel art, fine brown outlines, cream/sage/walnut palette, full isolated object, no room or ground, transparent alpha. 소파는 크림 패브릭/세이지·장미색 쿠션/니트 담요, 의자는 호두나무/올리브 천, 화분은 테라코타/잎사귀, 조명은 주름 크림 갓/황동과 나무 받침, 책장은 낮은 목재 서가와 여러 책등.
- assets/rooms/basic.svg: 무료 기본 방. 기본 책장과 아바타는 항상 표시됩니다.

## 상점·저장
- 햇살 서재=로맨스, 숲속 다락방=판타지, 책 읽는 기차=추리, 물가의 캠핑=SF.
- 기존 wall 상품 ID와 구매 내역을 유지하고 상품명을 방 테마로 변경했습니다. 테마 가격은 기존 20책갈피를 유지합니다.
- 테마별 소파 70책갈피, 의자 40책갈피를 별도 추가했습니다. 기존 화분·조명·소품도 개별로 구매할 수 있습니다.
- 구매는 기존 buy_items RPC를 사용합니다. 중복 소유/잔액 검증, 원장 차감, 미보유 세트의 20% 할인은 서버에서 처리합니다.
- 소파/의자 shape를 DB에 추가하고, 기존 validate_layout 함수의 소유권·공개 책 검사를 보존하면서 허용하는 가구 종류만 확장했습니다.
- reference/supabase/PIXEL_ROOM_SHOP.sql: 실제 프로젝트에 적용 완료. 4개 테마 + 8개 새 가구 조회 확인. 기존 소유권과 배치 데이터는 삭제하지 않았습니다.
- 선택한 테마는 room_layout.wallpaper에 저장됩니다. 브라우저 localStorage로 유료 테마를 적용하지 않습니다.
- 가구는 room_layout.placements에 저장합니다. 방 주인만 편집 가능하고 미보유 가구/테마 저장은 DB 검증을 통과하지 못합니다.

## 조작
- 바닥 클릭·터치 또는 WASD 키로 이동. 방향키도 호환됩니다.
- 상점 구매 → 내 미니홈피 → 방 꾸미기 → 보유 아이템 선택 → 가구 드래그 → 배치 저장.
- 기본 아바타 크기: 방 너비의 18%, 작은 화면에서는 21%.
- 책 표지 세 장은 나무 전시대 스타일로 표시하고, 기존 공개 완독 책만 선택할 수 있습니다.
- 가구 배치 앞뒤는 바닥 좌표로 정렬합니다. 이동은 바닥 다각형으로 제한하며 가구 충돌/앉기 기능은 포함하지 않습니다.

## 검증
15개 자동 테스트 통과: 기존 주요 기능, 소유한 테마·가구 적용, 방문자 편집 제한, 취소 복원, 저장 실패 후 복구, WASD/클릭 이동.
실제 상점에서 새 상품과 가격을 확인했습니다. 실제 사용자 책갈피를 소모하는 구매는 하지 않았습니다.
가구 배치·테마 전환의 시각 검사는 서버에 쓰지 않는 임시 QA 데이터로 수행했습니다. QA 페이지는 배포/ZIP에 포함하지 않습니다.
390px 화면의 가로 넘침 없음과 이동 버튼 동작을 확인했습니다.
