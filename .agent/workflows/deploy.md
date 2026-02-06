---
description: 린트 체크, 빌드, Git 커밋/푸시, Firebase 배포 자동화
---

# 배포 워크플로우 (Deploy)

이 워크플로우는 코드 변경 후 프로덕션 배포까지의 전체 과정을 자동화합니다.

## 사전 조건
- 개발 서버가 실행 중이면 먼저 종료

## 단계

### 1. 린트 체크
```powershell
npm run lint
```
// turbo

### 2. 빌드 테스트
```powershell
npm run build
```
// turbo

### 3. Git 스테이징
```powershell
git add -A
```
// turbo

### 4. Git 커밋
사용자에게 커밋 메시지를 확인받은 후:
```powershell
git commit -m "[커밋 메시지]"
```

### 5. Git 푸시
```powershell
git push
```
// turbo

### 6. Firebase 배포
```powershell
firebase deploy --only hosting
```
// turbo

## 완료 확인
- 배포 URL: https://boksaem-yoga.web.app
- Firebase 콘솔: https://console.firebase.google.com/project/boksaem-yoga/overview

## 오류 발생 시
- 린트 오류: `npm run lint -- --fix`로 자동 수정 시도
- 빌드 오류: 에러 메시지 확인 후 코드 수정
- Git 충돌: `git pull --rebase` 후 다시 시도
