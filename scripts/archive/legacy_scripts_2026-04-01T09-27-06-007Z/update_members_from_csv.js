const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

// CSV 파일 경로
const CSV_FILE = path.join(__dirname, '..', '회원정보_20260124.csv');

// 브랜치 ID 매핑
const branchMapping = {
    '광흥창': 'gwangheungchang',
    '마포': 'mapo',
    'ttc': 'gwangheungchang',  // TTC는 광흥창으로 처리
    'ttc8기': 'gwangheungchang',
    'ttc7기': 'gwangheungchang',
    'ttc6기': 'gwangheungchang',
    'ttc5기': 'gwangheungchang',
    'ttc4기': 'gwangheungchang',
    'ttc3기': 'gwangheungchang',
    'ttc2기': 'gwangheungchang',
    'ttc9기': 'gwangheungchang',
    'ttc플라잉': 'gwangheungchang'
};

// 날짜 파싱 함수
function parseDate(dateStr) {
    if (!dateStr || dateStr.trim() === '') return null;

    try {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        }
    } catch (e) {
        console.error('Date parsing error:', dateStr, e);
    }
    return null;
}

// 전화번호 정리 함수
function cleanPhone(phone) {
    if (!phone) return '';

    // 따옴표 제거 및 트림
    let cleaned = phone.replace(/"/g, '').trim();

    // 잘못된 형식 수정
    if (cleaned.startsWith('0104-')) {
        cleaned = '010-' + cleaned.substring(5);
    }

    // "010" 따옴표로 시작하는 경우 처리
    if (cleaned.startsWith('010')) {
        return cleaned;
    }

    return cleaned;
}

// CSV 행을 회원 객체로 변환
function csvRowToMember(row) {
    const branchId = branchMapping[row['회원번호']?.trim()] || branchMapping[row['회원번호']?.split(/\s+/)[0]] || 'gwangheungchang';

    return {
        name: row['이름']?.trim() || '',
        phone: cleanPhone(row['휴대폰']),
        homeBranch: branchId,
        regDate: parseDate(row['등록일자']),
        endDate: parseDate(row['만기일자']),
        credits: 0,  // 초기값, 실제로는 계산 필요
        attendanceCount: 0,  // 초기값
        subject: row['구매 내역']?.trim() || '',
        language: 'ko'
    };
}

async function main() {
    try {
        console.log('CSV 파일 읽는 중...');
        const fileContent = fs.readFileSync(CSV_FILE, 'utf-8');

        console.log('CSV 파싱 중...');
        const records = parse(fileContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true
        });

        console.log(`총 ${records.length}개의 레코드 발견`);

        // 1. 기존 회원 데이터 모두 삭제
        console.log('\n기존 회원 데이터 삭제 중...');
        const existingMembers = await db.collection('members').get();
        console.log(`삭제할 기존 회원 수: ${existingMembers.size}`);

        const batch = db.batch();
        let batchCount = 0;

        for (const doc of existingMembers.docs) {
            batch.delete(doc.ref);
            batchCount++;

            if (batchCount === 500) {
                await batch.commit();
                console.log(`${batchCount}개 삭제 완료...`);
                batchCount = 0;
            }
        }

        if (batchCount > 0) {
            await batch.commit();
            console.log(`나머지 ${batchCount}개 삭제 완료`);
        }

        console.log('✅ 기존 데이터 삭제 완료\n');

        // 2. 새 회원 데이터 추가
        console.log('새 회원 데이터 추가 중...');
        let successCount = 0;
        let errorCount = 0;
        const errors = [];

        for (let i = 0; i < records.length; i++) {
            const record = records[i];

            try {
                const member = csvRowToMember(record);

                // 최소 필수 정보 검증
                if (!member.name || !member.phone) {
                    console.warn(`⚠️ Row ${i + 2}: 이름 또는 전화번호 누락 - ${member.name || '이름없음'}`);
                    errorCount++;
                    continue;
                }

                // Firestore에 추가 (자동 생성 ID 사용)
                await db.collection('members').add(member);
                successCount++;

                if (successCount % 100 === 0) {
                    console.log(`${successCount}개 회원 추가됨...`);
                }

            } catch (error) {
                errorCount++;
                errors.push({ row: i + 2, name: record['이름'], error: error.message });
                console.error(`❌ Row ${i + 2} 처리 실패:`, error.message);
            }
        }

        console.log('\n\n=== 완료 ===');
        console.log(`✅ 성공: ${successCount}명`);
        console.log(`❌ 실패: ${errorCount}명`);

        if (errors.length > 0 && errors.length < 20) {
            console.log('\n실패한 레코드:');
            errors.forEach(e => {
                console.log(`  Row ${e.row}: ${e.name} - ${e.error}`);
            });
        }

    } catch (error) {
        console.error('스크립트 실행 오류:', error);
        process.exit(1);
    }
}

main()
    .then(() => {
        console.log('\n스크립트 완료');
        process.exit(0);
    })
    .catch(error => {
        console.error('치명적 오류:', error);
        process.exit(1);
    });
