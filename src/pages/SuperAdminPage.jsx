import { useState, useEffect } from 'react';
import { Buildings, Plus, ArrowSquareOut, Trash, Crown, X, Gear, UserCirclePlus, Lock, ShieldCheck, Eye, EyeSlash, Copy, Check } from '@phosphor-icons/react';
import { studioRegistryService } from '../services/studioRegistryService';
import { switchStudio, getCurrentStudioId } from '../utils/resolveStudioId';
import { useStudioConfig } from '../contexts/StudioContext';
import { functions, auth } from '../firebase';
import { httpsCallable } from 'firebase/functions';

const SuperAdminPage = () => {
    const { config } = useStudioConfig();
    const [studios, setStudios] = useState([]);
    const [pendingStudios, setPendingStudios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showRegister, setShowRegister] = useState(false);
    const [currentStudioId, setCurrentStudioId] = useState(() => getCurrentStudioId());
    const [registerForm, setRegisterForm] = useState({ studioId: '', name: '', nameEnglish: '', ownerEmail: '', domain: '' });
    const [registering, setRegistering] = useState(false);
    const [activeSection, setActiveSection] = useState('studios');

    // 관리자 관리
    const [admins, setAdmins] = useState([]);
    const [adminsLoading, setAdminsLoading] = useState(false);
    const [showAddAdmin, setShowAddAdmin] = useState(false);
    const [addForm, setAddForm] = useState({ email: '', displayName: '', role: 'admin', studioId: '' });
    const [adding, setAdding] = useState(false);
    const [createdResetLink, setCreatedResetLink] = useState(null);
    const [copied, setCopied] = useState(false);
    const [copiedStudioId, setCopiedStudioId] = useState(null);

    // 비밀번호 변경
    const [resetPasswordUid, setResetPasswordUid] = useState(null);
    const [newPassword, setNewPassword] = useState('');
    const [showPassword, setShowPassword] = useState({});
    const [resetting, setResetting] = useState(false);

    useEffect(() => { loadStudios(); }, []);

    const loadStudios = async () => {
        setLoading(true);
        const [list, pendingList] = await Promise.all([
            studioRegistryService.listStudios(),
            studioRegistryService.listPendingStudios()
        ]);
        setStudios(list);
        
        // pendingList에서 status가 'pending'인 것만 필터링
        const pList = pendingList.filter(p => p.status === 'pending');
        setPendingStudios(pList);
        
        setLoading(false);
    };

    const loadAdmins = async () => {
        setAdminsLoading(true);
        try {
            const fn = httpsCallable(functions, 'listAdminsCall');
            const result = await fn();
            setAdmins(result.data.admins || []);
        } catch (e) {
            alert('관리자 목록 조회 실패: ' + e.message);
        }
        setAdminsLoading(false);
    };

    const handleAddAdmin = async () => {
        if (!addForm.email || !addForm.role) { alert('이메일과 역할은 필수입니다.'); return; }
        if (addForm.role === 'admin' && !addForm.studioId) { alert('일반 관리자는 업장을 선택해야 합니다.'); return; }
        setAdding(true);
        try {
            const fn = httpsCallable(functions, 'createAdminCall');
            const result = await fn(addForm);
            // 구글 기본 영어 페이지를 우회하고, 우리가 새로 만든 한글 /auth/action 페이지로 강제 연결
            const matchParams = result.data.resetLink.match(/oobCode=([^&]+)/);
            const oobCode = matchParams ? matchParams[1] : '';
            const cleanLink = `https://passflowai.web.app/auth/action?mode=resetPassword&oobCode=${oobCode}`;
            
            setCreatedResetLink(cleanLink);
            
            // 파이어베이스에 커스텀 URL 등록을 유도하여, 자동 메일로 발송!
            try {
                const { sendPasswordResetEmail } = await import('firebase/auth');
                const actionCodeSettings = {
                    url: 'https://passflowai.web.app/auth/action',
                    handleCodeInApp: false
                };
                await sendPasswordResetEmail(auth, addForm.email, actionCodeSettings);
            } catch (err) {
                console.error("이메일 전송 실패(무시됨):", err);
            }
            
            alert(`${result.data.message}\n\n✅ [완벽한 화이트라벨링 통과]\n해당 원장님께 비밀번호 설정 이메일이 자동 발송되었습니다!\n(혹시 메일이 안 간 경우 화면의 링크를 직접 복사해서 주셔도 됩니다.)`);
            loadAdmins();
        } catch (e) {
            alert('생성 실패: ' + (e.message || '오류 발생'));
        }
        setAdding(false);
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(createdResetLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleCopyStudioLink = (studio) => {
        const link = `https://passflowai.web.app/admin?studio=${studio.id}`;
        navigator.clipboard.writeText(link);
        setCopiedStudioId(studio.id);
        setTimeout(() => setCopiedStudioId(null), 2000);
    };

    const handleResetPassword = async () => {
        if (!newPassword || newPassword.length < 6) { alert('비밀번호는 최소 6자 이상이어야 합니다.'); return; }
        setResetting(true);
        try {
            const fn = httpsCallable(functions, 'resetAdminPasswordCall');
            const result = await fn({ uid: resetPasswordUid, newPassword });
            alert(result.data.message);
            setResetPasswordUid(null);
            setNewPassword('');
        } catch (e) {
            alert('비밀번호 변경 실패: ' + e.message);
        }
        setResetting(false);
    };

    const handleSetClaims = async (email, role, studioId) => {
        try {
            const fn = httpsCallable(functions, 'setAdminClaimsCall');
            await fn({ email, role, studioId });
            alert(`${email} 권한 변경 완료`);
            loadAdmins();
        } catch (e) { alert('권한 변경 실패: ' + e.message); }
    };

    const handleDeleteAdmin = async (adminObj) => {
        if (!window.confirm(`정말로 [${adminObj.email}] 관리자 계정을 완전히 삭제하시겠습니까?\n이 작업은 복구할 수 없으며 해당 관리자의 파이어베이스 접속이 즉각 차단됩니다.`)) return;
        setAdminsLoading(true);
        try {
            const fn = httpsCallable(functions, 'deleteAdminCall');
            const result = await fn({ uid: adminObj.uid });
            alert(result.data.message);
            loadAdmins();
        } catch (e) {
            alert('삭제 실패: ' + e.message);
            setAdminsLoading(false);
        }
    };

    const handleRegister = async () => {
        if (!registerForm.studioId || !registerForm.name || !registerForm.ownerEmail) { alert('스튜디오 ID, 이름, 관리자 이메일은 필수입니다.'); return; }
        if (!/^[a-z0-9-]+$/.test(registerForm.studioId)) { alert('스튜디오 ID는 영문 소문자, 숫자, 하이픈만 가능합니다.'); return; }
        setRegistering(true);
        const result = await studioRegistryService.registerStudio(registerForm);
        setRegistering(false);
        if (result.success) { alert(result.message); setShowRegister(false); setRegisterForm({ studioId: '', name: '', ownerEmail: '', domain: '' }); loadStudios(); }
        else alert(result.message);
    };

    const handleApproveOnboarding = async (pending) => {
        const studioId = prompt('✅ 승인 처리를 위해 부여할 영문 스튜디오 ID를 입력하세요\n(예: namaste-yoga)', '');
        if (!studioId) return;
        if (!/^[a-z0-9-]+$/.test(studioId)) { alert('영문 소문자, 숫자, 하이픈만 가능합니다.'); return; }
        
        setLoading(true);
        const result = await studioRegistryService.approveOnboarding(pending.id, studioId, pending.ownerEmail, pending.name);
        if (result.success) {
            try {
                // 1. 관리자 계정 자동 생성 (임시 비번 부여됨) 및 고유 비밀번호 설정 링크(resetLink) 발급
                const fn = httpsCallable(functions, 'createAdminCall');
                const adminResult = await fn({
                    email: pending.ownerEmail,
                    displayName: pending.name + ' 원장님',
                    role: 'admin',
                    studioId: studioId
                });
                
                // 구글 기본 영어 페이지를 우회하고, 우리가 새로 만든 한글 /auth/action 페이지로 강제 연결
                const matchParams = adminResult.data.resetLink.match(/oobCode=([^&]+)/);
                const oobCode = matchParams ? matchParams[1] : '';
                const cleanLink = `https://passflowai.web.app/auth/action?mode=resetPassword&oobCode=${oobCode}`;
                
                // 파이어베이스 기본 영어 이메일 템플릿 우회! 카톡 복사용 링크 팝업 제공 및 자동 메일 발송 병행
                setCreatedResetLink(cleanLink);
                setShowAddAdmin(true); 

                try {
                    const { sendPasswordResetEmail } = await import('firebase/auth');
                    const actionCodeSettings = {
                        url: 'https://passflowai.web.app/auth/action',
                        handleCodeInApp: false
                    };
                    await sendPasswordResetEmail(auth, pending.ownerEmail, actionCodeSettings);
                } catch (err) {
                    console.error("이메일 전송 실패(무시됨):", err);
                }
                
                alert(`🎉 스튜디오 승인 완료!\n\n1. 원장님 이메일로 접속 설정 안내가 자동 발송되었습니다.\n2. (선택) 화면에 생성된 '직접 연결 주소'를 복사해서 카카오톡으로도 즉시 전달하실 수 있습니다!\n\n접속 즉시 한글판 PassFlow AI 로그인 화면이 펼쳐집니다.`);
            } catch (err) {
                console.error('계정 자동 생성 에러:', err);
                alert(`승인은 완료되었으나, 계정 자동 세팅에 실패했습니다.\n[관리자 계정] 탭에서 수동으로 새 관리자 계정을 추가해주세요.\n(사유: ${err.message})`);
            }
            loadStudios();
        } else {
            alert('승인 실패: ' + result.message);
        }
        setLoading(false);
    };

    const handleRejectOnboarding = async (pending) => {
        const reason = prompt('❌ 반려 (거절) 사유를 입력하세요 (신청자에게 발송 안됨, 기록용):', '');
        if (reason === null) return;
        
        setLoading(true);
        await studioRegistryService.rejectOnboarding(pending.id, reason);
        loadStudios();
    };

    const handleSwitch = (studio) => {
        // [AUTO-HEALER] 독립 도메인이 있는 경우 해당 도메인으로 브릿지 연결 (완벽한 격리)
        if (studio.domain) {
            let domainUrl = studio.domain.startsWith('http') ? studio.domain : `https://${studio.domain}`;
            window.open(`${domainUrl}/admin`, '_blank');
        } else {
            // 없는 경우 기존처럼 파라미터 기반 라우팅
            window.open(`/admin?studio=${studio.id}`, '_blank');
        }
    };

    const handleDelete = async (studio) => {
        if (!window.confirm(`정말로 [${studio.name}]을 레지스트리에서 삭제하시겠습니까?\n\n(실제 데이터는 보존됩니다)`)) return;
        await studioRegistryService.deleteStudio(studio.id);
        loadStudios();
    };

    const handleUpdateDate = async (studio) => {
        const currentDisplay = studio.createdAt ? new Date(studio.createdAt).toISOString().split('T')[0] : '';
        const newDateStr = prompt(`[${studio.name}] 시작 날짜 수정\n\n새 시작 날짜를 입력하세요 (YYYY-MM-DD 형식):`, currentDisplay);
        
        if (newDateStr === null) return; // 취소
        
        const timestamp = new Date(newDateStr).getTime();
        if (isNaN(timestamp)) {
            alert('올바른 날짜 형식이 아닙니다. (예: 2026-03-31)');
            return;
        }

        const isoString = new Date(newDateStr).toISOString();
        if (window.confirm(`시작 날짜를 ${newDateStr} 로 변경하시겠습니까?`)) {
            const success = await studioRegistryService.updateStudio(studio.id, { createdAt: isoString });
            if (success) {
                alert('날짜가 수정되었습니다.');
                loadStudios();
            } else {
                alert('날짜 수정에 실패했습니다.');
            }
        }
    };

    const statusColors = { active: '#10B981', suspended: '#EF4444', trial: '#F59E0B' };
    const statusLabels = { active: '운영중', suspended: '정지', trial: '체험' };
    const planLabels = { free: '무료', basic: '베이직', pro: '프로' };
    const planColors = { free: '#6B7280', basic: '#3B82F6', pro: '#8B5CF6' };
    const inputStyle = { width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#f0f0f0', fontSize: '0.95rem', boxSizing: 'border-box' };
    const labelStyle = { display: 'block', fontSize: '0.85rem', color: '#aaa', marginBottom: '6px', fontWeight: '600' };

    return (
        <div style={{ minHeight: '100vh', background: '#08080A', color: '#f0f0f0', padding: '24px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Crown size={28} color="#D4AF37" weight="fill" />
                    <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '700' }}>슈퍼 어드민</h1>
                    <span style={{ fontSize: '0.8rem', padding: '4px 10px', borderRadius: '20px', background: 'rgba(212, 175, 55, 0.15)', color: '#D4AF37', fontWeight: '600' }}>플랫폼 관리</span>
                </div>
            </div>

            {/* Section Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                <button onClick={() => setActiveSection('studios')} style={{ padding: '10px 20px', background: activeSection === 'studios' ? '#3B82F6' : 'rgba(255,255,255,0.05)', color: activeSection === 'studios' ? 'white' : '#aaa', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Buildings size={18} /> 스튜디오
                </button>
                <button onClick={() => { setActiveSection('admins'); if (admins.length === 0) loadAdmins(); }} style={{ padding: '10px 20px', background: activeSection === 'admins' ? '#3B82F6' : 'rgba(255,255,255,0.05)', color: activeSection === 'admins' ? 'white' : '#aaa', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldCheck size={18} /> 관리자 계정
                </button>
            </div>

            {/* ═══ STUDIOS ═══ */}
            {activeSection === 'studios' && (
                <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                        <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.1), rgba(212, 175, 55, 0.03))', borderRadius: '10px', border: '1px solid rgba(212, 175, 55, 0.2)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Buildings size={20} color="#D4AF37" />
                            <span style={{ fontSize: '0.85rem', color: '#999' }}>현재:</span>
                            <span style={{ fontWeight: '700', color: '#D4AF37' }}>{config.IDENTITY?.NAME || currentStudioId}</span>
                        </div>
                        <button onClick={() => setShowRegister(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', background: '#3B82F6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '0.9rem' }}>
                            <Plus size={18} weight="bold" /> 새 스튜디오
                        </button>
                    </div>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '60px', color: '#666' }}>불러오는 중...</div>
                    ) : (
                        <>
                            {/* 신규 가입 심사 대기소 */}
                            {pendingStudios.length > 0 && (
                                <div style={{ marginBottom: '32px', padding: '24px', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '16px' }}>
                                    <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px', color: '#60A5FA', fontSize: '1.2rem' }}>
                                        <Crown size={24} weight="fill" /> 신규 가입 심사 대기소 ({pendingStudios.length}건)
                                        <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 'normal', marginLeft: 'auto' }}>❓ 새로 신청한 원장님들을 검토하고 스튜디오를 발급해주는 공간입니다.</span>
                                    </h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                                        {pendingStudios.map(p => (
                                            <div key={p.id} style={{ background: 'rgba(0,0,0,0.3)', border: '1px dashed rgba(59, 130, 246, 0.4)', borderRadius: '12px', padding: '16px' }}>
                                                <div style={{ fontWeight: '700', fontSize: '1.1rem', marginBottom: '4px' }}>{p.name} {p.nameEnglish && `(${p.nameEnglish})`}</div>
                                                <div style={{ fontSize: '0.85rem', color: '#aaa', marginBottom: '4px' }}>📧 {p.ownerEmail}</div>
                                                <div style={{ fontSize: '0.85rem', color: '#aaa', marginBottom: p.scheduleUrl ? '8px' : '16px' }}>📦 요금제: {p.plan === 'pro' ? '프로' : p.plan === 'basic' ? '베이직' : '무료체험'}</div>
                                                {p.scheduleUrls && p.scheduleUrls.length > 0 && (
                                                    <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                        {p.scheduleUrls.map((url, idx) => (
                                                            <a key={idx} href={url} target="_blank" rel="noreferrer" style={{ fontSize: '0.85rem', color: '#60A5FA', textDecoration: 'underline', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                📥 첨부파일 #{idx + 1} 다운로드
                                                            </a>
                                                        ))}
                                                    </div>
                                                )}
                                                {!p.scheduleUrls && p.scheduleUrl && (
                                                    <div style={{ marginBottom: '16px' }}>
                                                        <a href={p.scheduleUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.85rem', color: '#60A5FA', textDecoration: 'underline', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            📥 첨부파일 (1) 다운로드
                                                        </a>
                                                    </div>
                                                )}
                                                
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button onClick={() => handleApproveOnboarding(p)} title="이 버튼을 누르면 원장님 전용 DB가 자동으로 세팅되며 카톡 알림이 전송됩니다." style={{ flex: 1, padding: '10px', background: '#3B82F6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem' }}>
                                                        ✅ 승인 및 ID 발급
                                                    </button>
                                                    <button onClick={() => handleRejectOnboarding(p)} title="가짜 신청이거나 중복 신청일 경우 거절합니다." style={{ padding: '10px 16px', background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                                                        ❌ 반려
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 기존 스튜디오 목록 */}
                            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#ccc' }}>등록된 스튜디오 목록</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
                                {studios.map(studio => {
                                    const isCurrent = studio.id === currentStudioId;
                                    return (
                                        <div key={studio.id} style={{ background: isCurrent ? 'rgba(212, 175, 55, 0.06)' : 'rgba(255,255,255,0.03)', border: isCurrent ? '2px solid rgba(212, 175, 55, 0.4)' : '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '20px', position: 'relative', cursor: 'pointer' }} onClick={() => handleSwitch(studio)} title={`클릭하면 이 화면 전체가 [${studio.name}]의 데이터로 탈바꿈합니다.`}>
                                            {isCurrent && <div style={{ position: 'absolute', top: '12px', right: '12px', fontSize: '0.7rem', padding: '3px 8px', borderRadius: '12px', background: '#D4AF37', color: '#000', fontWeight: '700' }}>현재 접속중</div>}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                                                <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: studio.logoUrl ? '#ffffff' : 'linear-gradient(135deg, #3B82F6, #8B5CF6)', boxShadow: studio.logoUrl ? '0 4px 12px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255,255,255,0.1)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '1.2rem', color: 'white', flexShrink: 0, overflow: 'hidden', padding: studio.logoUrl ? '4px' : '0' }}>
                                                    {studio.logoUrl ? <img src={studio.logoUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt={`${studio.name} 로고`} /> : (studio.name?.substring(0, 1) || '?')}
                                                </div>
                                                <div style={{ minWidth: 0 }}>
                                                    <div style={{ fontWeight: '800', fontSize: '1.15rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.3px' }}>{studio.name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: '#888' }}>{studio.id}</div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                                                <span style={{ fontSize: '0.7rem', padding: '3px 8px', borderRadius: '10px', background: `${statusColors[studio.status]}22`, color: statusColors[studio.status], fontWeight: '600' }}>{statusLabels[studio.status] || studio.status}</span>
                                                <span style={{ fontSize: '0.7rem', padding: '3px 8px', borderRadius: '10px', background: `${planColors[studio.plan]}22`, color: planColors[studio.plan], fontWeight: '600' }}>{planLabels[studio.plan] || studio.plan}</span>
                                                
                                                <div 
                                                    onClick={(e) => { e.stopPropagation(); handleUpdateDate(studio); }}
                                                    style={{ 
                                                        marginLeft: 'auto', 
                                                        fontSize: '0.7rem', 
                                                        color: '#aaa', 
                                                        background: 'rgba(255,255,255,0.05)', 
                                                        padding: '3px 8px', 
                                                        borderRadius: '6px', 
                                                        cursor: 'pointer',
                                                        border: '1px solid rgba(255,255,255,0.1)'
                                                    }}
                                                    title="클릭하여 시작(생성) 날짜를 수정합니다."
                                                >
                                                    🗓️ 시작일: {studio.createdAt ? new Date(studio.createdAt).toLocaleDateString('ko-KR') : '날짜 없음'}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#888' }}>
                                                <span>{studio.ownerEmail}</span>
                                                <div style={{ display: 'flex', gap: '4px' }} onClick={e => e.stopPropagation()}>
                                                    <button onClick={() => handleCopyStudioLink(studio)} title={`[링크 복사] 이 스튜디오 전용 관리자 접속 주소를 복사하여 원장님 카카오톡으로 전달하세요.`} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copiedStudioId === studio.id ? '#10B981' : '#A78BFA', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        {copiedStudioId === studio.id ? <Check size={18} /> : <Copy size={18} />}
                                                    </button>
                                                    <button onClick={() => handleDelete(studio)} title={`[가입 해지] 이 요가원을 플랫폼 목록에서 아예 삭제합니다.`} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', padding: '4px' }}><Trash size={18} /></button>
                                                </div>
                                            </div>
                                            {(studio.scheduleUrls && studio.scheduleUrls.length > 0) ? (
                                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }} onClick={e => e.stopPropagation()}>
                                                    {studio.scheduleUrls.map((url, i) => (
                                                        <a key={i} href={url} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#10B981', background: 'rgba(16,185,129,0.1)', padding: '4px 10px', borderRadius: '4px', textDecoration: 'none' }}>📦 가입 첨부파일 {i + 1} 다운로드</a>
                                                    ))}
                                                </div>
                                            ) : (studio.scheduleUrl && (
                                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }} onClick={e => e.stopPropagation()}>
                                                    <a href={studio.scheduleUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#10B981', background: 'rgba(16,185,129,0.1)', padding: '4px 10px', borderRadius: '4px', textDecoration: 'none' }}>📦 가입 첨부파일 다운로드</a>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </>
            )}

            {/* ═══ ADMINS ═══ */}
            {activeSection === 'admins' && (
                <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#ccc' }}>관리자 계정</h2>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={loadAdmins} style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#aaa', cursor: 'pointer', fontSize: '0.85rem' }}>새로고침</button>
                            <button onClick={() => { setShowAddAdmin(true); setCreatedResetLink(null); }} style={{ padding: '8px 16px', background: '#10B981', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <UserCirclePlus size={18} /> 새 관리자
                            </button>
                        </div>
                    </div>

                    {/* 관리자 흐름 안내 */}
                    <div style={{ marginBottom: '20px', padding: '16px 20px', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '12px', color: '#e2e8f0', lineHeight: '1.6', fontSize: '0.85rem' }}>
                        <div style={{ fontWeight: '700', fontSize: '0.95rem', color: '#60A5FA', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <ShieldCheck size={18} /> 새 관리자 추가 순서 (슈퍼어드민 숨김 방식)
                        </div>
                        <ol style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <li>우측 상단의 <strong>[+ 새 관리자]</strong> 버튼 클릭</li>
                            <li>이메일과 담당 업장만 선택하고 "생성하기" 클릭 (비밀번호 입력란 없음)</li>
                            <li>성공하면 화면에 <strong>"비밀번호 설정 링크"</strong> 생성</li>
                            <li>이 링크 복사 버튼을 눌러서 해당 원장님께 카톡/문자로 전달</li>
                            <li>원장님이 링크를 누르면 본인이 직접 사용할 비밀번호를 입력하고 저장</li>
                            <li>원장님은 설정한 비밀번호로 본인 업장에 로그인 (자신만의 단독 앱이라 인식)</li>
                        </ol>
                    </div>

                    {adminsLoading ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>조회 중...</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {admins.map(a => (
                                <div key={a.uid} style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                                        <div>
                                            <div style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '4px' }}>{a.displayName || a.email}</div>
                                            <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '6px' }}>{a.email}</div>
                                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '8px', background: a.role === 'superadmin' ? 'rgba(212, 175, 55, 0.15)' : a.role === 'admin' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: a.role === 'superadmin' ? '#D4AF37' : a.role === 'admin' ? '#3B82F6' : '#EF4444', fontWeight: '600' }}>
                                                    {a.role === 'superadmin' ? '👑 슈퍼어드민' : a.role === 'admin' ? '🔒 관리자' : '⚠️ 미설정'}
                                                </span>
                                                {a.studioId && <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: '#888' }}>{a.studioId}</span>}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button onClick={() => { setResetPasswordUid(a.uid); setNewPassword(''); }} style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#aaa', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Lock size={14} /> 비번 변경
                                            </button>
                                            {a.role !== 'superadmin' && (
                                                <button onClick={() => {
                                                    const sid = prompt('담당 업장 ID:', a.studioId || '');
                                                    if (sid !== null) handleSetClaims(a.email, 'admin', sid);
                                                }} style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#aaa', cursor: 'pointer', fontSize: '0.8rem' }}>업장 변경</button>
                                            )}
                                            {a.role !== 'superadmin' && (
                                                <button onClick={() => handleDeleteAdmin(a)} style={{ padding: '6px 12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '6px', color: '#EF4444', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <Trash size={14} /> 삭제
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {resetPasswordUid === a.uid && (
                                        <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <div style={{ position: 'relative', flex: 1 }}>
                                                <input type={showPassword[a.uid] ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="새 비밀번호 (6자 이상)" style={{ ...inputStyle, paddingRight: '36px' }} />
                                                <button onClick={() => setShowPassword(p => ({ ...p, [a.uid]: !p[a.uid] }))} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>
                                                    {showPassword[a.uid] ? <EyeSlash size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                            <button onClick={handleResetPassword} disabled={resetting} style={{ padding: '10px 16px', background: resetting ? '#555' : '#EF4444', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: resetting ? 'not-allowed' : 'pointer', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                                                {resetting ? '...' : '변경'}
                                            </button>
                                            <button onClick={() => setResetPasswordUid(null)} style={{ padding: '10px', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '8px', color: '#888', cursor: 'pointer' }}><X size={16} /></button>
                                        </div>
                                    )}

                                    <div style={{ marginTop: '8px', fontSize: '0.7rem', color: '#555' }}>
                                        마지막 로그인: {a.lastSignIn ? new Date(a.lastSignIn).toLocaleString('ko-KR') : '없음'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* ═══ ADD ADMIN MODAL ═══ */}
            {showAddAdmin && (
                <div className="modal-overlay" role="dialog" aria-modal="true">
                    <div className="modal-content" style={{ maxWidth: '480px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2 style={{ margin: 0, fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <UserCirclePlus size={24} color="#10B981" /> 새 관리자 추가
                            </h2>
                            <button onClick={() => { setShowAddAdmin(false); setCreatedResetLink(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}><X size={24} /></button>
                        </div>

                        {/* 링크가 생성되었으면 결과 화면 */}
                        {createdResetLink ? (
                            <div>
                                <div style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '10px', marginBottom: '16px' }}>
                                    <div style={{ fontWeight: '700', color: '#10B981', marginBottom: '8px' }}>✅ 관리자 계정 생성 완료!</div>
                                    <div style={{ fontSize: '0.85rem', color: '#aaa' }}>아래 링크를 관리자에게 전달하세요.<br />관리자가 링크를 클릭하면 직접 비밀번호를 설정할 수 있습니다.</div>
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <input readOnly value={createdResetLink} style={{ ...inputStyle, paddingRight: '50px', fontSize: '0.8rem', color: '#8ab4f8' }} />
                                    <button onClick={handleCopyLink} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: copied ? '#10B981' : '#3B82F6', border: 'none', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}>
                                        {copied ? <><Check size={14} /> 복사됨</> : <><Copy size={14} /> 복사</>}
                                    </button>
                                </div>
                                <button onClick={() => { setShowAddAdmin(false); setCreatedResetLink(null); setAddForm({ email: '', displayName: '', role: 'admin', studioId: '' }); }} style={{ width: '100%', marginTop: '20px', padding: '12px', background: '#3B82F6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '0.95rem' }}>완료</button>
                            </div>
                        ) : (
                            <>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div>
                                        <label style={labelStyle}>이메일 *</label>
                                        <input value={addForm.email} onChange={e => setAddForm({ ...addForm, email: e.target.value })} placeholder="admin@studio.com" style={inputStyle} />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>표시 이름</label>
                                        <input value={addForm.displayName} onChange={e => setAddForm({ ...addForm, displayName: e.target.value })} placeholder="예: 김원장" style={inputStyle} />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>역할 *</label>
                                        <select value={addForm.role} onChange={e => setAddForm({ ...addForm, role: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }}>
                                            <option value="admin">🔒 일반 관리자 (특정 업장만)</option>
                                            <option value="superadmin">👑 슈퍼어드민 (모든 업장)</option>
                                        </select>
                                    </div>
                                    {addForm.role === 'admin' && (
                                        <div>
                                            <label style={labelStyle}>담당 업장 *</label>
                                            <select value={addForm.studioId} onChange={e => setAddForm({ ...addForm, studioId: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }}>
                                                <option value="">업장 선택...</option>
                                                {studios.map(s => <option key={s.id} value={s.id}>{s.name} ({s.id})</option>)}
                                            </select>
                                        </div>
                                    )}
                                    <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', fontSize: '0.8rem', color: '#888' }}>
                                        🔐 비밀번호는 관리자가 직접 설정합니다. 생성 후 비밀번호 설정 링크가 제공됩니다.
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
                                    <button onClick={() => setShowAddAdmin(false)} style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#aaa', cursor: 'pointer' }}>취소</button>
                                    <button onClick={handleAddAdmin} disabled={adding} style={{ padding: '10px 24px', background: adding ? '#555' : '#10B981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: adding ? 'not-allowed' : 'pointer' }}>
                                        {adding ? '생성중...' : '✅ 생성하기'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ═══ REGISTER STUDIO MODAL ═══ */}
            {showRegister && (
                <div className="modal-overlay" role="dialog" aria-modal="true">
                    <div className="modal-content" style={{ maxWidth: '480px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2 style={{ margin: 0, fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '8px' }}><Buildings size={24} color="#3B82F6" /> 새 스튜디오 등록</h2>
                            <button onClick={() => setShowRegister(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}><X size={24} /></button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={labelStyle}>스튜디오 ID *</label>
                                <input value={registerForm.studioId} onChange={e => setRegisterForm({ ...registerForm, studioId: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} placeholder="예: namaste-yoga" style={inputStyle} />
                                <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '4px' }}>영문 소문자, 숫자, 하이픈만 가능</div>
                            </div>
                            <div>
                                <label style={labelStyle}>스튜디오 이름 *</label>
                                <input value={registerForm.name} onChange={e => setRegisterForm({ ...registerForm, name: e.target.value })} placeholder="예: 나마스테 요가" style={inputStyle} />
                            </div>

                            <div>
                                <label style={labelStyle}>관리자 이메일 *</label>
                                <input type="email" value={registerForm.ownerEmail} onChange={e => setRegisterForm({ ...registerForm, ownerEmail: e.target.value })} placeholder="admin@namaste.yoga" style={inputStyle} />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '28px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowRegister(false)} style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#aaa', cursor: 'pointer' }}>취소</button>
                            <button onClick={handleRegister} disabled={registering} style={{ padding: '10px 24px', background: registering ? '#555' : '#3B82F6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: registering ? 'not-allowed' : 'pointer' }}>
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
