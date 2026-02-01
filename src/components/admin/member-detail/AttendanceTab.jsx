import { useState } from 'react';
import CustomDatePicker from '../../common/CustomDatePicker';
import AttendanceHistory from '../../profile/AttendanceHistory';
import { translations } from '../../../utils/translations';

const AttendanceTab = ({ logs, member, onAdd, onDelete, isSubmitting, logLimit, setLogLimit }) => {
    // [FIX] Use safe YYYY-MM-DD format manually to avoid locale fallback issues (e.g. YYYY. MM. DD.)
    const getSafeToday = () => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [manualDate, setManualDate] = useState(getSafeToday());
    const [manualTime, setManualTime] = useState('10:00');
    const [manualBranch, setManualBranch] = useState(member.homeBranch || 'mapo');

    // ... (rest of the component state)

    return (
        <div>
            <h3 style={{ color: 'var(--primary-gold)', marginBottom: '15px', fontSize: '1rem' }}>수동 출석 처리</h3>
            <div style={{
                background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '10px', marginBottom: '20px',
                display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap'
            }}>
                <select
                    value={manualBranch}
                    onChange={(e) => setManualBranch(e.target.value)}
                    disabled={isSubmitting}
                    style={{
                        background: 'rgba(0,0,0,0.3)', color: 'white', border: '1px solid rgba(255,255,255,0.1)',
                        padding: '10px', borderRadius: '8px', flex: 1, minWidth: '100px',
                        opacity: isSubmitting ? 0.5 : 1
                    }}
                >
                    <option value="mapo">마포점</option>
                    <option value="gwangheungchang">광흥창점</option>
                </select>
                <div style={{ flex: 1.5, minWidth: '130px', opacity: isSubmitting ? 0.5 : 1 }}>
                    <CustomDatePicker value={manualDate} onChange={setManualDate} />
                </div>
                <select
                    value={manualTime}
                    onChange={(e) => setManualTime(e.target.value)}
                    disabled={isSubmitting}
                    style={{
                        background: 'rgba(0,0,0,0.3)', color: 'white', border: '1px solid rgba(255,255,255,0.1)',
                        padding: '10px', borderRadius: '8px', flex: 1, minWidth: '100px',
                        opacity: isSubmitting ? 0.5 : 1
                    }}
                >
                    {Array.from({ length: 18 }, (_, i) => i + 6).map(h => {
                        const timeStr = `${String(h).padStart(2, '0')}:00`;
                        return <option key={timeStr} value={timeStr}>{timeStr}</option>;
                    })}
                </select>
                <button
                    onClick={() => onAdd(manualDate, manualTime, manualBranch)}
                    disabled={isSubmitting}
                    style={{
                        background: isSubmitting ? 'rgba(212,175,55,0.3)' : 'var(--primary-gold)',
                        color: 'black', fontWeight: 'bold', border: 'none',
                        padding: '10px 15px', borderRadius: '8px', whiteSpace: 'nowrap', flex: '0 0 auto',
                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                        opacity: isSubmitting ? 0.6 : 1
                    }}
                >
                    {isSubmitting ? '처리 중...' : '수동 출석'}
                </button>
            </div>

            <AttendanceHistory
                logs={logs}
                member={member}
                language="ko"
                t={(k) => translations.ko[k] || k}
                onDelete={onDelete}
                logLimit={logLimit}
                setLogLimit={setLogLimit}
            />
        </div>
    );
};

export default AttendanceTab;
