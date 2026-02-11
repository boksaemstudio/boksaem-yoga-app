---
description: 복샘요가 앱 24시간 주기 보안 및 성능 정기 점검 가이드
---

매일 앱의 상태를 최상으로 유지하기 위해 아래 단계를 수행하세요.

1. **보안 규칙(Security Rules) 확인**
   - Firebase Console > Firestore > Rules 탭에서 `allow if true`가 아닌지 확인합니다.
   - 불필요한 쓰기 권한이 열려있지 않은지 점검합니다.

2. **데이터 무결성(Data Integrity) 점검**
   - `attendance` 컬렉션에 중복된 출석 데이터가 있는지 확인합니다.
   - `members`의 `credits` 값이 음수(-)가 된 회원이 있는지 확인합니다.

3. **AI 할당량 및 오류 모니터링**
   - Google Cloud Console에서 Gemini API 사용량을 확인합니다.
   - Cloud Functions 로그에서 `generatePageExperienceV2` 함수의 에러율을 확인합니다.
   - **[중요] 에러 로그 수동 점검**: Firestore에서 `ai_error_logs` 및 `error_logs` 컬렉션을 직접 조회하여 새로운 에러가 없는지 확인합니다. (관리자 앱 탭 제거됨)

4. **FCM 토큰 유효성 점검**
   - `fcm_tokens` 컬렉션에 한 명의 사용자에게 너무 많은(예: 10개 이상) 토크이 등록되어 있는지 확인하고 정리합니다.

5. **최신 보고서 업데이트**
   - [codebase_audit_report.md](file:///C:/Users/boksoon/.gemini/antigravity/brain/eac62209-e55b-4db2-ba2e-50bd69b3f58c/codebase_audit_report.md)를 열어 새로운 취약점이 발견되었는지 대조합니다.
