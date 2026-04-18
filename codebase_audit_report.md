# 🛡️ 복샘요가(PassFlow SaaS) 일일 점검 보고서 (Daily Audit)
**점검 일시:** 2026년 4월 18일

## 1. 보안 규칙 점검 (Security Rules)

### ⚠️ Firestore 보안 규칙 (`firestore.rules`)
- **현재 상태:** 모든 사용자가 Anonymous Auth를 사용 중이므로, 대부분의 컬렉션(`studios`, `members`, `attendance`, `sales` 등)에 대해 `allow read, write: if isAuth();`로 설정되어 있습니다.
- **취약점:** 모든 로그인된 사용자(익명 사용자 포함)가 다른 테넌트(스튜디오)의 데이터를 읽거나 수정할 수 있는 잠재적 위험이 존재합니다.
- **권고사항:** 빠른 시일 내에 `token.studioId == studioId`와 같은 Custom Claims 검증 로직을 추가하여 **관리자/강사/회원 간의 권한 분리 및 테넌트 격리**를 완벽하게 구현해야 합니다.
- **크레딧 무결성:** `members` 컬렉션의 경우 생성 및 업데이트 시 `request.resource.data.credits >= 0` 조건이 있어 음수 크레딧 발생을 규칙 단에서 차단하고 있습니다. (양호)

### ⚠️ Storage 보안 규칙 (`storage.rules`)
- **현재 상태:** `studios/{studioId}` 하위의 파일들에 대해 읽기는 `if true` (전체 공개), 쓰기는 `if isAuth()`로 설정되어 있습니다.
- **취약점:** 악의적인 인증 사용자가 임의의 파일을 업로드할 위험이 있습니다.
- **권고사항:** 파일 업로드 시 파일 타입 제한 및 업로드 권한을 `isAdmin()` 등으로 강화할 필요가 있습니다.

## 2. 데이터 무결성 점검 (Data Integrity)
- **음수 크레딧 방지:** Firestore 규칙에 의해 멤버의 `credits`가 0 미만으로 설정되는 것은 데이터베이스 레벨에서 차단되고 있으므로 안전하게 보호되고 있습니다.
- **출석 기록 확인:** 관리자 앱의 출석 처리 시 중복 처리 및 크레딧 복원(삭제 시 +1) 기능은 정상적으로 동작하도록 로직이 구성되어 있습니다.

## 3. 시스템 및 스크립트 상태
- **Healthcheck 스크립트:** `scripts/daily_global_healthcheck.cjs` 스크립트가 누락되어 자동화된 SEO 및 메타태그 점검이 실행되지 않았습니다.
- **조치 필요:** 글로벌 마케팅 헬스체크 스크립트를 재작성하거나 경로를 수정해야 합니다.

## 4. PWA 및 배포 무결성
- 최신 빌드 스크립트(`build.ps1` 또는 배포 스크립트)를 통해 캐시 무효화 및 Service Worker 업데이트 상태 모니터링이 필요합니다. 랜딩 페이지들의 언어별 HTML 빌드가 완료된 상태입니다.

## 5. FCM 토큰 현황
- `fcm_tokens` 컬렉션 또한 `isAuth()`로 열려 있어 만료되거나 비활성화된 토큰 정리를 위한 백그라운드 Cloud Function 구현이 필요합니다.

---
### 🚨 핵심 조치 필요 사항 (Action Items)
1. **[보안]** Firestore 규칙에서 테넌트 격리(`studioId` 기반 접근 제어) 구현
2. **[복구]** 누락된 `daily_global_healthcheck.cjs` 복원 또는 새로 작성
3. **[유지보수]** 사용하지 않는 구형 FCM 토큰 정리를 위한 예약된 함수(Scheduled Function) 추가 고려
