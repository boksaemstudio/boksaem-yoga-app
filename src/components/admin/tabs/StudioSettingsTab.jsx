import { useState, useEffect, useRef } from 'react';
import { useStudioConfig } from '../../../contexts/StudioContext';
import { Gear, MapPin, FloppyDisk, ArrowsClockwise, Robot, Image as ImageIcon, Globe } from '@phosphor-icons/react';
import SmartDataImporter from '../data-import/SmartDataImporter';
import { storage } from '../../../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const StudioSettingsTab = () => {
    const { config, updateConfig, refreshConfig, loading } = useStudioConfig();
    const [localConfig, setLocalConfig] = useState(config);
    const [isSaving, setIsSaving] = useState(false);
    const [showImporter, setShowImporter] = useState(false);
    const [logoUploading, setLogoUploading] = useState(false);
    const logoInputRef = useRef(null);

    useEffect(() => {
        if (config && Object.keys(config).length > 0) {
            const currentConfig = JSON.parse(JSON.stringify(config));
            
            // [TEMPORARY FIX] Auto-remove 'te' branch if exists
            if (currentConfig.BRANCHES && currentConfig.BRANCHES.some(b => b.id === 'te')) {
                currentConfig.BRANCHES = currentConfig.BRANCHES.filter(b => b.id !== 'te');
                updateConfig({ BRANCHES: currentConfig.BRANCHES }).then(() => {
                    console.log("'te' branch auto-removed.");
                });
            }

            setLocalConfig(currentConfig);
        }
    }, [config]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Firestore는 undefined 값을 거부 — JSON 순환으로 정리
            const cleanConfig = JSON.parse(JSON.stringify(localConfig));
            await updateConfig(cleanConfig);
            alert('설정이 저장되었습니다.');
        } catch (error) {
            console.error('Failed to save config:', error);
            alert(`설정 저장 실패: ${error.message || '알 수 없는 오류'}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleChange = (path, value) => {
        const newConfig = { ...localConfig };
        const parts = path.split('.');
        let current = newConfig;
        for (let i = 0; i < parts.length - 1; i++) {
            if (!current[parts[i]]) current[parts[i]] = {};
            current = current[parts[i]];
        }
        current[parts[parts.length - 1]] = value;
        setLocalConfig(newConfig);
    };

    if (loading && !localConfig.IDENTITY) return <div style={{ padding: '40px', textAlign: 'center' }}>설정 로드 중...</div>;

    // 재사용: 토글 스위치 컴포넌트
    const ToggleSwitch = ({ checked, onChange }) => (
        <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '26px', cursor: 'pointer', flexShrink: 0 }}>
            <input 
                type="checkbox" 
                checked={checked} 
                onChange={onChange} 
                style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span style={{
                position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: checked ? 'var(--primary-theme-color)' : 'rgba(255,255,255,0.1)',
                transition: '0.3s', borderRadius: '26px', border: `1px solid ${checked ? 'var(--primary-theme-color)' : 'rgba(255,255,255,0.2)'}`
            }}>
                <span style={{
                    position: 'absolute', height: '20px', width: '20px',
                    left: checked ? '26px' : '3px', bottom: '2px',
                    backgroundColor: 'white', transition: '0.3s', borderRadius: '50%', boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                }} />
            </span>
        </label>
    );

    // 재사용: ＋/－ 스텝퍼 컴포넌트
    const Stepper = ({ value, onChange, min = 1, unit = '' }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button onClick={() => onChange(Math.max(min, value - 1))}
                style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
            <span style={{ minWidth: '28px', textAlign: 'center', fontSize: '1rem', fontWeight: 'bold', color: 'white' }}>{value}</span>
            <button onClick={() => onChange(value + 1)}
                style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
            {unit && <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{unit}</span>}
        </div>
    );

    // 재사용: 기능 카드 스타일 (홀딩/예약 공통)
    const featureCardStyle = { 
        marginTop: '16px', padding: '20px', 
        background: 'rgba(255,255,255,0.02)', borderRadius: '12px', 
        border: '1px solid var(--border-color)' 
    };

    const featureHeaderStyle = { 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' 
    };

    const bookingRules = localConfig.POLICIES?.BOOKING_RULES || {};

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '900px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Gear size={32} weight="fill" color="var(--primary-theme-color)" />
                    우리 요가원 설정
                </h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                        onClick={refreshConfig} 
                        className="action-btn sm" 
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: 'none' }}
                    >
                        <ArrowsClockwise size={16} /> 새로고침
                    </button>
                    <button 
                        onClick={handleSave} 
                        disabled={isSaving}
                        className="action-btn sm primary" 
                        style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px', 
                            background: 'var(--primary-theme-color)', 
                            color: 'black',
                            padding: '8px 20px',
                            fontWeight: 'bold',
                            boxShadow: '0 4px 15px var(--primary-theme-skeleton)'
                        }}
                    >
                        <FloppyDisk size={20} weight="bold" /> {isSaving ? '저장 중...' : '변경사항 저장'}
                    </button>
                </div>
            </div>

            {/* ─── 1. 우리 요가원 ─── */}
            <div className="dashboard-card">
                <h3 className="card-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                    🏠 우리 요가원
                </h3>

                {/* 로고 업로드 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--primary-gold)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}>
                        {localConfig.IDENTITY?.LOGO_URL ? (
                            <img src={localConfig.IDENTITY.LOGO_URL} alt="로고" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <ImageIcon size={32} color="white" />
                        )}
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '6px', fontSize: '0.95rem' }}>요가원 로고</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '10px' }}>회원 앱과 알림에 표시돼요</div>
                        <input
                            ref={logoInputRef}
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                if (file.size > 2 * 1024 * 1024) { alert('파일 크기는 2MB 이하여야 합니다.'); return; }
                                setLogoUploading(true);
                                try {
                                    const logoRef = ref(storage, `studio/logo_${Date.now()}.${file.name.split('.').pop()}`);
                                    await uploadBytes(logoRef, file, { contentType: file.type });
                                    const url = await getDownloadURL(logoRef);
                                    handleChange('IDENTITY.LOGO_URL', url);
                                    alert('로고가 업로드되었습니다. 저장 버튼을 눌러 적용하세요.');
                                } catch (err) {
                                    console.error('[Settings] Logo upload error:', err);
                                    alert('로고 업로드 실패: ' + err.message);
                                } finally {
                                    setLogoUploading(false);
                                }
                            }}
                        />
                        <button
                            onClick={() => logoInputRef.current?.click()}
                            disabled={logoUploading}
                            className="action-btn sm"
                            style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}
                        >
                            <ImageIcon size={14} weight="bold" style={{ marginRight: '4px' }} />
                            {logoUploading ? '업로드 중...' : '로고 변경'}
                        </button>
                    </div>
                </div>

                {/* 기본 정보 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                    <div className="input-group">
                        <label>요가원 이름</label>
                        <input 
                            type="text" 
                            className="styled-input" 
                            value={localConfig.IDENTITY?.NAME || ''} 
                            onChange={(e) => handleChange('IDENTITY.NAME', e.target.value)} 
                        />
                    </div>
                    <div className="input-group">
                        <label>한 줄 소개</label>
                        <input 
                            type="text" 
                            className="styled-input" 
                            value={localConfig.IDENTITY?.SLOGAN || ''} 
                            onChange={(e) => handleChange('IDENTITY.SLOGAN', e.target.value)} 
                        />
                    </div>
                    <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '12px' }}>
                            <Globe size={14} /> 외부 링크 관리 (SNS, 블로그 등)
                        </label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {(localConfig.IDENTITY?.SOCIAL_LINKS || []).map((link, idx) => (
                                <div key={idx} style={{ display: 'flex', gap: '10px' }}>
                                    <input 
                                        type="text" 
                                        placeholder="이름 (예: 인스타그램)" 
                                        className="styled-input" 
                                        style={{ flex: 1, minWidth: '120px' }}
                                        value={link.label || ''}
                                        onChange={(e) => {
                                            const newLinks = [...(localConfig.IDENTITY.SOCIAL_LINKS || [])];
                                            newLinks[idx] = { ...newLinks[idx], label: e.target.value };
                                            handleChange('IDENTITY.SOCIAL_LINKS', newLinks);
                                        }}
                                    />
                                    <input 
                                        type="url" 
                                        placeholder="URL (https://...)" 
                                        className="styled-input" 
                                        style={{ flex: 2 }}
                                        value={link.url || ''}
                                        onChange={(e) => {
                                            const newLinks = [...(localConfig.IDENTITY.SOCIAL_LINKS || [])];
                                            newLinks[idx] = { ...newLinks[idx], url: e.target.value };
                                            handleChange('IDENTITY.SOCIAL_LINKS', newLinks);
                                        }}
                                    />
                                    <button 
                                        className="action-btn sm" 
                                        style={{ background: 'rgba(255,100,100,0.1)', color: '#ff6666', border: '1px solid rgba(255,100,100,0.2)' }}
                                        onClick={() => {
                                            const newLinks = [...(localConfig.IDENTITY.SOCIAL_LINKS || [])];
                                            newLinks.splice(idx, 1);
                                            handleChange('IDENTITY.SOCIAL_LINKS', newLinks);
                                        }}
                                    >
                                        삭제
                                    </button>
                                </div>
                            ))}
                            <button 
                                className="action-btn sm" 
                                style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px dashed var(--border-color)', marginTop: '4px' }}
                                onClick={() => {
                                    const newLinks = [...(localConfig.IDENTITY?.SOCIAL_LINKS || []), { label: '', url: '' }];
                                    handleChange('IDENTITY.SOCIAL_LINKS', newLinks);
                                }}
                            >
                                + 링크 추가
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── 2. 운영 규칙 ─── */}
            <div className="dashboard-card">
                <h3 className="card-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                    📋 운영 규칙
                </h3>

                {/* ── 2-1. 회원 홀딩 ── */}
                <div style={featureCardStyle}>
                    <div style={featureHeaderStyle}>
                        <div>
                            <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '4px' }}>⏸️ 회원 홀딩 (일시정지)</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>회원이 앱에서 수강권을 일시정지할 수 있습니다</div>
                        </div>
                        <ToggleSwitch 
                            checked={localConfig.POLICIES?.ALLOW_SELF_HOLD || false}
                            onChange={(e) => handleChange('POLICIES.ALLOW_SELF_HOLD', e.target.checked)}
                        />
                    </div>

                    {localConfig.POLICIES?.ALLOW_SELF_HOLD && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '4px' }}>홀딩 규칙 (수강권별)</div>
                            {(localConfig.POLICIES?.HOLD_RULES || []).map((rule, rIdx) => (
                                <div key={rIdx} style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap' }}>
                                    <div style={{ flex: 1, minWidth: '90px' }}>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', marginBottom: '6px' }}>수강 기간</div>
                                        <Stepper 
                                            value={rule.durationMonths || 1}
                                            onChange={(v) => { const rules = [...(localConfig.POLICIES?.HOLD_RULES || [])]; rules[rIdx] = { ...rules[rIdx], durationMonths: v }; handleChange('POLICIES.HOLD_RULES', rules); }}
                                            unit="개월"
                                        />
                                    </div>
                                    <div style={{ flex: 1, minWidth: '90px' }}>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', marginBottom: '6px' }}>최대 횟수</div>
                                        <Stepper 
                                            value={rule.maxCount || 1}
                                            onChange={(v) => { const rules = [...(localConfig.POLICIES?.HOLD_RULES || [])]; rules[rIdx] = { ...rules[rIdx], maxCount: v }; handleChange('POLICIES.HOLD_RULES', rules); }}
                                            unit="회"
                                        />
                                    </div>
                                    <div style={{ flex: 1, minWidth: '90px' }}>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', marginBottom: '6px' }}>1회 최대</div>
                                        <Stepper 
                                            value={rule.maxWeeks || 1}
                                            onChange={(v) => { const rules = [...(localConfig.POLICIES?.HOLD_RULES || [])]; rules[rIdx] = { ...rules[rIdx], maxWeeks: v }; handleChange('POLICIES.HOLD_RULES', rules); }}
                                            unit="주"
                                        />
                                    </div>
                                    <button 
                                        onClick={() => {
                                            const rules = [...(localConfig.POLICIES?.HOLD_RULES || [])];
                                            rules.splice(rIdx, 1);
                                            handleChange('POLICIES.HOLD_RULES', rules);
                                        }}
                                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.1rem', padding: '4px 8px', alignSelf: 'flex-start', marginTop: '16px' }}
                                        title="삭제"
                                    >✕</button>
                                </div>
                            ))}
                            <button 
                                className="action-btn sm"
                                style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px dashed var(--border-color)', fontSize: '0.8rem' }}
                                onClick={() => {
                                    const rules = [...(localConfig.POLICIES?.HOLD_RULES || []), { durationMonths: 3, maxCount: 1, maxWeeks: 2 }];
                                    handleChange('POLICIES.HOLD_RULES', rules);
                                }}
                            >+ 규칙 추가</button>
                        </div>
                    )}
                </div>

                {/* ── 2-2. 수업 예약 ── */}
                <div style={featureCardStyle}>
                    <div style={featureHeaderStyle}>
                        <div>
                            <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '4px' }}>📅 수업 예약</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>회원이 앱에서 수업을 미리 예약할 수 있습니다</div>
                        </div>
                        <ToggleSwitch 
                            checked={localConfig.POLICIES?.ALLOW_BOOKING || false}
                            onChange={(e) => handleChange('POLICIES.ALLOW_BOOKING', e.target.checked)}
                        />
                    </div>

                    {localConfig.POLICIES?.ALLOW_BOOKING && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {/* 예약 없이 직접 출석 안내 */}
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                💡 예약 기능을 켜도, 예약 없이 직접 오는 회원은 기존처럼 출석 가능합니다. 다만 정원이 찬 수업은 워크인이 제한될 수 있습니다.
                            </div>

                            {/* 정원 */}
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1, minWidth: '140px' }}>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '4px' }}>수업당 최대 인원</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginBottom: '8px' }}>시간표에서 수업별로 따로 정할 수도 있습니다</div>
                                    {(localConfig.BRANCHES?.length || 0) >= 2 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', minWidth: '50px' }}>기본값</span>
                                                <Stepper 
                                                    value={bookingRules.defaultCapacity || 15}
                                                    onChange={(v) => handleChange('POLICIES.BOOKING_RULES', { ...bookingRules, defaultCapacity: v })}
                                                    unit="명"
                                                />
                                            </div>
                                            {localConfig.BRANCHES.map((branch) => (
                                                <div key={branch.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ fontSize: '0.7rem', color: 'var(--primary-theme-color)', minWidth: '50px', fontWeight: 'bold' }}>{branch.name}</span>
                                                    <Stepper 
                                                        value={(bookingRules.branchCapacity || {})[branch.id] || bookingRules.defaultCapacity || 15}
                                                        onChange={(v) => {
                                                            const bc = { ...(bookingRules.branchCapacity || {}) };
                                                            bc[branch.id] = v;
                                                            handleChange('POLICIES.BOOKING_RULES', { ...bookingRules, branchCapacity: bc });
                                                        }}
                                                        unit="명"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <Stepper 
                                            value={bookingRules.defaultCapacity || 15}
                                            onChange={(v) => handleChange('POLICIES.BOOKING_RULES', { ...bookingRules, defaultCapacity: v })}
                                            unit="명"
                                        />
                                    )}
                                </div>
                            </div>

                            {/* 예약 시간 규칙 */}
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1, minWidth: '120px' }}>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', marginBottom: '6px' }}>예약 가능 기간</div>
                                    <Stepper 
                                        value={bookingRules.windowDays || 7}
                                        onChange={(v) => handleChange('POLICIES.BOOKING_RULES', { ...bookingRules, windowDays: v })}
                                        unit="일 전부터"
                                    />
                                </div>
                                <div style={{ flex: 1, minWidth: '120px' }}>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', marginBottom: '6px' }}>예약 마감</div>
                                    <Stepper 
                                        value={bookingRules.deadlineHours || 1}
                                        onChange={(v) => handleChange('POLICIES.BOOKING_RULES', { ...bookingRules, deadlineHours: v })}
                                        unit="시간 전"
                                    />
                                </div>
                                <div style={{ flex: 1, minWidth: '120px' }}>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', marginBottom: '6px' }}>취소 마감</div>
                                    <Stepper 
                                        value={bookingRules.cancelDeadlineHours || 3}
                                        onChange={(v) => handleChange('POLICIES.BOOKING_RULES', { ...bookingRules, cancelDeadlineHours: v })}
                                        unit="시간 전"
                                    />
                                </div>
                            </div>

                            {/* 예약 제한 */}
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1, minWidth: '120px' }}>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', marginBottom: '6px' }}>동시 예약 한도</div>
                                    <Stepper 
                                        value={bookingRules.maxActiveBookings || 3}
                                        onChange={(v) => handleChange('POLICIES.BOOKING_RULES', { ...bookingRules, maxActiveBookings: v })}
                                        unit="건"
                                    />
                                </div>
                                <div style={{ flex: 1, minWidth: '120px' }}>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', marginBottom: '6px' }}>하루 최대 예약</div>
                                    <Stepper 
                                        value={bookingRules.maxDailyBookings || 2}
                                        onChange={(v) => handleChange('POLICIES.BOOKING_RULES', { ...bookingRules, maxDailyBookings: v })}
                                        unit="건"
                                    />
                                </div>
                            </div>

                            {/* 노쇼 규칙 */}
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1, minWidth: '140px' }}>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '8px' }}>노쇼 (예약 후 미출석)</div>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', marginBottom: '6px' }}>미출석 시 횟수 차감</div>
                                    <Stepper 
                                        value={bookingRules.noshowCreditDeduct || 1}
                                        onChange={(v) => handleChange('POLICIES.BOOKING_RULES', { ...bookingRules, noshowCreditDeduct: v })}
                                        min={0}
                                        unit="회 차감"
                                    />
                                </div>
                            </div>

                            {/* 대기열 */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '4px' }}>대기열</div>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>정원 초과 시 대기 → 취소 발생 시 자동 예약 + 알림</div>
                                </div>
                                <ToggleSwitch 
                                    checked={bookingRules.enableWaitlist !== false}
                                    onChange={(e) => handleChange('POLICIES.BOOKING_RULES', { ...bookingRules, enableWaitlist: e.target.checked })}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* ── 2-3. 출석 화면 카메라 ── */}
                <div style={featureCardStyle}>
                    <div style={featureHeaderStyle}>
                        <div>
                            <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '4px' }}>📷 출석 화면 카메라</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>출석체크 화면에 카메라 영상을 표시합니다</div>
                        </div>
                        <ToggleSwitch 
                            checked={localConfig.POLICIES?.SHOW_CAMERA_PREVIEW || false}
                            onChange={(e) => handleChange('POLICIES.SHOW_CAMERA_PREVIEW', e.target.checked)}
                        />
                    </div>

                    {/* 하위 옵션: 안면인식 자동 출석 (카메라 ON일 때만 표시) */}
                    {localConfig.POLICIES?.SHOW_CAMERA_PREVIEW && (
                        <div style={{ 
                            marginTop: '12px', paddingTop: '12px', paddingLeft: '20px',
                            borderTop: '1px solid rgba(255,255,255,0.05)'
                        }}>
                            <div style={featureHeaderStyle}>
                                <div>
                                    <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '4px' }}>🧠 안면인식 자동 출석</div>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>등록된 회원의 얼굴을 인식하면 자동으로 출석 처리합니다</div>
                                </div>
                                <ToggleSwitch 
                                    checked={localConfig.POLICIES?.FACE_RECOGNITION_ENABLED || false}
                                    onChange={(e) => handleChange('POLICIES.FACE_RECOGNITION_ENABLED', e.target.checked)}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ─── 3. 지점 관리 ─── */}
            <div className="dashboard-card">
                <h3 className="card-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                    <MapPin size={20} weight="fill" color="var(--primary-theme-color)" /> 지점 관리
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {localConfig.BRANCHES?.map((branch, index) => (
                        <div key={branch.id} style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <div style={{ flex: 1 }}>
                                <input 
                                    type="text" 
                                    className="styled-input sm" 
                                    style={{ background: 'none', border: 'none', fontWeight: 'bold', padding: '4px 0', color: 'var(--text-primary)' }}
                                    value={branch.name} 
                                    onChange={(e) => {
                                        const newBranches = [...localConfig.BRANCHES];
                                        newBranches[index].name = e.target.value;
                                        handleChange('BRANCHES', newBranches);
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                    <button 
                        className="action-btn sm" 
                        style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px dashed var(--border-color)' }}
                        onClick={() => {
                            const name = prompt('새 지점 이름을 입력하세요:');
                            if (name) {
                                // 자동 ID 생성: 한글→영문 변환 또는 타임스탬프 기반
                                const id = name.replace(/[^a-zA-Z0-9가-힣]/g, '').toLowerCase() || `branch_${Date.now()}`;
                                const autoId = id.replace(/[가-힣]+/g, () => `branch_${Date.now()}`);
                                const finalId = /^[a-z]/.test(autoId) ? autoId : `branch_${Date.now()}`;
                                const newBranches = [...(localConfig.BRANCHES || []), { id: finalId, name, color: 'var(--primary-gold)' }];
                                handleChange('BRANCHES', newBranches);
                            }
                        }}
                    >
                        + 지점 추가
                    </button>
                </div>
            </div>
            
            {/* 4. 데이터 마이그레이션 (숨김) */}
            <div style={{ marginTop: '20px', padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: '0.8rem', userSelect: 'none' }}>
                    <input 
                        type="checkbox" 
                        checked={showImporter} 
                        onChange={(e) => setShowImporter(e.target.checked)} 
                        style={{ opacity: 0.5 }}
                    />
                    요가원 초기 데이터 마이그레이션 (AI 기반) 
                    <Robot size={14} weight="fill" style={{ opacity: showImporter ? 1 : 0.3 }} color={showImporter ? 'var(--primary-gold)' : 'currentColor'} />
                </label>

                {showImporter && (
                    <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
                        <SmartDataImporter onImportComplete={(type, data) => {
                            console.log('Imported:', type, data);
                        }} />
                    </div>
                )}
            </div>

            <div style={{ height: '200px' }} />
        </div>
    );
};

export default StudioSettingsTab;
