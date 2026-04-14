const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const text = `
  ❌ [김혜진 / 01040241853] 월 무제한 (3개월)
     - endDate 오류: 2026-06-25 → 2026-04-04 (차이 큼)

  ❌ [이원희 / 010-7211-8021] 
     - endDate 오류: 2024-12-02 → 2024-09-29 (차이 큼)

  ❌ [김지원 / 010-9061-6608] 
     - endDate 오류: 2024-10-16 → 2024-07-31 (차이 큼)

  ❌ [유혜영 / 010-3980-4537] 
     - endDate 오류: 2025-06-09 → 2025-04-09 (차이 큼)

  ❌ [서지혜 / 010-4299-0915] 
     - endDate 오류: 2024-10-23 → 2024-08-23 (차이 큼)

  ❌ [정숙희 / 01027190365] 월 8회 (3개월)
     - endDate 오류: 2026-07-03 → 2026-05-03 (차이 큼)

  ❌ [주예진 / 010-3337-7324] 
     - endDate 오류: 2024-08-08 → 2024-02-23 (차이 큼)

  ❌ [서경숙 / 010-9099-3677] 
     - endDate 오류: 2025-11-15 → 2025-08-28 (차이 큼)

  ❌ [박성민 / 010-3519-7206] 
     - endDate 오류: 2025-11-17 → 2025-05-22 (차이 큼)

  ❌ [김지윤 / 01077044913] 월 12회 (3개월)
     - endDate 오류: 2026-07-11 → 2026-05-11 (차이 큼)

  ❌ [김한아 / 01089817108] 월 12회 (3개월)
     - endDate 오류: 2026-06-04 → 2026-04-04 (차이 큼)

  ❌ [김민지 / 01036065977] 월 8회 (3개월)
     - endDate 오류: 2026-06-30 → 2026-04-30 (차이 큼)

  ❌ [고진아 / 010-5001-0524] 
     - endDate 오류: 2025-01-23 → 2024-11-27 (차이 큼)

  ❌ [성우진 / 010-4479-7270] 
     - endDate 오류: 2025-07-09 → 2025-01-09 (차이 큼)

  ❌ [김진옥 / 01092244785] 월 8회 (3개월)
     - endDate 오류: 2026-06-23 → 2026-04-23 (차이 큼)

  ❌ [최지민 / 01045674694] 월 8회 (3개월)
     - endDate 오류: 2026-06-22 → 2026-04-22 (차이 큼)

  ❌ [이희원 / 01043078478] 월 8회 (3개월)
     - endDate 오류: 2026-06-15 → 2026-04-10 (차이 큼)

  ❌ [임희정 / 010-9733-1582] 
     - endDate 오류: 2025-07-20 → 2025-05-09 (차이 큼)

  ❌ [박선화 / 010-5007-7456] 
     - endDate 오류: 2024-04-30 → 2024-03-01 (차이 큼)

  ❌ [오근미 / 010-2007-2698] 
     - endDate 오류: 2024-11-30 → 2024-10-09 (차이 큼)

  ❌ [윤누리 / 010-8403-2116] 
     - endDate 오류: 2025-02-28 → 2024-10-22 (차이 큼)

  ❌ [류수민 / 01054729055] 월 8회 (3개월)
     - endDate 오류: 2026-06-16 → 2026-04-16 (차이 큼)

  ❌ [곽수경 / 01093400810] 월 12회 (3개월)
     - endDate 오류: 2026-07-19 → 2026-05-05 (차이 큼)

  ❌ [강재희 / 010-5210-6166] 
     - endDate 오류: 2025-02-21 → 2024-12-08 (차이 큼)

  ❌ [유영승 / 010-8020-4326] 
     - endDate 오류: 2024-09-12 → 2024-07-04 (차이 큼)

  ❌ [오소정 / 010-7204-5291] 
     - endDate 오류: 2025-05-03 → 2025-05-25 (차이 큼)

  ❌ [김은정 / 010-9622-0017] 
     - endDate 오류: 2024-09-30 → 2024-09-01 (차이 큼)

  ❌ [정유진 / 01033938320] 월 12회 
     - endDate 오류: 2026-05-29 → 2026-04-15 (차이 큼)

  ❌ [김서영 / 01094197168] 월 무제한 (3개월)
     - endDate 오류: 2026-06-22 → 2026-04-22 (차이 큼)

  ❌ [김유진 / 010-4191-5110] 
     - endDate 오류: 2025-10-24 → 2025-08-08 (차이 큼)

  ❌ [김상아ttc9기 / 010-7759-2620] 
     - endDate 오류: 2026-07-18 → 2026-03-22 (차이 큼)

  ❌ [윤지혜ttc9기 / 01024641603] TTC 
     - endDate 오류: 2026-07-18 → 2026-06-02 (차이 큼)

  ❌ [양은총 / 010-9068-3563] 
     - endDate 오류: 2025-09-19 → 2025-07-19 (차이 큼)

  ❌ [장유미 / 01057375937] 월 무제한 (6개월)
     - endDate 오류: 2026-10-09 → 2026-05-09 (차이 큼)

  ❌ [이아름 / 01026739577] 월 8회 (3개월)
     - endDate 오류: 2026-06-25 → 2026-04-25 (차이 큼)

  ❌ [연보라 / 010-4155-6669] 
     - endDate 오류: 2026-03-08 → 2026-01-01 (차이 큼)

  ❌ [박민경 / 010-7473-5368] 
     - endDate 오류: 2025-10-20 → 2025-08-20 (차이 큼)

  ❌ [이지민 / 010-4566-5048] 
     - endDate 오류: 2024-08-07 → 2024-06-07 (차이 큼)

  ❌ [배도연 / 010-3563-5652] 
     - endDate 오류: 2025-03-30 → 2025-01-08 (차이 큼)

  ❌ [김수연 / 010-7423-2425] 
     - endDate 오류: 2024-05-05 → 2024-02-10 (차이 큼)

  ❌ [정재윤 / 010-6288-2981] 
     - endDate 오류: 2025-02-21 → 2024-12-08 (차이 큼)

  ❌ [김지영 / 010-8970-3050] 
     - endDate 오류: 2024-10-19 → 2024-08-12 (차이 큼)

  ❌ [최세영 / 010-2833-7740] 
     - endDate 오류: 2025-06-30 → 2025-04-30 (차이 큼)
`;

async function restore() {
    const lines = text.split('\n');
    let phoneToOriginalDate = {};
    let matchedPhone = null;

    for (let line of lines) {
        let m = line.match(/\[([^\/]+)\s+\/\s+([0-9-]+)\]/);
        if (m) {
            matchedPhone = m[2].replace(/-/g, '');
        }
        let em = line.match(/endDate 오류: ([0-9-]+) →/);
        if (em && matchedPhone) {
            phoneToOriginalDate[matchedPhone] = em[1];
        }
    }

    console.log('Restoring', Object.keys(phoneToOriginalDate).length, 'members');

    const snap = await db.collection('studios/boksaem-yoga/members').get();
    let count = 0;
    for (const doc of snap.docs) {
       const m = doc.data();
       const phone = m.phone.replace(/-/g, '');
       if (phoneToOriginalDate[phone]) {
           const origDate = phoneToOriginalDate[phone];
           if (m.endDate !== origDate) {
               console.log(`Restoring ${m.name}: ${m.endDate} -> ${origDate}`);
               await doc.ref.update({ endDate: origDate });
               count++;
           } else {
               console.log(`Skipping ${m.name}: already ${origDate}`);
           }
       }
    }
    console.log(`Restored ${count} members`);
    process.exit(0);
}
restore();
