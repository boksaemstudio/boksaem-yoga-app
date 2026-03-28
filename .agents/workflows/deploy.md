---
description: 린트 체크, 빌드, Git 커밋/푸시, Firebase 배포 자동화
---

// turbo-all

## 배포 순서

1. 빌드: `npm run build`
2. CLI 배포 (정식앱 + 메인 도메인): `firebase deploy --only hosting:boksaem-yoga,hosting:passflow-0324`
3. passflow-demo-0324 + ssangmun-yoga-0324 배포 (REST API): `node functions/deploy_rest_api.cjs`
4. Git 커밋/푸시: `git add -A; git commit -m "deploy"; git push`

## 참고
- boksaem-yoga, passflow-0324는 CLI로 배포 가능 (firebase.json rewrites 정상 작동)
- passflow-demo-0324, ssangmun-yoga-0324는 Firebase CLI 버그로 REST API만 사용
- REST API 배포 스크립트: `functions/deploy_rest_api.cjs`
