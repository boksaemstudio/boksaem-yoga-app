---
description: 개발/배포 워크플로우 - 빌드, 테스트, 배포 명령어 자동 실행
---

// turbo-all

## 개발 워크플로우

1. 코드 수정
2. 빌드: `npm run build`
3. 배포: `firebase deploy --only hosting`
4. Functions 배포: `firebase deploy --only functions`
5. Firestore 쿼리 스크립트 실행
6. 브라우저 테스트
