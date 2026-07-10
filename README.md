# 토계부 (Toto + 가계부)

스포츠 배팅 내역을 가계부처럼 기록하는 웹앱입니다. 회원가입이 없고, 모든 데이터는 방문자의 브라우저(localStorage)에만 저장됩니다.

## 파일 구조

```
tokebu/
├── index.html          메인 앱 (기록 / 통계 / 캘린더 / 설정 탭)
├── privacy.html         개인정보처리방침
├── terms.html            이용약관
├── ads.txt                애드센스 승인 후 퍼블리셔 ID로 교체
├── css/style.css
├── js/app.js             전체 로직 (localStorage 기반, 서버 없음)
└── android-wrap/         안드로이드 앱 래핑용 Capacitor 설정
    ├── capacitor.config.json
    ├── package.json
    └── www/index.html    오프라인 폴백 페이지
```

로컬에서 바로 확인하려면 `tokebu` 폴더에서 `python3 -m http.server 8000` 실행 후 `localhost:8000` 접속하면 됩니다.

---

## 1단계. 웹사이트 무료 배포 (Vercel)

1. [vercel.com](https://vercel.com) 가입 (GitHub 계정으로 가능)
2. 방법 A — **드래그 앤 드롭 (가장 간단)**: Vercel 대시보드에서 "Add New → Project → 폴더 드래그" 로 `tokebu` 폴더를 그대로 올리면 끝. 별도 빌드 과정이 없는 정적 사이트라 바로 배포됩니다.
3. 방법 B — **CLI 사용**:
   ```bash
   npm i -g vercel
   cd tokebu
   vercel --prod
   ```
4. 배포가 끝나면 `https://프로젝트명.vercel.app` 형태의 주소가 발급됩니다. 이후 Vercel 설정에서 원하는 커스텀 도메인(예: tokebu.co.kr)을 연결할 수 있습니다 (도메인은 별도 구매 필요).
5. **애드센스 심사를 통과하려면 도메인 소유 사실이 명확해야 하므로, 무료 `.vercel.app` 서브도메인보다는 자체 도메인을 구매해 연결하는 것을 권장합니다.**

배포 후 `index.html`, `privacy.html`, `terms.html`이 모두 정상 로드되는지, 기록 추가/통계/캘린더 탭이 잘 동작하는지 확인하세요.

---

## 2단계. 안드로이드 앱으로 만들기 (Capacitor 웹뷰 래핑)

이 사이트는 순수 클라이언트 웹앱이라 **Capacitor**로 감싸면 별도 안드로이드 코드를 새로 짜지 않고도 앱으로 만들 수 있습니다. 아래 과정은 **Android Studio가 설치된 PC**에서 진행해야 합니다 (APK 빌드는 Android SDK가 필요해 이 대화 환경에서는 직접 실행할 수 없습니다).

1. `android-wrap` 폴더에 있는 `capacitor.config.json`의 `server.url` 값을 1단계에서 배포한 실제 주소로 교체합니다.
   ```json
   "url": "https://tokebu.vercel.app"
   ```
   이렇게 하면 앱이 실제 웹사이트를 그대로 불러오므로, 웹사이트를 업데이트할 때마다 앱을 다시 빌드할 필요가 없습니다.
2. 터미널에서:
   ```bash
   cd android-wrap
   npm install
   npx cap add android
   npx cap sync android
   npx cap open android
   ```
3. Android Studio가 열리면 상단 메뉴에서 `Build → Generate Signed Bundle / APK`로 서명된 앱(AAB 또는 APK)을 생성합니다. 서명 키(keystore)는 최초 1회 직접 생성해야 하며 분실 시 업데이트가 불가능하니 안전하게 보관하세요.
4. 앱 아이콘/스플래시 화면은 `android-wrap/android/app/src/main/res` 폴더의 리소스를 교체해 변경할 수 있습니다.

### 플레이스토어 등록
1. [Google Play Console](https://play.google.com/console) 접속 → **개발자 계정 등록비 25달러(1회)** 결제, 본인 인증 필요 (이 부분은 본인이 직접 진행해야 합니다).
2. 새 앱 만들기 → 스토어 등록정보(앱 이름, 설명, 스크린샷, 아이콘) 입력.
3. **콘텐츠 등급 심사**에서 사행성 관련 항목에 정직하게 답변하세요. 배팅 자체를 중개하지 않는 "기록 관리 도구"임을 앱 설명에 명확히 기재하는 것이 중요합니다.
4. **개인정보처리방침 URL**에 `https://your-domain/privacy.html`을 입력합니다.
5. AAB 파일 업로드 후 심사 제출 (통상 며칠 소요).

> 참고: 도박/베팅 관련 앱은 Google Play 정책상 국가별 라이선스, 연령 제한 등 추가 요건이 있을 수 있습니다. 제출 전 [Google Play 도박 정책](https://support.google.com/googleplay/android-developer/answer/9877726)을 반드시 확인하세요. 토계부는 실제 베팅 기능이 없는 "개인 기록 도구"이므로 일반적으로 이 정책 대상은 아니지만, 스토어 설명에 이를 명확히 밝히는 것이 안전합니다.

---

## 3단계. 구글 애드센스 등록으로 수익화

애드센스 승인은 Google이 사이트를 직접 심사하는 절차라 저(Claude)나 다른 도구가 대신 신청/승인해 줄 수 없습니다. 아래 단계를 직접 진행하세요.

1. **콘텐츠와 트래픽 확보**: 애드센스는 콘텐츠가 부실하거나 방문자가 거의 없는 사이트는 승인하지 않는 경우가 많습니다. 배포 후 실사용자가 어느 정도 유입되고, 필요하면 배팅 관리 팁 등 블로그성 콘텐츠 페이지를 추가하는 것도 승인에 도움이 됩니다.
2. [Google AdSense](https://www.google.com/adsense/)에 본인 Google 계정으로 가입 → 사이트 URL 등록.
3. Google이 제공하는 확인 코드(메타 태그 또는 `ads.txt`)를 사이트에 삽입해 소유권을 인증합니다.
   - `index.html` 상단 주석 처리된 부분:
     ```html
     <!-- <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX" crossorigin="anonymous"></script> -->
     ```
     승인 후 발급받은 `client=ca-pub-...` 값으로 교체하고 주석을 해제하세요.
   - `ads.txt` 파일의 `pub-0000000000000000` 부분도 실제 발급받은 퍼블리셔 ID로 교체 후 재배포하세요.
4. 심사 신청 → 보통 수일~수 주 소요. 통과하면 광고 유닛을 만들고, `index.html`의 `ad-slot-top` / `ad-slot-bottom` 자리(주석 표시된 부분)에 발급받은 광고 코드를 넣으면 됩니다.
5. **주의**: 도박성 콘텐츠에 대한 애드센스 정책이 엄격합니다. 실제 베팅 중개 기능이 없는 "개인 기록 관리 도구"라는 점을 사이트 첫 화면과 소개 문구에 분명히 밝혀두면 심사에 유리합니다 (이미 `index.html`과 `terms.html`에 해당 문구를 넣어두었습니다). 그래도 정책 위반으로 반려될 수 있으니 [AdSense 프로그램 정책](https://support.google.com/adsense/answer/48182)의 도박 관련 항목을 직접 확인하시길 권합니다.

---

## 유의 사항

- 이 사이트/앱은 배팅을 중개하거나 권유하지 않는 **개인 기록 관리 도구**입니다. 실제 스포츠 베팅은 국내에서 허가된 스포츠토토(배트맨) 등 공식 채널을 통해서만 합법입니다.
- 로그인이 없는 구조라 데이터는 기기별로 분리 저장됩니다. 설정 탭의 백업(JSON/CSV) 기능을 이용자에게 안내해 데이터 유실을 예방하세요.
- 향후 여러 기기 간 동기화, 회원 로그인, 실시간 배당률 연동 등을 추가하려면 별도 백엔드/DB 구축이 필요합니다.
