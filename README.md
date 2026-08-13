# 오늘의 틈 — Weather for Life

> 날씨 숫자를 보여주는 데서 끝나지 않고, 오늘을 언제·어디서·어떻게 보내면 좋을지 함께 제안하는 Vue 3 생활 날씨 서비스

- **배포 서비스:** [skala-vue-weather-xi.vercel.app](https://skala-vue-weather-xi.vercel.app)
- **GitHub:** [gabin-kim11/skala-vue-weather](https://github.com/gabin-kim11/skala-vue-weather)
- **최종 업데이트:** 2026-08-13

`오늘의 틈`은 Vue 수업에서 단원마다 이어진 **Hands on Weather 과제**를 단계적으로 빌드업해 완성한 반응형 SPA입니다. 세 도시의 Mock 데이터를 카드로 출력하던 첫 과제에서 출발해, Composition API, 컴포넌트 분리, Router, Pinia, Axios와 배포 과정을 차례로 반영했습니다. 최종적으로 GPS 현재 위치, 전국 17개 시·도 탐색, 시간대별 외출 플래너, 즐겨찾기 비교, 도시별 장소·음식·활동 추천을 하나의 사용자 흐름으로 연결했습니다.

날씨·생활지수는 모두 국내 공공 API의 최신 응답을 사용합니다. 현재 관측과 예보는 기상청 API허브, 자외선은 기상청 생활기상지수, 공기질은 에어코리아, 일출·일몰은 한국천문연구원 데이터를 서버 프록시를 통해 연결했습니다.

## 과제에서 최종 서비스까지

수업 과제의 기본 요구사항을 유지하면서, 매 단계의 결과물을 다음 단원의 기반으로 사용했습니다. 단순 문법 실습을 각각 따로 제출하는 대신 하나의 날씨 서비스를 계속 확장하는 방식으로 구현했습니다.

| 수업 과제 단계 | 기본 요구사항 | `오늘의 틈`에서의 최종 확장 |
| --- | --- | --- |
| Weather Mockup | `v-for`, `v-if`, 검색 바인딩, 카드 선택 이벤트 | 3개 Mock 도시를 전국 17개 시·도로 확장하고 검색·필터·즐겨찾기·도시 비교 추가 |
| Weather Composition | `ref`, `reactive`, `computed`, `watch`, `watchEffect`로 상태와 검색 결과 관리 | GPS 도시와 탐색 도시를 분리하고 추천 시간·생활지수 등 파생 상태와 공통 composable 구성 |
| Weather Component | 카드·검색창을 컴포넌트로 분리하고 Props, Emits, Slot, `scoped` 스타일 적용 | 공통 카드·검색·도시 카드·헤더 컴포넌트로 역할을 나누고 전역 디자인 토큰 구성 |
| Weather Router | 홈·상세·소개 화면, 동적 경로, lazy loading, catch-all route 적용 | `/planner`, `/cities`, `/map`을 추가해 총 6개 화면의 탐색 흐름으로 확장 |
| Weather Store | Pinia의 state·getter·action으로 섭씨/화씨 단위 관리 | 위치·선택 도시·날씨·단위·즐겨찾기·로딩·오류를 통합하고 `localStorage`에 사용자 설정 저장 |
| Weather Axios | Axios로 실제 날씨 API를 연결하고 외부 API로 기능 확장 | 기상청·에어코리아·한국천문연구원 API 연동, 서버 프록시와 응답 정규화 적용 |
| UI·Refinement | 외부 UI Library 적용, 기능 정비, README에 구현 과정 기록 | 컴포넌트 기반 UI 원칙은 반영하되 최종 디자인은 CSS Grid·Flexbox·디자인 토큰으로 직접 구현 |
| Build·Deployment | ESLint 검사, API 키 분리, 프로덕션 빌드와 정적 호스팅 | GitHub Actions 품질 검사, 환경 변수 보호, Vercel 배포와 SPA 직접 경로 새로고침 대응 |

초기 과제의 핵심이었던 **도시 검색 → 날씨 카드 선택 → 상세 정보 확인** 흐름은 그대로 유지했습니다. 여기에 “날씨를 본 다음 무엇을 할지”까지 답할 수 있도록 플래너, 지도 탐색, 여행 추천을 추가한 것이 최종 커스터마이징의 중심입니다.

## 주요 기능

- 브라우저 GPS를 가장 가까운 지원 도시와 연결하고 권한 거부 시 서울을 기본값으로 사용
- 선택 도시의 기상청 현재 관측·시간별 예보·5일 예보를 필요한 시점에 실시간 호출
- 자외선, 미세먼지, 통합대기환경지수, 일출·일몰 등 공공 생활정보 제공
- 전국 17개 시·도 검색·필터·즐겨찾기 및 도시 간 비교
- 실제 시·도 경계를 반영한 대한민국 지도에서 지역을 선택하고 상세 페이지로 이동
- 도시와 날씨에 맞는 장소·음식·활동 추천
- 섭씨/화씨, 즐겨찾기, 준비물 체크 상태를 `localStorage`에 저장
- API 응답 전이나 선택형 생활정보 호출 실패 시 임의의 샘플 값 대신 `확인 중` 상태 표시
- 데스크톱·태블릿·모바일 반응형 레이아웃과 키보드 포커스 지원

## 페이지

| 경로 | 화면 | 설명 |
| --- | --- | --- |
| `/` | 오늘 날씨 | GPS 날씨, 활동 추천, 시간별·주간 예보 |
| `/planner` | 오늘 플래너 | 외출 시간표, 준비물, 생활지수, 도시 비교 |
| `/cities` | 전국 도시 | 검색, 즐겨찾기 필터, 도시 날씨 카드 |
| `/map` | 전국 지도 | 지도 마커 선택과 지역 상세 패널 |
| `/weather/:cityId` | 도시 상세 | 장소·음식·활동 추천 |
| `/about` | 서비스 소개 | 서비스 가치, 데이터와 위치 권한 안내 |
| 잘못된 주소·도시 ID | 404 안내 | 요청한 경로 표시와 홈·지도 이동 버튼 |

존재하지 않는 경로는 전용 404 안내 화면을 보여주며, 배포 환경에서 상세 URL이나 잘못된 주소를 직접 새로고침해도 SPA가 열리도록 설정했습니다.

## 단원별 구현 근거

### 1. Vue 기본 문법과 Composition API

- `ref`로 선택 항목, 메뉴 열림처럼 하나의 UI 상태를 관리합니다.
- `reactive`로 도시 검색어와 즐겨찾기 범위처럼 함께 바뀌는 필터 값을 한 객체로 묶었습니다.
- `computed`로 검색 결과, 즐겨찾기 도시, 추천 시간, 생활지수를 원본 상태에서 파생합니다.
- `watch`로 선택 도시와 단위 변경을 감지해 저장 상태와 화면을 동기화합니다.
- `watchEffect`로 검색 조건처럼 여러 반응형 값에 의존하는 동작을 자동 추적합니다.
- 반복되는 날씨 화면 로직은 `src/components/weather/composables/useWeatherApplication.js`로 분리했습니다.

단순 예제의 온도·도시 목록에서 끝내지 않고 GPS 도시와 사용자가 선택한 도시를 별도 상태로 관리합니다. 지도나 도시 목록에서 고른 지역은 홈으로 돌아와도 헤더와 메인 날씨에 유지되고, GPS 위치로의 전환은 사용자가 현재 위치 버튼을 눌렀을 때만 실행됩니다.

### 2. 컴포넌트, Props, Emits, Slot

- `WeatherSearchBar.vue`: `modelValue`와 `resultCount`를 props로 받고 `update:modelValue`, `clear` 이벤트를 부모로 전달합니다.
- `WeatherCityCard.vue`: 도시 데이터를 props로 받아 표시하고 `select`, `toggle-favorite` 이벤트만 부모에 알립니다.
- `BaseDashboardCard.vue`: `controls`, 기본, `footer` named slot으로 재사용 가능한 카드 틀을 제공합니다.
- `WeatherSiteHeader.vue`: 모든 페이지가 공유하는 내비게이션과 모바일 메뉴를 담당합니다.
- 각 SFC의 표현 전용 스타일은 `scoped`로 제한하고 전역 디자인 토큰은 `src/assets/main.css`에서 관리합니다.

부모인 `WeatherCitiesView.vue`는 검색·즐겨찾기라는 업무 상태를 관리하고, 자식 컴포넌트는 표현과 사용자 이벤트에 집중하게 역할을 나눴습니다.

### 3. Vue Router

- `createWebHistory` 기반 SPA 라우팅
- 메인을 제외한 페이지 lazy loading
- `/weather/:cityId` 동적 라우트와 route param 사용
- catch-all 경로의 전용 404 화면 처리와 페이지 이동 시 스크롤 초기화
- 공통 상단 메뉴의 `RouterLink`와 앱 루트의 `RouterView`

### 4. Pinia

`src/stores/weatherStore.js`에서 다음을 한 곳에서 관리합니다.

- state: GPS 위치, 선택 도시, 날씨 목록, 온도 단위, 즐겨찾기, 로딩·오류 상태
- getters: 선택 도시 정보, 즐겨찾기 도시 목록, 데이터 출처 문구
- actions: GPS 요청, 날씨 갱신, 도시 선택, 단위 변환, 즐겨찾기 토글
- `localStorage` 연동: 마지막 위치, 선택 도시, 단위, 즐겨찾기

페이지에서는 `storeToRefs()`를 사용해 구조 분해 후에도 반응성을 유지합니다.

### 5. Axios와 외부 API

- Axios로 앱의 `/api/kma`, `/api/public-data` 서버 프록시를 호출합니다.
- 기상청 API허브의 초단기실황·단기예보로 현재 관측, 시간별 예보와 5일 예보를 구성합니다.
- 기상청 생활기상지수 조회서비스의 자외선지수를 사용합니다.
- 에어코리아 시도별 실시간 대기오염정보에서 선택 도시의 대표 측정소 통합대기환경지수·미세먼지 값을 사용합니다.
- 한국천문연구원 출몰시각정보의 지역별 일출·일몰 시각을 사용합니다.
- 메인·지도·상세·플래너에서는 선택 도시를 우선 호출하고, 전국 목록은 `/cities` 진입 시 3개씩 나눠 갱신합니다.
- 외부 응답에 없는 생활지수는 임의의 숫자로 채우지 않고 `확인 중`으로 표시합니다.

#### 데이터 요청 구조

| 화면 정보 | 브라우저 요청 | 외부 데이터 | 갱신·오류 처리 |
| --- | --- | --- | --- |
| 현재 날씨 | `/api/kma?type=current` | 기상청 초단기실황 | 서버 5분 캐시, 5xx 응답 1회 재시도 |
| 시간별·5일 예보 | `/api/kma?type=forecast` | 기상청 단기예보 | 서버 10분 캐시, 같은 요청 공유 |
| 자외선 | `/api/public-data?type=uv` | 기상청 생활기상지수 | 10분 캐시, 미제공 시 `확인 중` |
| 대기질 | `/api/public-data?type=air` | 에어코리아 측정소별 실시간 대기오염정보 | 선택 도시의 대표 측정소 사용 |
| 일출·일몰 | `/api/public-data?type=sun` | 한국천문연구원 출몰시각정보 | 지역·날짜별 응답 정규화 |

```text
Vue 화면
  └─ Pinia weatherStore
      ├─ /api/kma ───────── 기상청 API허브
      └─ /api/public-data
          ├─ 생활기상지수 ─ 기상청
          ├─ 대기질 ─────── 에어코리아
          └─ 일출·일몰 ──── 한국천문연구원
```

API 키는 Vue 코드에 넣지 않습니다. Vercel 서버리스 함수가 환경 변수에서 인증키를 읽고, 허용된 매개변수만 외부 API에 전달한 뒤 화면에서 사용하기 쉬운 형태로 응답을 정규화합니다. 선택형 생활정보 API가 일시적으로 응답하지 않으면 전체 날씨 화면을 실패시키지 않고 해당 항목만 `available: false`로 처리합니다.

### 6. 직접 추가한 기능

- Geolocation API와 최근 좌표 캐시
- 날씨 상태별 CSS 애니메이션과 구름 고양이 스프라이트
- 전국 도시 지도, 도시별 고유 일러스트와 여행 가이드 데이터
- 반응형 모바일 메뉴, 접근 가능한 버튼 이름과 `aria-pressed`
- API 장애 시 임의의 값을 노출하지 않는 `확인 중` 상태와 요청 중복 방지 설계
- ESLint와 GitHub Actions를 이용한 자동 품질 검사

## 기술 스택

- Vue 3, Composition API, Single File Components
- Vue Router, Pinia
- Axios, Browser Geolocation API
- Vite 8, ESLint 9
- CSS Grid, Flexbox, animation, glassmorphism
- 기상청 API허브·생활기상지수, 에어코리아, 한국천문연구원 출몰시각정보

## 실행 방법

### 요구 환경

- Node.js `20.19.0` 이상 또는 `22.12.0` 이상
- npm

```bash
npm install
cp .env.example .env.local
npm run dev
```

API 키가 없으면 화면 구조는 확인할 수 있지만 실시간 수치는 표시되지 않습니다.

### 로컬 환경 변수

`.env.local`은 Git에서 제외되며 로컬 개발에만 사용합니다.

```env
# 기상청 API허브 authKey
KMA_API_HUB_KEY=

# 공공데이터포털 일반 인증키(Decoding)
DATA_GO_KR_SERVICE_KEY=

```

두 인증키는 브라우저 번들에 포함하지 않고 로컬 Vite 프록시와 Vercel 서버리스 함수에서만 사용합니다. 키 이름에 `VITE_`를 붙이면 브라우저에 노출될 수 있으므로 사용하지 않습니다.

## 명령어

| 명령어 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 실행 |
| `npm run lint` | Vue·JavaScript 정적 검사, 경고도 실패 처리 |
| `npm run build` | `dist/` 프로덕션 번들 생성 |
| `npm run check` | lint 후 build까지 한 번에 검증 |
| `npm run preview` | 생성된 번들 로컬 미리보기 |

## 프로젝트 구조

```text
.
├── api/
│   ├── kma.js                       # Vercel용 기상청 서버리스 프록시
│   └── public-data.js               # 생활기상·대기질·일출일몰 프록시
├── public/
│   ├── korea-illustrated-map.png
│   └── og.png
├── src/
│   ├── assets/
│   │   ├── character/cloud-cat-sprite.png
│   │   ├── cities/                  # 17개 도시 일러스트
│   │   └── main.css                 # 전역 토큰과 공통 스타일
│   ├── components/weather/
│   │   ├── BaseDashboardCard.vue    # named slot 재사용 카드
│   │   ├── WeatherSearchBar.vue      # props + emits + v-model
│   │   ├── WeatherCityCard.vue       # props + 사용자 이벤트
│   │   ├── WeatherApplication.vue
│   │   ├── WeatherCharacter.vue
│   │   ├── WeatherSiteHeader.vue
│   │   ├── composables/useWeatherApplication.js
│   │   ├── data/                    # 도시와 추천 콘텐츠
│   │   ├── services/kmaWeather.js
│   │   ├── services/publicDataWeather.js
│   │   └── utils/                   # 격자·날씨 코드 변환
│   ├── router/index.js
│   ├── stores/weatherStore.js
│   ├── views/                       # 6개 라우트 화면
│   ├── App.vue
│   └── main.js
├── server/publicData.js             # 공공데이터 응답 정규화
├── .env.example
├── eslint.config.js
├── vercel.json
└── vite.config.js
```

수업용 샘플·목업 파일과 사용하지 않는 이미지는 제출 대상에서 제거했습니다.

## 배포

### 권장: Vercel

1. 이 프로젝트를 Public GitHub 저장소에 push합니다.
2. Vercel에서 저장소를 Import합니다.
3. Framework Preset은 `Vite`, Build Command는 `npm run build`, Output Directory는 `dist`를 사용합니다.
4. Vercel 프로젝트 환경 변수에 `KMA_API_HUB_KEY`와 `DATA_GO_KR_SERVICE_KEY`를 추가합니다. 이름에 `VITE_`를 붙이지 않습니다.
5. 배포 후 `/`, `/cities`, `/weather/seoul`을 시크릿 창에서 직접 열고 새로고침합니다.

`api/kma.js`와 `api/public-data.js`는 서버에서만 인증키를 읽고 필요한 외부 API에 요청을 전달합니다. `vercel.json`은 API와 정적 파일을 먼저 처리한 뒤 나머지 경로를 `index.html`로 보내므로 Vue Router의 상세 주소도 새로고침할 수 있습니다.

### GitHub에 올리지 않는 파일

`.gitignore`로 다음 항목을 제외합니다.

- `node_modules/`, `dist/`, `coverage/`
- `.env`, `.env.local`, `.env.*.local`
- `.vercel/`, `.netlify/`
- `.DS_Store`, IDE 설정, 로그 파일

반드시 올려야 하는 파일은 `src/`, `public/`, `api/`, `package.json`, `package-lock.json`, 설정 파일, 이 README입니다.

## 데이터와 저장 정보

다음 값은 서버 데이터베이스가 아니라 사용자의 브라우저 `localStorage`에만 저장됩니다.

- 최근 GPS 좌표와 확인 시각
- 선택 도시와 온도 단위
- 즐겨찾기 도시
- 플래너 준비물 체크 상태

GPS를 가져오지 못하면 서울을 사용합니다. 외부 API가 제공하지 못한 생활지수는 `확인 중`으로 구분해 임의의 값이 실시간 정보처럼 보이지 않도록 했습니다.

## 문제 해결

### 기상청 데이터가 나오지 않음

- 로컬: `.env.local`의 `KMA_API_HUB_KEY`에 API허브 `authKey`가 입력됐는지 확인합니다.
- Vercel: 프로젝트 환경 변수 이름이 `KMA_API_HUB_KEY`인지 확인하고 재배포합니다.
- 생활지수까지 사용하려면 Vercel의 `DATA_GO_KR_SERVICE_KEY`에 공공데이터포털 일반 인증키(Decoding)도 등록하고 재배포합니다.

### GPS가 서울로 표시됨

주소창 옆 위치 권한과 운영체제 위치 서비스를 허용한 뒤 상단의 위치 버튼을 누릅니다. 좌표는 가장 가까운 지원 도시로 표시되므로 실제 행정구역과 약간 다를 수 있습니다.

## 수정 및 검증 기록

| 발견한 문제 | 수정 내용 | 확인 결과 |
| --- | --- | --- |
| 일러스트 지도와 마커의 기준 비율이 달라 일부 도시가 바다 쪽에 표시됨 | 장식용 지도 위의 수동 마커 방식을 제거하고 실제 시·도 경계 SVG와 17개 지역 라벨로 교체 | 각 지역 도형·지역명 선택 시 해당 도시 상세 화면으로 이동 확인 |
| 지도에서 도시를 고른 뒤 홈으로 이동하면 GPS 도시로 되돌아감 | 홈 초기화 시 자동 GPS 복원 로직을 제거하고 사용자가 선택한 도시를 유지 | 배포 환경에서 `청주 선택 → 도시 상세 → 오늘 날씨` 이동 후 헤더와 메인 모두 청주 유지 확인 |
| 외부 API의 일시 장애가 브라우저 오류로 표시되거나 같은 요청이 중복됨 | 선택형 생활정보 실패를 `available: false`로 정규화하고 기상청·생활정보 요청 캐시와 진행 중 요청 공유 적용 | 응답 전에는 샘플 숫자 없이 `확인 중` 표시, 정상 응답만 10분 캐시 |
| 배포 주소에서 상세 경로를 직접 열거나 새로고침하면 404가 발생할 수 있음 | Vercel rewrite로 API·정적 파일 외 경로를 `index.html`에 연결 | `/map`, `/planner`, `/weather/cheongju` 직접 접근 확인 |
| 소개 화면의 아치형 창 안에서 온도 문구와 캐릭터가 겹치고 일부가 잘려 보임 | 중복 날씨 문구와 창살 장식을 제거하고 아치 곡률·캐릭터 크기·안쪽 여백 재조정 | 데스크톱 배포 화면에서 캐릭터의 머리·꼬리·발이 모두 창 안에 표시되는 것을 확인 |

## 검증 상태

- ✅ ESLint 검사 통과
- ✅ 프로덕션 빌드 통과
- ✅ 환경 변수 및 API 키 Git 제외
- ✅ Vercel 서버리스 프록시에서 기상청·공공데이터 응답 처리
- ✅ 선택 도시 유지 및 GPS 수동 전환 동작 확인
- ✅ 전국 지도 17개 시·도 선택 위치 확인
- ✅ 반응형 레이아웃 적용
- ✅ GitHub Actions 품질 검사 구성
- ✅ 전국 지도 지역 선택과 상세 화면 이동 확인
- ✅ 선택 도시가 홈과 공통 헤더에 유지되는 배포 동선 확인
- ✅ Vercel 프로덕션 배포 확인

---

날씨와 하루 사이, 좋은 틈을 여는 생활 날씨 서비스 **오늘의 틈**
