import { useLanguageStore } from '../stores/useLanguageStore';
import { useState, useEffect } from 'react';
import { Buildings, Plus, Trash, Crown, X, UserCirclePlus, Lock, ShieldCheck, Eye, EyeSlash, Copy, Check, Globe, LinkSimple, ChatCircleDots, EnvelopeOpen, Translate } from '@phosphor-icons/react';
import { getFirestore, collection, query, orderBy, limit, getDocs, doc, updateDoc } from 'firebase/firestore';
import { studioRegistryService } from '../services/studioRegistryService';
import { getCurrentStudioId } from '../utils/resolveStudioId';
import { useStudioConfig } from '../contexts/StudioContext';
import { functions, auth } from '../firebase';
import { httpsCallable } from 'firebase/functions';
const SuperAdminPage = () => {
  const t = useLanguageStore(s => s.t);
  const {
    config
  } = useStudioConfig();
  const [studios, setStudios] = useState([]);
  const [pendingStudios, setPendingStudios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [currentStudioId, setCurrentStudioId] = useState(() => getCurrentStudioId());
  const [registerForm, setRegisterForm] = useState({
    studioId: '',
    name: '',
    nameEnglish: '',
    ownerEmail: '',
    domain: ''
  });
  const [registering, setRegistering] = useState(false);
  const [activeSection, setActiveSection] = useState('studios');

  // 관리자 관리
  const [admins, setAdmins] = useState([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [addForm, setAddForm] = useState({
    email: '',
    displayName: '',
    role: 'admin',
    studioId: ''
  });
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
  useEffect(() => {
    loadStudios();
  }, []);
  const loadInquiries = async () => {
    setInquiriesLoading(true);
    try {
      const db = getFirestore();
      const q = query(collection(db, 'platform_inquiries'), orderBy('createdAt', 'desc'), limit(50));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      setInquiries(list);
    } catch (e) {
      console.error(t("g_774275") || t("g_774275") || t("g_774275") || t("g_774275") || t("g_774275") || "\uBB38\uC758 \uB85C\uB529 \uC2E4\uD328:", e);
    }
    setInquiriesLoading(false);
  };
  const handleTranslate = async inq => {
    setTranslating(p => ({
      ...p,
      [inq.id]: true
    }));
    try {
      const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=ko&dt=t&q=${encodeURIComponent(inq.message)}`);
      const data = await res.json();
      const translated = data[0].map(s => s[0]).join('');
      setInquiries(prev => prev.map(i => i.id === inq.id ? {
        ...i,
        translatedMessage: translated
      } : i));
    } catch (e) {
      console.error(t("g_81a184") || t("g_81a184") || t("g_81a184") || t("g_81a184") || t("g_81a184") || "\uBC88\uC5ED \uC2E4\uD328:", e);
    }
    setTranslating(p => ({
      ...p,
      [inq.id]: false
    }));
  };
  const handleMarkRead = async inqId => {
    try {
      const db = getFirestore();
      await updateDoc(doc(db, 'platform_inquiries', inqId), {
        status: 'read'
      });
      setInquiries(prev => prev.map(i => i.id === inqId ? {
        ...i,
        status: 'read'
      } : i));
    } catch (e) {
      console.error(e);
    }
  };
  const loadStudios = async () => {
    setLoading(true);
    const [list, pendingList] = await Promise.all([studioRegistryService.listStudios(), studioRegistryService.listPendingStudios()]);
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
      alert((t("g_84fd49") || t("g_84fd49") || t("g_84fd49") || t("g_84fd49") || t("g_84fd49") || "\uAD00\uB9AC\uC790 \uBAA9\uB85D \uC870\uD68C \uC2E4\uD328: ") + e.message);
    }
    setAdminsLoading(false);
  };
  const handleAddAdmin = async () => {
    if (!addForm.email || !addForm.role) {
      alert(t("g_c5156e") || t("g_c5156e") || t("g_c5156e") || t("g_c5156e") || t("g_c5156e") || "\uC774\uBA54\uC77C\uACFC \uC5ED\uD560\uC740 \uD544\uC218\uC785\uB2C8\uB2E4.");
      return;
    }
    if (addForm.role === 'admin' && !addForm.studioId) {
      alert(t("g_00693f") || t("g_00693f") || t("g_00693f") || t("g_00693f") || t("g_00693f") || "\uC77C\uBC18 \uAD00\uB9AC\uC790\uB294 \uC5C5\uC7A5\uC744 \uC120\uD0DD\uD574\uC57C \uD569\uB2C8\uB2E4.");
      return;
    }
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
        const {
          sendPasswordResetEmail
        } = await import('firebase/auth');
        const actionCodeSettings = {
          url: 'https://passflowai.web.app/auth/action',
          handleCodeInApp: false
        };
        await sendPasswordResetEmail(auth, addForm.email, actionCodeSettings);
      } catch (err) {
        console.error(t("g_1265fc") || t("g_1265fc") || t("g_1265fc") || t("g_1265fc") || t("g_1265fc") || "\uC774\uBA54\uC77C \uC804\uC1A1 \uC2E4\uD328(\uBB34\uC2DC\uB428):", err);
      }
      alert(`${result.data.message}\n\n✅ [완벽한 화이트라벨링 통과]\n해당 원장님께 비밀번호 설정 이메일이 자동 발송되었습니다!\n(혹시 메일이 안 간 경우 화면의 링크를 직접 복사해서 주셔도 됩니다.)`);
      loadAdmins();
    } catch (e) {
      alert((t("g_60c58a") || t("g_60c58a") || t("g_60c58a") || t("g_60c58a") || t("g_60c58a") || "\uC0DD\uC131 \uC2E4\uD328: ") + (e.message || t("g_5eeba8") || t("g_5eeba8") || t("g_5eeba8") || t("g_5eeba8") || t("g_5eeba8") || "\uC624\uB958 \uBC1C\uC0DD"));
    }
    setAdding(false);
  };
  const handleCopyLink = () => {
    navigator.clipboard.writeText(createdResetLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const handleCopyStudioLink = studio => {
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
    if (!newPassword || newPassword.length < 6) {
      alert(t("g_be3a8d") || t("g_be3a8d") || t("g_be3a8d") || t("g_be3a8d") || t("g_be3a8d") || "\uBE44\uBC00\uBC88\uD638\uB294 \uCD5C\uC18C 6\uC790 \uC774\uC0C1\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.");
      return;
    }
    setResetting(true);
    try {
      const fn = httpsCallable(functions, 'resetAdminPasswordCall');
      const result = await fn({
        uid: resetPasswordUid,
        newPassword
      });
      alert(result.data.message);
      setResetPasswordUid(null);
      setNewPassword('');
    } catch (e) {
      alert((t("g_8788a6") || t("g_8788a6") || t("g_8788a6") || t("g_8788a6") || t("g_8788a6") || "\uBE44\uBC00\uBC88\uD638 \uBCC0\uACBD \uC2E4\uD328: ") + e.message);
    }
    setResetting(false);
  };
  const handleSetClaims = async (email, role, studioId) => {
    try {
      const fn = httpsCallable(functions, 'setAdminClaimsCall');
      await fn({
        email,
        role,
        studioId
      });
      alert(`${email} 권한 변경 완료`);
      loadAdmins();
    } catch (e) {
      alert((t("g_3555a9") || t("g_3555a9") || t("g_3555a9") || t("g_3555a9") || t("g_3555a9") || "\uAD8C\uD55C \uBCC0\uACBD \uC2E4\uD328: ") + e.message);
    }
  };
  const handleDeleteAdmin = async adminObj => {
    if (!window.confirm(`정말로 [${adminObj.email}] 관리자 계정을 완전히 삭제하시겠습니까?\n이 작업은 복구할 수 없으며 해당 관리자의 파이어베이스 접속이 즉각 차단됩니다.`)) return;
    setAdminsLoading(true);
    try {
      const fn = httpsCallable(functions, 'deleteAdminCall');
      const result = await fn({
        uid: adminObj.uid
      });
      alert(result.data.message);
      loadAdmins();
    } catch (e) {
      alert((t("g_51acf1") || t("g_51acf1") || t("g_51acf1") || t("g_51acf1") || t("g_51acf1") || "\uC0AD\uC81C \uC2E4\uD328: ") + e.message);
      setAdminsLoading(false);
    }
  };
  const handleRegister = async () => {
    if (!registerForm.studioId || !registerForm.name || !registerForm.ownerEmail) {
      alert(t("g_41817d") || t("g_41817d") || t("g_41817d") || t("g_41817d") || t("g_41817d") || "\uC2A4\uD29C\uB514\uC624 ID, \uC774\uB984, \uAD00\uB9AC\uC790 \uC774\uBA54\uC77C\uC740 \uD544\uC218\uC785\uB2C8\uB2E4.");
      return;
    }
    if (!/^[a-z0-9-]+$/.test(registerForm.studioId)) {
      alert(t("g_4c2636") || t("g_4c2636") || t("g_4c2636") || t("g_4c2636") || t("g_4c2636") || "\uC2A4\uD29C\uB514\uC624 ID\uB294 \uC601\uBB38 \uC18C\uBB38\uC790, \uC22B\uC790, \uD558\uC774\uD508\uB9CC \uAC00\uB2A5\uD569\uB2C8\uB2E4.");
      return;
    }
    setRegistering(true);
    const result = await studioRegistryService.registerStudio(registerForm);
    setRegistering(false);
    if (result.success) {
      alert(result.message);
      setShowRegister(false);
      setRegisterForm({
        studioId: '',
        name: '',
        ownerEmail: '',
        domain: ''
      });
      loadStudios();
    } else alert(result.message);
  };
  const handleApproveOnboarding = async pending => {
    const studioId = prompt(t("g_a27085") || t("g_a27085") || t("g_a27085") || t("g_a27085") || t("g_a27085") || "\u2705 \uC2B9\uC778 \uCC98\uB9AC\uB97C \uC704\uD574 \uBD80\uC5EC\uD560 \uC601\uBB38 \uC2A4\uD29C\uB514\uC624 ID\uB97C \uC785\uB825\uD558\uC138\uC694\n(\uC608: namaste-yoga)", '');
    if (!studioId) return;
    if (!/^[a-z0-9-]+$/.test(studioId)) {
      alert(t("g_483755") || t("g_483755") || t("g_483755") || t("g_483755") || t("g_483755") || "\uC601\uBB38 \uC18C\uBB38\uC790, \uC22B\uC790, \uD558\uC774\uD508\uB9CC \uAC00\uB2A5\uD569\uB2C8\uB2E4.");
      return;
    }
    setLoading(true);
    const result = await studioRegistryService.approveOnboarding(pending.id, studioId, pending.ownerEmail, pending.name);
    if (result.success) {
      try {
        // 1. 관리자 계정 자동 생성 (임시 비번 부여됨) 및 고유 비밀번호 설정 링크(resetLink) 발급
        const fn = httpsCallable(functions, 'createAdminCall');
        const adminResult = await fn({
          email: pending.ownerEmail,
          displayName: pending.name + (t("g_513c81") || t("g_513c81") || t("g_513c81") || t("g_513c81") || t("g_513c81") || " \uC6D0\uC7A5\uB2D8"),
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
          const {
            sendPasswordResetEmail
          } = await import('firebase/auth');
          const actionCodeSettings = {
            url: 'https://passflowai.web.app/auth/action',
            handleCodeInApp: false
          };
          await sendPasswordResetEmail(auth, pending.ownerEmail, actionCodeSettings);
        } catch (err) {
          console.error(t("g_1265fc") || t("g_1265fc") || t("g_1265fc") || t("g_1265fc") || t("g_1265fc") || "\uC774\uBA54\uC77C \uC804\uC1A1 \uC2E4\uD328(\uBB34\uC2DC\uB428):", err);
        }
        alert(`🎉 스튜디오 승인 완료!\n\n1. 원장님 이메일로 접속 설정 안내가 자동 발송되었습니다.\n2. (선택) 화면에 생성된 '직접 연결 주소'를 복사해서 카카오톡으로도 즉시 전달하실 수 있습니다!\n\n접속 즉시 한글판 PassFlow AI 로그인 화면이 펼쳐집니다.`);
      } catch (err) {
        console.error(t("g_ac1c64") || t("g_ac1c64") || t("g_ac1c64") || t("g_ac1c64") || t("g_ac1c64") || "\uACC4\uC815 \uC790\uB3D9 \uC0DD\uC131 \uC5D0\uB7EC:", err);
        alert(`승인은 완료되었으나, 계정 자동 세팅에 실패했습니다.\n[관리자 계정] 탭에서 수동으로 새 관리자 계정을 추가해주세요.\n(사유: ${err.message})`);
      }
      loadStudios();
    } else {
      alert((t("g_032dcd") || t("g_032dcd") || t("g_032dcd") || t("g_032dcd") || t("g_032dcd") || "\uC2B9\uC778 \uC2E4\uD328: ") + result.message);
    }
    setLoading(false);
  };
  const handleRejectOnboarding = async pending => {
    const reason = prompt(t("g_f33e90") || t("g_f33e90") || t("g_f33e90") || t("g_f33e90") || t("g_f33e90") || "\u274C \uBC18\uB824 (\uAC70\uC808) \uC0AC\uC720\uB97C \uC785\uB825\uD558\uC138\uC694 (\uC2E0\uCCAD\uC790\uC5D0\uAC8C \uBC1C\uC1A1 \uC548\uB428, \uAE30\uB85D\uC6A9):", '');
    if (reason === null) return;
    setLoading(true);
    await studioRegistryService.rejectOnboarding(pending.id, reason);
    loadStudios();
  };
  const handleSwitch = studio => {
    // [FIX] 슈퍼어드민(본사)이 눌러서 들어가는 경우, 현재 접속 중인 도메인(passflowai.web.app)을
    // 그대로 유지해야 슈퍼어드민 로그인 세션(권한)이 끊기지 않습니다.
    // 독립 도메인(ssangmunyoga.web.app)으로 튕겨버리면 로그아웃 상태가 되어 접근 거부가 뜹니다.
    // 파라미터 기반 라우팅을 사용하여 동일 도메인에서 데이터만 해당 스튜디오로 갈아끼웁니다.
    window.open(`/admin?studio=${studio.id}`, '_blank');
  };
  const handleDelete = async studio => {
    if (!window.confirm(`정말로 [${studio.name}]을 레지스트리에서 삭제하시겠습니까?\n\n(실제 데이터는 보존됩니다)`)) return;
    await studioRegistryService.deleteStudio(studio.id);
    loadStudios();
  };
  const handleUpdateDate = async studio => {
    const currentDisplay = studio.createdAt ? new Date(studio.createdAt).toISOString().split('T')[0] : '';
    const newDateStr = prompt(`[${studio.name}] 시작 날짜 수정\n\n새 시작 날짜를 입력하세요 (YYYY-MM-DD 형식):`, currentDisplay);
    if (newDateStr === null) return; // 취소

    const timestamp = new Date(newDateStr).getTime();
    if (isNaN(timestamp)) {
      alert(t("g_b4735a") || t("g_b4735a") || t("g_b4735a") || t("g_b4735a") || t("g_b4735a") || "\uC62C\uBC14\uB978 \uB0A0\uC9DC \uD615\uC2DD\uC774 \uC544\uB2D9\uB2C8\uB2E4. (\uC608: 2026-03-31)");
      return;
    }
    const isoString = new Date(newDateStr).toISOString();
    if (window.confirm(`시작 날짜를 ${newDateStr} 로 변경하시겠습니까?`)) {
      const success = await studioRegistryService.updateStudio(studio.id, {
        createdAt: isoString
      });
      if (success) {
        alert(t("g_35401c") || t("g_35401c") || t("g_35401c") || t("g_35401c") || t("g_35401c") || "\uB0A0\uC9DC\uAC00 \uC218\uC815\uB418\uC5C8\uC2B5\uB2C8\uB2E4.");
        loadStudios();
      } else {
        alert(t("g_6cc3ad") || t("g_6cc3ad") || t("g_6cc3ad") || t("g_6cc3ad") || t("g_6cc3ad") || "\uB0A0\uC9DC \uC218\uC815\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.");
      }
    }
  };
  const statusColors = {
    active: '#10B981',
    suspended: '#EF4444',
    trial: '#F59E0B'
  };
  const statusLabels = {
    active: t("g_7b4d79") || t("g_7b4d79") || t("g_7b4d79") || t("g_7b4d79") || t("g_7b4d79") || "\uC6B4\uC601\uC911",
    suspended: t("g_d59db9") || t("g_d59db9") || t("g_d59db9") || t("g_d59db9") || t("g_d59db9") || "\uC815\uC9C0",
    trial: t("g_ab62a0") || t("g_ab62a0") || t("g_ab62a0") || t("g_ab62a0") || t("g_ab62a0") || "\uCCB4\uD5D8"
  };
  const planLabels = {
    free: t("g_667dd4") || t("g_667dd4") || t("g_667dd4") || t("g_667dd4") || t("g_667dd4") || "\uBB34\uB8CC",
    basic: t("g_d58f1c") || t("g_d58f1c") || t("g_d58f1c") || t("g_d58f1c") || t("g_d58f1c") || "\uBCA0\uC774\uC9C1",
    pro: t("g_56fcec") || t("g_56fcec") || t("g_56fcec") || t("g_56fcec") || t("g_56fcec") || "\uD504\uB85C"
  };
  const planColors = {
    free: '#6B7280',
    basic: '#3B82F6',
    pro: '#8B5CF6'
  };
  const inputStyle = {
    width: '100%',
    padding: '12px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '8px',
    color: '#f0f0f0',
    fontSize: '0.95rem',
    boxSizing: 'border-box'
  };
  const labelStyle = {
    display: 'block',
    fontSize: '0.85rem',
    color: '#aaa',
    marginBottom: '6px',
    fontWeight: '600'
  };
  return <div style={{
    minHeight: '100vh',
    background: '#08080A',
    color: '#f0f0f0',
    padding: '24px'
  }}>
            {/* Header */}
            <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px',
      flexWrap: 'wrap',
      gap: '16px'
    }}>
                <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
                    <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginRight: '8px'
        }}>
                        <img src="/assets/passflow_square_logo.png" alt={t("g_4983a8") || t("g_4983a8") || t("g_4983a8") || t("g_4983a8") || t("g_4983a8") || "\uC815\uC0AC\uAC01\uD615 \uB85C\uACE0"} style={{
            height: '32px',
            borderRadius: '6px',
            boxShadow: '0 0 10px rgba(212, 175, 55, 0.3)'
          }} />
                        <div style={{
            width: '130px',
            height: '34px',
            display: 'flex',
            alignItems: 'center',
            overflow: 'hidden',
            position: 'relative'
          }}>
                            <img src="/assets/passflow_ai_logo_transparent.png" alt={t("g_09656c") || t("g_09656c") || t("g_09656c") || t("g_09656c") || t("g_09656c") || "\uAC00\uB85C\uD615 \uB85C\uACE0"} style={{
              position: 'absolute',
              height: '100px',
              left: '-5px',
              maxWidth: 'none',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))'
            }} />
                        </div>
                    </div>
                    <span style={{
          fontSize: '0.8rem',
          padding: '4px 10px',
          borderRadius: '20px',
          background: 'rgba(212, 175, 55, 0.15)',
          color: '#D4AF37',
          fontWeight: '600'
        }}>{t("g_16db03") || t("g_16db03") || t("g_16db03") || t("g_16db03") || t("g_16db03") || "\uD50C\uB7AB\uD3FC \uAD00\uB9AC"}</span>
                </div>
            </div>

            {/* Section Tabs */}
            <div style={{
      display: 'flex',
      gap: '8px',
      marginBottom: '24px',
      flexWrap: 'wrap'
    }}>
                <button onClick={() => setActiveSection('studios')} style={{
        padding: '10px 20px',
        background: activeSection === 'studios' ? '#3B82F6' : 'rgba(255,255,255,0.05)',
        color: activeSection === 'studios' ? 'white' : '#aaa',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: '600',
        fontSize: '0.9rem',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}>
                    <Buildings size={18} />{t("g_e54edb") || t("g_e54edb") || t("g_e54edb") || t("g_e54edb") || t("g_e54edb") || "\uC2A4\uD29C\uB514\uC624"}</button>
                <button onClick={() => {
        setActiveSection('admins');
        if (admins.length === 0) loadAdmins();
      }} style={{
        padding: '10px 20px',
        background: activeSection === 'admins' ? '#3B82F6' : 'rgba(255,255,255,0.05)',
        color: activeSection === 'admins' ? 'white' : '#aaa',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: '600',
        fontSize: '0.9rem',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}>
                    <ShieldCheck size={18} />{t("g_c5529e") || t("g_c5529e") || t("g_c5529e") || t("g_c5529e") || t("g_c5529e") || "\uAD00\uB9AC\uC790 \uACC4\uC815"}</button>
                <button onClick={() => setActiveSection('domains')} style={{
        padding: '10px 20px',
        background: activeSection === 'domains' ? '#3B82F6' : 'rgba(255,255,255,0.05)',
        color: activeSection === 'domains' ? 'white' : '#aaa',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: '600',
        fontSize: '0.9rem',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}>
                    <Globe size={18} />{t("g_99a17a") || t("g_99a17a") || t("g_99a17a") || t("g_99a17a") || t("g_99a17a") || "\uB3C4\uBA54\uC778 \uAD00\uB9AC"}</button>
                <button onClick={() => {
        setActiveSection('inquiries');
        if (inquiries.length === 0) loadInquiries();
      }} style={{
        padding: '10px 20px',
        background: activeSection === 'inquiries' ? '#8B5CF6' : 'rgba(255,255,255,0.05)',
        color: activeSection === 'inquiries' ? 'white' : '#aaa',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: '600',
        fontSize: '0.9rem',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        position: 'relative'
      }}>
                    <ChatCircleDots size={18} />{t("g_cd3560") || t("g_cd3560") || t("g_cd3560") || t("g_cd3560") || t("g_cd3560") || "\uBB38\uC758 \uBA54\uC2DC\uC9C0"}{inquiries.filter(i => i.status === 'new').length > 0 && <span style={{
          position: 'absolute',
          top: '-4px',
          right: '-4px',
          width: '18px',
          height: '18px',
          borderRadius: '50%',
          background: '#EF4444',
          color: '#fff',
          fontSize: '0.65rem',
          fontWeight: '800',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>{inquiries.filter(i => i.status === 'new').length}</span>}
                </button>
                
                <button onClick={() => window.open('https://analytics.google.com/analytics/web/#/p518971396/reports/intelligenthome', '_blank')} style={{
        padding: '10px 20px',
        background: 'linear-gradient(135deg, #10B981, #059669)',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 'bold',
        fontSize: '0.9rem',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        marginLeft: 'auto',
        boxShadow: '0 4px 12px rgba(16,185,129,0.3)'
      }} title={t("g_862e2b") || t("g_862e2b") || t("g_862e2b") || t("g_862e2b") || t("g_862e2b") || "Passflow Ai \uBC0F \uC694\uAC00\uC6D0 \uBC29\uBB38\uC790 \uD2B8\uB798\uD53D \uD1B5\uACC4\uB97C \uD655\uC778\uD569\uB2C8\uB2E4"}>{t("g_3183aa") || t("g_3183aa") || t("g_3183aa") || t("g_3183aa") || t("g_3183aa") || "\uD83D\uDCCA \uBC29\uBB38\uC790 \uD1B5\uACC4 (GA4)"}</button>
            </div>

            {/* ═══ STUDIOS ═══ */}
            {activeSection === 'studios' && <>
                    <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
                        <div style={{
          padding: '12px 16px',
          background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.1), rgba(212, 175, 55, 0.03))',
          borderRadius: '10px',
          border: '1px solid rgba(212, 175, 55, 0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
                            <Buildings size={20} color="#D4AF37" />
                            <span style={{
            fontSize: '0.85rem',
            color: '#999'
          }}>{t("g_dae181") || t("g_dae181") || t("g_dae181") || t("g_dae181") || t("g_dae181") || "\uD604\uC7AC:"}</span>
                            <span style={{
            fontWeight: '700',
            color: '#D4AF37'
          }}>{config.IDENTITY?.NAME || currentStudioId}</span>
                        </div>
                        <button onClick={() => setShowRegister(true)} style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '10px 20px',
          background: '#3B82F6',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontWeight: '600',
          cursor: 'pointer',
          fontSize: '0.9rem'
        }}>
                            <Plus size={18} weight="bold" />{t("g_98d480") || t("g_98d480") || t("g_98d480") || t("g_98d480") || t("g_98d480") || "\uC0C8 \uC2A4\uD29C\uB514\uC624"}</button>
                    </div>
                    {loading ? <div style={{
        textAlign: 'center',
        padding: '60px',
        color: '#666'
      }}>{t("g_74e00a") || t("g_74e00a") || t("g_74e00a") || t("g_74e00a") || t("g_74e00a") || "\uBD88\uB7EC\uC624\uB294 \uC911..."}</div> : <>
                            {/* 신규 가입 심사 대기소 */}
                            {pendingStudios.length > 0 && <div style={{
          marginBottom: '32px',
          padding: '24px',
          background: 'rgba(59, 130, 246, 0.05)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '16px'
        }}>
                                    <h3 style={{
            margin: '0 0 16px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#60A5FA',
            fontSize: '1.2rem'
          }}>
                                        <Crown size={24} weight="fill" />{t("g_3477c1") || t("g_3477c1") || t("g_3477c1") || t("g_3477c1") || t("g_3477c1") || "\uC2E0\uADDC \uAC00\uC785 \uC2EC\uC0AC \uB300\uAE30\uC18C ("}{pendingStudios.length}{t("g_bcbcd4") || t("g_bcbcd4") || t("g_bcbcd4") || t("g_bcbcd4") || t("g_bcbcd4") || "\uAC74)"}<span style={{
              fontSize: '0.8rem',
              color: '#94a3b8',
              fontWeight: 'normal',
              marginLeft: 'auto'
            }}>{t("g_98afca") || t("g_98afca") || t("g_98afca") || t("g_98afca") || t("g_98afca") || "\u2753 \uC0C8\uB85C \uC2E0\uCCAD\uD55C \uC6D0\uC7A5\uB2D8\uB4E4\uC744 \uAC80\uD1A0\uD558\uACE0 \uC2A4\uD29C\uB514\uC624\uB97C \uBC1C\uAE09\uD574\uC8FC\uB294 \uACF5\uAC04\uC785\uB2C8\uB2E4."}</span>
                                    </h3>
                                    <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '16px'
          }}>
                                        {pendingStudios.map(p => <div key={p.id} style={{
              background: 'rgba(0,0,0,0.3)',
              border: '1px dashed rgba(59, 130, 246, 0.4)',
              borderRadius: '12px',
              padding: '16px'
            }}>
                                                <div style={{
                fontWeight: '700',
                fontSize: '1.1rem',
                marginBottom: '4px'
              }}>{p.name} {p.nameEnglish && `(${p.nameEnglish})`}</div>
                                                {p.language && p.language !== 'ko' && <div style={{
                fontSize: '0.75rem',
                marginBottom: '4px'
              }}><span style={{
                  padding: '2px 8px',
                  borderRadius: '10px',
                  background: 'rgba(99, 102, 241, 0.15)',
                  color: '#818cf8',
                  fontWeight: '600'
                }}>{p.language === 'en' ? '🇺🇸 English' : p.language === 'ja' ? '🇯🇵 日本語' : p.language === 'in' ? '🇮🇳 India' : `🌐 ${p.language}`}</span></div>}
                                                <div style={{
                fontSize: '0.85rem',
                color: '#aaa',
                marginBottom: '4px'
              }}>📧 {p.ownerEmail}</div>
                                                <div style={{
                fontSize: '0.85rem',
                color: '#aaa',
                marginBottom: p.scheduleUrl ? '8px' : '16px'
              }}>{t("g_b126c0") || t("g_b126c0") || t("g_b126c0") || t("g_b126c0") || t("g_b126c0") || "\uD83D\uDCE6 \uC694\uAE08\uC81C:"}{p.plan === 'pro' ? t("g_56fcec") || t("g_56fcec") || t("g_56fcec") || t("g_56fcec") || t("g_56fcec") || "\uD504\uB85C" : p.plan === 'basic' ? t("g_d58f1c") || t("g_d58f1c") || t("g_d58f1c") || t("g_d58f1c") || t("g_d58f1c") || "\uBCA0\uC774\uC9C1" : t("g_17292f") || t("g_17292f") || t("g_17292f") || t("g_17292f") || t("g_17292f") || "\uBB34\uB8CC\uCCB4\uD5D8"}</div>
                                                {p.scheduleUrls && p.scheduleUrls.length > 0 && <div style={{
                marginBottom: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                                                        {p.scheduleUrls.map((url, idx) => <a key={idx} href={url} target="_blank" rel="noreferrer" style={{
                  fontSize: '0.85rem',
                  color: '#60A5FA',
                  textDecoration: 'underline',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>{t("g_d053f5") || t("g_d053f5") || t("g_d053f5") || t("g_d053f5") || t("g_d053f5") || "\uD83D\uDCE5 \uCCA8\uBD80\uD30C\uC77C #"}{idx + 1}{t("g_612ca2") || t("g_612ca2") || t("g_612ca2") || t("g_612ca2") || t("g_612ca2") || "\uB2E4\uC6B4\uB85C\uB4DC"}</a>)}
                                                    </div>}
                                                {!p.scheduleUrls && p.scheduleUrl && <div style={{
                marginBottom: '16px'
              }}>
                                                        <a href={p.scheduleUrl} target="_blank" rel="noreferrer" style={{
                  fontSize: '0.85rem',
                  color: '#60A5FA',
                  textDecoration: 'underline',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>{t("g_edb1cf") || t("g_edb1cf") || t("g_edb1cf") || t("g_edb1cf") || t("g_edb1cf") || "\uD83D\uDCE5 \uCCA8\uBD80\uD30C\uC77C (1) \uB2E4\uC6B4\uB85C\uB4DC"}</a>
                                                    </div>}
                                                
                                                <div style={{
                display: 'flex',
                gap: '8px'
              }}>
                                                    <button onClick={() => handleApproveOnboarding(p)} title={t("g_6c3c44") || t("g_6c3c44") || t("g_6c3c44") || t("g_6c3c44") || t("g_6c3c44") || "\uC774 \uBC84\uD2BC\uC744 \uB204\uB974\uBA74 \uC6D0\uC7A5\uB2D8 \uC804\uC6A9 DB\uAC00 \uC790\uB3D9\uC73C\uB85C \uC138\uD305\uB418\uBA70 \uCE74\uD1A1 \uC54C\uB9BC\uC774 \uC804\uC1A1\uB429\uB2C8\uB2E4."} style={{
                  flex: 1,
                  padding: '10px',
                  background: '#3B82F6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}>{t("g_350916") || t("g_350916") || t("g_350916") || t("g_350916") || t("g_350916") || "\u2705 \uC2B9\uC778 \uBC0F ID \uBC1C\uAE09"}</button>
                                                    <button onClick={() => handleRejectOnboarding(p)} title={t("g_0b6761") || t("g_0b6761") || t("g_0b6761") || t("g_0b6761") || t("g_0b6761") || "\uAC00\uC9DC \uC2E0\uCCAD\uC774\uAC70\uB098 \uC911\uBCF5 \uC2E0\uCCAD\uC77C \uACBD\uC6B0 \uAC70\uC808\uD569\uB2C8\uB2E4."} style={{
                  padding: '10px 16px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#EF4444',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}>{t("g_457da6") || t("g_457da6") || t("g_457da6") || t("g_457da6") || t("g_457da6") || "\u274C \uBC18\uB824"}</button>
                                                </div>
                                            </div>)}
                                    </div>
                                </div>}

                            {/* 기존 스튜디오 목록 */}
                            <h3 style={{
          margin: '0 0 16px 0',
          fontSize: '1.1rem',
          color: '#ccc'
        }}>{t("g_963144") || t("g_963144") || t("g_963144") || t("g_963144") || t("g_963144") || "\uB4F1\uB85D\uB41C \uC2A4\uD29C\uB514\uC624 \uBAA9\uB85D"}</h3>
                            <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: '16px'
        }}>
                                {studios.map(studio => {
            const isCurrent = studio.id === currentStudioId;
            return <div key={studio.id} style={{
              background: isCurrent ? 'rgba(212, 175, 55, 0.06)' : 'rgba(255,255,255,0.03)',
              border: isCurrent ? '2px solid rgba(212, 175, 55, 0.4)' : '1px solid rgba(255,255,255,0.08)',
              borderRadius: '14px',
              padding: '20px',
              position: 'relative',
              cursor: 'pointer'
            }} onClick={() => handleSwitch(studio)} title={`클릭하면 이 화면 전체가 [${studio.name}]의 데이터로 탈바꿈합니다.`}>
                                            {isCurrent && <div style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                fontSize: '0.7rem',
                padding: '3px 8px',
                borderRadius: '12px',
                background: '#D4AF37',
                color: '#000',
                fontWeight: '700'
              }}>{t("g_ae1d1f") || t("g_ae1d1f") || t("g_ae1d1f") || t("g_ae1d1f") || t("g_ae1d1f") || "\uD604\uC7AC \uC811\uC18D\uC911"}</div>}
                                            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                marginBottom: '16px'
              }}>
                                                <div style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '12px',
                  background: studio.logoUrl ? 'rgba(255, 255, 255, 0.85)' : 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
                  boxShadow: studio.logoUrl ? '0 4px 12px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255,255,255,0.1)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '800',
                  fontSize: '1.2rem',
                  color: 'white',
                  flexShrink: 0,
                  overflow: 'hidden',
                  padding: studio.logoUrl ? '4px' : '0'
                }}>
                                                    {studio.logoUrl ? <img src={studio.logoUrl} style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain'
                  }} alt={`${studio.name} 로고`} /> : studio.name?.substring(0, 1) || '?'}
                                                </div>
                                                <div style={{
                  minWidth: 0
                }}>
                                                    <div style={{
                    fontWeight: '800',
                    fontSize: '1.15rem',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    letterSpacing: '-0.3px'
                  }}>{studio.name}</div>
                                                    <div style={{
                    fontSize: '0.75rem',
                    color: '#888'
                  }}>{studio.id}</div>
                                                </div>
                                            </div>
                                            <div style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '12px',
                alignItems: 'center',
                flexWrap: 'wrap'
              }}>
                                                <span style={{
                  fontSize: '0.7rem',
                  padding: '3px 8px',
                  borderRadius: '10px',
                  background: `${statusColors[studio.status]}22`,
                  color: statusColors[studio.status],
                  fontWeight: '600'
                }}>{statusLabels[studio.status] || studio.status}</span>
                                                <span style={{
                  fontSize: '0.7rem',
                  padding: '3px 8px',
                  borderRadius: '10px',
                  background: `${planColors[studio.plan]}22`,
                  color: planColors[studio.plan],
                  fontWeight: '600'
                }}>{planLabels[studio.plan] || studio.plan}</span>
                                                
                                                <div onClick={e => {
                  e.stopPropagation();
                  handleUpdateDate(studio);
                }} style={{
                  marginLeft: 'auto',
                  fontSize: '0.7rem',
                  color: '#aaa',
                  background: 'rgba(255,255,255,0.05)',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  border: '1px solid rgba(255,255,255,0.1)'
                }} title={t("g_813c28") || t("g_813c28") || t("g_813c28") || t("g_813c28") || t("g_813c28") || "\uD074\uB9AD\uD558\uC5EC \uC2DC\uC791(\uC0DD\uC131) \uB0A0\uC9DC\uB97C \uC218\uC815\uD569\uB2C8\uB2E4."}>{t("g_9f6303") || t("g_9f6303") || t("g_9f6303") || t("g_9f6303") || t("g_9f6303") || "\uD83D\uDDD3\uFE0F \uC2DC\uC791\uC77C:"}{studio.createdAt ? new Date(studio.createdAt).toLocaleDateString('ko-KR') : t("g_1feee3") || t("g_1feee3") || t("g_1feee3") || t("g_1feee3") || t("g_1feee3") || "\uB0A0\uC9DC \uC5C6\uC74C"}
                                                </div>
                                            </div>
                                            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.8rem',
                color: '#888'
              }}>
                                                <span>{studio.ownerEmail}</span>
                                                <div style={{
                  display: 'flex',
                  gap: '4px'
                }} onClick={e => e.stopPropagation()}>
                                                    <button onClick={() => handleCopyStudioLink(studio)} title={`[링크 복사] 이 스튜디오 전용 관리자 접속 주소를 복사하여 원장님 카카오톡으로 전달하세요.`} style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: copiedStudioId === studio.id ? '#10B981' : '#A78BFA',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                                                        {copiedStudioId === studio.id ? <Check size={18} /> : <Copy size={18} />}
                                                    </button>
                                                    <button onClick={() => handleDelete(studio)} title={`[가입 해지] 이 요가원을 플랫폼 목록에서 아예 삭제합니다.`} style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#EF4444',
                    padding: '4px'
                  }}><Trash size={18} /></button>
                                                </div>
                                            </div>
                                            {/* Trial 남은 기간 + 사용량 */}
                                            {studio.status === 'trial' && studio.trialEndDate && (() => {
                const daysLeft = Math.ceil((new Date(studio.trialEndDate) - new Date()) / (1000 * 60 * 60 * 24));
                const isExpired = daysLeft <= 0;
                const isUrgent = daysLeft <= 14 && daysLeft > 0;
                return <div style={{
                  marginTop: '10px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: isExpired ? 'rgba(239,68,68,0.1)' : isUrgent ? 'rgba(245,158,11,0.1)' : 'rgba(74,222,128,0.06)',
                  border: `1px solid ${isExpired ? 'rgba(239,68,68,0.3)' : isUrgent ? 'rgba(245,158,11,0.3)' : 'rgba(74,222,128,0.2)'}`,
                  fontSize: '0.75rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                                                        <span style={{
                    color: isExpired ? '#EF4444' : isUrgent ? '#F59E0B' : '#4ade80',
                    fontWeight: '700'
                  }}>
                                                            {isExpired ? t("g_5fc089") || t("g_5fc089") || t("g_5fc089") || t("g_5fc089") || t("g_5fc089") || "\u26D4 \uCCB4\uD5D8 \uB9CC\uB8CC" : `⏰ 체험 D-${daysLeft}`}
                                                        </span>
                                                        <span style={{
                    color: '#888'
                  }}>{t("g_162657") || t("g_162657") || t("g_162657") || t("g_162657") || t("g_162657") || "\uD83D\uDC65 \uD68C\uC6D0"}{studio.memberCount || 0}{t("g_7b3c6e") || t("g_7b3c6e") || t("g_7b3c6e") || t("g_7b3c6e") || t("g_7b3c6e") || "\uBA85"}</span>
                                                    </div>;
              })()}
                                            {studio.scheduleUrls && studio.scheduleUrls.length > 0 ? <div style={{
                display: 'flex',
                gap: '8px',
                flexWrap: 'wrap',
                marginTop: '10px'
              }} onClick={e => e.stopPropagation()}>
                                                    {studio.scheduleUrls.map((url, i) => <a key={i} href={url} target="_blank" rel="noreferrer" style={{
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  color: '#10B981',
                  background: 'rgba(16,185,129,0.1)',
                  padding: '4px 10px',
                  borderRadius: '4px',
                  textDecoration: 'none'
                }}>{t("g_83c5a3") || t("g_83c5a3") || t("g_83c5a3") || t("g_83c5a3") || t("g_83c5a3") || "\uD83D\uDCE6 \uAC00\uC785 \uCCA8\uBD80\uD30C\uC77C"}{i + 1}{t("g_612ca2") || t("g_612ca2") || t("g_612ca2") || t("g_612ca2") || t("g_612ca2") || "\uB2E4\uC6B4\uB85C\uB4DC"}</a>)}
                                                </div> : studio.scheduleUrl && <div style={{
                display: 'flex',
                gap: '8px',
                flexWrap: 'wrap',
                marginTop: '10px'
              }} onClick={e => e.stopPropagation()}>
                                                    <a href={studio.scheduleUrl} target="_blank" rel="noreferrer" style={{
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  color: '#10B981',
                  background: 'rgba(16,185,129,0.1)',
                  padding: '4px 10px',
                  borderRadius: '4px',
                  textDecoration: 'none'
                }}>{t("g_b62339") || t("g_b62339") || t("g_b62339") || t("g_b62339") || t("g_b62339") || "\uD83D\uDCE6 \uAC00\uC785 \uCCA8\uBD80\uD30C\uC77C \uB2E4\uC6B4\uB85C\uB4DC"}</a>
                                                </div>}
                                        </div>;
          })}
                            </div>
                        </>}
                </>}

            {/* ═══ ADMINS ═══ */}
            {activeSection === 'admins' && <>
                    <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
                        <h2 style={{
          margin: 0,
          fontSize: '1.2rem',
          color: '#ccc'
        }}>{t("g_c5529e") || t("g_c5529e") || t("g_c5529e") || t("g_c5529e") || t("g_c5529e") || "\uAD00\uB9AC\uC790 \uACC4\uC815"}</h2>
                        <div style={{
          display: 'flex',
          gap: '8px'
        }}>
                            <button onClick={loadAdmins} style={{
            padding: '8px 16px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            color: '#aaa',
            cursor: 'pointer',
            fontSize: '0.85rem'
          }}>{t("g_423c41") || t("g_423c41") || t("g_423c41") || t("g_423c41") || t("g_423c41") || "\uC0C8\uB85C\uACE0\uCE68"}</button>
                            <button onClick={() => {
            setShowAddAdmin(true);
            setCreatedResetLink(null);
          }} style={{
            padding: '8px 16px',
            background: '#10B981',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
                                <UserCirclePlus size={18} />{t("g_2538d9") || t("g_2538d9") || t("g_2538d9") || t("g_2538d9") || t("g_2538d9") || "\uC0C8 \uAD00\uB9AC\uC790"}</button>
                        </div>
                    </div>

                    {/* 관리자 흐름 안내 */}
                    <div style={{
        marginBottom: '20px',
        padding: '16px 20px',
        background: 'rgba(59, 130, 246, 0.08)',
        border: '1px solid rgba(59, 130, 246, 0.2)',
        borderRadius: '12px',
        color: '#e2e8f0',
        lineHeight: '1.6',
        fontSize: '0.85rem'
      }}>
                        <div style={{
          fontWeight: '700',
          fontSize: '0.95rem',
          color: '#60A5FA',
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
                            <ShieldCheck size={18} />{t("g_b79209") || t("g_b79209") || t("g_b79209") || t("g_b79209") || t("g_b79209") || "\uC0C8 \uAD00\uB9AC\uC790 \uCD94\uAC00 \uC21C\uC11C (\uC288\uD37C\uC5B4\uB4DC\uBBFC \uC228\uAE40 \uBC29\uC2DD)"}</div>
                        <ol style={{
          margin: 0,
          paddingLeft: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
                            <li>{t("g_22877c") || t("g_22877c") || t("g_22877c") || t("g_22877c") || t("g_22877c") || "\uC6B0\uCE21 \uC0C1\uB2E8\uC758"}<strong>{t("g_5e19ff") || t("g_5e19ff") || t("g_5e19ff") || t("g_5e19ff") || t("g_5e19ff") || "[+ \uC0C8 \uAD00\uB9AC\uC790]"}</strong>{t("g_0fcb13") || t("g_0fcb13") || t("g_0fcb13") || t("g_0fcb13") || t("g_0fcb13") || "\uBC84\uD2BC \uD074\uB9AD"}</li>
                            <li>{t("g_d043d7") || t("g_d043d7") || t("g_d043d7") || t("g_d043d7") || t("g_d043d7") || "\uC774\uBA54\uC77C\uACFC \uB2F4\uB2F9 \uC5C5\uC7A5\uB9CC \uC120\uD0DD\uD558\uACE0 \"\uC0DD\uC131\uD558\uAE30\" \uD074\uB9AD (\uBE44\uBC00\uBC88\uD638 \uC785\uB825\uB780 \uC5C6\uC74C)"}</li>
                            <li>{t("g_05990c") || t("g_05990c") || t("g_05990c") || t("g_05990c") || t("g_05990c") || "\uC131\uACF5\uD558\uBA74 \uD654\uBA74\uC5D0"}<strong>{t("g_11ad7f") || t("g_11ad7f") || t("g_11ad7f") || t("g_11ad7f") || t("g_11ad7f") || "\"\uBE44\uBC00\uBC88\uD638 \uC124\uC815 \uB9C1\uD06C\""}</strong>{t("g_4169bb") || t("g_4169bb") || t("g_4169bb") || t("g_4169bb") || t("g_4169bb") || "\uC0DD\uC131"}</li>
                            <li>{t("g_71e171") || t("g_71e171") || t("g_71e171") || t("g_71e171") || t("g_71e171") || "\uC774 \uB9C1\uD06C \uBCF5\uC0AC \uBC84\uD2BC\uC744 \uB20C\uB7EC\uC11C \uD574\uB2F9 \uC6D0\uC7A5\uB2D8\uAED8 \uCE74\uD1A1/\uBB38\uC790\uB85C \uC804\uB2EC"}</li>
                            <li>{t("g_82c8bc") || t("g_82c8bc") || t("g_82c8bc") || t("g_82c8bc") || t("g_82c8bc") || "\uC6D0\uC7A5\uB2D8\uC774 \uB9C1\uD06C\uB97C \uB204\uB974\uBA74 \uBCF8\uC778\uC774 \uC9C1\uC811 \uC0AC\uC6A9\uD560 \uBE44\uBC00\uBC88\uD638\uB97C \uC785\uB825\uD558\uACE0 \uC800\uC7A5"}</li>
                            <li>{t("g_14c0a5") || t("g_14c0a5") || t("g_14c0a5") || t("g_14c0a5") || t("g_14c0a5") || "\uC6D0\uC7A5\uB2D8\uC740 \uC124\uC815\uD55C \uBE44\uBC00\uBC88\uD638\uB85C \uBCF8\uC778 \uC5C5\uC7A5\uC5D0 \uB85C\uADF8\uC778 (\uC790\uC2E0\uB9CC\uC758 \uB2E8\uB3C5 \uC571\uC774\uB77C \uC778\uC2DD)"}</li>
                        </ol>
                    </div>

                    {adminsLoading ? <div style={{
        textAlign: 'center',
        padding: '40px',
        color: '#666'
      }}>{t("g_8d23a1") || t("g_8d23a1") || t("g_8d23a1") || t("g_8d23a1") || t("g_8d23a1") || "\uC870\uD68C \uC911..."}</div> : <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
                            {admins.map(a => <div key={a.uid} style={{
          padding: '16px 20px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px'
        }}>
                                    <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
                                        <div>
                                            <div style={{
                fontWeight: '700',
                fontSize: '1rem',
                marginBottom: '4px'
              }}>{a.displayName || a.email}</div>
                                            <div style={{
                fontSize: '0.8rem',
                color: '#888',
                marginBottom: '6px'
              }}>{a.email}</div>
                                            <div style={{
                display: 'flex',
                gap: '8px',
                flexWrap: 'wrap'
              }}>
                                                <span style={{
                  fontSize: '0.75rem',
                  padding: '2px 8px',
                  borderRadius: '8px',
                  background: a.role === 'superadmin' ? 'rgba(212, 175, 55, 0.15)' : a.role === 'admin' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: a.role === 'superadmin' ? '#D4AF37' : a.role === 'admin' ? '#3B82F6' : '#EF4444',
                  fontWeight: '600'
                }}>
                                                    {a.role === 'superadmin' ? t("g_94de12") || t("g_94de12") || t("g_94de12") || t("g_94de12") || t("g_94de12") || "\uD83D\uDC51 \uC288\uD37C\uC5B4\uB4DC\uBBFC" : a.role === 'admin' ? t("g_9989be") || t("g_9989be") || t("g_9989be") || t("g_9989be") || t("g_9989be") || "\uD83D\uDD12 \uAD00\uB9AC\uC790" : t("g_493d27") || t("g_493d27") || t("g_493d27") || t("g_493d27") || t("g_493d27") || "\u26A0\uFE0F \uBBF8\uC124\uC815"}
                                                </span>
                                                {a.studioId && <span style={{
                  fontSize: '0.75rem',
                  padding: '2px 8px',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#888'
                }}>{a.studioId}</span>}
                                            </div>
                                        </div>
                                        <div style={{
              display: 'flex',
              gap: '8px'
            }}>
                                            <button onClick={() => {
                setResetPasswordUid(a.uid);
                setNewPassword('');
              }} style={{
                padding: '6px 12px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '6px',
                color: '#aaa',
                cursor: 'pointer',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                                                <Lock size={14} />{t("g_9ecb3c") || t("g_9ecb3c") || t("g_9ecb3c") || t("g_9ecb3c") || t("g_9ecb3c") || "\uBE44\uBC88 \uBCC0\uACBD"}</button>
                                            {a.role !== 'superadmin' && <button onClick={() => {
                const sid = prompt(t("g_f3784b") || t("g_f3784b") || t("g_f3784b") || t("g_f3784b") || t("g_f3784b") || "\uB2F4\uB2F9 \uC5C5\uC7A5 ID:", a.studioId || '');
                if (sid !== null) handleSetClaims(a.email, 'admin', sid);
              }} style={{
                padding: '6px 12px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '6px',
                color: '#aaa',
                cursor: 'pointer',
                fontSize: '0.8rem'
              }}>{t("g_c8d56b") || t("g_c8d56b") || t("g_c8d56b") || t("g_c8d56b") || t("g_c8d56b") || "\uC5C5\uC7A5 \uBCC0\uACBD"}</button>}
                                            {a.role !== 'superadmin' && <button onClick={() => handleDeleteAdmin(a)} style={{
                padding: '6px 12px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '6px',
                color: '#EF4444',
                cursor: 'pointer',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                                                    <Trash size={14} />{t("g_30e15a") || t("g_30e15a") || t("g_30e15a") || t("g_30e15a") || t("g_30e15a") || "\uC0AD\uC81C"}</button>}
                                        </div>
                                    </div>

                                    {resetPasswordUid === a.uid && <div style={{
            marginTop: '12px',
            padding: '12px',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '8px',
            display: 'flex',
            gap: '8px',
            alignItems: 'center'
          }}>
                                            <div style={{
              position: 'relative',
              flex: 1
            }}>
                                                <input type={showPassword[a.uid] ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder={t("g_bcc599") || t("g_bcc599") || t("g_bcc599") || t("g_bcc599") || t("g_bcc599") || "\uC0C8 \uBE44\uBC00\uBC88\uD638 (6\uC790 \uC774\uC0C1)"} style={{
                ...inputStyle,
                paddingRight: '36px'
              }} />
                                                <button onClick={() => setShowPassword(p => ({
                ...p,
                [a.uid]: !p[a.uid]
              }))} style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#888',
                cursor: 'pointer'
              }}>
                                                    {showPassword[a.uid] ? <EyeSlash size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                            <button onClick={handleResetPassword} disabled={resetting} style={{
              padding: '10px 16px',
              background: resetting ? '#555' : '#EF4444',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: resetting ? 'not-allowed' : 'pointer',
              fontSize: '0.85rem',
              whiteSpace: 'nowrap'
            }}>
                                                {resetting ? '...' : t("g_9be281") || t("g_9be281") || t("g_9be281") || t("g_9be281") || t("g_9be281") || "\uBCC0\uACBD"}
                                            </button>
                                            <button onClick={() => setResetPasswordUid(null)} style={{
              padding: '10px',
              background: 'rgba(255,255,255,0.05)',
              border: 'none',
              borderRadius: '8px',
              color: '#888',
              cursor: 'pointer'
            }}><X size={16} /></button>
                                        </div>}

                                    <div style={{
            marginTop: '8px',
            fontSize: '0.7rem',
            color: '#555'
          }}>{t("g_e2f381") || t("g_e2f381") || t("g_e2f381") || t("g_e2f381") || t("g_e2f381") || "\uB9C8\uC9C0\uB9C9 \uB85C\uADF8\uC778:"}{a.lastSignIn ? new Date(a.lastSignIn).toLocaleString('ko-KR') : t("g_a245e6") || t("g_a245e6") || t("g_a245e6") || t("g_a245e6") || t("g_a245e6") || "\uC5C6\uC74C"}
                                    </div>
                                </div>)}
                        </div>}
                </>}

            {/* ═══ ADD ADMIN MODAL ═══ */}
            {showAddAdmin && <div className="modal-overlay" role="dialog" aria-modal="true">
                    <div className="modal-content" style={{
        maxWidth: '480px'
      }}>
                        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}>
                            <h2 style={{
            margin: 0,
            fontSize: '1.3rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
                                <UserCirclePlus size={24} color="#10B981" />{t("g_c1d06a") || t("g_c1d06a") || t("g_c1d06a") || t("g_c1d06a") || t("g_c1d06a") || "\uC0C8 \uAD00\uB9AC\uC790 \uCD94\uAC00"}</h2>
                            <button onClick={() => {
            setShowAddAdmin(false);
            setCreatedResetLink(null);
          }} style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#888'
          }}><X size={24} /></button>
                        </div>

                        {/* 링크가 생성되었으면 결과 화면 */}
                        {createdResetLink ? <div>
                                <div style={{
            padding: '16px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: '10px',
            marginBottom: '16px'
          }}>
                                    <div style={{
              fontWeight: '700',
              color: '#10B981',
              marginBottom: '8px'
            }}>{t("g_389baa") || t("g_389baa") || t("g_389baa") || t("g_389baa") || t("g_389baa") || "\u2705 \uAD00\uB9AC\uC790 \uACC4\uC815 \uC0DD\uC131 \uC644\uB8CC!"}</div>
                                    <div style={{
              fontSize: '0.85rem',
              color: '#aaa'
            }}>{t("g_27a83f") || t("g_27a83f") || t("g_27a83f") || t("g_27a83f") || t("g_27a83f") || "\uC544\uB798 \uB9C1\uD06C\uB97C \uAD00\uB9AC\uC790\uC5D0\uAC8C \uC804\uB2EC\uD558\uC138\uC694."}<br />{t("g_1696b0") || t("g_1696b0") || t("g_1696b0") || t("g_1696b0") || t("g_1696b0") || "\uAD00\uB9AC\uC790\uAC00 \uB9C1\uD06C\uB97C \uD074\uB9AD\uD558\uBA74 \uC9C1\uC811 \uBE44\uBC00\uBC88\uD638\uB97C \uC124\uC815\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4."}</div>
                                </div>
                                <div style={{
            position: 'relative'
          }}>
                                    <input readOnly value={createdResetLink} style={{
              ...inputStyle,
              paddingRight: '50px',
              fontSize: '0.8rem',
              color: '#8ab4f8'
            }} />
                                    <button onClick={handleCopyLink} style={{
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: copied ? '#10B981' : '#3B82F6',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 10px',
              cursor: 'pointer',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.8rem'
            }}>
                                        {copied ? <><Check size={14} />{t("g_b42cbc") || t("g_b42cbc") || t("g_b42cbc") || t("g_b42cbc") || t("g_b42cbc") || "\uBCF5\uC0AC\uB428"}</> : <><Copy size={14} />{t("g_6acf7a") || t("g_6acf7a") || t("g_6acf7a") || t("g_6acf7a") || t("g_6acf7a") || "\uBCF5\uC0AC"}</>}
                                    </button>
                                </div>
                                <button onClick={() => {
            setShowAddAdmin(false);
            setCreatedResetLink(null);
            setAddForm({
              email: '',
              displayName: '',
              role: 'admin',
              studioId: ''
            });
          }} style={{
            width: '100%',
            marginTop: '20px',
            padding: '12px',
            background: '#3B82F6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '0.95rem'
          }}>{t("g_4f8e30") || t("g_4f8e30") || t("g_4f8e30") || t("g_4f8e30") || t("g_4f8e30") || "\uC644\uB8CC"}</button>
                            </div> : <>
                                <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
                                    <div>
                                        <label style={labelStyle}>{t("g_71ce1e") || t("g_71ce1e") || t("g_71ce1e") || t("g_71ce1e") || t("g_71ce1e") || "\uC774\uBA54\uC77C *"}</label>
                                        <input value={addForm.email} onChange={e => setAddForm({
                ...addForm,
                email: e.target.value
              })} placeholder="admin@studio.com" style={inputStyle} />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>{t("g_2904f9") || t("g_2904f9") || t("g_2904f9") || t("g_2904f9") || t("g_2904f9") || "\uD45C\uC2DC \uC774\uB984"}</label>
                                        <input value={addForm.displayName} onChange={e => setAddForm({
                ...addForm,
                displayName: e.target.value
              })} placeholder={t("g_4dec08") || t("g_4dec08") || t("g_4dec08") || t("g_4dec08") || t("g_4dec08") || "\uC608: \uAE40\uC6D0\uC7A5"} style={inputStyle} />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>{t("g_c90de7") || t("g_c90de7") || t("g_c90de7") || t("g_c90de7") || t("g_c90de7") || "\uC5ED\uD560 *"}</label>
                                        <select value={addForm.role} onChange={e => setAddForm({
                ...addForm,
                role: e.target.value
              })} style={{
                ...inputStyle,
                cursor: 'pointer'
              }}>
                                            <option value="admin">{t("g_3c9eb9") || t("g_3c9eb9") || t("g_3c9eb9") || t("g_3c9eb9") || t("g_3c9eb9") || "\uD83D\uDD12 \uC77C\uBC18 \uAD00\uB9AC\uC790 (\uD2B9\uC815 \uC5C5\uC7A5\uB9CC)"}</option>
                                            <option value="superadmin">{t("g_8241e3") || t("g_8241e3") || t("g_8241e3") || t("g_8241e3") || t("g_8241e3") || "\uD83D\uDC51 \uC288\uD37C\uC5B4\uB4DC\uBBFC (\uBAA8\uB4E0 \uC5C5\uC7A5)"}</option>
                                        </select>
                                    </div>
                                    {addForm.role === 'admin' && <div>
                                            <label style={labelStyle}>{t("g_d1a82e") || t("g_d1a82e") || t("g_d1a82e") || t("g_d1a82e") || t("g_d1a82e") || "\uB2F4\uB2F9 \uC5C5\uC7A5 *"}</label>
                                            <select value={addForm.studioId} onChange={e => setAddForm({
                ...addForm,
                studioId: e.target.value
              })} style={{
                ...inputStyle,
                cursor: 'pointer'
              }}>
                                                <option value="">{t("g_c074e1") || t("g_c074e1") || t("g_c074e1") || t("g_c074e1") || t("g_c074e1") || "\uC5C5\uC7A5 \uC120\uD0DD..."}</option>
                                                {studios.map(s => <option key={s.id} value={s.id}>{s.name} ({s.id})</option>)}
                                            </select>
                                        </div>}
                                    <div style={{
              padding: '12px',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '8px',
              fontSize: '0.8rem',
              color: '#888'
            }}>{t("g_f37390") || t("g_f37390") || t("g_f37390") || t("g_f37390") || t("g_f37390") || "\uD83D\uDD10 \uBE44\uBC00\uBC88\uD638\uB294 \uAD00\uB9AC\uC790\uAC00 \uC9C1\uC811 \uC124\uC815\uD569\uB2C8\uB2E4. \uC0DD\uC131 \uD6C4 \uBE44\uBC00\uBC88\uD638 \uC124\uC815 \uB9C1\uD06C\uAC00 \uC81C\uACF5\uB429\uB2C8\uB2E4."}</div>
                                </div>
                                <div style={{
            display: 'flex',
            gap: '12px',
            marginTop: '20px',
            justifyContent: 'flex-end'
          }}>
                                    <button onClick={() => setShowAddAdmin(false)} style={{
              padding: '10px 20px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#aaa',
              cursor: 'pointer'
            }}>{t("g_d9de21") || t("g_d9de21") || t("g_d9de21") || t("g_d9de21") || t("g_d9de21") || "\uCDE8\uC18C"}</button>
                                    <button onClick={handleAddAdmin} disabled={adding} style={{
              padding: '10px 24px',
              background: adding ? '#555' : '#10B981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: adding ? 'not-allowed' : 'pointer'
            }}>
                                        {adding ? t("g_1c54a5") || t("g_1c54a5") || t("g_1c54a5") || t("g_1c54a5") || t("g_1c54a5") || "\uC0DD\uC131\uC911..." : t("g_612ee1") || t("g_612ee1") || t("g_612ee1") || t("g_612ee1") || t("g_612ee1") || "\u2705 \uC0DD\uC131\uD558\uAE30"}
                                    </button>
                                </div>
                            </>}
                    </div>
                </div>}

            {/* ═══ REGISTER STUDIO MODAL ═══ */}
            {showRegister && <div className="modal-overlay" role="dialog" aria-modal="true">
                    <div className="modal-content" style={{
        maxWidth: '480px'
      }}>
                        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}>
                            <h2 style={{
            margin: 0,
            fontSize: '1.3rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}><Buildings size={24} color="#3B82F6" />{t("g_3cebae") || t("g_3cebae") || t("g_3cebae") || t("g_3cebae") || t("g_3cebae") || "\uC0C8 \uC2A4\uD29C\uB514\uC624 \uB4F1\uB85D"}</h2>
                            <button onClick={() => setShowRegister(false)} style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#888'
          }}><X size={24} /></button>
                        </div>
                        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
                            <div>
                                <label style={labelStyle}>{t("g_344a41") || t("g_344a41") || t("g_344a41") || t("g_344a41") || t("g_344a41") || "\uC2A4\uD29C\uB514\uC624 ID *"}</label>
                                <input value={registerForm.studioId} onChange={e => setRegisterForm({
              ...registerForm,
              studioId: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
            })} placeholder={t("g_7a2317") || t("g_7a2317") || t("g_7a2317") || t("g_7a2317") || t("g_7a2317") || "\uC608: namaste-yoga"} style={inputStyle} />
                                <div style={{
              fontSize: '0.7rem',
              color: '#666',
              marginTop: '4px'
            }}>{t("g_8d1071") || t("g_8d1071") || t("g_8d1071") || t("g_8d1071") || t("g_8d1071") || "\uC601\uBB38 \uC18C\uBB38\uC790, \uC22B\uC790, \uD558\uC774\uD508\uB9CC \uAC00\uB2A5"}</div>
                            </div>
                            <div>
                                <label style={labelStyle}>{t("g_2b5eb5") || t("g_2b5eb5") || t("g_2b5eb5") || t("g_2b5eb5") || t("g_2b5eb5") || "\uC2A4\uD29C\uB514\uC624 \uC774\uB984 *"}</label>
                                <input value={registerForm.name} onChange={e => setRegisterForm({
              ...registerForm,
              name: e.target.value
            })} placeholder={t("g_bd1eb6") || t("g_bd1eb6") || t("g_bd1eb6") || t("g_bd1eb6") || t("g_bd1eb6") || "\uC608: \uB098\uB9C8\uC2A4\uD14C \uC694\uAC00"} style={inputStyle} />
                            </div>

                            <div>
                                <label style={labelStyle}>{t("g_dea9f2") || t("g_dea9f2") || t("g_dea9f2") || t("g_dea9f2") || t("g_dea9f2") || "\uAD00\uB9AC\uC790 \uC774\uBA54\uC77C *"}</label>
                                <input type="email" value={registerForm.ownerEmail} onChange={e => setRegisterForm({
              ...registerForm,
              ownerEmail: e.target.value
            })} placeholder="admin@namaste.yoga" style={inputStyle} />
                            </div>
                        </div>
                        <div style={{
          display: 'flex',
          gap: '12px',
          marginTop: '28px',
          justifyContent: 'flex-end'
        }}>
                            <button onClick={() => setShowRegister(false)} style={{
            padding: '10px 20px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            color: '#aaa',
            cursor: 'pointer'
          }}>{t("g_d9de21") || t("g_d9de21") || t("g_d9de21") || t("g_d9de21") || t("g_d9de21") || "\uCDE8\uC18C"}</button>
                            <button onClick={handleRegister} disabled={registering} style={{
            padding: '10px 24px',
            background: registering ? '#555' : '#3B82F6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontWeight: '600',
            cursor: registering ? 'not-allowed' : 'pointer'
          }}>
                                {registering ? t("g_e21a14") || t("g_e21a14") || t("g_e21a14") || t("g_e21a14") || t("g_e21a14") || "\uB4F1\uB85D\uC911..." : t("g_1ebbc6") || t("g_1ebbc6") || t("g_1ebbc6") || t("g_1ebbc6") || t("g_1ebbc6") || "\uD83C\uDFE2 \uB4F1\uB85D\uD558\uAE30"}
                            </button>
                        </div>
                    </div>
                </div>}

            {/* ═══ DOMAINS (도메인 보관 리스트) ═══ */}
            {activeSection === 'domains' && <>
                    <div style={{
        marginBottom: '20px'
      }}>
                        <div style={{
          padding: '12px 16px',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(99, 102, 241, 0.03))',
          borderRadius: '10px',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
                            <Globe size={20} weight="fill" color="#6366F1" />
                            <span style={{
            fontSize: '0.85rem',
            color: '#a5b4fc'
          }}>{t("g_dcce5d") || t("g_dcce5d") || t("g_dcce5d") || t("g_dcce5d") || t("g_dcce5d") || "\uC120\uC810 \uC644\uB8CC\uB41C Firebase Hosting \uB3C4\uBA54\uC778 \uBAA9\uB85D\uC785\uB2C8\uB2E4. \uB2E4\uB978 \uC0AC\uC6A9\uC790\uAC00 \uC808\uB300 \uAC00\uC838\uAC08 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4."}</span>
                        </div>
                    </div>

                    {/* 운영 중인 도메인 */}
                    <h3 style={{
        fontSize: '1rem',
        fontWeight: '700',
        color: '#10B981',
        marginBottom: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
                        <LinkSimple size={18} weight="bold" />{t("g_ace280") || t("g_ace280") || t("g_ace280") || t("g_ace280") || t("g_ace280") || "\uC6B4\uC601 \uC911 (Active)"}</h3>
                    <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '10px',
        marginBottom: '28px'
      }}>
                        {[{
          name: t("g_1378bb") || t("g_1378bb") || t("g_1378bb") || t("g_1378bb") || t("g_1378bb") || "\uBCF5\uC0D8\uC694\uAC00",
          siteId: 'boksaem-yoga',
          url: 'boksaem-yoga.web.app',
          active: true
        }, {
          name: t("g_a20f83") || t("g_a20f83") || t("g_a20f83") || t("g_a20f83") || t("g_a20f83") || "\uC30D\uBB38\uC694\uAC00",
          siteId: 'ssangmunyoga',
          url: 'ssangmunyoga.web.app',
          active: true
        }, {
          name: 'PassFlow Ai',
          siteId: 'passflowai',
          url: 'passflowai.web.app',
          active: true
        }].map(d => <div key={d.siteId} style={{
          padding: '14px 16px',
          background: 'rgba(16, 185, 129, 0.06)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          borderRadius: '10px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
                                <div>
                                    <div style={{
              fontWeight: '700',
              fontSize: '0.9rem',
              color: '#f0f0f0'
            }}>{d.name}</div>
                                    <div style={{
              fontSize: '0.75rem',
              color: '#6ee7b7',
              marginTop: '2px'
            }}>{d.url}</div>
                                </div>
                                <span style={{
            fontSize: '0.7rem',
            padding: '3px 8px',
            borderRadius: '12px',
            background: 'rgba(16, 185, 129, 0.15)',
            color: '#10B981',
            fontWeight: '600'
          }}>{t("g_7b4d79") || t("g_7b4d79") || t("g_7b4d79") || t("g_7b4d79") || t("g_7b4d79") || "\uC6B4\uC601\uC911"}</span>
                            </div>)}
                    </div>

                    {/* 보관 중인 도메인 (선점만) */}
                    <h3 style={{
        fontSize: '1rem',
        fontWeight: '700',
        color: '#F59E0B',
        marginBottom: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
                        <Lock size={18} weight="bold" />{t("g_b25ed4") || t("g_b25ed4") || t("g_b25ed4") || t("g_b25ed4") || t("g_b25ed4") || "\uC120\uC810 \uBCF4\uAD00 \uC911 (Reserved)"}</h3>
                    <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '10px',
        marginBottom: '28px'
      }}>
                        {[{
          name: t("g_cadba1") || t("g_cadba1") || t("g_cadba1") || t("g_cadba1") || t("g_cadba1") || "\uBCF5\uC0D8\uC694\uAC00 (\uBD99\uC784)",
          siteId: 'boksaemyoga',
          url: 'boksaemyoga.web.app'
        }, {
          name: t("g_a20f83") || t("g_a20f83") || t("g_a20f83") || t("g_a20f83") || t("g_a20f83") || "\uC30D\uBB38\uC694\uAC00",
          siteId: 'ssangmunyoga',
          url: 'ssangmunyoga.web.app'
        }, {
          name: t("g_f6947c") || t("g_f6947c") || t("g_f6947c") || t("g_f6947c") || t("g_f6947c") || "\uB9C8\uD3EC\uC694\uAC00",
          siteId: 'mapo-yoga',
          url: 'mapo-yoga.web.app'
        }, {
          name: t("g_1954aa") || t("g_1954aa") || t("g_1954aa") || t("g_1954aa") || t("g_1954aa") || "\uB9C8\uD3EC\uC694\uAC00 (\uBD99\uC784)",
          siteId: 'mapoyoga',
          url: 'mapoyoga.web.app'
        }, {
          name: t("g_131dc3") || t("g_131dc3") || t("g_131dc3") || t("g_131dc3") || t("g_131dc3") || "\uACF5\uB355\uC694\uAC00",
          siteId: 'gongdeok-yoga',
          url: 'gongdeok-yoga.web.app'
        }, {
          name: t("g_39bc10") || t("g_39bc10") || t("g_39bc10") || t("g_39bc10") || t("g_39bc10") || "\uACF5\uB355\uC694\uAC00 (\uBD99\uC784)",
          siteId: 'gongdeokyoga',
          url: 'gongdeokyoga.web.app'
        }, {
          name: t("g_8fba09") || t("g_8fba09") || t("g_8fba09") || t("g_8fba09") || t("g_8fba09") || "\uC544\uD604\uC694\uAC00",
          siteId: 'ahyeon-yoga',
          url: 'ahyeon-yoga.web.app'
        }, {
          name: t("g_a73991") || t("g_a73991") || t("g_a73991") || t("g_a73991") || t("g_a73991") || "\uC544\uD604\uC694\uAC00 (\uBD99\uC784)",
          siteId: 'ahyeonyoga',
          url: 'ahyeonyoga.web.app'
        }, {
          name: t("g_346453") || t("g_346453") || t("g_346453") || t("g_346453") || t("g_346453") || "\uC774\uB300\uC694\uAC00",
          siteId: 'ewha-yoga',
          url: 'ewha-yoga.web.app'
        }, {
          name: t("g_dd49f2") || t("g_dd49f2") || t("g_dd49f2") || t("g_dd49f2") || t("g_dd49f2") || "\uC774\uB300\uC694\uAC00 (\uBD99\uC784)",
          siteId: 'ewhayoga',
          url: 'ewhayoga.web.app'
        }, {
          name: t("g_28b0c0") || t("g_28b0c0") || t("g_28b0c0") || t("g_28b0c0") || t("g_28b0c0") || "\uC2E0\uCD0C\uC694\uAC00",
          siteId: 'sinchon-yoga',
          url: 'sinchon-yoga.web.app'
        }, {
          name: t("g_137714") || t("g_137714") || t("g_137714") || t("g_137714") || t("g_137714") || "\uC2E0\uCD0C\uC694\uAC00 (\uBD99\uC784)",
          siteId: 'sinchonyoga',
          url: 'sinchonyoga.web.app'
        }, {
          name: t("g_66479b") || t("g_66479b") || t("g_66479b") || t("g_66479b") || t("g_66479b") || "\uD64D\uB300\uC694\uAC00",
          siteId: 'hongdae-yoga',
          url: 'hongdae-yoga.web.app'
        }, {
          name: t("g_5c2870") || t("g_5c2870") || t("g_5c2870") || t("g_5c2870") || t("g_5c2870") || "\uD64D\uB300\uC694\uAC00 (\uBD99\uC784)",
          siteId: 'hongdaeyoga',
          url: 'hongdaeyoga.web.app'
        }, {
          name: t("g_3865af") || t("g_3865af") || t("g_3865af") || t("g_3865af") || t("g_3865af") || "\uB9DD\uC6D0\uC694\uAC00",
          siteId: 'mangwon-yoga',
          url: 'mangwon-yoga.web.app'
        }, {
          name: t("g_807211") || t("g_807211") || t("g_807211") || t("g_807211") || t("g_807211") || "\uB9DD\uC6D0\uC694\uAC00 (\uBD99\uC784)",
          siteId: 'mangwonyoga',
          url: 'mangwonyoga.web.app'
        }, {
          name: t("g_5dae47") || t("g_5dae47") || t("g_5dae47") || t("g_5dae47") || t("g_5dae47") || "\uD569\uC815\uC694\uAC00",
          siteId: 'hapjeong-yoga',
          url: 'hapjeong-yoga.web.app'
        }, {
          name: t("g_e17925") || t("g_e17925") || t("g_e17925") || t("g_e17925") || t("g_e17925") || "\uD569\uC815\uC694\uAC00 (\uBD99\uC784)",
          siteId: 'hapjeongyoga',
          url: 'hapjeongyoga.web.app'
        }, {
          name: t("g_11da0f") || t("g_11da0f") || t("g_11da0f") || t("g_11da0f") || t("g_11da0f") || "\uC560\uC624\uAC1C\uC694\uAC00",
          siteId: 'aeogae-yoga',
          url: 'aeogae-yoga.web.app'
        }, {
          name: t("g_e9a912") || t("g_e9a912") || t("g_e9a912") || t("g_e9a912") || t("g_e9a912") || "\uC560\uC624\uAC1C\uC694\uAC00 (\uBD99\uC784)",
          siteId: 'aeogaeyoga',
          url: 'aeogaeyoga.web.app'
        }, {
          name: t("g_79cc63") || t("g_79cc63") || t("g_79cc63") || t("g_79cc63") || t("g_79cc63") || "\uC5EC\uC758\uB3C4\uC694\uAC00",
          siteId: 'yeouido-yoga',
          url: 'yeouido-yoga.web.app'
        }, {
          name: t("g_55dfb0") || t("g_55dfb0") || t("g_55dfb0") || t("g_55dfb0") || t("g_55dfb0") || "\uC5EC\uC758\uB3C4\uC694\uAC00 (\uBD99\uC784)",
          siteId: 'yeoidoyoga',
          url: 'yeoidoyoga.web.app'
        }, {
          name: t("g_14858e") || t("g_14858e") || t("g_14858e") || t("g_14858e") || t("g_14858e") || "PassFlow \uB79C\uB529",
          siteId: 'passflow-landing',
          url: 'passflow-landing.web.app'
        }].map(d => <div key={d.siteId} style={{
          padding: '14px 16px',
          background: 'rgba(245, 158, 11, 0.04)',
          border: '1px solid rgba(245, 158, 11, 0.12)',
          borderRadius: '10px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
                                <div>
                                    <div style={{
              fontWeight: '600',
              fontSize: '0.85rem',
              color: '#d1d5db'
            }}>{d.name}</div>
                                    <div style={{
              fontSize: '0.72rem',
              color: '#78716c',
              marginTop: '2px'
            }}>{d.url}</div>
                                </div>
                                <span style={{
            fontSize: '0.7rem',
            padding: '3px 8px',
            borderRadius: '12px',
            background: 'rgba(245, 158, 11, 0.1)',
            color: '#F59E0B',
            fontWeight: '600'
          }}>{t("g_ef8c0a") || t("g_ef8c0a") || t("g_ef8c0a") || t("g_ef8c0a") || t("g_ef8c0a") || "\uBCF4\uAD00"}</span>
                            </div>)}
                    </div>

                    <div style={{
        padding: '14px 16px',
        background: 'rgba(255,255,255,0.02)',
        borderRadius: '10px',
        border: '1px solid rgba(255,255,255,0.06)',
        fontSize: '0.78rem',
        color: '#6b7280',
        lineHeight: 1.7
      }}>
                        <div style={{
          fontWeight: '700',
          color: '#9ca3af',
          marginBottom: '4px'
        }}>{t("g_0b43f8") || t("g_0b43f8") || t("g_0b43f8") || t("g_0b43f8") || t("g_0b43f8") || "\uD83D\uDCCC \uB3C4\uBA54\uC778 \uAD00\uB9AC \uC548\uB0B4"}</div>
                        <div>{t("g_faea2e") || t("g_faea2e") || t("g_faea2e") || t("g_faea2e") || t("g_faea2e") || "\u2022 \uBAA8\uB4E0 \uB3C4\uBA54\uC778\uC740 Firebase Hosting\uC5D0 \uC120\uC810 \uB4F1\uB85D\uB418\uC5B4, \uC678\uBD80\uC778\uC774 \uB3D9\uC77C \uC774\uB984\uC73C\uB85C \uC0AC\uC774\uD2B8\uB97C \uB9CC\uB4E4 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4."}</div>
                        <div>{t("g_6dc2ce") || t("g_6dc2ce") || t("g_6dc2ce") || t("g_6dc2ce") || t("g_6dc2ce") || "\u2022 '\uBCF4\uAD00' \uC0C1\uD0DC\uC758 \uB3C4\uBA54\uC778\uC740 \uC544\uC9C1 \uC571\uC774 \uBC30\uD3EC\uB418\uC9C0 \uC54A\uC740 \uC0C1\uD0DC\uC774\uBA70, \uACE0\uAC1D \uC628\uBCF4\uB529 \uC2DC \uC989\uC2DC \uD65C\uC131\uD654\uB429\uB2C8\uB2E4."}</div>
                        <div>• <strong>ssangmun-yoga</strong>{t("g_f6b1bf") || t("g_f6b1bf") || t("g_f6b1bf") || t("g_f6b1bf") || t("g_f6b1bf") || "(\uD558\uC774\uD508 \uD3EC\uD568)\uB294 \uD0C0 \uD504\uB85C\uC81D\uD2B8\uC5D0 \uC120\uC810\uB418\uC5B4 \uC788\uC5B4"}<strong>ssangmunyoga</strong>{t("g_1daf44") || t("g_1daf44") || t("g_1daf44") || t("g_1daf44") || t("g_1daf44") || "\uB85C \uC6B4\uC601 \uC911\uC785\uB2C8\uB2E4."}</div>
                    </div>
                </>}

            {/* ═══ INQUIRIES ═══ */}
            {activeSection === 'inquiries' && <>
                    <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
                        <h2 style={{
          fontSize: '1.2rem',
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
                            <ChatCircleDots size={24} color="#8B5CF6" weight="duotone" />{t("g_979ce3") || t("g_979ce3") || t("g_979ce3") || t("g_979ce3") || t("g_979ce3") || "\uD574\uC678 \uACE0\uAC1D \uBB38\uC758 \uBA54\uC2DC\uC9C0"}</h2>
                        <button onClick={loadInquiries} style={{
          padding: '8px 16px',
          background: 'rgba(139,92,246,0.15)',
          color: '#8B5CF6',
          border: '1px solid rgba(139,92,246,0.3)',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: '600',
          fontSize: '0.85rem'
        }}>{t("g_ee7f7e") || t("g_ee7f7e") || t("g_ee7f7e") || t("g_ee7f7e") || t("g_ee7f7e") || "\uD83D\uDD04 \uC0C8\uB85C\uACE0\uCE68"}</button>
                    </div>

                    {inquiriesLoading ? <div style={{
        textAlign: 'center',
        padding: '40px',
        color: '#888'
      }}>{t("g_06057f") || t("g_06057f") || t("g_06057f") || t("g_06057f") || t("g_06057f") || "\uB85C\uB529 \uC911..."}</div> : inquiries.length === 0 ? <div style={{
        textAlign: 'center',
        padding: '60px 20px',
        background: 'rgba(255,255,255,0.02)',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.06)'
      }}>
                            <ChatCircleDots size={48} color="#555" weight="duotone" />
                            <p style={{
          color: '#888',
          marginTop: '12px'
        }}>{t("g_c8c3e2") || t("g_c8c3e2") || t("g_c8c3e2") || t("g_c8c3e2") || t("g_c8c3e2") || "\uC544\uC9C1 \uC811\uC218\uB41C \uBB38\uC758\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4."}</p>
                        </div> : <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
                            {inquiries.map(inq => <div key={inq.id} style={{
          padding: '20px',
          background: inq.status === 'new' ? 'rgba(139,92,246,0.06)' : 'rgba(255,255,255,0.02)',
          border: `1px solid ${inq.status === 'new' ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.06)'}`,
          borderRadius: '14px',
          position: 'relative'
        }}>
                                    {/* Header */}
                                    <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '12px',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
                                        <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
                                            {inq.status === 'new' && <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#EF4444',
                animation: 'pulse 1.5s infinite'
              }} />}
                                            <span style={{
                fontWeight: '700',
                color: '#e0e0e0',
                fontSize: '0.95rem'
              }}>{inq.studioName || inq.email}</span>
                                            {inq.lang && <span style={{fontSize: '0.75rem', padding: '2px 8px', borderRadius: '8px', background: 'rgba(99,102,241,0.15)', color: '#6366f1'}}>{inq.lang.toUpperCase()}</span>}
                                            {inq.country && <span style={{fontSize: '0.75rem', padding: '2px 8px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981'}}>{inq.country}</span>}
                                        </div>
                                        <div style={{
              display: 'flex',
              gap: '6px',
              alignItems: 'center'
            }}>
                                            <span style={{
                fontSize: '0.75rem',
                color: '#666'
              }}>
                                                {inq.createdAt?.toDate ? inq.createdAt.toDate().toLocaleString('ko-KR') : t("g_b76230") || t("g_b76230") || t("g_b76230") || t("g_b76230") || t("g_b76230") || "\uC2DC\uAC04 \uBBF8\uC0C1"}
                                            </span>
                                            {inq.status === 'new' && <button onClick={() => handleMarkRead(inq.id)} style={{
                padding: '4px 10px',
                fontSize: '0.72rem',
                background: 'rgba(16,185,129,0.1)',
                color: '#10B981',
                border: '1px solid rgba(16,185,129,0.2)',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600'
              }}>{t("g_eabae3") || t("g_eabae3") || t("g_eabae3") || t("g_eabae3") || t("g_eabae3") || "\u2705 \uC77D\uC74C"}</button>}
                                        </div>
                                    </div>

                                    {/* Additional Metadata */}
                                    <div style={{ marginBottom: '10px', fontSize: '0.85rem', color: '#9ca3af', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                                        <span>📧 {inq.email}</span>
                                        {inq.phone && <span>📞 {inq.phone}</span>}
                                        {inq.source && <span>🔗 {inq.source}</span>}
                                    </div>
                                    {inq.features && inq.features.length > 0 && (
                                        <div style={{ marginBottom: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {inq.features.map((f, idx) => (
                                                <span key={f+"-"+idx} style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', color: '#f59e0b' }}>{f}</span>
                                            ))}
                                        </div>
                                    )}
                                    {/* Original message */}
                                    <div style={{
            padding: '14px',
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '10px',
            marginBottom: '8px'
          }}>
                                        <div style={{
              fontSize: '0.72rem',
              color: '#888',
              marginBottom: '6px',
              fontWeight: '600'
            }}>{t("g_b59a09") || t("g_b59a09") || t("g_b59a09") || t("g_b59a09") || t("g_b59a09") || "\uD83D\uDCAC \uC6D0\uBB38"}</div>
                                        <p style={{
              margin: 0,
              color: '#d1d5db',
              fontSize: '0.9rem',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap'
            }}>{inq.message}</p>
                                    </div>

                                    {/* Translation */}
                                    {inq.translatedMessage ? <div style={{
            padding: '14px',
            background: 'rgba(139,92,246,0.05)',
            borderRadius: '10px',
            border: '1px solid rgba(139,92,246,0.1)'
          }}>
                                            <div style={{
              fontSize: '0.72rem',
              color: '#8B5CF6',
              marginBottom: '6px',
              fontWeight: '600'
            }}>{t("g_f987f7") || t("g_f987f7") || t("g_f987f7") || t("g_f987f7") || t("g_f987f7") || "\uD83C\uDDF0\uD83C\uDDF7 \uD55C\uAD6D\uC5B4 \uBC88\uC5ED"}</div>
                                            <p style={{
              margin: 0,
              color: '#e0e0e0',
              fontSize: '0.9rem',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap'
            }}>{inq.translatedMessage}</p>
                                        </div> : <button onClick={() => handleTranslate(inq)} disabled={translating[inq.id]} style={{
            padding: '8px 14px',
            fontSize: '0.8rem',
            background: 'rgba(139,92,246,0.1)',
            color: '#8B5CF6',
            border: '1px solid rgba(139,92,246,0.2)',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
                                            <Translate size={16} /> {translating[inq.id] ? t("g_a212b8") || t("g_a212b8") || t("g_a212b8") || t("g_a212b8") || t("g_a212b8") || "\uBC88\uC5ED \uC911..." : t("g_9442be") || t("g_9442be") || t("g_9442be") || t("g_9442be") || t("g_9442be") || "\uD55C\uAD6D\uC5B4\uB85C \uBC88\uC5ED"}
                                        </button>}

                                    {/* Reply action */}
                                    <div style={{
            marginTop: '12px',
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap'
          }}>
                                        <a href={`mailto:${inq.email}?subject=Re: PassFlow AI Inquiry`} target="_blank" rel="noopener noreferrer" style={{
              padding: '8px 14px',
              fontSize: '0.8rem',
              background: 'rgba(59,130,246,0.1)',
              color: '#3B82F6',
              border: '1px solid rgba(59,130,246,0.2)',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
                                            <EnvelopeOpen size={16} />{t("g_21fa4c") || t("g_21fa4c") || t("g_21fa4c") || t("g_21fa4c") || t("g_21fa4c") || "\uC774\uBA54\uC77C\uB85C \uB2F5\uBCC0"}</a>
                                        <button onClick={() => {
              navigator.clipboard.writeText(inq.email);
            }} style={{
              padding: '8px 14px',
              fontSize: '0.8rem',
              background: 'rgba(255,255,255,0.05)',
              color: '#aaa',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
                                            <Copy size={16} />{t("g_e413a9") || t("g_e413a9") || t("g_e413a9") || t("g_e413a9") || t("g_e413a9") || "\uC774\uBA54\uC77C \uBCF5\uC0AC"}</button>
                                        {inq.page && <span style={{
              fontSize: '0.72rem',
              color: '#555',
              alignSelf: 'center'
            }}>📍 {inq.page}</span>}
                                    </div>
                                </div>)}
                        </div>}

                    <style>{`@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
                </>}
        </div>;
};
export default SuperAdminPage;