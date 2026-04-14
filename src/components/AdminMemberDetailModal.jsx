import { useLanguageStore } from '../stores/useLanguageStore';
import { useState } from 'react';
import { getMembershipLabel } from '../utils/membershipLabels';
import { X, User, Calendar, CreditCard, Chats, BellRinging, CheckSquare, Square } from '@phosphor-icons/react';
import RegistrationTab from './admin/member-detail/RegistrationTab';
import AttendanceTab from './admin/member-detail/AttendanceTab';
import MessagesTab from './admin/member-detail/MessagesTab';
import MemberInfoTab, { determineStatusColor } from './admin/member-detail/MemberInfoTab';
import { useStudioConfig } from '../contexts/StudioContext';
import { useAdminMemberDetail } from '../hooks/useAdminMemberDetail';
const AdminMemberDetailModal = ({
  member: initialMember,
  memberLogs: propMemberLogs,
  onClose,
  pricingConfig,
  onUpdateMember,
  onAddSalesRecord,
  pushTokens = []
}) => {
  const t = useLanguageStore(s => s.t);
  const {
    config
  } = useStudioConfig();
  const [prefillMessage, setPrefillMessage] = useState(null);
  const getBranchName = id => (config.BRANCHES || []).find(b => b.id === id)?.name || id;
  const getBranchColor = id => (config.BRANCHES || []).find(b => b.id === id)?.color || 'var(--primary-gold)';
  const getMembershipTypeLabel = key => getMembershipLabel(key, config);

  // [FIX] 전화번호 포맷: 01012345678 → 010-1234-5678
  const formatPhone = phone => {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
    if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    return phone; // 이미 포맷되어 있거나 예외
  };

  // ─── Business Logic Hook (~330줄 → 1줄) ───
  const {
    member,
    editData,
    memberLogs,
    logLimit,
    setLogLimit,
    isSubmitting,
    aiAnalysis,
    isDirtyByUser,
    activeTab,
    setActiveTab,
    showChangeModal,
    setShowChangeModal,
    pendingChanges,
    selectedChangeKeys,
    setSelectedChangeKeys,
    setEditData,
    handlePreSave,
    handleFinalSave,
    handleSafeClose,
    handleManualAttendance,
    handleDeleteAttendance
  } = useAdminMemberDetail(initialMember, propMemberLogs, {
    onUpdateMember,
    onClose,
    pricingConfig
  });
  const tabs = member.role === 'instructor' ? [{
    id: 'info',
    label: t("g_426749") || t("g_426749") || t("g_426749") || t("g_426749") || t("g_426749") || "\uAC15\uC0AC \uC815\uBCF4",
    icon: <User size={20} />
  }] : [{
    id: 'info',
    label: t("g_3da299") || t("g_3da299") || t("g_3da299") || t("g_3da299") || t("g_3da299") || "\uD68C\uC6D0\uC815\uBCF4",
    icon: <User size={20} />
  }, {
    id: 'attendance',
    label: t("g_81b9e4") || t("g_81b9e4") || t("g_81b9e4") || t("g_81b9e4") || t("g_81b9e4") || "\uCD9C\uC11D\uBD80",
    icon: <Calendar size={20} />
  }, {
    id: 'registration',
    label: t("g_763e2b") || t("g_763e2b") || t("g_763e2b") || t("g_763e2b") || t("g_763e2b") || "\uC7AC\uB4F1\uB85D",
    icon: <CreditCard size={20} />
  }, {
    id: 'messages',
    label: t("g_918b33") || t("g_918b33") || t("g_918b33") || t("g_918b33") || t("g_918b33") || "\uBA54\uC2DC\uC9C0",
    icon: <Chats size={20} />
  }];
  return <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={`${member.name} 회원 상세`} style={{
    zIndex: 1100
  }}>
            <div className="detail-modal-container">
                {/* Header */}
                <div className="detail-modal-header">
                    <div>
                        <h2>
                            {member.name}
                            <span className="phone">{formatPhone(member.phone)}</span>
                            <div className="branch-badge" style={{
              background: getBranchColor(member.homeBranch || member.branchId)
            }}>
                                {getBranchName(member.homeBranch || member.branchId)}
                            </div>

                            {member.pushEnabled !== false && pushTokens.some(t => t.memberId === member.id) && <div className="status-badge status-badge--push">
                                    <BellRinging size={12} weight="fill" />{t("g_bf6c29") || t("g_bf6c29") || t("g_bf6c29") || t("g_bf6c29") || t("g_bf6c29") || "\uD478\uC2DC ON"}</div>}

                            {member.hasFaceDescriptor && <>
                                    <div className="status-badge status-badge--face">{t("g_3d226c") || t("g_3d226c") || t("g_3d226c") || t("g_3d226c") || t("g_3d226c") || "\uD83D\uDCF8 AI \uC778\uC2DD \uAC00\uB2A5"}</div>
                                    {member.faceUpdatedAt && <span style={{
                fontSize: '0.65rem',
                opacity: 0.5,
                fontWeight: 'normal',
                transform: 'translateY(2px)'
              }}>{t("g_f68a93") || t("g_f68a93") || t("g_f68a93") || t("g_f68a93") || t("g_f68a93") || "(\uD559\uC2B5\uC77C:"}{new Date(member.faceUpdatedAt).toLocaleDateString('ko-KR', {
                  timeZone: 'Asia/Seoul'
                })})
                                        </span>}
                                </>}

                            {member.holdStatus === 'holding' && <div className="status-badge status-badge--holding">{t("g_1aeeda") || t("g_1aeeda") || t("g_1aeeda") || t("g_1aeeda") || t("g_1aeeda") || "\u23F8\uFE0F \uD640\uB529 \uC911"}{member.holdStartDate && `(${member.holdStartDate}~)`}
                                </div>}
                        </h2>
                        {member.role === 'instructor' ? <div style={{
            fontSize: '0.85rem',
            color: '#FBBF24',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '6px',
            fontWeight: 'bold'
          }}>{t("g_fff89e") || t("g_fff89e") || t("g_fff89e") || t("g_fff89e") || t("g_fff89e") || "\uC120\uC0DD\uB2D8 (\uD478\uC2DC \uC218\uC2E0 \uC804\uC6A9 \uD504\uB85C\uD544)"}</div> : <div style={{
            fontSize: '0.8rem',
            color: determineStatusColor(member),
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '4px'
          }}>
                                <span>{getMembershipTypeLabel(member.membershipType)} | </span>
                                <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255,255,255,0.1)',
              padding: '2px 8px',
              borderRadius: '12px'
            }}>
                                    <span style={{
                fontWeight: 'bold'
              }}>{member.credits}{t("g_51d327") || t("g_51d327") || t("g_51d327") || t("g_51d327") || t("g_51d327") || "\uD68C \uB0A8\uC74C"}</span>
                                </div>
                                <span> | {member.endDate === 'TBD' ? t("g_227d2d") || t("g_227d2d") || t("g_227d2d") || t("g_227d2d") || t("g_227d2d") || "\uCCAB \uCD9C\uC11D \uC2DC \uAE30\uAC04 \uD655\uC815" : member.endDate ? `~ ${member.endDate}` : t("g_a1a0e2") || t("g_a1a0e2") || t("g_a1a0e2") || t("g_a1a0e2") || t("g_a1a0e2") || "\uB9CC\uB8CC\uC77C \uBBF8\uC124\uC815"}</span>
                                {(() => {
              const todayStr = new Date().toLocaleDateString('sv-SE', {
                timeZone: 'Asia/Seoul'
              });
              if (member.startDate && member.startDate > todayStr) {
                return <span className="status-badge--preregistered">{t("g_7c1bff") || t("g_7c1bff") || t("g_7c1bff") || t("g_7c1bff") || t("g_7c1bff") || "\uB300\uAE30 \uC911 (\uC120\uB4F1\uB85D)"}</span>;
              }
              return null;
            })()}
                            </div>}
                    </div>
                    <button onClick={handleSafeClose} className="detail-modal-close" aria-label={t("g_218e2a") || t("g_218e2a") || t("g_218e2a") || t("g_218e2a") || t("g_218e2a") || "\uB2EB\uAE30"}>
                        <X size={24} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="detail-tab-bar">
                    {tabs.map(tab => <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`detail-tab-btn ${activeTab === tab.id ? 'active' : ''}`}>
                            {tab.icon}
                            {tab.label}
                        </button>)}
                </div>

                {/* Content */}
                <div className="detail-content">
                    {activeTab === 'info' && <div className="fade-in">
                            <MemberInfoTab editData={editData} setEditData={setEditData} onSave={handlePreSave} pricingConfig={pricingConfig} originalData={member} isDirtyByUser={isDirtyByUser} />
                        </div>}
                    {activeTab === 'attendance' && <div className="fade-in">
                            <AttendanceTab logs={memberLogs} member={member} aiAnalysis={aiAnalysis} onAdd={handleManualAttendance} onDelete={handleDeleteAttendance} isSubmitting={isSubmitting} logLimit={logLimit} setLogLimit={setLogLimit} />
                        </div>}
                    {activeTab === 'registration' && <div className="fade-in">
                            <RegistrationTab pricingConfig={pricingConfig} member={member} onAddSalesRecord={onAddSalesRecord} onUpdateMember={onUpdateMember} onManualAttendance={handleManualAttendance} setActiveTab={setActiveTab} setPrefillMessage={setPrefillMessage} />
                        </div>}
                    {activeTab === 'messages' && <div className="fade-in">
                            <MessagesTab memberId={member.id} member={member} prefillMessage={prefillMessage} onPrefillConsumed={() => setPrefillMessage(null)} />
                        </div>}
                </div>
            </div>

            {/* Selective Save Modal */}
            {showChangeModal && <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.85)',
      zIndex: 1200,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
                    <div style={{
        width: '90%',
        maxWidth: '400px',
        background: '#27272a',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
      }}>
                        <h3 style={{
          color: 'white',
          margin: '0 0 15px 0'
        }}>{t("g_7df5bb") || t("g_7df5bb") || t("g_7df5bb") || t("g_7df5bb") || t("g_7df5bb") || "\uBCC0\uACBD \uC0AC\uD56D \uD655\uC778"}</h3>
                        <p style={{
          color: '#a1a1aa',
          fontSize: '0.9rem',
          marginBottom: '15px'
        }}>{t("g_a7da98") || t("g_a7da98") || t("g_a7da98") || t("g_a7da98") || t("g_a7da98") || "\uC800\uC7A5\uD560 \uD56D\uBAA9\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694."}</p>
                        <div style={{
          maxHeight: '300px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          marginBottom: '20px'
        }}>
                            {pendingChanges.map(change => <div key={change.key} onClick={() => {
            const next = new Set(selectedChangeKeys);
            if (next.has(change.key)) next.delete(change.key);else next.add(change.key);
            setSelectedChangeKeys(next);
          }} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px',
            borderRadius: '8px',
            background: selectedChangeKeys.has(change.key) ? 'rgba(var(--primary-rgb), 0.1)' : 'rgba(255,255,255,0.05)',
            border: selectedChangeKeys.has(change.key) ? '1px solid var(--primary-gold)' : '1px solid transparent',
            cursor: 'pointer'
          }} role="button" tabIndex={0} onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              const next = new Set(selectedChangeKeys);
              if (next.has(change.key)) next.delete(change.key);else next.add(change.key);
              setSelectedChangeKeys(next);
            }
          }}>
                                    <div style={{
              color: selectedChangeKeys.has(change.key) ? 'var(--primary-gold)' : '#52525b'
            }}>
                                        {selectedChangeKeys.has(change.key) ? <CheckSquare size={24} weight="fill" /> : <Square size={24} />}
                                    </div>
                                    <div style={{
              flex: 1
            }}>
                                        <div style={{
                color: 'white',
                fontSize: '0.9rem',
                fontWeight: 'bold'
              }}>{change.label}</div>
                                        <div style={{
                fontSize: '0.8rem',
                color: '#a1a1aa'
              }}>
                                            <span style={{
                  textDecoration: 'line-through',
                  opacity: 0.7
                }}>{change.oldValue}</span>{' -> '}
                                            <span style={{
                  color: 'var(--primary-gold)'
                }}>{change.newValue}</span>
                                        </div>
                                    </div>
                                </div>)}
                        </div>
                        <div style={{
          display: 'flex',
          gap: '10px'
        }}>
                            <button onClick={() => setShowChangeModal(false)} style={{
            flex: 1,
            padding: '12px',
            background: 'transparent',
            border: '1px solid #52525b',
            color: '#a1a1aa',
            borderRadius: '8px'
          }}>{t("g_d9de21") || t("g_d9de21") || t("g_d9de21") || t("g_d9de21") || t("g_d9de21") || "\uCDE8\uC18C"}</button>
                            <button onClick={() => {
            const d = {};
            selectedChangeKeys.forEach(key => {
              d[key] = editData[key];
            });
            if (Object.keys(d).length === 0) return;

            // 기간/횟수 변경이 포함되어 있으면 메시지 탭으로 이동 준비
            const hasImportantChange = selectedChangeKeys.has('credits') || selectedChangeKeys.has('endDate') || selectedChangeKeys.has('startDate');
            if (hasImportantChange) {
              const changes = pendingChanges.filter(c => selectedChangeKeys.has(c.key));
              const lines = [`${member.name} 회원님, 수강권 정보가 변경되었습니다.`, '', ...changes.map(c => `• ${c.label}: ${c.oldValue} → ${c.newValue}`), '', t("g_0e7c16") || t("g_0e7c16") || t("g_0e7c16") || t("g_0e7c16") || t("g_0e7c16") || "\uD655\uC778 \uBD80\uD0C1\uB4DC\uB9BD\uB2C8\uB2E4 \uD83D\uDE4F"];
              setPrefillMessage(lines.join('\n'));
            }
            handleFinalSave(d);
            if (hasImportantChange) {
              setTimeout(() => setActiveTab('messages'), 300);
            }
          }} disabled={selectedChangeKeys.size === 0} style={{
            flex: 2,
            padding: '12px',
            borderRadius: '8px',
            border: 'none',
            background: selectedChangeKeys.size > 0 ? 'var(--primary-gold)' : '#3f3f46',
            color: selectedChangeKeys.size > 0 ? 'black' : '#a1a1aa',
            fontWeight: 'bold'
          }}>
                                {selectedChangeKeys.size}{t("g_76b147") || t("g_76b147") || t("g_76b147") || t("g_76b147") || t("g_76b147") || "\uAC1C \uBCC0\uACBD \uC800\uC7A5"}</button>
                        </div>
                    </div>
                </div>}
        </div>;
};
export default AdminMemberDetailModal;