import { useState, useEffect } from 'react';
import { Buildings, Plus, ArrowSquareOut, Trash, Crown, MagnifyingGlass, X, Gear } from '@phosphor-icons/react';
import { studioRegistryService } from '../services/studioRegistryService';
import { switchStudio, getCurrentStudioId } from '../utils/resolveStudioId';
import { useStudioConfig } from '../contexts/StudioContext';

const SuperAdminPage = () => {
    const { config } = useStudioConfig();
    const [studios, setStudios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showRegister, setShowRegister] = useState(false);
    const [currentStudioId, setCurrentStudioId] = useState(() => getCurrentStudioId());
    const [registerForm, setRegisterForm] = useState({ studioId: '', name: '', nameEnglish: '', ownerEmail: '', domain: '' });
    const [registering, setRegistering] = useState(false);

    useEffect(() => { loadStudios(); }, []);

    const loadStudios = async () => {
        setLoading(true);
        const list = await studioRegistryService.listStudios();
        setStudios(list);
        setLoading(false);
    };

    const handleRegister = async () => {
        if (!registerForm.studioId || !registerForm.name || !registerForm.ownerEmail) {
            alert('스튜디오 ID, 이름, 관리자 이메일은 필수입니다.');
            return;
        }
        if (!/^[a-z0-9-]+$/.test(registerForm.studioId)) {
            alert('스튜디오 ID는 영문 소문자, 숫자, 하이픈만 사용 가능합니다.');
            return;
        }
        setRegistering(true);
        const result = await studioRegistryService.registerStudio(registerForm);
        setRegistering(false);
        if (result.success) {
            alert(result.message);
            setShowRegister(false);
            setRegisterForm({ studioId: '', name: '', nameEnglish: '', ownerEmail: '', domain: '' });
            loadStudios();
        } else {
            alert(result.message);
        }
    };

    const handleSwitch = (studioId) => {
        if (currentStudioId === studioId) return;
        if (!window.confirm(`[${studioId}] 스튜디오로 전환하시겠습니까?\n\n모든 데이터가 해당 스튜디오의 데이터로 바뀝니다.`)) return;
        switchStudio(studioId);
        setCurrentStudioId(studioId);
    };

    const handleDelete = async (studio) => {
        if (!window.confirm(`정말로 [${studio.name}]을 레지스트리에서 삭제하시겠습니까?\n\n(실제 데이터는 보존됩니다)`)) return;
        await studioRegistryService.deleteStudio(studio.id);
        loadStudios();
    };

    const statusColors = { active: '#10B981', suspended: '#EF4444', trial: '#F59E0B' };
    const statusLabels = { active: '운영중', suspended: '정지', trial: '체험' };
    const planLabels = { free: '무료', basic: '베이직', pro: '프로' };
    const planColors = { free: '#6B7280', basic: '#3B82F6', pro: '#8B5CF6' };

    return (
        <div style={{ minHeight: '100vh', background: '#08080A', color: '#f0f0f0', padding: '24px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Crown size={28} color="#D4AF37" weight="fill" />
                    <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '700' }}>슈퍼 어드민</h1>
                    <span style={{ fontSize: '0.8rem', padding: '4px 10px', borderRadius: '20px', background: 'rgba(212, 175, 55, 0.15)', color: '#D4AF37', fontWeight: '600' }}>
                        플랫폼 관리
                    </span>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        onClick={() => setShowRegister(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', background: '#3B82F6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '0.9rem' }}
                    >
                        <Plus size={18} weight="bold" /> 새 스튜디오 등록
                    </button>
                    <button
                        onClick={() => window.location.href = '/admin'}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', background: 'rgba(255,255,255,0.08)', color: '#ccc', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem' }}
                    >
                        <Gear size={18} /> 어드민 대시보드
                    </button>
                </div>
            </div>

            {/* Current Studio Banner */}
            <div style={{ marginBottom: '24px', padding: '16px 20px', background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.1), rgba(212, 175, 55, 0.03))', borderRadius: '12px', border: '1px solid rgba(212, 175, 55, 0.2)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Buildings size={22} color="#D4AF37" />
                <span style={{ fontSize: '0.9rem', color: '#999' }}>현재 연결:</span>
                <span style={{ fontWeight: '700', color: '#D4AF37', fontSize: '1rem' }}>{config.IDENTITY?.NAME || currentStudioId}</span>
                <span style={{ fontSize: '0.75rem', color: '#666', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px' }}>{currentStudioId}</span>
            </div>

            {/* Studios Grid */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#666' }}>스튜디오 목록 불러오는 중...</div>
            ) : studios.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#666' }}>
                    <Buildings size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
                    <p>등록된 스튜디오가 없습니다.</p>
                    <p style={{ fontSize: '0.85rem' }}>위 "새 스튜디오 등록" 버튼으로 시작하세요.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
                    {studios.map(studio => {
                        const isCurrent = studio.id === currentStudioId;
                        return (
                            <div key={studio.id} style={{
                                background: isCurrent ? 'rgba(212, 175, 55, 0.06)' : 'rgba(255,255,255,0.03)',
                                border: isCurrent ? '2px solid rgba(212, 175, 55, 0.4)' : '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '14px', padding: '20px', position: 'relative',
                                transition: 'all 0.2s', cursor: 'pointer'
                            }} onClick={() => handleSwitch(studio.id)}>
                                {isCurrent && (
                                    <div style={{ position: 'absolute', top: '12px', right: '12px', fontSize: '0.7rem', padding: '3px 8px', borderRadius: '12px', background: '#D4AF37', color: '#000', fontWeight: '700' }}>현재</div>
                                )}

                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                                    <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '1rem', color: 'white', flexShrink: 0 }}>
                                        {studio.name?.substring(0, 1) || '?'}
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontWeight: '700', fontSize: '1.05rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{studio.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#888' }}>{studio.id}</div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                                    <span style={{ fontSize: '0.7rem', padding: '3px 8px', borderRadius: '10px', background: `${statusColors[studio.status]}22`, color: statusColors[studio.status], fontWeight: '600' }}>
                                        {statusLabels[studio.status] || studio.status}
                                    </span>
                                    <span style={{ fontSize: '0.7rem', padding: '3px 8px', borderRadius: '10px', background: `${planColors[studio.plan]}22`, color: planColors[studio.plan], fontWeight: '600' }}>
                                        {planLabels[studio.plan] || studio.plan}
                                    </span>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#888' }}>
                                    <span>{studio.ownerEmail}</span>
                                    <div style={{ display: 'flex', gap: '4px' }} onClick={e => e.stopPropagation()}>
                                        <button onClick={() => handleSwitch(studio.id)} title="전환" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3B82F6', padding: '4px' }}><ArrowSquareOut size={18} /></button>
                                        <button onClick={() => handleDelete(studio)} title="삭제" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', padding: '4px' }}><Trash size={18} /></button>
                                    </div>
                                </div>

                                <div style={{ marginTop: '10px', fontSize: '0.7rem', color: '#555' }}>
                                    등록: {new Date(studio.createdAt).toLocaleDateString('ko-KR')}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Register Modal */}
            {showRegister && (
                <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="새 스튜디오 등록">
                    <div className="modal-content" style={{ maxWidth: '480px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2 style={{ margin: 0, fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Buildings size={24} color="#3B82F6" /> 새 스튜디오 등록
                            </h2>
                            <button onClick={() => setShowRegister(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}><X size={24} /></button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: '#aaa', marginBottom: '6px', fontWeight: '600' }}>스튜디오 ID *</label>
                                <input
                                    value={registerForm.studioId}
                                    onChange={e => setRegisterForm({ ...registerForm, studioId: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                                    placeholder="예: namaste-yoga, blue-studio"
                                    style={{ width: '100%', padding: '12px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#f0f0f0', fontSize: '0.95rem', boxSizing: 'border-box' }}
                                />
                                <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '4px' }}>영문 소문자, 숫자, 하이픈만 가능. Firestore 경로 및 서브도메인으로 사용됩니다.</div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: '#aaa', marginBottom: '6px', fontWeight: '600' }}>스튜디오 이름 *</label>
                                <input
                                    value={registerForm.name}
                                    onChange={e => setRegisterForm({ ...registerForm, name: e.target.value })}
                                    placeholder="예: 나마스테 요가"
                                    style={{ width: '100%', padding: '12px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#f0f0f0', fontSize: '0.95rem', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: '#aaa', marginBottom: '6px', fontWeight: '600' }}>영문 이름</label>
                                <input
                                    value={registerForm.nameEnglish}
                                    onChange={e => setRegisterForm({ ...registerForm, nameEnglish: e.target.value })}
                                    placeholder="예: Namaste Yoga"
                                    style={{ width: '100%', padding: '12px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#f0f0f0', fontSize: '0.95rem', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: '#aaa', marginBottom: '6px', fontWeight: '600' }}>관리자 이메일 *</label>
                                <input
                                    type="email"
                                    value={registerForm.ownerEmail}
                                    onChange={e => setRegisterForm({ ...registerForm, ownerEmail: e.target.value })}
                                    placeholder="admin@namaste.yoga"
                                    style={{ width: '100%', padding: '12px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#f0f0f0', fontSize: '0.95rem', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: '#aaa', marginBottom: '6px', fontWeight: '600' }}>커스텀 도메인 (선택)</label>
                                <input
                                    value={registerForm.domain}
                                    onChange={e => setRegisterForm({ ...registerForm, domain: e.target.value })}
                                    placeholder="예: namaste.boksaem.app"
                                    style={{ width: '100%', padding: '12px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#f0f0f0', fontSize: '0.95rem', boxSizing: 'border-box' }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '28px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowRegister(false)} style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#aaa', cursor: 'pointer', fontSize: '0.9rem' }}>취소</button>
                            <button
                                onClick={handleRegister}
                                disabled={registering}
                                style={{ padding: '10px 24px', background: registering ? '#555' : '#3B82F6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: registering ? 'not-allowed' : 'pointer', fontSize: '0.9rem' }}
                            >
                                {registering ? '등록중...' : '🏢 등록하기'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SuperAdminPage;
