import { useState, useEffect } from 'react';
import { useStudioConfig } from '../../../contexts/StudioContext';
import { Gear, Palette, ShieldCheck, MapPin, Info, FloppyDisk, ArrowsClockwise } from '@phosphor-icons/react';
import { getContrastText } from '../../../utils/colors';

const StudioSettingsTab = () => {
    const { config, updateConfig, refreshConfig, loading } = useStudioConfig();
    const [localConfig, setLocalConfig] = useState(config);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (config && Object.keys(config).length > 0) {
            setLocalConfig(config);
        }
    }, [config]);

    const themeColor = config.THEME?.PRIMARY_COLOR || '#D4AF37';
    const contrastText = getContrastText(themeColor);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateConfig(localConfig);
            alert('설정이 성공적으로 저장되었습니다.');
        } catch (error) {
            console.error('Failed to save config:', error);
            alert('설정 저장 중 오류가 발생했습니다.');
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

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '900px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Gear size={32} weight="fill" color="var(--primary-theme-color)" />
                    스튜디오 핵심 설정 (SaaS Core)
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
                            color: contrastText,
                            padding: '8px 20px',
                            fontWeight: 'bold',
                            boxShadow: '0 4px 15px var(--primary-theme-skeleton)'
                        }}
                    >
                        <FloppyDisk size={20} weight="bold" /> {isSaving ? '저장 중...' : '변경사항 저장'}
                    </button>
                </div>
            </div>

            {/* 1. Identity Section */}
            <div className="dashboard-card">
                <h3 className="card-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                    <Info size={20} weight="fill" color="var(--primary-theme-color)" /> 스튜디오 정보 (Identity)
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                    <div className="input-group">
                        <label>스튜디오 이름</label>
                        <input 
                            type="text" 
                            className="styled-input" 
                            value={localConfig.IDENTITY?.NAME || ''} 
                            onChange={(e) => handleChange('IDENTITY.NAME', e.target.value)} 
                        />
                    </div>
                    <div className="input-group">
                        <label>슬로건</label>
                        <input 
                            type="text" 
                            className="styled-input" 
                            value={localConfig.IDENTITY?.SLOGAN || ''} 
                            onChange={(e) => handleChange('IDENTITY.SLOGAN', e.target.value)} 
                        />
                    </div>
                    <div className="input-group">
                        <label>앱 버전</label>
                        <input 
                            type="text" 
                            className="styled-input" 
                            value={localConfig.IDENTITY?.APP_VERSION || ''} 
                            onChange={(e) => handleChange('IDENTITY.APP_VERSION', e.target.value)} 
                        />
                    </div>
                </div>
            </div>

            {/* 2. Theme Section */}
            <div className="dashboard-card">
                <h3 className="card-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                    <Palette size={20} weight="fill" color="var(--primary-theme-color)" /> 브랜드 테마 (Theme)
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                    <div className="input-group">
                        <label>프라이머리 컬러 (Primary)</label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <input 
                                type="color" 
                                style={{ width: '40px', height: '40px', padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
                                value={localConfig.THEME?.PRIMARY_COLOR || '#D4AF37'} 
                                onChange={(e) => handleChange('THEME.PRIMARY_COLOR', e.target.value)} 
                            />
                            <input 
                                type="text" 
                                className="styled-input" 
                                value={localConfig.THEME?.PRIMARY_COLOR || ''} 
                                onChange={(e) => handleChange('THEME.PRIMARY_COLOR', e.target.value)} 
                            />
                        </div>
                    </div>
                    <div className="input-group">
                        <label>스켈레톤 컬러 (Skeleton)</label>
                        <input 
                            type="text" 
                            className="styled-input" 
                            value={localConfig.THEME?.SKELETON_COLOR || ''} 
                            onChange={(e) => handleChange('THEME.SKELETON_COLOR', e.target.value)} 
                            placeholder="rgba(212, 175, 55, 0.1)"
                        />
                    </div>
                </div>
                <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', margin: '0 0 10px 0' }}>💡 색상을 변경하면 즉시 모든 사용자의 앱 테마가 실시간으로 업데이트됩니다.</p>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <div style={{ width: '100px', height: '30px', background: localConfig.THEME?.PRIMARY_COLOR, borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: getContrastText(localConfig.THEME?.PRIMARY_COLOR || '#D4AF37'), fontWeight: 'bold' }}>
                            PREVIEW
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Policies Section */}
            <div className="dashboard-card">
                <h3 className="card-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                    <ShieldCheck size={20} weight="fill" color="var(--primary-theme-color)" /> 정책 임계값 (Policies)
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                    <div className="input-group">
                        <label>세션 자동 종료 (초)</label>
                        <input 
                            type="number" 
                            className="styled-input" 
                            value={localConfig.POLICIES?.SESSION_AUTO_CLOSE_SEC || ''} 
                            onChange={(e) => handleChange('POLICIES.SESSION_AUTO_CLOSE_SEC', parseInt(e.target.value))} 
                        />
                    </div>
                    <div className="input-group">
                        <label>신규 회원 기준 (일)</label>
                        <input 
                            type="number" 
                            className="styled-input" 
                            value={localConfig.POLICIES?.NEW_MEMBER_THRESHOLD_DAYS || ''} 
                            onChange={(e) => handleChange('POLICIES.NEW_MEMBER_THRESHOLD_DAYS', parseInt(e.target.value))} 
                        />
                    </div>
                </div>
            </div>

            {/* 4. Branches Section */}
            <div className="dashboard-card">
                <h3 className="card-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                    <MapPin size={20} weight="fill" color="var(--primary-theme-color)" /> 지점 관리 (Branches)
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {localConfig.BRANCHES?.map((branch, index) => (
                        <div key={branch.id} style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <div style={{ flex: 1 }}>
                                <input 
                                    type="text" 
                                    className="styled-input sm" 
                                    style={{ background: 'none', border: 'none', fontWeight: 'bold', padding: '4px 0' }}
                                    value={branch.name} 
                                    onChange={(e) => {
                                        const newBranches = [...localConfig.BRANCHES];
                                        newBranches[index].name = e.target.value;
                                        handleChange('BRANCHES', newBranches);
                                    }}
                                />
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>ID: {branch.id}</div>
                            </div>
                            <div className="input-group" style={{ width: '120px', marginBottom: 0 }}>
                                <input 
                                    type="color" 
                                    className="styled-input sm" 
                                    style={{ height: '30px', padding: '2px' }}
                                    value={branch.color || '#D4AF37'} 
                                    onChange={(e) => {
                                        const newBranches = [...localConfig.BRANCHES];
                                        newBranches[index].color = e.target.value;
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
                            const id = prompt('새 지점 ID를 입력하세요 (영문):');
                            if (id) {
                                const newBranches = [...(localConfig.BRANCHES || []), { id, name: '새 지점', color: '#D4AF37' }];
                                handleChange('BRANCHES', newBranches);
                            }
                        }}
                    >
                        + 지점 추가
                    </button>
                </div>
            </div>
            
            <div style={{ height: '40px' }} />
        </div>
    );
};

export default StudioSettingsTab;
