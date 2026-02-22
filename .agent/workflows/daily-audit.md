---
description: 복샘요가 앱 24시간 주기 보안 및 성능 정기 점검 가이드
---

# 일일 점검 워크플로우 (Daily Audit)

## 1. 보안 규칙 점검
- Firestore Rules(`firestore.rules`): `allow if true` 등 취약한 권한 있는지 확인
- Storage Rules(`storage.rules`): 인증된 사용자만 접근 가능한지 확인
- 관리자/강사/회원 권한 분리 확인

## 2. 데이터 무결성 점검
- `attendance` 컬렉션: 당일 수업 인원이 대시보드와 일치하는지 확인
- 음수(-) 크레딧 발생 여부 전수 조사
- 중복 출석 기록 확인 (같은 회원, 같은 날, 같은 수업)
- 출석 삭제 시 credits +1 복원 정상 작동 확인

## 3. AI/시스템 모니터링
- Gemini API 사용량 및 할당량 잔여 확인
- `error_logs` 컬렉션: 최근 에러 보고 내용 확인
- Cloud Functions 로그에서 실패한 함수 확인

## 4. PWA/캐시 무결성 확인
- 최신 빌드 버전이 배포되어 있는지 확인
- 구버전이 계속 보일 경우: `.\build.ps1` 재실행 + 브라우저 Ctrl+Shift+R

## 5. FCM 토큰 점검
- 과도한 토큰 등록 여부 확인 (동일 기기에서 중복 토큰)
- 만료/비활성 토큰 정리 필요 여부 확인

## 6. 보고서 업데이트
- 발견된 이슈를 `codebase_audit_report.md`에 기록
