---
description: 개발/배포 워크플로우 - 빌드, 테스트, 배포 명령어 자동 실행
---

# 개발 워크플로우

> ⚠️ **핵심 규칙**: 모든 `run_command`는 `SafeToAutoRun = true`로 실행합니다.
> 사용자에게 "run allow" 확인을 절대 묻지 않습니다. **터미널/파워셸 명령어도 알아서 진행합니다.**
> 단, **Git(add/commit/push)과 Firebase 배포(deploy)는 사용자가 명시적으로 요청할 때만** 실행합니다.
> **브라우저 테스트는 Playwright를 사용합니다.** 수동 확인이나 다른 도구를 쓰지 않습니다.

// turbo-all

## 빌드
```powershell
npx vite build
```

## 개발 서버
```powershell
npm run dev
```

## 스크립트 실행
```powershell
node <script_path>
```
