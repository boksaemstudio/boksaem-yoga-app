export const parseCSV = (csvText) => {
    const result = [];
    let row = [];
    let field = '';
    let inQuotes = false;
    const text = csvText.trim();

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (inQuotes) {
            if (char === '"' && nextChar === '"') {
                field += '"'; // Escaped quote
                i++;
            } else if (char === '"') {
                inQuotes = false;
            } else {
                field += char;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
            } else if (char === ',') {
                row.push(field.trim());
                field = '';
            } else if (char === '\n' || char === '\r') {
                if (field || row.length > 0) {
                    row.push(field.trim());
                    result.push(row);
                }
                row = [];
                field = '';
                if (char === '\r' && nextChar === '\n') i++; // Handle CRLF
            } else {
                field += char;
            }
        }
    }

    if (field || row.length > 0) {
        row.push(field.trim());
        result.push(row);
    }

    if (result.length === 0) return [];

    const headers = result[0];
    return result.slice(1).map(rowData => {
        const obj = {};
        headers.forEach((header, index) => {
            let val = rowData[index] || '';
            // Handle Excel-style formulas like ="0"
            if (val.startsWith('="') && val.endsWith('"')) {
                val = val.substring(2, val.length - 1);
            }
            // Remove remaining wrapping quotes if any
            if (val.startsWith('"') && val.endsWith('"')) {
                val = val.slice(1, -1);
            }
            obj[header] = val;
        });
        return obj;
    });
};

/**
 * 상품명에서 기간(개월수) 추출
 */
export function extractMonthsFromProduct(productName) {
    if (!productName) return 3;

    if (productName.includes('TTC') || productName.includes('ttc')) {
        return 6;
    }

    const monthMatch = productName.match(/(\d+)개월/);
    if (monthMatch) {
        return parseInt(monthMatch[1], 10);
    }

    if (productName.includes('쿠폰')) {
        return 3;
    }

    return 3;
}

/**
 * 판매일자에 개월수를 더해 만기일자 계산
 */
export function calculateEndDate(saleDate, months) {
    if (!saleDate) return '';

    try {
        const date = new Date(saleDate);
        if (isNaN(date.getTime())) return '';

        date.setMonth(date.getMonth() + months);
        return date.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    } catch (e) {
        console.error('날짜 계산 오류:', e);
        return '';
    }
}

/**
 * 이용기간 문자열에서 종료일 추출
 */
export function extractEndDateFromPeriod(periodStr) {
    if (!periodStr) return '';
    
    // 1. Tilde case: "2024.01.01 ~ 2024.07.18"
    if (periodStr.includes('~')) {
        const parts = periodStr.split('~').map(s => s.trim());
        return parts.length === 2 ? parts[1] : '';
    }

    // 2. Single date case: "2026-07-18" or "2026.07.18"
    const cleaned = periodStr.trim();
    // Validate length to avoid returning garbage (e.g. "1년")
    if (cleaned.length >= 8) { 
        return cleaned;
    }
    
    return '';
}

/**
 * 회원번호를 branchId로 변환
 */
export function convertToBranchId(memberNum) {
    if (!memberNum) return 'gwangheungchang';
    const normalized = memberNum.trim().toLowerCase();
    return normalized.includes('마포') ? 'mapo' : 'gwangheungchang';
}

/**
 * 남은횟수 문자열을 숫자로 변환
 */
export function parseCredits(creditsStr) {
    if (!creditsStr || creditsStr.trim() === '') return 999;
    const match = creditsStr.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 999;
}

/**
 * 판매금액 문자열을 숫자로 변환
 */
export function parseAmount(amountStr) {
    if (!amountStr) return 0;
    if (amountStr.includes('0') && !amountStr.match(/\d{2,}/)) {
        return 0;
    }
    const numbers = amountStr.replace(/[^\d]/g, '');
    return numbers ? parseInt(numbers, 10) : 0;
}

/**
 * 마지막출입 문자열을 ISO String으로 변환
 */
export function parseLastVisit(lastVisitStr) {
    if (!lastVisitStr) return '';
    const match = lastVisitStr.match(/(\d{4}-\d{2}-\d{2})/);
    if (match) {
        try {
            const date = new Date(match[1]);
            return date.toISOString();
        } catch {
            return '';
        }
    }
    return '';
}

