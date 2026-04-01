const admin = require('firebase-admin');
const fs = require('fs');
const serviceAccount = require('../functions/service-account-key.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const TENANT = 'studios/boksaem-yoga';

async function fullAudit() {
  const pricingSnap = await db.doc(`${TENANT}/settings/pricing`).get();
  const pricing = pricingSnap.exists ? pricingSnap.data() : {};
  
  const validTypes = Object.keys(pricing).filter(k => k !== '_meta');
  const pricingInfo = {};
  validTypes.forEach(t => {
    const p = pricing[t];
    pricingInfo[t] = { label: p.label, branches: p.branches || [] };
  });

  const membersSnap = await db.collection(`${TENANT}/members`).get();
  const typeDistribution = {};
  const issues = [];
  const ttcCandidates = []; // name contains 'ttc'

  membersSnap.docs.forEach(doc => {
    const d = doc.data();
    const mt = d.membershipType || '(none)';
    typeDistribution[mt] = (typeDistribution[mt] || 0) + 1;

    // TTC 이름에 ttc 포함된데 membershipType이 ttc가 아닌 경우
    const nameLower = (d.name || '').toLowerCase();
    if (nameLower.includes('ttc') && mt !== 'ttc') {
      ttcCandidates.push({
        id: doc.id, name: d.name, phone: d.phone,
        currentType: mt, branchId: d.branchId, credits: d.credits
      });
    }

    // 문제 감지
    let problem = null;
    if (!d.membershipType) {
      problem = 'membershipType missing';
    } else if (!validTypes.includes(d.membershipType)) {
      problem = `invalid type: ${d.membershipType}`;
    } else {
      const pe = pricing[d.membershipType];
      if (pe && pe.branches && pe.branches.length > 0) {
        if (!pe.branches.includes(d.branchId) && !pe.branches.includes(d.homeBranch)) {
          problem = `branch mismatch: type=${d.membershipType}(allowed:${pe.branches}), member=${d.branchId}`;
        }
      }
    }

    if (problem) {
      issues.push({ id: doc.id, name: d.name, phone: d.phone, currentType: mt, branchId: d.branchId, problem });
    }
  });

  const result = {
    totalMembers: membersSnap.size,
    validPricingTypes: pricingInfo,
    typeDistribution,
    issueCount: issues.length,
    issues,
    ttcNameButNotTtcType: ttcCandidates
  };

  fs.writeFileSync('/tmp/member_audit.json', JSON.stringify(result, null, 2), 'utf8');
  console.log('Done. Written to /tmp/member_audit.json');
  process.exit(0);
}

fullAudit().catch(e => { console.error(e); process.exit(1); });
