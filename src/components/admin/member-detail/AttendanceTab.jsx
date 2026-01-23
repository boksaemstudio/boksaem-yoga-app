import React, { useState } from 'react';
import CustomDatePicker from '../../common/CustomDatePicker';
import AttendanceHistory from '../../profile/AttendanceHistory';

const AttendanceTab = ({ logs, member, onAdd, onDelete }) => {
    const [manualDate, setManualDate] = useState(new Date().toLocaleDateString('sv-SE'));
    const [manualTime, setManualTime] = useState('10:00');
    const [manualBranch, setManualBranch] = useState(member.homeBranch || 'mapo');

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
                    style={{
                        background: 'rgba(0,0,0,0.3)', color: 'white', border: '1px solid rgba(255,255,255,0.1)',
                        padding: '10px', borderRadius: '8px', flex: 1, minWidth: '100px'
                    }}
                >
                    <option value="mapo">마포점</option>
                    <option value="gwangheungchang">광흥창점</option>
                </select>
                <div style={{ flex: 1.5, minWidth: '130px' }}>
                    <CustomDatePicker value={manualDate} onChange={setManualDate} />
                </div>
                <select
                    value={manualTime}
                    onChange={(e) => setManualTime(e.target.value)}
                    style={{
                        background: 'rgba(0,0,0,0.3)', color: 'white', border: '1px solid rgba(255,255,255,0.1)',
                        padding: '10px', borderRadius: '8px', flex: 1, minWidth: '100px'
                    }}
                >
                    {Array.from({ length: 18 }, (_, i) => i + 6).map(h => {
                        const timeStr = `${String(h).padStart(2, '0')}:00`;
                        return <option key={timeStr} value={timeStr}>{timeStr}</option>;
                    })}
                </select>
                <button
                    onClick={() => onAdd(manualDate, manualTime, manualBranch)}
                    style={{
                        background: 'var(--primary-gold)', color: 'black', fontWeight: 'bold', border: 'none',
                        padding: '10px 15px', borderRadius: '8px', whiteSpace: 'nowrap', flex: '0 0 auto'
                    }}
                >
                    수동 출석
                </button>
            </div>

            <AttendanceHistory logs={logs} member={member} language="ko" t={(k) => k} onDelete={onDelete} />
        </div>
    );
};

export default AttendanceTab;
