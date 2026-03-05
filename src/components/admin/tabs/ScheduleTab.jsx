import { useState } from 'react';
import { STUDIO_CONFIG, getBranchThemeColor, getBranchColor } from '../../../studioConfig';
import AdminScheduleManager from '../../AdminScheduleManager';
import timeTable1 from '../../../assets/timetable_gwangheungchang.png';
import timeTable2 from '../../../assets/timetable_mapo.png';

const ScheduleTab = ({ images, optimisticImages, handleImageUpload }) => {
    const [scheduleSubTab, setScheduleSubTab] = useState('monthly');

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', gap: '10px', background: 'rgba(255,255,255,0.05)', padding: '5px', borderRadius: '12px' }}>
                <button
                    onClick={() => setScheduleSubTab('monthly')}
                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: scheduleSubTab === 'monthly' ? 'var(--primary-gold)' : 'transparent', color: scheduleSubTab === 'monthly' ? 'black' : 'white', fontWeight: 'bold', cursor: 'pointer' }}
                >월간 시간표</button>
                <button
                    onClick={() => setScheduleSubTab('weekly')}
                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: scheduleSubTab === 'weekly' ? 'var(--primary-gold)' : 'transparent', color: scheduleSubTab === 'weekly' ? 'black' : 'white', fontWeight: 'bold', cursor: 'pointer' }}
                >주간 시간표</button>
            </div>

            {scheduleSubTab === 'monthly' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                    {STUDIO_CONFIG.BRANCHES.map((branch) => {
                        const isGwang = branch.id === 'gwangheungchang';
                        const themeColor = getBranchThemeColor(branch.id);
                        const bgTint = `${getBranchColor(branch.id)}0D`;

                        return (
                            <div key={branch.id} className="dashboard-card" style={{ 
                                position: 'relative',
                                border: `1px solid ${getBranchColor(branch.id)}4D`,
                                background: `linear-gradient(180deg, ${bgTint} 0%, rgba(20, 20, 25, 0.5) 100%)`
                            }}>
                                <div style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center', 
                                    marginBottom: '20px',
                                    borderBottom: `1px solid ${getBranchColor(branch.id)}1A`,
                                    paddingBottom: '10px'
                                }}>
                                    <h3 style={{ 
                                        fontSize: '1.8rem', 
                                        fontWeight: '800', 
                                        color: themeColor,
                                        textShadow: `0 0 10px ${getBranchColor(branch.id)}4D`
                                    }}>
                                        {branch.name}
                                    </h3>
                                    <div style={{
                                        padding: '4px 12px',
                                        borderRadius: '20px',
                                        background: `${getBranchColor(branch.id)}1A`,
                                        border: `1px solid ${getBranchColor(branch.id)}33`,
                                        color: themeColor,
                                        fontSize: '0.8rem',
                                        fontWeight: 'bold'
                                    }}>
                                        {isGwang ? '본점' : '지점'}
                                    </div>
                                </div>
                                <AdminScheduleManager branchId={branch.id} />
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="dashboard-card">
                    <h3 className="card-label" style={{ marginBottom: '20px' }}>주간 시간표 (이미지)</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                        {STUDIO_CONFIG.BRANCHES.map(branch => {
                            const now = new Date();
                            const curYear = now.getFullYear();
                            const curMonth = (now.getMonth() + 1).toString().padStart(2, '0');
                            const nextDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
                            const nextYear = nextDate.getFullYear();
                            const nextMonth = (nextDate.getMonth() + 1).toString().padStart(2, '0');
                            const curKey = `timetable_${branch.id}_${curYear}-${curMonth}`;
                            const nextKey = `timetable_${branch.id}_${nextYear}-${nextMonth}`;
                            const curImage = images[curKey] || images[`timetable_${branch.id}`] || (branch.id === 'gwangheungchang' ? timeTable1 : timeTable2);
                            const nextImage = images[nextKey];

                            return (
                                <div key={branch.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                    <h3 style={{ fontSize: '1.6rem', fontWeight: '800', marginBottom: '20px' }}>{branch.name}</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            <h4 style={{ margin: 0, color: 'var(--primary-gold)' }}>{curMonth}월 (현재)</h4>
                                            <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '12px', overflow: 'hidden', minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed rgba(255,255,255,0.1)' }}>
                                                {(optimisticImages[curKey] || curImage) ? (
                                                    <img src={optimisticImages[curKey] || curImage} alt="Current" style={{ width: '100%' }} />
                                                ) : (
                                                    <span style={{ color: 'var(--text-secondary)' }}>이미지 없음</span>
                                                )}
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <input type="file" accept="image/*" onChange={e => handleImageUpload(e, curKey)} style={{ display: 'none' }} id={`up-cur-${branch.id}`} />
                                                <label htmlFor={`up-cur-${branch.id}`} className="action-btn sm" style={{ padding: '6px 12px', fontSize: '0.8rem', cursor: 'pointer' }}>이미지 변경</label>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            <h4 style={{ margin: 0, color: '#a1a1aa' }}>{nextMonth}월 (다음달)</h4>
                                            <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '12px', overflow: 'hidden', minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed rgba(255,255,255,0.1)' }}>
                                                {(optimisticImages[nextKey] || nextImage) ? (
                                                    <img src={optimisticImages[nextKey] || nextImage} alt="Next" style={{ width: '100%' }} />
                                                ) : (
                                                    <span style={{ color: 'var(--text-secondary)' }}>이미지 없음</span>
                                                )}
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <input type="file" accept="image/*" onChange={e => handleImageUpload(e, nextKey)} style={{ display: 'none' }} id={`up-next-${branch.id}`} />
                                                <label htmlFor={`up-next-${branch.id}`} className="action-btn sm" style={{ padding: '6px 12px', fontSize: '0.8rem', cursor: 'pointer' }}>이미지 등록/변경</label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ScheduleTab;
