/**
 * Firebase REST API를 사용한 Firestore 직접 접근 테스트
 * 1. 익명 인증으로 토큰 획득
 * 2. studios/boksaem_gwangheungchang 문서 읽기
 * 3. ALLOW_SELF_HOLD=true + HOLD_RULES 확인/업데이트
 * 4. 회원 데이터 샘플 확인
 */

const API_KEY = 'AIzaSyCTjDayI1tiZO15eynRzKqrDK3TKj3D-yw';
const PROJECT_ID = 'boksaem-yoga';
const STUDIO_ID = 'boksaem_gwangheungchang';

async function signInAnonymously() {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnSecureToken: true })
    });
    const data = await res.json();
    if (data.error) throw new Error(`Auth error: ${JSON.stringify(data.error)}`);
    console.log('✅ 익명 인증 성공, uid:', data.localId);
    return data.idToken;
}

async function getFirestoreDoc(token, collection, docId) {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collection}/${docId}`;
    const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Firestore GET error (${res.status}): ${err}`);
    }
    return await res.json();
}

async function updateFirestoreDoc(token, collection, docId, fields) {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collection}/${docId}?updateMask.fieldPaths=POLICIES`;
    const res = await fetch(url, {
        method: 'PATCH',
        headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fields })
    });
    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Firestore PATCH error (${res.status}): ${err}`);
    }
    return await res.json();
}

function parseFirestoreValue(val) {
    if (!val) return null;
    if ('stringValue' in val) return val.stringValue;
    if ('integerValue' in val) return parseInt(val.integerValue);
    if ('doubleValue' in val) return val.doubleValue;
    if ('booleanValue' in val) return val.booleanValue;
    if ('nullValue' in val) return null;
    if ('mapValue' in val) {
        const obj = {};
        for (const [k, v] of Object.entries(val.mapValue.fields || {})) {
            obj[k] = parseFirestoreValue(v);
        }
        return obj;
    }
    if ('arrayValue' in val) {
        return (val.arrayValue.values || []).map(parseFirestoreValue);
    }
    return val;
}

function toFirestoreValue(val) {
    if (val === null || val === undefined) return { nullValue: 'NULL_VALUE' };
    if (typeof val === 'boolean') return { booleanValue: val };
    if (typeof val === 'number') return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
    if (typeof val === 'string') return { stringValue: val };
    if (Array.isArray(val)) return { arrayValue: { values: val.map(toFirestoreValue) } };
    if (typeof val === 'object') {
        const fields = {};
        for (const [k, v] of Object.entries(val)) {
            fields[k] = toFirestoreValue(v);
        }
        return { mapValue: { fields } };
    }
    return { stringValue: String(val) };
}

async function main() {
    console.log('=== Firebase REST API 테스트 시작 ===\n');
    
    // 1. 익명 인증
    const token = await signInAnonymously();
    
    // 2. 스튜디오 설정 읽기
    console.log('\n=== 스튜디오 설정 읽기 ===');
    const configDoc = await getFirestoreDoc(token, 'studios', STUDIO_ID);
    
    const policies = configDoc.fields?.POLICIES ? parseFirestoreValue({ mapValue: { fields: configDoc.fields.POLICIES.mapValue?.fields || {} } }) : {};
    console.log('현재 POLICIES:', JSON.stringify(policies, null, 2));
    console.log('ALLOW_SELF_HOLD:', policies.ALLOW_SELF_HOLD);
    console.log('HOLD_RULES:', JSON.stringify(policies.HOLD_RULES));
    
    // 3. ALLOW_SELF_HOLD가 false이면 true로 변경
    if (!policies.ALLOW_SELF_HOLD) {
        console.log('\n=== ALLOW_SELF_HOLD → true 업데이트 ===');
        
        const newPolicies = {
            ...policies,
            ALLOW_SELF_HOLD: true,
            HOLD_RULES: policies.HOLD_RULES && policies.HOLD_RULES.length > 0 
                ? policies.HOLD_RULES 
                : [
                    { durationMonths: 3, maxCount: 1, maxWeeks: 2 },
                    { durationMonths: 6, maxCount: 2, maxWeeks: 4 }
                ]
        };
        
        const updateFields = {
            POLICIES: toFirestoreValue(newPolicies)
        };
        
        await updateFirestoreDoc(token, 'studios', STUDIO_ID, updateFields);
        console.log('✅ ALLOW_SELF_HOLD=true + HOLD_RULES 저장 완료');
        
        // 변경 확인
        const updated = await getFirestoreDoc(token, 'studios', STUDIO_ID);
        const updatedPolicies = updated.fields?.POLICIES ? parseFirestoreValue({ mapValue: { fields: updated.fields.POLICIES.mapValue?.fields || {} } }) : {};
        console.log('변경 후 POLICIES:', JSON.stringify(updatedPolicies, null, 2));
    } else {
        console.log('\n✅ ALLOW_SELF_HOLD 이미 true');
        if (!policies.HOLD_RULES || policies.HOLD_RULES.length === 0) {
            console.log('⚠️ HOLD_RULES 비어있음. 기본 규칙 추가...');
            const newPolicies = {
                ...policies,
                HOLD_RULES: [
                    { durationMonths: 3, maxCount: 1, maxWeeks: 2 },
                    { durationMonths: 6, maxCount: 2, maxWeeks: 4 }
                ]
            };
            const updateFields = { POLICIES: toFirestoreValue(newPolicies) };
            await updateFirestoreDoc(token, 'studios', STUDIO_ID, updateFields);
            console.log('✅ HOLD_RULES 추가 완료');
        }
    }
    
    // 4. 회원 데이터 샘플 확인
    console.log('\n=== 회원 데이터 확인 ===');
    const membersUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/members?pageSize=3`;
    const membersRes = await fetch(membersUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (membersRes.ok) {
        const membersData = await membersRes.json();
        (membersData.documents || []).forEach(doc => {
            const fields = doc.fields || {};
            const name = parseFirestoreValue(fields.name || {});
            const duration = parseFirestoreValue(fields.duration || {});
            const startDate = parseFirestoreValue(fields.startDate || {});
            const endDate = parseFirestoreValue(fields.endDate || {});
            const holdStatus = parseFirestoreValue(fields.holdStatus || {});
            console.log(`회원: ${name} | dur:${duration || '없음'} | start:${startDate} | end:${endDate} | hold:${holdStatus || '없음'}`);
        });
    } else {
        console.log('회원 데이터 접근 실패:', membersRes.status);
    }
    
    console.log('\n=== 테스트 완료 ===');
}

main().catch(e => {
    console.error('❌ Error:', e.message);
    process.exit(1);
});
