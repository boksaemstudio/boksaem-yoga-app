import { useState, useMemo, useEffect } from 'react';
import { User, Phone, CalendarBlank, MapPin, Trash, CheckCircle, Warning, ClockCounterClockwise, Plus, X } from '@phosphor-icons/react';
import { useStudioConfig } from '../../../contexts/StudioContext';
import { storageService } from '../../../services/storage';
import CustomDatePicker from '../../common/CustomDatePicker';
import AttendanceHistory from '../../profile/AttendanceHistory';
import { translations } from '../../../utils/translations';

const AttendanceTab = ({ logs, member, aiAnalysis, onAdd, onDelete, isSubmitting, logLimit, setLogLimit }) => {
    const { config } = useStudioConfig();
    const branches = config.BRANCHES || [];

    const getSafeToday = () => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [manualDate, setManualDate] = useState(getSafeToday());
    const [manualClassName, setManualClassName] = useState('자율수련');
    const [manualBranch, setManualBranch] = useState(member.homeBranch || (branches.length > 0 ? branches[0].id : ''));
    const [dailyClasses, setDailyClasses] = useState([]);

    // 선택된 날짜와 지점에 해당하는 수업 목록 가져오기
    useEffect(() => {
        const fetchClasses = async () => {
            if (!manualBranch || !manualDate) return;
            try {
                const classes = await storageService.getDailyClasses(manualBranch, null, manualDate);
                setDailyClasses(classes || []);
            } catch (err) {
                console.warn('[AttendanceTab] Failed to fetch daily classes:', err);
                setDailyClasses([]);
            }
        };
        fetchClasses();
    }, [manualBranch, manualDate]);

    // 수업 목록: 선택 지점의 해당 날짜 수업 + 자율수련(시간만)
    const classOptions = useMemo(() => {
        // 자율수련 포함 - 선택된 지점의 이름 찾기
        const selectedBranchName = branches.find(b => b.id === manualBranch)?.name || '';
        const options = [{ value: '자율수련', label: '자율수련' }];

        if (dailyClasses.length > 0) {
            dailyClasses.forEach(cls => {
                const time = cls.time || '';
                const title = cls.title || cls.className || '';
                const instructor = cls.instructor || '';
                const parts = [time, title, instructor].filter(Boolean);
                const label = parts.join(' ');
                options.push({ value: title, label, time, instructor });
            });
        }
        return options;
    }, [dailyClasses, manualBranch, branches]);

    // 지점이나 날짜 변경 시 수업 선택 초기화
    useEffect(() => {
        setManualClassName('자율수련');
    }, [manualBranch, manualDate]);

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
                    className="form-select"
                    style={{
                        flex: 1, minWidth: '100px',
                        opacity: isSubmitting ? 0.5 : 1
                    }}
                >
                    {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                </select>
                <div style={{ flex: 1.5, minWidth: '130px', opacity: isSubmitting ? 0.5 : 1 }}>
                    <CustomDatePicker value={manualDate} onChange={setManualDate} />
                </div>
                <select
                    value={manualClassName}
                    onChange={(e) => setManualClassName(e.target.value)}
                    disabled={isSubmitting}
                    className="form-select"
                    style={{
                        flex: 1.2, minWidth: '120px',
                        opacity: isSubmitting ? 0.5 : 1
                    }}
                >
                    {classOptions.map(opt => (
                        <option key={opt.label} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
                <button
                    onClick={() => {
                        const selectedInfo = classOptions.find(opt => opt.value === manualClassName) || { time: '10:00', instructor: '관리자' };
                        // Pass (date, time, branch, className, instructor)
                        onAdd(manualDate, selectedInfo.time, manualBranch, manualClassName, selectedInfo.instructor);
                    }}
                    disabled={isSubmitting}
                    style={{
                        background: isSubmitting ? 'rgba(var(--primary-rgb), 0.3)' : 'var(--primary-gold)',
                        color: 'var(--text-on-primary)', fontWeight: 'bold', border: 'none',
                        padding: '10px 15px', borderRadius: '8px', whiteSpace: 'nowrap', flex: '0 0 auto',
                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                        opacity: isSubmitting ? 0.6 : 1
                    }}
                >
                    {isSubmitting ? '처리 중...' : '출석'}
                </button>
            </div>

            <AttendanceHistory
                logs={logs}
                member={member}
                aiAnalysis={aiAnalysis}
                language="ko"
                t={(k, params = {}) => {
                    let text = translations.ko[k] || k;
                    Object.keys(params).forEach(p => {
                        text = text.replace(new RegExp(`\\{${p}\\}`, 'g'), params[p]);
                    });
                    return text;
                }}
                onDelete={onDelete}
                isSubmitting={isSubmitting}
                logLimit={logLimit}
                setLogLimit={setLogLimit}
            />
        </div>
    );
};

export default AttendanceTab;
