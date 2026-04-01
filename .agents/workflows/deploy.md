---
description: 린트 체크, 빌드, Git 커밋/푸시, Firebase 배포 자동화
---

// turbo-all

## 배포 순서

1. 린트 체크: `npm run lint`
2. 빌드 및 다중 도메인 Title(OG 메타/PWA) 순차 주입 & 전면 배포: `node scripts/deploy_all.cjs`
3. Git 커밋/푸시: `git add -A; git commit -m "deploy"; git push`

## 참고
- 스크립트 하나로 복샘요가, 쌍문요가, PassFlowAi 메인 서버 모두 고유의 Title을 갖도록 변환하며 일괄 배포됩니다.
- CLI 오류 시 REST API 배포 우회를 고려할 필요 없이 각 호스팅 타겟별 단독 배포를 순차적으로 실행합니다.
