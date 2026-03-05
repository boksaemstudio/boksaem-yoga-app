# 🚀 추후 발전 로드맵 (Future Development Roadmap)

> 현재 복샘요가 앱은 실전 사용 중이며 안정화 단계입니다.  
> 아래 내용은 안정화 완료 후 순차적으로 진행할 예정입니다.

---

## 1단계: 코드 범용화 (설정 분리)
- [ ] `studioConfig.js`에 하드코딩된 복샘요가 전용 부분을 설정 기반으로 전환
- [ ] 스튜디오 이름, 로고, 색상, 지점 정보를 설정 파일에서 로드하도록 변경
- [ ] Firebase 프로젝트를 환경변수로 분리

## 2단계: Feature Flag 시스템 도입
- [ ] Firestore `settings` 컬렉션에 기능별 ON/OFF 플래그 추가
- [ ] 관리자 설정 탭에 토글 스위치 UI 구현
- [ ] 대상 기능:
  - 예약 기능 (`reservationEnabled`)
  - 얼굴인식 출석 (`faceRecognitionEnabled`)
  - 회원 직접 정지/연장 (`memberSelfManageEnabled`)

## 3단계: 모노레포 분리 + 범용 앱 생성
- [ ] 프로젝트를 모노레포 구조로 재구성:
  ```
  yoga-platform/
  ├── packages/core/       ← 공통 엔진
  ├── packages/ui/         ← 공유 UI 컴포넌트
  ├── packages/functions/  ← Cloud Functions
  ├── apps/boksaem/        ← 복샘요가 전용
  └── apps/generic/        ← 범용 앱
  ```
- [ ] 버그 수정 시 core에서 한 번 고치면 양쪽 동시 반영되는 구조

## 4단계: 네이티브 허브 앱 (스토어 공개)
- [ ] React Native 또는 Capacitor로 "요가원 관리" 허브 앱 제작
- [ ] 역할별 로그인 → WebView로 해당 PWA 연결
- [ ] 키오스크 출석체크는 네이티브 모드로 구현
- [ ] Google Play ($25 1회) / Apple App Store ($99/년) 등록

## 5단계: 얼굴인식 출석 모듈
- [ ] **기술**: Google ML Kit (Android) + Apple Vision (iOS) → 비용 **0원**
- [ ] 온디바이스 처리 (서버 전송 없음, 오프라인 가능)
- [ ] 회원 얼굴 등록 → Firebase에 암호화 저장 → 기기에서 대조
- [ ] 처리 속도: 0.1초 이내 실시간

## 6단계: 신규 기능 개발
- [ ] **예약 시스템**: 회원이 수업 시간대별 예약/취소
- [ ] **회원 직접 정지/연장**: 약관 동의 후 회원 앱에서 수강권 정지/연장 신청
- [ ] **다국어 확장**: 영어/일본어 등 지원

---

## 비용 요약
| 항목 | 비용 |
|------|------|
| 얼굴인식 엔진 (Google ML Kit) | ₩0 |
| Firebase 호스팅/DB | 현재와 동일 |
| Google Play 등록 | 1회 ~₩34,000 |
| Apple Store 등록 | 연간 ~₩135,000 |

---

*최종 업데이트: 2026-03-04*
