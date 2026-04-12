import { useState, useEffect } from 'react';
import { Buildings, Plus, Trash, Crown, X, UserCirclePlus, Lock, ShieldCheck, Eye, EyeSlash, Copy, Check, Globe, LinkSimple, ChatCircleDots, EnvelopeOpen, Translate } from '@phosphor-icons/react';
import { getFirestore, collection, query, orderBy, limit, getDocs, doc, updateDoc } from 'firebase/firestore';
import { studioRegistryService } from '../services/studioRegistryService';
import { getCurrentStudioId } from '../utils/resolveStudioId';
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

    // 문의 메시지
    const [inquiries, setInquiries] = useState([]);
    const [inquiriesLoading, setInquiriesLoading] = useState(false);
    const [translating, setTranslating] = useState({});

    useEffect(() => { loadStudios(); }, []);

    const loadInquiries = async () => {
        setInquiriesLoading(true);
        try {
            const db = getFirestore();
            const q = query(collection(db, 'inquiries'), orderBy('createdAt', 'desc'), limit(50));
            const snap = await getDocs(q);
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setInquiries(list);
        } catch (e) {
            console.error('문의 로딩 실패:', e);
        }
        setInquiriesLoading(false);
    };

    const handleTranslate = async (inq) => {
        setTranslating(p => ({ ...p, [inq.id]: true }));
        try {
            const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=ko&dt=t&q=${encodeURIComponent(inq.message)}`);
            const data = await res.json();
            const translated = data[0].map(s => s[0]).join('');
            setInquiries(prev => prev.map(i => i.id === inq.id ? { ...i, translatedMessage: translated } : i));
        } catch (e) {
            console.error('번역 실패:', e);
        }
        setTranslating(p => ({ ...p, [inq.id]: false }));
    };

    const handleMarkRead = async (inqId) => {
        try {
            const db = getFirestore();
            await updateDoc(doc(db, 'inquiries', inqId), { status: 'read' });
            setInquiries(prev => prev.map(i => i.id === inqId ? { ...i, status: 'read' } : i));
        } catch (e) { console.error(e); }
    };

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
        // [FIX] 원장님께 전달하는 링크는 독립 도메인이 있다면 해당 도메인을 제공해야 합니다.
        let link;
        if (studio.domain) {
            link = studio.domain.startsWith('http') ? `${studio.domain}/admin` : `https://${studio.domain}/admin`;
        } else {
            // 커스텀 도메인이 없는 옛날/베이직 티어의 경우
            link = `https://passflowai.web.app/admin?studio=${studio.id}`;
        }
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
        // [FIX] 슈퍼어드민(본사)이 눌러서 들어가는 경우, 현재 접속 중인 도메인(passflowai.web.app)을
        // 그대로 유지해야 슈퍼어드민 로그인 세션(권한)이 끊기지 않습니다.
        // 독립 도메인(ssangmunyoga.web.app)으로 튕겨버리면 로그아웃 상태가 되어 접근 거부가 뜹니다.
        // 파라미터 기반 라우팅을 사용하여 동일 도메인에서 데이터만 해당 스튜디오로 갈아끼웁니다.
        window.open(`/admin?studio=${studio.id}`, '_blank');
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '8px' }}>
                        <img src="/assets/passflow_square_logo.png" alt="정사각형 로고" style={{ height: '32px', borderRadius: '6px', boxShadow: '0 0 10px rgba(212, 175, 55, 0.3)' }} />
                        <div style={{ width: '130px', height: '34px', display: 'flex', alignItems: 'center', overflow: 'hidden', position: 'relative' }}>
                            <img src="/assets/passflow_ai_logo_transparent.png" alt="가로형 로고" style={{ position: 'absolute', height: '100px', left: '-5px', maxWidth: 'none', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }} />
                        </div>
                    </div>
                    <span style={{ fontSize: '0.8rem', padding: '4px 10px', borderRadius: '20px', background: 'rgba(212, 175, 55, 0.15)', color: '#D4AF37', fontWeight: '600' }}>플랫폼 관리</span>
                </div>
            </div>

            {/* Section Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
                <button onClick={() => setActiveSection('studios')} style={{ padding: '10px 20px', background: activeSection === 'studios' ? '#3B82F6' : 'rgba(255,255,255,0.05)', color: activeSection === 'studios' ? 'white' : '#aaa', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Buildings size={18} /> 스튜디오
                </button>
                <button onClick={() => { setActiveSection('admins'); if (admins.length === 0) loadAdmins(); }} style={{ padding: '10px 20px', background: activeSection === 'admins' ? '#3B82F6' : 'rgba(255,255,255,0.05)', color: activeSection === 'admins' ? 'white' : '#aaa', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldCheck size={18} /> 관리자 계정
                </button>
                <button onClick={() => setActiveSection('domains')} style={{ padding: '10px 20px', background: activeSection === 'domains' ? '#3B82F6' : 'rgba(255,255,255,0.05)', color: activeSection === 'domains' ? 'white' : '#aaa', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Globe size={18} /> 도메인 관리
                </button>
                <button onClick={() => { setActiveSection('inquiries'); if (inquiries.length === 0) loadInquiries(); }} style={{ padding: '10px 20px', background: activeSection === 'inquiries' ? '#8B5CF6' : 'rgba(255,255,255,0.05)', color: activeSection === 'inquiries' ? 'white' : '#aaa', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px', position: 'relative' }}>
                    <ChatCircleDots size={18} /> 문의 메시지
                    {inquiries.filter(i => i.status === 'new').length > 0 && (
                        <span style={{ position: 'absolute', top: '-4px', right: '-4px', width: '18px', height: '18px', borderRadius: '50%', background: '#EF4444', color: '#fff', fontSize: '0.65rem', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{inquiries.filter(i => i.status === 'new').length}</span>
                    )}
                </button>
                
                <button onClick={() => window.open('https://analytics.google.com/analytics/web/#/p518971396/reports/intelligenthome', '_blank')} style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #10B981, #059669)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }} title="Passflow Ai 및 요가원 방문자 트래픽 통계를 확인합니다">
                    📊 방문자 통계 (GA4)
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
                                                {p.language && p.language !== 'ko' && <div style={{ fontSize: '0.75rem', marginBottom: '4px' }}><span style={{ padding: '2px 8px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', fontWeight: '600' }}>{p.language === 'en' ? '🇺🇸 English' : p.language === 'ja' ? '🇯🇵 日本語' : p.language === 'in' ? '🇮🇳 India' : `🌐 ${p.language}`}</span></div>}
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
                                                <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: studio.logoUrl ? 'rgba(255, 255, 255, 0.85)' : 'linear-gradient(135deg, #3B82F6, #8B5CF6)', boxShadow: studio.logoUrl ? '0 4px 12px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255,255,255,0.1)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '1.2rem', color: 'white', flexShrink: 0, overflow: 'hidden', padding: studio.logoUrl ? '4px' : '0' }}>
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
                                            {/* Trial 남은 기간 + 사용량 */}
                                            {studio.status === 'trial' && studio.trialEndDate && (() => {
                                                const daysLeft = Math.ceil((new Date(studio.trialEndDate) - new Date()) / (1000*60*60*24));
                                                const isExpired = daysLeft <= 0;
                                                const isUrgent = daysLeft <= 14 && daysLeft > 0;
                                                return (
                                                    <div style={{ marginTop: '10px', padding: '8px 12px', borderRadius: '8px', background: isExpired ? 'rgba(239,68,68,0.1)' : isUrgent ? 'rgba(245,158,11,0.1)' : 'rgba(74,222,128,0.06)', border: `1px solid ${isExpired ? 'rgba(239,68,68,0.3)' : isUrgent ? 'rgba(245,158,11,0.3)' : 'rgba(74,222,128,0.2)'}`, fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ color: isExpired ? '#EF4444' : isUrgent ? '#F59E0B' : '#4ade80', fontWeight: '700' }}>
                                                            {isExpired ? '⛔ 체험 만료' : `⏰ 체험 D-${daysLeft}`}
                                                        </span>
                                                        <span style={{ color: '#888' }}>
                                                            👥 회원 {studio.memberCount || 0}명
                                                        </span>
                                                    </div>
                                                );
                                            })()}
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

            {/* ═══ DOMAINS (도메인 보관 리스트) ═══ */}
            {activeSection === 'domains' && (
                <>
                    <div style={{ marginBottom: '20px' }}>
                        <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(99, 102, 241, 0.03))', borderRadius: '10px', border: '1px solid rgba(99, 102, 241, 0.2)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Globe size={20} weight="fill" color="#6366F1" />
                            <span style={{ fontSize: '0.85rem', color: '#a5b4fc' }}>선점 완료된 Firebase Hosting 도메인 목록입니다. 다른 사용자가 절대 가져갈 수 없습니다.</span>
                        </div>
                    </div>

                    {/* 운영 중인 도메인 */}
                    <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#10B981', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <LinkSimple size={18} weight="bold" /> 운영 중 (Active)
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '10px', marginBottom: '28px' }}>
                        {[
                            { name: '복샘요가', siteId: 'boksaem-yoga', url: 'boksaem-yoga.web.app', active: true },
                            { name: '쌍문요가', siteId: 'ssangmunyoga', url: 'ssangmunyoga.web.app', active: true },
                            { name: 'PassFlow Ai', siteId: 'passflowai', url: 'passflowai.web.app', active: true },
                        ].map(d => (
                            <div key={d.siteId} style={{ padding: '14px 16px', background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#f0f0f0' }}>{d.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#6ee7b7', marginTop: '2px' }}>{d.url}</div>
                                </div>
                                <span style={{ fontSize: '0.7rem', padding: '3px 8px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', fontWeight: '600' }}>운영중</span>
                            </div>
                        ))}
                    </div>

                    {/* 보관 중인 도메인 (선점만) */}
                    <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#F59E0B', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Lock size={18} weight="bold" /> 선점 보관 중 (Reserved)
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '10px', marginBottom: '28px' }}>
                        {[
                            { name: '복샘요가 (붙임)', siteId: 'boksaemyoga', url: 'boksaemyoga.web.app' },
                            { name: '쌍문요가', siteId: 'ssangmunyoga', url: 'ssangmunyoga.web.app' },
                            { name: '마포요가', siteId: 'mapo-yoga', url: 'mapo-yoga.web.app' },
                            { name: '마포요가 (붙임)', siteId: 'mapoyoga', url: 'mapoyoga.web.app' },
                            { name: '공덕요가', siteId: 'gongdeok-yoga', url: 'gongdeok-yoga.web.app' },
                            { name: '공덕요가 (붙임)', siteId: 'gongdeokyoga', url: 'gongdeokyoga.web.app' },
                            { name: '아현요가', siteId: 'ahyeon-yoga', url: 'ahyeon-yoga.web.app' },
                            { name: '아현요가 (붙임)', siteId: 'ahyeonyoga', url: 'ahyeonyoga.web.app' },
                            { name: '이대요가', siteId: 'ewha-yoga', url: 'ewha-yoga.web.app' },
                            { name: '이대요가 (붙임)', siteId: 'ewhayoga', url: 'ewhayoga.web.app' },
                            { name: '신촌요가', siteId: 'sinchon-yoga', url: 'sinchon-yoga.web.app' },
                            { name: '신촌요가 (붙임)', siteId: 'sinchonyoga', url: 'sinchonyoga.web.app' },
                            { name: '홍대요가', siteId: 'hongdae-yoga', url: 'hongdae-yoga.web.app' },
                            { name: '홍대요가 (붙임)', siteId: 'hongdaeyoga', url: 'hongdaeyoga.web.app' },
                            { name: '망원요가', siteId: 'mangwon-yoga', url: 'mangwon-yoga.web.app' },
                            { name: '망원요가 (붙임)', siteId: 'mangwonyoga', url: 'mangwonyoga.web.app' },
                            { name: '합정요가', siteId: 'hapjeong-yoga', url: 'hapjeong-yoga.web.app' },
                            { name: '합정요가 (붙임)', siteId: 'hapjeongyoga', url: 'hapjeongyoga.web.app' },
                            { name: '애오개요가', siteId: 'aeogae-yoga', url: 'aeogae-yoga.web.app' },
                            { name: '애오개요가 (붙임)', siteId: 'aeogaeyoga', url: 'aeogaeyoga.web.app' },
                            { name: '여의도요가', siteId: 'yeouido-yoga', url: 'yeouido-yoga.web.app' },
                            { name: '여의도요가 (붙임)', siteId: 'yeoidoyoga', url: 'yeoidoyoga.web.app' },
                            { name: 'PassFlow 랜딩', siteId: 'passflow-landing', url: 'passflow-landing.web.app' },
                        ].map(d => (
                            <div key={d.siteId} style={{ padding: '14px 16px', background: 'rgba(245, 158, 11, 0.04)', border: '1px solid rgba(245, 158, 11, 0.12)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontWeight: '600', fontSize: '0.85rem', color: '#d1d5db' }}>{d.name}</div>
                                    <div style={{ fontSize: '0.72rem', color: '#78716c', marginTop: '2px' }}>{d.url}</div>
                                </div>
                                <span style={{ fontSize: '0.7rem', padding: '3px 8px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B', fontWeight: '600' }}>보관</span>
                            </div>
                        ))}
                    </div>

                    <div style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', fontSize: '0.78rem', color: '#6b7280', lineHeight: 1.7 }}>
                        <div style={{ fontWeight: '700', color: '#9ca3af', marginBottom: '4px' }}>📌 도메인 관리 안내</div>
                        <div>• 모든 도메인은 Firebase Hosting에 선점 등록되어, 외부인이 동일 이름으로 사이트를 만들 수 없습니다.</div>
                        <div>• '보관' 상태의 도메인은 아직 앱이 배포되지 않은 상태이며, 고객 온보딩 시 즉시 활성화됩니다.</div>
                        <div>• <strong>ssangmun-yoga</strong> (하이픈 포함)는 타 프로젝트에 선점되어 있어 <strong>ssangmunyoga</strong>로 운영 중입니다.</div>
                    </div>
                </>
            )}

            {/* ═══ INQUIRIES ═══ */}
            {activeSection === 'inquiries' && (
                <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h2 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ChatCircleDots size={24} color="#8B5CF6" weight="duotone" /> 해외 고객 문의 메시지
                        </h2>
                        <button onClick={loadInquiries} style={{ padding: '8px 16px', background: 'rgba(139,92,246,0.15)', color: '#8B5CF6', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>
                            🔄 새로고침
                        </button>
                    </div>

                    {inquiriesLoading ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>로딩 중...</div>
                    ) : inquiries.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <ChatCircleDots size={48} color="#555" weight="duotone" />
                            <p style={{ color: '#888', marginTop: '12px' }}>아직 접수된 문의가 없습니다.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {inquiries.map(inq => (
                                <div key={inq.id} style={{ padding: '20px', background: inq.status === 'new' ? 'rgba(139,92,246,0.06)' : 'rgba(255,255,255,0.02)', border: `1px solid ${inq.status === 'new' ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.06)'}`, borderRadius: '14px', position: 'relative' }}>
                                    {/* Header */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {inq.status === 'new' && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444', animation: 'pulse 1.5s infinite' }} />}
                                            <span style={{ fontWeight: '700', color: '#e0e0e0', fontSize: '0.95rem' }}>{inq.email}</span>
                                            <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '8px', background: 'rgba(99,102,241,0.15)', color: '#6366f1' }}>{inq.lang?.toUpperCase()}</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.75rem', color: '#666' }}>
                                                {inq.createdAt?.toDate ? inq.createdAt.toDate().toLocaleString('ko-KR') : '시간 미상'}
                                            </span>
                                            {inq.status === 'new' && (
                                                <button onClick={() => handleMarkRead(inq.id)} style={{ padding: '4px 10px', fontSize: '0.72rem', background: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
                                                    ✅ 읽음
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Original message */}
                                    <div style={{ padding: '14px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', marginBottom: '8px' }}>
                                        <div style={{ fontSize: '0.72rem', color: '#888', marginBottom: '6px', fontWeight: '600' }}>💬 원문</div>
                                        <p style={{ margin: 0, color: '#d1d5db', fontSize: '0.9rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{inq.message}</p>
                                    </div>

                                    {/* Translation */}
                                    {inq.translatedMessage ? (
                                        <div style={{ padding: '14px', background: 'rgba(139,92,246,0.05)', borderRadius: '10px', border: '1px solid rgba(139,92,246,0.1)' }}>
                                            <div style={{ fontSize: '0.72rem', color: '#8B5CF6', marginBottom: '6px', fontWeight: '600' }}>🇰🇷 한국어 번역</div>
                                            <p style={{ margin: 0, color: '#e0e0e0', fontSize: '0.9rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{inq.translatedMessage}</p>
                                        </div>
                                    ) : (
                                        <button onClick={() => handleTranslate(inq)} disabled={translating[inq.id]}
                                            style={{ padding: '8px 14px', fontSize: '0.8rem', background: 'rgba(139,92,246,0.1)', color: '#8B5CF6', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Translate size={16} /> {translating[inq.id] ? '번역 중...' : '한국어로 번역'}
                                        </button>
                                    )}

                                    {/* Reply action */}
                                    <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        <a href={`mailto:${inq.email}?subject=Re: PassFlow AI Inquiry`} target="_blank" rel="noopener noreferrer"
                                            style={{ padding: '8px 14px', fontSize: '0.8rem', background: 'rgba(59,130,246,0.1)', color: '#3B82F6', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '8px', textDecoration: 'none', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <EnvelopeOpen size={16} /> 이메일로 답변
                                        </a>
                                        <button onClick={() => { navigator.clipboard.writeText(inq.email); }}
                                            style={{ padding: '8px 14px', fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)', color: '#aaa', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Copy size={16} /> 이메일 복사
                                        </button>
                                        {inq.page && (
                                            <span style={{ fontSize: '0.72rem', color: '#555', alignSelf: 'center' }}>📍 {inq.page}</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <style>{`@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
                </>
            )}
        </div>
    );
};

export default SuperAdminPage;
