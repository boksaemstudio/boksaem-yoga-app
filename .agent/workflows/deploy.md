---
description: 린트 체크, 빌드, Git 커밋/푸시, Firebase 배포 자동화
---

# 배포 워크플로우 (Deploy)

## 방법 1: build.ps1 스크립트 (캐시 초기화 + Hosting만 배포)
// turbo
```powershell
.\build.ps1
```
- Vite 캐시(`node_modules/.vite`, `dist`) 삭제 후 클린 빌드
- `firebase deploy --only hosting` (Functions 배포 안 함)
- PWA 캐시 문제가 있을 때 사용

## 방법 2: npm run deploy (전체 배포 - Functions 포함)
// turbo
```powershell
npm run deploy
```
- `npm run build && firebase deploy --force`
- Hosting + Functions + Firestore Rules + Storage Rules 전체 배포
- 서버 측 코드(Cloud Functions) 변경이 있을 때 사용

## 배포 후 Git 동기화 (선택)
```powershell
git add -A
git commit -m "배포: [작업 내용 요약]"
git push
```

## 완료 확인
- 배포 URL: https://boksaem-yoga.web.app
- 브라우저 강력 새로고침: Ctrl+Shift+R
- 출석체크 키오스크: 3~5분 대기 후 자동 업데이트됨
