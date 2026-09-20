# 이 저장소에서 알아둘 것

광주·담양 숙소 안내 정적 페이지. `index.html` 한 장 + `images/` + PDF.
GitHub Pages 로 https://mrsure1.github.io/idea/ 에 배포된다.

## 배포

Pages 의 Source 가 **GitHub Actions** 로 되어 있다.
`.github/workflows/pages.yml` 이 이 브랜치 push 마다 배포한다.
"Deploy from a branch" 방식이 아니므로 브랜치·`/root` 선택 UI 를 찾으면 안 된다.

## 이 개발 환경은 외부 접속이 막혀 있다

숙소 홈페이지, 예약 사이트, 이미지 서비스, 지도 타일 모두 프록시가 차단한다.
DNS 조회와 github.com 만 된다. 그래서:

- **사진 수집·링크 점검은 GitHub Actions 러너에서 한다.** 러너는 인터넷이 열려 있다.
  - `scripts/fetch-photos.mjs` — 숙소 페이지에서 사진을 받아 `images/` 에 커밋
  - `scripts/check-links.mjs` — 링크 생존 + http→https 지원 여부 점검
  - 둘 다 `workflow_dispatch` 수동 실행
- 브라우저 렌더링 확인은 `/opt/pw-browsers/chromium-1194/chrome-linux/chrome --headless` 로 한다.
- **여기서 확인 못 한 것을 "될 겁니다"라고 말하지 말 것.** 이 작업에서 세 번 틀렸다.

## 사진

`images/<숙소코드>-1..3.(jpg|webp|png)` 가 있으면 그걸 먼저 쓰고, 없으면
외부 서비스에서 페이지 대표 이미지를 가져온다(소스당 6초 제한).

- **야놀자·여기어때·트립닷컴·부킹닷컴은 봇을 차단**한다. 스크린샷을 찍으면
  "Sorry, you have been blocked" 같은 에러 화면이 찍힌다. 사진 소스로 쓰지 말고
  예약 링크로만 쓴다.
- 자동 수집물에는 **행사 포스터·룸서비스 광고·아이콘 그림띠·후기 캡처**가 섞인다.
  용량 필터만으로는 못 거른다. 커밋 전에 눈으로 확인할 것.

## 지도

카카오맵을 쓴다. 키는 `index.html` 의 `MAP_KEY` 한 곳에 있다.
카카오·네이버·구글·OSM 을 모두 지원하고, 실패하면 OSM 으로 자동 폴백한다.

설정 방법과 안 뜰 때의 진단은 **`.claude/skills/kakao-map/SKILL.md`** 에 정리해 두었다.
카카오 개발자 콘솔은 개편되어 예전 메뉴 이름("앱 설정 → 플랫폼")이 없다.
기억으로 안내하지 말고 그 문서를 볼 것.

## 링크

- `http://` 만 되는 사이트는 브라우저가 "보안 연결을 지원하지 않습니다" 경고를 띄운다.
  링크 이름에 "(보안 연결 미지원)"을 붙여 미리 알린다. (담양메타펜션이 해당)
- 새 링크를 넣었으면 `check-links` 워크플로를 돌려 확인한다.

## 문서 톤

실제로 투숙할 분께 보여주는 자료다. 동행 구성을 특정하지 말고 "성인 2~3명"으로 쓴다.
설명은 짧게, 어려운 말은 피한다.
