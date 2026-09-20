---
name: kakao-map
description: 웹페이지에 카카오맵·네이버지도·구글지도를 붙일 때 사용. 개발자 콘솔에서 키를 발급받고 도메인을 등록하는 정확한 메뉴 경로, 지도가 안 뜰 때의 증상별 원인 진단, 폴백 설계를 담고 있다. "카카오맵", "카카오 지도", "지도 API", "appkey", "지도가 안 떠", "Kakao SDK", "네이버 지도 API", "map API key" 같은 요청에서 쓴다.
---

# 카카오맵을 웹페이지에 붙이기

실제로 겪으며 확인한 내용이다. **카카오 개발자 콘솔은 개편되어 예전 안내와 메뉴 이름이 다르다.**
기억으로 "앱 설정 → 플랫폼"을 안내하면 틀린다. 그 메뉴는 없어졌다.

## 준비물 세 가지 — 하나라도 빠지면 지도가 안 뜬다

1. **JavaScript 키**
2. **그 키에 등록된 JS SDK 도메인**  ← 가장 많이 빠뜨리는 것
3. **카카오맵 제품 사용 설정 ON**

## 콘솔 메뉴 구조 (개편 후)

```
앱 설정
 ├ 대시보드
 └ 앱
    ├ 일반              … 앱 이름·아이콘·앱 대표 도메인 (지도와 무관)
    ├ 플랫폼 키          … ★ 키 발급 + JS SDK 도메인 등록
    ├ 어드민 키          … 절대 노출 금지
    ├ 제품 링크 관리     … 카카오톡 공유용 (지도와 무관)
    ├ 추가 기능 신청 / 카카오톡 채널 / 웹훅 / 멤버
제품 설정
 ├ 카카오 로그인 / 비즈니스 인증 / 카카오톡 메시지
 ├ 카카오맵            … ★ 사용 설정 ON
 └ 푸시 알림
```

## 절차

### 1. 앱 생성
developers.kakao.com → 내 애플리케이션 → 애플리케이션 추가하기

### 2. 카카오맵 켜기
**제품 설정 → 카카오맵 → 사용 설정 → 상태 ON**
무료 쿼터가 자동 제공된다(앱 뱃지에 "카카오맵 무료 쿼터" 표시).

### 3. JS 키 + 도메인 등록  ← 핵심
**앱 → 플랫폼 키 → JavaScript 키**

`Default JS Key` 가 이미 있지만 **여기엔 JS SDK 도메인이 없을 수 있다.**
`+ JavaScript 키 추가` 로 키를 새로 만들고, 그 키에 **JS SDK 도메인**을 등록한다.
키 카드 아래 `JS SDK 도메인` 딱지가 보이면 등록된 것이다.

도메인은 **스킴 + 호스트까지만**:

```
✅ https://example.github.io
❌ https://example.github.io/myapp/
```

브라우저가 보내는 Origin 헤더에 경로가 없기 때문이다.
콘솔 안내문에도 "경로를 포함한 경우 경로는 제외되고 도메인만 등록됩니다"라고 적혀 있다.

## 헷갈리기 쉬운 가짜 도메인 칸 두 개

| 위치 | 용도 | 지도에 효력 |
|---|---|---|
| 앱 → 일반 → **앱 대표 도메인** | 앱 소개 표시용 | ❌ 없음 |
| 앱 → **제품 링크 관리 → 웹 도메인** | 카카오톡 공유 링크 허용 | ❌ 없음 |
| 앱 → **플랫폼 키 → JavaScript 키 → JS SDK 도메인** | **JavaScript SDK 인증** | ✅ **이것** |

제품 링크 관리 화면의 안내문이 직접 알려준다:
*"Kakao SDK for JavaScript를 사용하기 위해 필요한 웹사이트 도메인은 [플랫폼 키] > [JavaScript 키]에서…"*

## 증상으로 원인 찾기 — 이게 제일 빠르다

| 콘솔에 보이는 것 | 원인 |
|---|---|
| **카카오 오류가 아예 없고 SDK script 가 onerror** | **도메인 미등록.** 카카오가 sdk.js 응답 자체를 거부. 가장 흔함 |
| SDK 는 로드됐는데 `kakao.maps.load()` 콜백이 안 옴 | 카카오맵 제품 사용 설정 OFF |
| 카카오가 appkey 관련 오류를 직접 출력 | 키 오타 / 잘못된 키 종류(REST API 키를 넣은 경우) |

**카카오 오류 메시지가 하나도 없다는 것 자체가 단서다.** 파일을 못 받았으니
그 안의 오류 코드도 실행되지 않은 것이고, 이는 곧 도메인 거부를 뜻한다.
진단하려면 script 의 `onerror` 에서 어떤 URL이 막혔는지 직접 찍어야 한다.

## 구현 패턴

```js
const t = document.createElement("script");
t.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KEY}&autoload=false`;
t.onerror = () => { /* 도메인 거부. 폴백으로 */ };
t.onload = () => {
  const guard = setTimeout(fallback, 9000);   // 제품 OFF면 콜백이 안 온다
  kakao.maps.load(() => {
    clearTimeout(guard);
    const map = new kakao.maps.Map(el, {center:new kakao.maps.LatLng(y,x), level:11});
    const bounds = new kakao.maps.LatLngBounds();
    items.forEach(p => {
      const pos = new kakao.maps.LatLng(p.lat, p.lng);
      bounds.extend(pos);
      // 커스텀 핀은 CustomOverlay, 클릭 처리는 투명 Marker 를 겹쳐 쓴다
      new kakao.maps.CustomOverlay({map, position:pos, yAnchor:1, content:pinHTML(p)});
      const hit = new kakao.maps.Marker({map, position:pos, opacity:0});
      const info = new kakao.maps.InfoWindow({content:popHTML(p)});
      kakao.maps.event.addListener(hit, "click", () => info.open(map, hit));
    });
    map.setBounds(bounds);
  });
};
document.head.appendChild(t);
```

- `autoload=false` + `kakao.maps.load()` 를 쓴다. 안 그러면 준비 전에 접근해 터진다.
- 번호 붙은 커스텀 핀은 `CustomOverlay`. `Marker` 는 클릭 판정용으로만 겹쳐 둔다.
- 전체를 한 화면에 담으려면 `LatLngBounds` + `map.setBounds()`.

## 폴백은 반드시 넣는다

키·도메인·제품 설정 중 하나만 틀려도 지도가 통째로 사라진다.
실패 시 **OpenStreetMap(Leaflet)** 으로 조용히 넘어가게 해두면 설정을 고치는 동안에도
페이지가 멀쩡히 돌아간다. Leaflet 은 키가 필요 없다.

## 키 노출

JavaScript 키는 **공개 전제**다. 페이지 소스에 그대로 박히는 게 정상이고,
도메인 제한이 자물쇠 역할을 한다. 공개 저장소에 올라가도 괜찮다.
**어드민 키는 절대 올리면 안 된다.**

## 세 지도 비교

| | 비용 | 카드 등록 | 국내 지도 | 키 이름 |
|---|---|---|---|---|
| **카카오** | 무료 쿼터 | **불필요** | 최상 | JavaScript 키 |
| 네이버 | 무료 쿼터 | 필요 | 최상 | Key ID (`ncpKeyId`) |
| 구글 | 소규모 무료 | 필요 | 약함 | API 키 (HTTP 리퍼러 제한 필수) |

국내 대상이면 카카오를 먼저 권한다. 카드 등록 없이 5분이면 된다.
구글은 국내 지도 규제로 건물·도로 표현이 부실하다.

**키 없이 구글 지도를 쓰는 길**: 구글 내 지도(My Maps)로 핀을 찍고 공유 → 내 사이트에 삽입 →
나오는 iframe 을 넣는다. 발급 절차가 없고 핀을 손으로 고칠 수 있다.
