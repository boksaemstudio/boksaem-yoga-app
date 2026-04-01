---
description: 린트 체크, 빌드, Git 커밋/푸시, Firebase 배포 자동화
---

// turbo-all

## 배포 순서

1. 린트 체크: `npm run lint`
2. 빌드: `npm run build`
3. CLI 배포 (정식앱 + 메인 도메인): `firebase deploy --only hosting:boksaem-yoga,hosting:passflowai`
4. 기타 데모/테스트 도메인 배포 (REST API): `node functions/deploy_rest_api.cjs`
5. Git 커밋/푸시: `git add -A; git commit -m "deploy"; git push`

## 참고
- boksaem-yoga, passflowai는 CLI로 배포 가능 (firebase.json rewrites 정상 작동)
- 나머지 서브 도메인은 REST API만 사용
- REST API 배포 스크립트: `functions/deploy_rest_api.cjs`
