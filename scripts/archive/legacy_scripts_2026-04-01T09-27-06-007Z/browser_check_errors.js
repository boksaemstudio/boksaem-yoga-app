// 브라우저 개발자 도구 콘솔에서 실행할 스크립트
// Admin Dashboard → 에러로그 탭 → F12 → Console에 붙여넣기

const checkErrorLogs = async () => {
    try {
        const result = await storageService.getErrorLogs(100);

        const errors = {};
        result.forEach(log => {
            const key = log.message || 'Unknown';
            if (!errors[key]) {
                errors[key] = { count: 0, examples: [] };
            }
            errors[key].count++;
            errors[key].examples.push(log);
        });

        console.log('\n=== 에러 분석 ===\n');
        Object.entries(errors)
            .sort((a, b) => b[1].count - a[1].count)
            .forEach(([msg, info]) => {
                console.log(`\n📛 ${msg}`);
                console.log(`발생: ${info.count}회`);
                console.log(`최근: ${new Date(info.examples[0].timestamp).toLocaleString()}`);
            });

        console.log(`\n총 ${result.length}건`);

        // 삭제 확인
        if (confirm(`모든 에러 로그 ${result.length}건을 삭제하시겠습니까?`)) {
            await storageService.clearErrorLogs();
            console.log('✅ 모든 에러 로그 삭제 완료');
        }
    } catch (e) {
        console.error('실패:', e);
    }
};

checkErrorLogs();
