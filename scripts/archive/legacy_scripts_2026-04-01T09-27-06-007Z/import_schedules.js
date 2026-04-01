// 시간표 이미지 분석 결과를 기반으로 Firebase에 스케줄 템플릿 자동 생성
// 실행: node scripts/import_schedules.js

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCTjDayI1tiZO15eynRzKqrDK3TKj3D-yw",
    authDomain: "boksaem-yoga.firebaseapp.com",
    projectId: "boksaem-yoga",
    storageBucket: "boksaem-yoga.firebasestorage.app",
    messagingSenderId: "638854766032",
    appId: "1:638854766032:web:db6b919068aaf5808b2dd5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 광흥창점 시간표 (이미지 분석 결과)
const gwangheungchangSchedule = [
    // 월요일
    { days: ['월'], startTime: '10:00', className: '아티스요가', instructor: '' },
    { days: ['월'], startTime: '14:00', className: '마미요가(산후케어)', instructor: '' },
    { days: ['월'], startTime: '19:00', className: '아티스요가', instructor: '' },
    { days: ['월'], startTime: '20:20', className: '아쉬탕가요가', instructor: '' },

    // 화요일
    { days: ['화'], startTime: '10:00', className: '아쉬탕가요가', instructor: '' },
    { days: ['화'], startTime: '14:00', className: '마미요가(산후케어)', instructor: '' },
    { days: ['화'], startTime: '19:00', className: '아티스요가', instructor: '' },
    { days: ['화'], startTime: '20:20', className: '인사가요가', instructor: '' },

    // 수요일
    { days: ['수'], startTime: '10:00', className: '아티스+인사이드', instructor: '' },
    { days: ['수'], startTime: '14:00', className: '아티스(아쉬탕가,2+3(MON)등)', instructor: '' },
    { days: ['수'], startTime: '19:00', className: '아쉬탕가', instructor: '' },
    { days: ['수'], startTime: '20:20', className: '라티스요가', instructor: '' },

    // 목요일
    { days: ['목'], startTime: '10:00', className: '아티스테크', instructor: '' },
    { days: ['목'], startTime: '14:00', className: '마미요가(산후케어)', instructor: '' },
    { days: ['목'], startTime: '19:00', className: '아티스테크', instructor: '' },
    { days: ['목'], startTime: '20:20', className: '인사가요가', instructor: '' },

    // 금요일
    { days: ['금'], startTime: '10:00', className: '아티스요가', instructor: '' },
    { days: ['금'], startTime: '14:00', className: '아티스(아쉬탕가,2+3(MON)등)', instructor: '' },
    { days: ['금'], startTime: '19:00', className: '인사가요가', instructor: '' },
    { days: ['금'], startTime: '20:20', className: '라티스요가', instructor: '' },

    // 토요일
    { days: ['토'], startTime: '11:20', className: '다이나스토리(하타+빈야사,3개월이상)', instructor: '' },

    // 일요일
    { days: ['일'], startTime: '14:00', className: '아티스(아쉬탕가,2+3(MON)등)', instructor: '' },
];

// 마포점 시간표 (이미지 분석 결과)
const mapoSchedule = [
    // 월요일
    { days: ['월'], startTime: '10:00', className: '아티스요가', instructor: '' },
    { days: ['월'], startTime: '17:40', className: '인사가요가', instructor: '' },
    { days: ['월'], startTime: '19:00', className: '아티스요가', instructor: '' },
    { days: ['월'], startTime: '20:20', className: '필라테스(입문)', instructor: '' },

    // 화요일
    { days: ['화'], startTime: '10:00', className: '아티스요가', instructor: '' },
    { days: ['화'], startTime: '11:50', className: '당진복부가', instructor: '' },
    { days: ['화'], startTime: '17:40', className: '플라잉(가족반-소년)', instructor: '' },
    { days: ['화'], startTime: '19:00', className: '아티스요가', instructor: '' },
    { days: ['화'], startTime: '20:20', className: '아쉬탕가요가', instructor: '' },

    // 수요일
    { days: ['수'], startTime: '10:00', className: '아티스요가', instructor: '' },
    { days: ['수'], startTime: '15:00', className: '키즈플라잉(가족반-유아)', instructor: '' },
    { days: ['수'], startTime: '17:40', className: '라티스요가', instructor: '' },
    { days: ['수'], startTime: '19:00', className: '아티스요가', instructor: '' },
    { days: ['수'], startTime: '20:20', className: '필라테스(L1~2단계)', instructor: '' },

    // 목요일
    { days: ['목'], startTime: '10:00', className: '빈야사요가', instructor: '' },
    { days: ['목'], startTime: '11:50', className: '당진복부가', instructor: '' },
    { days: ['목'], startTime: '17:40', className: '플라잉(입문)', instructor: '' },
    { days: ['목'], startTime: '19:00', className: '플라잉(L1~2단계)', instructor: '' },
    { days: ['목'], startTime: '20:20', className: '필라테스(입문)', instructor: '' },

    // 금요일
    { days: ['금'], startTime: '10:00', className: '관절요가', instructor: '' },
    { days: ['금'], startTime: '17:40', className: '아쉬탕가요가', instructor: '' },
    { days: ['금'], startTime: '19:00', className: '아티스요가', instructor: '' },
    { days: ['금'], startTime: '20:20', className: '코어필라(입문)', instructor: '' },

    // 토요일
    { days: ['토'], startTime: '11:20', className: '1~4주(MON) 요가회원/5주(WED) 쿠킹강습/3주(SAT)요강습/4주(SAT) 디저트 강습', instructor: '' },

    // 일요일
    { days: ['일'], startTime: '10:00', className: '아티스요가', instructor: '' },
];

async function importSchedules() {
    try {
        console.log('📅 시간표 템플릿 가져오는 중...');

        // 광흥창점 스케줄 저장
        await setDoc(doc(db, 'schedules', 'gwangheungchang'), {
            slots: gwangheungchangSchedule
        });
        console.log('✅ 광흥창점 시간표 저장 완료');

        // 마포점 스케줄 저장
        await setDoc(doc(db, 'schedules', 'mapo'), {
            slots: mapoSchedule
        });
        console.log('✅ 마포점 시간표 저장 완료');

        console.log('\n🎉 모든 시간표 템플릿이 Firebase에 저장되었습니다!');
        console.log('이제 관리자 대시보드 > 달력 관리에서 "기본 스케줄로 생성" 버튼을 눌러주세요.');

        process.exit(0);
    } catch (error) {
        console.error('❌ 오류 발생:', error);
        process.exit(1);
    }
}

importSchedules();
