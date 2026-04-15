import { useLanguageStore } from '../../../stores/useLanguageStore';
import { useState, useEffect } from 'react';
import { Trash, PencilSimple, UserFocus, CaretDown, CaretUp } from '@phosphor-icons/react';
import { storageService } from '../../../services/storage';
import { memberService } from '../../../services/memberService';
import { getMembershipLabel } from '../../../utils/membershipLabels';
import { useStudioConfig } from '../../../contexts/StudioContext';
import CustomDatePicker from '../../common/CustomDatePicker';
const inputStyle = {
  padding: '12px',
  borderRadius: '8px',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'white',
  fontSize: '1rem',
  fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif'
};
export const InputGroup = ({
  label,
  value,
  onChange,
  type = 'text',
  options = [],
  ...props
}) => <div style={{
  display: 'flex',
  flexDirection: 'column',
  gap: '5px'
}}>
        <label style={{
    color: '#a1a1aa',
    fontSize: '0.8rem'
  }}>{label}</label>
        {(type === 'text' || type === 'tel') && <input type={type} value={value} onChange={e => onChange(e.target.value)} style={inputStyle} {...props} />}
        {type === 'date' && <CustomDatePicker value={value} onChange={onChange} />}
        {type === 'select' && <select value={value} onChange={e => onChange(e.target.value)} style={inputStyle}>
                {options.map(o => <option key={o.value} value={o.value} style={{
      background: '#333',
      color: 'white'
    }}>{o.label}</option>)}
            </select>}
        {type === 'textarea' && <textarea value={value} onChange={e => onChange(e.target.value)} style={{
    ...inputStyle,
    minHeight: '100px',
    resize: 'vertical'
  }} />}
    </div>;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 블록 1: 기본 정보 (이름/전화/등록일/메모/얼굴인식)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const BasicInfoBlock = ({
  editData,
  setEditData,
  originalData
}) => {
  const t = useLanguageStore(s => s.t);
  const [isDeletingFace, setIsDeletingFace] = useState(false);
  return <div style={{
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  }}>
            <h3 style={{
      color: 'white',
      margin: 0,
      fontSize: '1rem'
    }}>{t("g_a3f257") || "\uAE30\uBCF8 \uC815\uBCF4"}</h3>
            <InputGroup label={t("g_6eb5cd") || "\uC774\uB984"} value={editData.name} onChange={v => setEditData({
      ...editData,
      name: v
    })} lang="ko" autoComplete="off" />
            <InputGroup label={t("g_ba8df0") || "\uC804\uD654\uBC88\uD638"} value={editData.phone} onChange={v => setEditData({
      ...editData,
      phone: v
    })} type="tel" inputMode="numeric" pattern="[0-9]*" autoComplete="off" />
            <InputGroup label={t("g_252d4d") || "\uB4F1\uB85D\uC77C"} value={editData.regDate || ''} onChange={v => setEditData({
      ...editData,
      regDate: v
    })} type="date" />
            <InputGroup label={t("g_9e2b23") || "\uC6D0\uC7A5 \uBA54\uBAA8 / \uAE30\uD0C0 \uD2B9\uC774\uC0AC\uD56D"} value={editData.notes || ''} onChange={v => setEditData({
      ...editData,
      notes: v
    })} type="textarea" />

            {/* 얼굴인식 관리 */}
            {originalData?.role !== 'instructor' && <div style={{
      background: originalData?.hasFaceDescriptor ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255, 255, 255, 0.03)',
      border: originalData?.hasFaceDescriptor ? '1px solid rgba(99, 102, 241, 0.2)' : '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '12px',
      padding: '16px'
    }}>
                    <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
                        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
                            <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: originalData?.hasFaceDescriptor ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: originalData?.hasFaceDescriptor ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)'
          }}>
                                <UserFocus size={20} weight={originalData?.hasFaceDescriptor ? 'fill' : 'regular'} color={originalData?.hasFaceDescriptor ? '#818CF8' : '#52525b'} />
                            </div>
                            <div>
                                <div style={{
              fontSize: '0.9rem',
              fontWeight: 'bold',
              color: originalData?.hasFaceDescriptor ? '#818CF8' : '#71717a'
            }}>
                                    {originalData?.hasFaceDescriptor ? t("g_a27093") || "\uD83D\uDCF8 \uC548\uBA74 \uC778\uC2DD \uB4F1\uB85D \uC644\uB8CC" : t("g_acf8cd") || "\uC548\uBA74 \uB370\uC774\uD130 \uBBF8\uB4F1\uB85D"}
                                </div>
                                {originalData?.hasFaceDescriptor && originalData?.faceUpdatedAt && <div style={{
              fontSize: '0.75rem',
              color: '#a1a1aa',
              marginTop: '2px'
            }}>{t("g_44830b") || "\uD559\uC2B5\uC77C:"}{new Date(originalData.faceUpdatedAt).toLocaleDateString('ko-KR')}
                                    </div>}
                                {!originalData?.hasFaceDescriptor && <div style={{
              fontSize: '0.75rem',
              color: '#52525b',
              marginTop: '2px'
            }}>{t("g_61a0b1") || "\uD0A4\uC624\uC2A4\uD06C \uCCB4\uD06C\uC778\uC5D0\uC11C \uB4F1\uB85D \uAC00\uB2A5"}</div>}
                            </div>
                        </div>
                        {originalData?.hasFaceDescriptor && <button onClick={async () => {
          if (!confirm(t("g_c1b61b") || "\uC548\uBA74 \uC778\uC2DD \uB370\uC774\uD130\uB97C \uC0AD\uC81C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?\n\n\uC0AD\uC81C \uD6C4 \uD0A4\uC624\uC2A4\uD06C\uC5D0\uC11C \uB2E4\uC2DC \uB4F1\uB85D\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.")) return;
          setIsDeletingFace(true);
          try {
            const result = await memberService.deleteFaceDescriptor(originalData.id);
            if (result.success) {
              alert(t("g_cf44fe") || "\uC548\uBA74 \uC778\uC2DD \uB370\uC774\uD130\uAC00 \uC0AD\uC81C\uB418\uC5C8\uC2B5\uB2C8\uB2E4.\n\uD0A4\uC624\uC2A4\uD06C\uC5D0\uC11C \uB2E4\uC2DC \uB4F1\uB85D\uD574\uC8FC\uC138\uC694.");
              storageService.notifyListeners('members');
            } else {
              alert((t("g_74d6f6") || "\uC0AD\uC81C\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4: ") + (result.error || t("g_053d5f") || "\uC54C \uC218 \uC5C6\uB294 \uC624\uB958"));
            }
          } catch (e) {
            console.error('Face delete failed:', e);
            alert(t("g_54e78b") || "\uC0AD\uC81C \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.");
          } finally {
            setIsDeletingFace(false);
          }
        }} disabled={isDeletingFace} style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#ef4444',
          padding: '8px 14px',
          borderRadius: '8px',
          fontSize: '0.8rem',
          fontWeight: 'bold',
          cursor: isDeletingFace ? 'not-allowed' : 'pointer',
          opacity: isDeletingFace ? 0.5 : 1,
          display: 'flex',
          alignItems: 'center',
          gap: '5px'
        }}>
                                <Trash size={14} /> {isDeletingFace ? t("g_adf9c4") || "\uC0AD\uC81C \uC911..." : t("g_ac947d") || "\uC0AD\uC81C \uD6C4 \uC7AC\uB4F1\uB85D"}
                            </button>}
                    </div>
                </div>}
        </div>;
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 블록 1.5: 관리자 수동 홀딩
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const AdminHoldBlock = ({
  originalData
}) => {
  const t = useLanguageStore(s => s.t);
  const [isHolding, setIsHolding] = useState(false);
  const [holdLoading, setHoldLoading] = useState(false);

  // Custom Modal States
  const [modalConfig, setModalConfig] = useState(null); // null | { type: 'apply' | 'release' }
  const [holdDaysText, setHoldDaysText] = useState('14');
  useEffect(() => {
    setIsHolding(originalData?.holdStatus === 'holding');
  }, [originalData?.holdStatus]);
  const handleHoldToggleClick = () => {
    if (!originalData?.id) return;
    if (isHolding) {
      setModalConfig({
        type: 'release'
      });
    } else {
      setHoldDaysText('14');
      setModalConfig({
        type: 'apply'
      });
    }
  };
  const executeReleaseHold = async () => {
    setModalConfig(null);
    setHoldLoading(true);
    try {
      const today = new Date().toLocaleDateString('sv-SE', {
        timeZone: 'Asia/Seoul'
      });
      const holdStart = new Date(originalData.holdStartDate + 'T00:00:00+09:00');
      const todayDate = new Date(today + 'T00:00:00+09:00');
      let actualHoldDays = Math.max(1, Math.round((todayDate - holdStart) / (1000 * 60 * 60 * 24)));
      if (originalData.holdRequestedDays) {
        actualHoldDays = Math.min(actualHoldDays, originalData.holdRequestedDays);
      }
      let newEndDate = originalData.endDate;
      if (originalData.endDate && originalData.endDate !== 'TBD' && originalData.endDate !== 'unlimited') {
        const currentEnd = new Date(originalData.endDate);
        currentEnd.setDate(currentEnd.getDate() + actualHoldDays);
        newEndDate = currentEnd.toLocaleDateString('sv-SE', {
          timeZone: 'Asia/Seoul'
        });
      }
      const history = [...(originalData.holdHistory || [])];
      if (history.length > 0 && !history[history.length - 1].releasedAt) {
        history[history.length - 1].releasedAt = new Date().toISOString();
        history[history.length - 1].actualDays = actualHoldDays;
      }
      await memberService.updateMember(originalData.id, {
        holdStatus: null,
        holdStartDate: null,
        holdRequestedDays: null,
        endDate: newEndDate,
        holdHistory: history
      });
      alert(`✅ 성공적으로 수동 해제되었으며, ${actualHoldDays}일 만큼 만료일이 연장되었습니다.`);
    } catch (e) {
      alert((t("g_9c393f") || "\uD574\uC81C \uC911 \uC624\uB958 \uBC1C\uC0DD: ") + e.message);
    } finally {
      setHoldLoading(false);
    }
  };
  const executeApplyHold = async () => {
    setModalConfig(null);
    setHoldLoading(true);
    try {
      const today = new Date().toLocaleDateString('sv-SE', {
        timeZone: 'Asia/Seoul'
      });
      const history = [...(originalData.holdHistory || [])];
      history.push({
        startDate: today,
        appliedAt: new Date().toISOString(),
        appliedByAdmin: true
      });
      await memberService.updateMember(originalData.id, {
        holdStatus: 'holding',
        holdStartDate: today,
        holdHistory: history
      });
      alert(`✅ 성공적으로 수강권 홀딩이 시작되었습니다!\n\n회원 상태가 '홀딩 일시정지 중'으로 변경되었으며, 회원이 복귀하여 첫 출석체크를 하는 순간 홀딩이 해제되고 쉰 날짜만큼 연장됩니다.`);
    } catch (e) {
      alert((t("g_22102b") || "\uC801\uC6A9 \uC911 \uC624\uB958 \uBC1C\uC0DD: ") + e.message);
    } finally {
      setHoldLoading(false);
    }
  };
  return <>
            <div style={{
      background: 'rgba(251, 146, 60, 0.05)',
      border: '1px solid rgba(251, 146, 60, 0.2)',
      borderRadius: '12px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    }}>
                <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
                    <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
                        <span style={{
            fontSize: '1rem'
          }}>⏸️</span>
                        <span style={{
            fontSize: '0.85rem',
            color: '#fb923c',
            fontWeight: 'bold'
          }}>
                            {isHolding ? `현재 홀딩 중 (${originalData.holdStartDate} ~ )` : t("g_d09056") || "\uAD00\uB9AC\uC790 \uAD8C\uD55C \uD640\uB529 (\uC77C\uC2DC\uC815\uC9C0)"}
                        </span>
                    </div>
                    <button onClick={handleHoldToggleClick} disabled={holdLoading} style={{
          padding: '6px 12px',
          borderRadius: '6px',
          fontSize: '0.8rem',
          fontWeight: 'bold',
          border: 'none',
          background: isHolding ? 'rgba(239, 68, 68, 0.2)' : '#fb923c',
          color: isHolding ? '#ef4444' : 'white',
          cursor: holdLoading ? 'not-allowed' : 'pointer'
        }}>
                        {holdLoading ? t("g_a8d064") || "\uCC98\uB9AC \uC911..." : isHolding ? t("g_fc86f2") || "\uD640\uB529 \uD574\uC81C" : t("g_9e9f25") || "\uD640\uB529 \uC801\uC6A9"}
                    </button>
                </div>
                {!isHolding && <div style={{
        fontSize: '0.75rem',
        color: 'rgba(255,255,255,0.5)',
        lineHeight: '1.4'
      }}>{t("g_245159") || "\uD68C\uC6D0\uC758 \uC571\uC5D0\uC11C '\uD68C\uC6D0 \uC790\uAC00 \uD640\uB529' \uC124\uC815\uC744 \uCF1C\uC9C0 \uC54A\uB354\uB77C\uB3C4 \uC774 \uD654\uBA74\uC5D0\uC11C \uAD00\uB9AC\uC790\uAC00 \uC9C1\uC811 \uC218\uAC15\uAD8C\uC744 \uC77C\uC2DC\uC815\uC9C0\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4."}</div>}
            </div>

            {/* Custom Modals */}
            {modalConfig?.type === 'apply' && <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
                    <div style={{
        background: '#18181b',
        border: '1px solid #3f3f46',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '400px',
        padding: '24px',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
      }}>
                        <h3 style={{
          margin: '0 0 16px',
          color: 'white',
          fontSize: '1.2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
                            <span style={{
            color: '#fb923c'
          }}>⏸️</span>{t("g_f7f421") || "\uAD00\uB9AC\uC790 \uC218\uB3D9 \uD640\uB529 \uC801\uC6A9"}</h3>
                        <p style={{
          margin: '0 0 16px',
          color: '#a1a1aa',
          fontSize: '0.9rem'
        }}>{t("g_ff5a96") || "\uD68C\uC6D0\uC758 \uC218\uAC15\uAD8C\uC744 \uC77C\uC2DC\uC815\uC9C0 \uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?"}</p>
                        <div style={{
          background: 'rgba(255,255,255,0.03)',
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '24px'
        }}>
                            <p style={{
            margin: '0 0 8px',
            color: '#fb923c',
            fontSize: '0.8rem',
            fontWeight: 'bold'
          }}>{t("g_6187fe") || "\u26A0\uFE0F \uC8FC\uC758\uC0AC\uD56D \uBC0F \uB3D9\uC791 \uBC29\uC2DD"}</p>
                            <ul style={{
            margin: 0,
            paddingLeft: '16px',
            color: '#a1a1aa',
            fontSize: '0.75rem',
            lineHeight: '1.5'
          }}>
                                <li style={{
              marginBottom: '6px'
            }}>{t("g_da67ab") || "\uC801\uC6A9 \uC989\uC2DC \uC218\uAC15\uAD8C \uC774\uC6A9\uC774 \uC815\uC9C0\uB418\uBA70 \uAE30\uAC04 \uCC28\uAC10\uC774 \uBA48\uCDA5\uB2C8\uB2E4."}</li>
                                <li style={{
              marginBottom: '6px'
            }}>{t("g_99a420") || "\uD68C\uC6D0\uC774 \uBCF5\uADC0\uD558\uC5EC"}<strong style={{
                color: 'white'
              }}>{t("g_ff8247") || "\uCC98\uC74C \uCD9C\uC11D\uCCB4\uD06C"}</strong>{t("g_eefcfe") || "\uB97C \uD558\uB294 \uB0A0 \uBC14\uB85C \uD640\uB529\uC774 \uD480\uB9AC\uBA70, \uC26C\uC5C8\uB358 \uAE30\uAC04\uB9CC\uD07C \uC885\uB8CC\uC77C\uC774 \uC790\uB3D9\uC73C\uB85C \uC5F0\uC7A5\uB429\uB2C8\uB2E4."}</li>
                                <li>{t("g_8b5dfb") || "\uC5B8\uC81C\uB4E0 \uC774 \uD654\uBA74\uC5D0\uC11C \uAD00\uB9AC\uC790\uAC00 \uC218\uB3D9\uC73C\uB85C \uD640\uB529\uC744 \uD574\uC81C\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4."}</li>
                            </ul>
                        </div>
                        <div style={{
          display: 'flex',
          gap: '10px'
        }}>
                            <button onClick={() => setModalConfig(null)} style={{
            flex: 1,
            padding: '12px',
            borderRadius: '8px',
            border: 'none',
            background: '#3f3f46',
            color: 'white',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}>{t("g_d9de21") || "\uCDE8\uC18C"}</button>
                            <button onClick={executeApplyHold} style={{
            flex: 1,
            padding: '12px',
            borderRadius: '8px',
            border: 'none',
            background: '#fb923c',
            color: 'white',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}>{t("g_c36eab") || "\uC801\uC6A9\uD558\uAE30"}</button>
                        </div>
                    </div>
                </div>}

            {modalConfig?.type === 'release' && <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
                    <div style={{
        background: '#18181b',
        border: '1px solid #3f3f46',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '400px',
        padding: '24px',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
      }}>
                        <h3 style={{
          margin: '0 0 16px',
          color: 'white',
          fontSize: '1.2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
                            <span style={{
            color: '#ef4444'
          }}>⏹️</span>{t("g_2740a3") || "\uD640\uB529 \uAC15\uC81C \uD574\uC81C"}</h3>
                        <p style={{
          margin: '0 0 20px',
          color: '#d4d4d8',
          fontSize: '0.95rem',
          lineHeight: '1.5'
        }}>{t("g_06726d") || "\uC815\uB9D0 \uD604\uC7AC \uC9C4\uD589 \uC911\uC778 \uD640\uB529\uC744 \uD574\uC81C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?"}</p>
                        <div style={{
          background: 'rgba(239, 68, 68, 0.05)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '24px'
        }}>
                            <p style={{
            margin: '0 0 8px',
            color: '#ef4444',
            fontSize: '0.8rem',
            fontWeight: 'bold'
          }}>{t("g_909c1c") || "\u26A0\uFE0F \uBCC0\uACBD \uC0AC\uD56D"}</p>
                            <p style={{
            margin: 0,
            color: '#a1a1aa',
            fontSize: '0.8rem',
            lineHeight: '1.5'
          }}>{t("g_a0b975") || "\uC9C0\uAE08\uAE4C\uC9C0 \uC26C\uC5C8\uB358 \uC77C\uC218(\uCD5C\uB300 \uD55C\uB3C4 \uB0B4)\uB97C \uACC4\uC0B0\uD558\uC5EC \uC989\uC2DC"}<strong style={{
              color: 'white'
            }}>{t("g_083ccc") || "\uD68C\uC6D0\uAD8C \uB9CC\uB8CC\uC77C\uC744 \uC5F0\uC7A5"}</strong>{t("g_3908a9") || "\uD558\uACE0, \uC0C1\uD0DC\uB97C '\uC774\uC6A9 \uC911'\uC73C\uB85C \uB418\uB3CC\uB9BD\uB2C8\uB2E4."}</p>
                        </div>
                        <div style={{
          display: 'flex',
          gap: '10px'
        }}>
                            <button onClick={() => setModalConfig(null)} style={{
            flex: 1,
            padding: '12px',
            borderRadius: '8px',
            border: 'none',
            background: '#3f3f46',
            color: 'white',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}>{t("g_d9de21") || "\uCDE8\uC18C"}</button>
                            <button onClick={executeReleaseHold} style={{
            flex: 1,
            padding: '12px',
            borderRadius: '8px',
            border: 'none',
            background: '#ef4444',
            color: 'white',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}>{t("g_724f9d") || "\uD574\uC81C\uD558\uAE30"}</button>
                        </div>
                    </div>
                </div>}
        </>;
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 블록 2: 회원권 현황 (읽기전용 카드 + 수동 조정)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const MembershipBlock = ({
  editData,
  setEditData,
  originalData,
  pricingConfig,
  getTypeLabel
}) => {
  const t = useLanguageStore(s => s.t);
  const todayStr = new Date().toLocaleDateString('sv-SE', {
    timeZone: 'Asia/Seoul'
  });
  const upcoming = originalData?.upcomingMembership;

  // 현재 회원권 상태 판정
  const credits = Number(originalData?.credits || 0);
  const endDate = originalData?.endDate;
  const isTBD = endDate === 'TBD';
  let statusLabel = "\uB9CC\uB8CC\uB428";
  let statusColor = '#ef4444';
  if (isTBD) {
    statusLabel = "\uCCAB \uCD9C\uC11D \uB300\uAE30";
    statusColor = 'var(--primary-gold)';
  } else if (originalData?.holdStatus === 'holding') {
    statusLabel = "\uD640\uB529 \uC77C\uC2DC\uC815\uC9C0 \uC911";
    statusColor = '#fb923c';
  } else if (endDate && endDate >= todayStr && credits > 0) {
    statusLabel = "\uC774\uC6A9 \uC911";
    statusColor = '#10b981';
  } else if (endDate && endDate >= todayStr && credits <= 0) {
    statusLabel = "\uD69F\uC218 \uC18C\uC9C4";
    statusColor = '#f59e0b';
  } else if (endDate && endDate < todayStr) {
    statusLabel = "\uAE30\uAC04 \uB9CC\uB8CC";
    statusColor = '#ef4444';
  }
  return <div style={{
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  }}>
            <h3 style={{
      color: 'white',
      margin: 0,
      fontSize: '1rem'
    }}>{t("g_476c3e") || "\uD68C\uC6D0\uAD8C \uD604\uD669"}</h3>

            {/* ── 현재 활성 회원권 카드 ── */}
            <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '12px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }}>
                <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
                    <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
                        <span style={{
            fontSize: '0.75rem',
            background: `${statusColor}20`,
            color: statusColor,
            padding: '3px 10px',
            borderRadius: '6px',
            fontWeight: 'bold',
            border: `1px solid ${statusColor}40`
          }}>
                            {statusLabel}
                        </span>
                        <span style={{
            fontSize: '0.85rem',
            color: 'white',
            fontWeight: '600'
          }}>
                            {getTypeLabel(originalData?.membershipType)}
                        </span>
                    </div>
                    {originalData?.price > 0 && <span style={{
          fontSize: '0.85rem',
          color: 'var(--primary-gold)',
          fontWeight: 'bold'
        }}>
                            {originalData.price.toLocaleString()}{t("g_771dc3") || "\uC6D0"}</span>}
                </div>
                <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '8px'
      }}>
                    <div style={{
          background: 'rgba(0,0,0,0.25)',
          padding: '10px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
                        <div style={{
            fontSize: '0.7rem',
            color: '#71717a',
            marginBottom: '4px'
          }}>{t("g_1b113c") || "\uC2DC\uC791\uC77C"}</div>
                        <div style={{
            fontSize: '0.85rem',
            color: 'white',
            fontWeight: '600'
          }}>
                            {isTBD ? t("g_7128fe") || "\uCCAB \uCD9C\uC11D \uC2DC" : originalData?.startDate || '-'}
                        </div>
                    </div>
                    <div style={{
          background: 'rgba(0,0,0,0.25)',
          padding: '10px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
                        <div style={{
            fontSize: '0.7rem',
            color: '#71717a',
            marginBottom: '4px'
          }}>{t("g_42003a") || "\uC885\uB8CC\uC77C"}</div>
                        <div style={{
            fontSize: '0.85rem',
            color: statusColor,
            fontWeight: '600'
          }}>
                            {isTBD ? t("g_b8e060") || "\uCCAB \uCD9C\uC11D \uC2DC \uD655\uC815" : endDate || '-'}
                        </div>
                    </div>
                    <div style={{
          background: 'rgba(0,0,0,0.25)',
          padding: '10px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
                        <div style={{
            fontSize: '0.7rem',
            color: '#71717a',
            marginBottom: '4px'
          }}>{t("g_34c1e0") || "\uC794\uC5EC"}</div>
                        <div style={{
            fontSize: '0.85rem',
            color: credits <= 2 ? '#f59e0b' : 'white',
            fontWeight: '600'
          }}>
                            {credits >= 999 ? t("g_7fe271") || "\uBB34\uC81C\uD55C" : `${credits}회`}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── 홀딩 내역 ── */}
            {originalData?.holdHistory && originalData.holdHistory.length > 0 && <div style={{
      background: 'rgba(251,146,60,0.08)',
      border: '1px solid rgba(251,146,60,0.25)',
      borderRadius: '12px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      marginTop: '10px'
    }}>
                    <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
                        <span style={{
          fontSize: '0.75rem',
          background: '#fb923c',
          color: '#000',
          padding: '3px 10px',
          borderRadius: '6px',
          fontWeight: 'bold'
        }}>{t("g_ae86ba") || "\uD640\uB529 \uB0B4\uC5ED"}</span>
                        <span style={{
          fontSize: '0.8rem',
          color: '#fb923c',
          fontWeight: '600'
        }}>{t("g_97dfc6") || "\uCD1D"}{originalData.holdHistory.length}{t("g_f14641") || "\uD68C \uAE30\uB85D"}</span>
                    </div>
                    <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
      }}>
                        {originalData.holdHistory.map((h, i) => <div key={i} style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(0,0,0,0.2)',
          padding: '10px',
          borderRadius: '8px'
        }}>
                                <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '2px'
          }}>
                                    <span style={{
              color: '#fb923c',
              fontSize: '0.85rem',
              fontWeight: 'bold'
            }}>
                                        {h.startDate.replace(/-/g, '.')} ~ {h.releasedAt ? new Date(h.releasedAt).toLocaleDateString('sv-SE', {
                timeZone: 'Asia/Seoul'
              }).replace(/-/g, '.') : t("g_e7755c") || "\uD604\uC7AC"}
                                    </span>
                                    <span style={{
              color: '#a1a1aa',
              fontSize: '0.75rem'
            }}>{h.appliedByAdmin ? t("g_ee34b0") || "\uAD00\uB9AC\uC790 \uC218\uB3D9 \uC815\uC9C0" : t("g_c2d09d") || "\uC2DC\uC2A4\uD15C \uCC98\uB9AC"}</span>
                                </div>
                                <div style={{
            color: 'white',
            fontSize: '0.85rem',
            fontWeight: 'bold',
            background: 'rgba(255,255,255,0.1)',
            padding: '6px 10px',
            borderRadius: '6px'
          }}>
                                    {h.releasedAt ? `${h.actualDays || '?'}일 정지 완료` : t("g_deb86e") || "\uC815\uC9C0 \uC911"}
                                </div>
                            </div>)}
                    </div>
                </div>}

            {/* ── 다가올 수강권 (선등록) ── */}
            {upcoming && <div style={{
      background: 'rgba(212,175,55,0.08)',
      border: '1px solid rgba(212,175,55,0.25)',
      borderRadius: '12px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    }}>
                    <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
                        <span style={{
          fontSize: '0.75rem',
          background: 'var(--primary-gold)',
          color: '#000',
          padding: '3px 10px',
          borderRadius: '6px',
          fontWeight: 'bold'
        }}>{t("g_bfdbd3") || "\uB2E4\uAC00\uC62C \uC218\uAC15\uAD8C (\uC120\uB4F1\uB85D)"}</span>
                        {upcoming.membershipType && <span style={{
          fontSize: '0.8rem',
          color: 'var(--primary-gold)',
          fontWeight: '600'
        }}>
                                {getTypeLabel(upcoming.membershipType)}
                            </span>}
                    </div>
                    <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '8px'
      }}>
                        <div style={{
          background: 'rgba(0,0,0,0.2)',
          padding: '10px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
                            <div style={{
            fontSize: '0.7rem',
            color: '#a1a1aa',
            marginBottom: '4px'
          }}>{t("g_1b113c") || "\uC2DC\uC791\uC77C"}</div>
                            <div style={{
            fontSize: '0.85rem',
            color: 'var(--primary-gold)',
            fontWeight: 'bold'
          }}>
                                {upcoming.startDate === 'TBD' ? t("g_7128fe") || "\uCCAB \uCD9C\uC11D \uC2DC" : upcoming.startDate}
                            </div>
                        </div>
                        <div style={{
          background: 'rgba(0,0,0,0.2)',
          padding: '10px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
                            <div style={{
            fontSize: '0.7rem',
            color: '#a1a1aa',
            marginBottom: '4px'
          }}>{t("g_42003a") || "\uC885\uB8CC\uC77C"}</div>
                            <div style={{
            fontSize: '0.85rem',
            color: 'var(--primary-gold)',
            fontWeight: 'bold'
          }}>
                                {upcoming.endDate === 'TBD' ? t("g_b8e060") || "\uCCAB \uCD9C\uC11D \uC2DC \uD655\uC815" : upcoming.endDate}
                            </div>
                        </div>
                        <div style={{
          background: 'rgba(0,0,0,0.2)',
          padding: '10px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
                            <div style={{
            fontSize: '0.7rem',
            color: '#a1a1aa',
            marginBottom: '4px'
          }}>{t("g_705bfc") || "\uD69F\uC218"}</div>
                            <div style={{
            fontSize: '0.85rem',
            color: 'var(--primary-gold)',
            fontWeight: 'bold'
          }}>
                                {upcoming.credits >= 999 ? t("g_7fe271") || "\uBB34\uC81C\uD55C" : `${upcoming.credits}회`}
                            </div>
                        </div>
                    </div>
                    {upcoming.price > 0 && <div style={{
        fontSize: '0.8rem',
        color: '#a1a1aa',
        textAlign: 'right'
      }}>{t("g_74b466") || "\uACB0\uC81C \uAE08\uC561:"}<span style={{
          color: 'var(--primary-gold)',
          fontWeight: 'bold'
        }}>{upcoming.price.toLocaleString()}{t("g_771dc3") || "\uC6D0"}</span>
                        </div>}
                </div>}

            {/* ── 관리자 수동 조정 ── */}
            {originalData?.role !== 'instructor' && <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '12px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    }}>
                    <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
                        <PencilSimple size={16} color="#a1a1aa" />
                        <span style={{
          fontSize: '0.8rem',
          color: '#a1a1aa',
          fontWeight: '600'
        }}>{t("g_85cc35") || "\uAD00\uB9AC\uC790 \uC218\uB3D9 \uC870\uC815"}</span>
                    </div>
                    <InputGroup label={t("g_c4edbb") || "\uD68C\uC6D0\uAD8C \uAD6C\uBD84"} value={editData.membershipType} onChange={v => setEditData({
        ...editData,
        membershipType: v
      })} type="select" options={(() => {
        const pricingKeys = Object.keys(pricingConfig || {}).filter(k => k !== '_meta');
        const opts = pricingKeys.map(k => ({
          value: k,
          label: getTypeLabel(k)
        }));
        const currentType = editData.membershipType;
        if (currentType && !pricingKeys.includes(currentType)) {
          opts.unshift({
            value: currentType,
            label: `${getTypeLabel(currentType)} (미등록)`
          });
        }
        return opts;
      })()} />
                    <InputGroup label={t("g_af273f") || "\uC138\uBD80 \uC774\uC6A9\uAD8C"} value={editData.subject || ''} onChange={v => setEditData({
        ...editData,
        subject: v
      })} />
                    <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '10px'
      }}>
                        <InputGroup label={t("g_1b113c") || "\uC2DC\uC791\uC77C"} value={editData.startDate || ''} onChange={v => {
          const updates = {
            startDate: v
          };
          if (v && v !== 'TBD' && editData.duration) {
            const start = new Date(v + 'T00:00:00+09:00');
            const end = new Date(start);
            end.setMonth(end.getMonth() + (Number(editData.duration) || 1)); // [NOTE] duration이 DB에 올바르게 저장되어야 정상 동작 (MemberAddModal 수정 참조)
            end.setDate(end.getDate() - 1);
            const newEndDate = end.toLocaleDateString('sv-SE', {
              timeZone: 'Asia/Seoul'
            });
            if (confirm((t('confirm_adjust_end_date') || `Adjust end date to ${newEndDate}?`).replace('{date}', newEndDate))) {
              updates.endDate = newEndDate;
            }
          }
          setEditData({
            ...editData,
            ...updates
          });
        }} type="date" />
                        <InputGroup label={t("g_42003a") || "\uC885\uB8CC\uC77C"} value={editData.endDate || ''} onChange={v => setEditData({
          ...editData,
          endDate: v
        })} type="date" />
                    </div>
                    <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(0,0,0,0.2)',
        padding: '10px',
        borderRadius: '8px'
      }}>
                        <span style={{
          color: '#a1a1aa',
          fontSize: '0.8rem'
        }}>{t("g_386745") || "\uC794\uC5EC \uD69F\uC218"}</span>
                        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
                            <button onClick={() => setEditData({
            ...editData,
            credits: Math.max(0, (editData.credits || 0) - 1)
          })} style={{
            padding: '4px 8px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '4px',
            color: 'white',
            border: 'none',
            cursor: 'pointer'
          }}>-</button>
                            <span style={{
            fontWeight: 'bold',
            color: 'white',
            minWidth: '30px',
            textAlign: 'center'
          }}>{editData.credits}</span>
                            <button onClick={() => setEditData({
            ...editData,
            credits: (editData.credits || 0) + 1
          })} style={{
            padding: '4px 8px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '4px',
            color: 'white',
            border: 'none',
            cursor: 'pointer'
          }}>+</button>
                        </div>
                    </div>
                    <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(0,0,0,0.2)',
        padding: '10px',
        borderRadius: '8px'
      }}>
                        <span style={{
          color: '#a1a1aa',
          fontSize: '0.8rem'
        }}>{t("g_ada266") || "\uACB0\uC81C \uAE08\uC561"}</span>
                        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px'
        }}>
                            <input type="text" value={(editData.price || 0).toLocaleString()} onChange={e => {
            const val = Number(e.target.value.replace(/[^0-9]/g, ''));
            setEditData({
              ...editData,
              price: val
            });
          }} style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'var(--primary-gold)',
            fontSize: '1rem',
            fontWeight: 'bold',
            textAlign: 'right',
            width: '120px',
            padding: '5px',
            borderRadius: '6px'
          }} />
                            <span style={{
            color: '#a1a1aa',
            fontSize: '0.9rem'
          }}>{t("g_771dc3") || "\uC6D0"}</span>
                        </div>
                    </div>
                </div>}
        </div>;
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 블록 3: 결제 이력 (접이식) -> 수강권 타임라인
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const PaymentHistoryBlock = ({
  originalData,
  getTypeLabel
}) => {
  const t = useLanguageStore(s => s.t);
  const [isOpen, setIsOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [editingSale, setEditingSale] = useState(null);
  const [saleEditData, setSaleEditData] = useState(null);
  const [isSavingSale, setIsSavingSale] = useState(false);
  useEffect(() => {
    if (!originalData?.id) return;
    let isMounted = true;
    const fetchHistory = async () => {
      try {
        const data = await storageService.getSalesHistory(originalData.id);
        if (!isMounted) return;
        const sorted = [...data].sort((a, b) => new Date(b.timestamp || b.date).getTime() - new Date(a.timestamp || a.date).getTime());
        setHistory(sorted);
      } catch (e) {
        console.error("Fetch sales history failed:", e);
      }
    };
    fetchHistory();
    return () => {
      isMounted = false;
    };
  }, [originalData?.id, isSavingSale]);
  const handleSaleSave = async () => {
    try {
      setIsSavingSale(true);
      const updates = {};
      if (saleEditData.startDate !== editingSale.startDate) updates.startDate = saleEditData.startDate;
      if (saleEditData.endDate !== editingSale.endDate) updates.endDate = saleEditData.endDate;
      if (saleEditData.amount !== editingSale.amount) updates.amount = saleEditData.amount;
      if (saleEditData.item !== editingSale.item) updates.item = saleEditData.item;
      if (saleEditData.method !== editingSale.method) updates.method = saleEditData.method;
      if (Object.keys(updates).length > 0) {
        const hasDateChange = updates.startDate !== undefined || updates.endDate !== undefined;
        let syncTarget = null; // 'current' | 'upcoming' | null

        if (hasDateChange) {
          // 확인: 이 영수증이 현재 회원권인지, 다가올 회원권인지 추정
          if (originalData.startDate === editingSale.startDate && originalData.endDate === editingSale.endDate) syncTarget = 'current';else if (originalData.upcomingMembership?.startDate === editingSale.startDate && originalData.upcomingMembership?.endDate === editingSale.endDate) syncTarget = 'upcoming';
          if (syncTarget) {
            const targetName = syncTarget === 'current' ? t("g_db09e2") || "\uD604\uC7AC \uC774\uC6A9 \uC911\uC778 \uC218\uAC15\uAD8C" : t("g_10ae49") || "\uB2E4\uAC00\uC62C \uC218\uAC15\uAD8C(\uC120\uB4F1\uB85D)";
            if (confirm((t('confirm_sync_receipt') || `Receipt dates updated. Sync [${targetName}] period to match?`).replace('{target}', targetName))) {
              const memberUpdates = {};
              if (syncTarget === 'current') {
                if (updates.startDate !== undefined) memberUpdates.startDate = updates.startDate;
                if (updates.endDate !== undefined) memberUpdates.endDate = updates.endDate;
              } else {
                memberUpdates.upcomingMembership = {
                  ...originalData.upcomingMembership
                };
                if (updates.startDate !== undefined) memberUpdates.upcomingMembership.startDate = updates.startDate;
                if (updates.endDate !== undefined) memberUpdates.upcomingMembership.endDate = updates.endDate;
              }
              await memberService.updateMember(originalData.id, memberUpdates);
              alert((t('alert_sync_success') || `[${targetName}] dates synced successfully.`).replace('{target}', targetName));
              // 상태 리로드를 위해 이벤트를 좀 트리거해주는게 좋지만, 일단 storageService 리스너가 처리해줌
              storageService.notifyListeners('members');
            }
          } else {
            alert(t("g_540230") || "\uC601\uC218\uC99D \uB0B4\uC5ED\uB9CC \uBCC0\uACBD\uB418\uC5C8\uC2B5\uB2C8\uB2E4.\n(\uCC38\uACE0: \uD68C\uC6D0\uC758 \uC2E4\uC81C \uCD9C\uC11D \uAE30\uAC04 \uBCC0\uACBD\uC774 \uD544\uC694\uD558\uBA74 \uC0C1\uB2E8\uC758 \"\uC218\uB3D9 \uC870\uC815\"\uC744 \uC774\uC6A9\uD558\uC138\uC694.)");
          }
        }
        await storageService.updateSalesRecord(editingSale.id, updates);
      }
      setEditingSale(null);
      setSaleEditData(null);
    } catch (e) {
      alert(t("g_94289f") || "\uACB0\uC81C \uB0B4\uC5ED \uC800\uC7A5\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.");
    } finally {
      setIsSavingSale(false);
    }
  };
  const handleDeleteSale = async (salesId, itemName) => {
    if (!confirm((t('confirm_delete_payment') || `Delete "${itemName}"?\n\nDeleted records can be restored from Trash.`).replace('{item}', itemName))) return;
    try {
      await storageService.deleteSalesRecord(salesId);
      setHistory(prev => prev.filter(h => h.id !== salesId));
    } catch (e) {
      alert((t("g_11a132") || "\uC0AD\uC81C \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4: ") + e.message);
    }
  };
  const getSaleBadge = record => {
    const up = originalData?.upcomingMembership;
    if (up && record.startDate === up.startDate && record.endDate === up.endDate && record.amount === up.price) {
      return {
        label: t("g_6402ed") || "\uC774\uC6A9 \uB300\uAE30",
        bg: 'rgba(250, 204, 21, 0.15)',
        color: '#facc15',
        border: '1px solid rgba(250, 204, 21, 0.3)'
      };
    }
    if (originalData?.startDate === record.startDate && originalData?.endDate === record.endDate) {
      return {
        label: t("g_e6067e") || "\uD604\uC7AC \uC774\uC6A9",
        bg: 'rgba(74, 222, 128, 0.15)',
        color: '#4ade80',
        border: '1px solid rgba(74, 222, 128, 0.3)'
      };
    }
    const todayStr = new Date().toLocaleDateString('sv-SE', {
      timeZone: 'Asia/Seoul'
    });
    if (record.endDate && record.endDate !== 'TBD' && record.endDate < todayStr) {
      return {
        label: t("g_fab709") || "\uAE30\uAC04 \uB9CC\uB8CC",
        bg: 'rgba(255,255,255,0.05)',
        color: '#a1a1aa',
        border: '1px solid rgba(255,255,255,0.1)'
      };
    }
    return null; // 뱃지 없음
  };
  return <div>
            {/* 접이식 헤더 */}
            <button onClick={() => setIsOpen(!isOpen)} style={{
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '14px 16px',
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '12px',
      cursor: 'pointer',
      color: 'white'
    }}>
                <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
                    <h3 style={{
          margin: 0,
          fontSize: '1rem',
          color: 'white'
        }}>{t("g_de09c9") || "\uC218\uAC15\uAD8C \uBC0F \uACB0\uC81C (\uD0C0\uC784\uB77C\uC778)"}</h3>
                    <span style={{
          fontSize: '0.75rem',
          color: '#71717a',
          background: 'rgba(255,255,255,0.08)',
          padding: '2px 8px',
          borderRadius: '10px'
        }}>
                        {history.length}{t("g_230561") || "\uAC74"}</span>
                </div>
                {isOpen ? <CaretUp size={18} color="#a1a1aa" /> : <CaretDown size={18} color="#a1a1aa" />}
            </button>

            {/* 접이식 내용 */}
            {isOpen && <div style={{
      marginTop: '10px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }}>
                    {/* 결제건 수정 폼 */}
                    {editingSale && saleEditData && <div style={{
        background: 'rgba(var(--primary-rgb), 0.05)',
        border: '1px solid var(--primary-gold)',
        borderRadius: '12px',
        padding: '15px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
                            <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
                                <h4 style={{
            color: 'var(--primary-gold)',
            margin: 0,
            fontSize: '0.9rem'
          }}>
                                    <PencilSimple size={16} style={{
              marginRight: '6px'
            }} />{t("g_e32a65") || "\uACB0\uC81C \uB0B4\uC5ED \uC218\uC815"}</h4>
                                <button onClick={() => {
            setEditingSale(null);
            setSaleEditData(null);
          }} style={{
            background: 'none',
            border: '1px solid #52525b',
            color: '#a1a1aa',
            padding: '4px 10px',
            borderRadius: '4px',
            fontSize: '0.8rem',
            cursor: 'pointer'
          }}>{t("g_d9de21") || "\uCDE8\uC18C"}</button>
                            </div>
                            <InputGroup label={t("g_7faa31") || "\uC218\uAC15\uAD8C \uD56D\uBAA9 \uC774\uB984"} value={saleEditData.item || ''} onChange={v => setSaleEditData({
          ...saleEditData,
          item: v
        })} />
                            <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '10px'
        }}>
                                <InputGroup label={t("g_1b113c") || "\uC2DC\uC791\uC77C"} value={saleEditData.startDate || ''} onChange={v => setSaleEditData({
            ...saleEditData,
            startDate: v
          })} type="date" />
                                <InputGroup label={t("g_42003a") || "\uC885\uB8CC\uC77C"} value={saleEditData.endDate || ''} onChange={v => setSaleEditData({
            ...saleEditData,
            endDate: v
          })} type="date" />
                            </div>
                            <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '10px'
        }}>
                                <InputGroup label={t("g_8cdf4b") || "\uACB0\uC81C\uC218\uB2E8"} value={saleEditData.method || ''} onChange={v => setSaleEditData({
            ...saleEditData,
            method: v
          })} type="select" options={[{
            label: t("g_948cb2") || "\uD604\uAE08",
            value: 'cash'
          }, {
            label: t("g_0b2312") || "\uC774\uCCB4",
            value: 'transfer'
          }, {
            label: t("g_7e9cf3") || "\uCE74\uB4DC",
            value: 'card'
          }]} />
                                <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '5px'
          }}>
                                    <label style={{
              color: '#a1a1aa',
              fontSize: '0.8rem'
            }}>{t("g_ada266") || "\uACB0\uC81C \uAE08\uC561"}</label>
                                    <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
                                        <input type="text" value={(saleEditData.amount || 0).toLocaleString()} onChange={e => setSaleEditData({
                ...saleEditData,
                amount: Number(e.target.value.replace(/[^0-9]/g, ''))
              })} style={{
                ...inputStyle,
                flex: 1,
                textAlign: 'right',
                color: 'var(--primary-gold)',
                fontWeight: 'bold'
              }} />
                                        <span style={{
                color: '#a1a1aa'
              }}>{t("g_771dc3") || "\uC6D0"}</span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={handleSaleSave} disabled={isSavingSale} style={{
          padding: '12px',
          borderRadius: '8px',
          border: 'none',
          background: 'var(--primary-gold)',
          color: 'var(--text-on-primary)',
          fontWeight: 'bold',
          fontSize: '0.95rem',
          cursor: 'pointer'
        }}>
                                {isSavingSale ? t("g_923cf9") || "\uC800\uC7A5 \uC911..." : t("g_4c0952") || "\uACB0\uC81C \uB0B4\uC5ED \uC800\uC7A5"}
                            </button>
                        </div>}

                    {/* 결제 기록 리스트 */}
                    {history.length === 0 ? <div style={{
        textAlign: 'center',
        color: '#71717a',
        padding: '20px',
        fontSize: '0.9rem'
      }}>{t("g_3efebb") || "\uACB0\uC81C \uB0B4\uC5ED\uC774 \uC5C6\uC2B5\uB2C8\uB2E4."}</div> : history.map(record => {
        const dDate = record.timestamp ? new Date(record.timestamp) : new Date(record.date || Date.now());
        const isEditing = editingSale?.id === record.id;
        const badge = getSaleBadge(record);
        return <div key={record.id} style={{
          background: isEditing ? 'rgba(var(--primary-rgb), 0.1)' : 'rgba(255,255,255,0.03)',
          border: isEditing ? '1px solid var(--primary-gold)' : '1px solid rgba(255,255,255,0.06)',
          borderRadius: '10px',
          padding: '14px',
          transition: 'all 0.2s',
          borderLeft: badge ? `3px solid ${badge.color}` : '1px solid rgba(255,255,255,0.06)'
        }}>
                                    <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '8px'
          }}>
                                        <div>
                                            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '4px'
              }}>
                                                {badge && <span style={{
                  background: badge.bg,
                  border: badge.border,
                  color: badge.color,
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontSize: '0.7rem',
                  fontWeight: 'bold'
                }}>
                                                        {badge.label}
                                                    </span>}
                                                <span style={{
                  color: 'white',
                  fontWeight: '600',
                  fontSize: '0.9rem'
                }}>{record.item || t("g_80601c") || "\uC54C \uC218 \uC5C6\uC74C"}</span>
                                            </div>
                                            {record.startDate && record.endDate && <div style={{
                fontSize: '0.75rem',
                color: '#71717a',
                marginTop: '3px'
              }}>
                                                    📅 {record.startDate === 'TBD' ? t("g_83d1aa") || "\uC2DC\uC791\uC77C \uBBF8\uC815" : record.startDate} ~ {record.endDate === 'TBD' ? t("g_b8e060") || "\uCCAB \uCD9C\uC11D \uC2DC \uD655\uC815" : record.endDate}
                                                </div>}
                                        </div>
                                        <span style={{
              color: 'var(--primary-gold)',
              fontWeight: 'bold',
              fontSize: '0.9rem'
            }}>
                                            {(record.amount || 0).toLocaleString()}{t("g_771dc3") || "\uC6D0"}</span>
                                    </div>
                                    <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
                                        <div style={{
              fontSize: '0.78rem',
              color: '#52525b'
            }}>
                                            {record.method === 'transfer' ? t("g_0b2312") || "\uC774\uCCB4" : record.method === 'cash' ? t("g_948cb2") || "\uD604\uAE08" : record.method === 'card' ? t("g_7e9cf3") || "\uCE74\uB4DC" : record.method || ''} · {dDate.toLocaleDateString('ko-KR')}
                                        </div>
                                        <div style={{
              display: 'flex',
              gap: '6px'
            }}>
                                            <button onClick={e => {
                e.stopPropagation();
                setEditingSale(record);
                setSaleEditData({
                  startDate: record.startDate || '',
                  endDate: record.endDate || '',
                  amount: record.amount !== undefined ? record.amount : 0,
                  item: record.item || '',
                  method: record.method || ''
                });
              }} style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#a1a1aa',
                padding: '4px 8px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                fontSize: '0.72rem',
                cursor: 'pointer'
              }}>
                                                <PencilSimple size={12} />{t("g_ad7560") || "\uC218\uC815"}</button>
                                            <button onClick={e => {
                e.stopPropagation();
                handleDeleteSale(record.id, record.item);
              }} style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                padding: '4px 8px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                fontSize: '0.72rem',
                cursor: 'pointer'
              }}>
                                                <Trash size={12} />{t("g_30e15a") || "\uC0AD\uC81C"}</button>
                                        </div>
                                    </div>
                                </div>;
      })}
                </div>}
        </div>;
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 메인 컴포넌트
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const MemberInfoTab = ({
  editData,
  setEditData,
  onSave,
  pricingConfig,
  originalData,
  isDirtyByUser
}) => {
  const t = useLanguageStore(s => s.t);
  const {
    config
  } = useStudioConfig();
  const getTypeLabel = key => getMembershipLabel(key, config);
  return <>
        <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '20px'
    }}>
            {/* ━━━ 블록 1: 기본 정보 ━━━ */}
            <BasicInfoBlock editData={editData} setEditData={setEditData} originalData={originalData} />

            {/* ━━━ 구분선 ━━━ */}
            <hr style={{
        border: 'none',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        margin: '0'
      }} />

            {/* ━━━ 블록 2: 회원권 현황 ━━━ */}
            {originalData?.role !== 'instructor' && <MembershipBlock editData={editData} setEditData={setEditData} originalData={originalData} pricingConfig={pricingConfig} getTypeLabel={getTypeLabel} />}

            {/* ━━━ 저장 버튼 ━━━ */}
            {(() => {
        const editableKeys = ['name', 'phone', 'membershipType', 'subject', 'regDate', 'startDate', 'endDate', 'credits', 'price', 'notes'];
        const hasChanges = editableKeys.some(key => {
          const orig = originalData[key] ?? '';
          const curr = editData[key] ?? '';
          if (key === 'price') return Number(orig) !== Number(curr);
          return orig != curr;
        });
        if (!hasChanges || !isDirtyByUser) return null;
        return <button onClick={onSave} style={{
          padding: '15px',
          borderRadius: '10px',
          border: 'none',
          background: 'var(--primary-gold)',
          color: 'var(--text-on-primary)',
          fontWeight: 'bold',
          fontSize: '1.1rem'
        }}>{t("g_d998f8") || "\uD68C\uC6D0\uC815\uBCF4 \uC800\uC7A5\uD558\uAE30"}</button>;
      })()}

            {/* ━━━ 구분선 ━━━ */}
            <hr style={{
        border: 'none',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        margin: '0'
      }} />

            {/* ━━━ 관리자 수동 홀딩 블록 ━━━ */}
            {originalData?.role !== 'instructor' && <AdminHoldBlock originalData={originalData} />}

            {/* ━━━ 블록 3: 수강권 타임라인 ━━━ */}
            <PaymentHistoryBlock originalData={originalData} getTypeLabel={getTypeLabel} />

            {/* ━━━ 회원 삭제 ━━━ */}
            {(() => {
        const credits = Number(originalData.credits || 0);
        const endDate = originalData.endDate;
        const isTBD = endDate === 'TBD';
        let isActive = false;
        if (isTBD) {
          isActive = true;
        } else if (endDate) {
          const end = new Date(endDate);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          isActive = end >= today && credits > 0;
        }
        if (isActive) {
          return <div style={{
            padding: '14px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
                            <p style={{
              margin: 0,
              fontSize: '0.75rem',
              color: '#71717a'
            }}>
                                {isTBD ? t("g_635868") || "\uD83D\uDD12 \uC120\uB4F1\uB85D \uD68C\uC6D0\uC740 \uC0AD\uC81C\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uC218\uAC15 \uB9CC\uB8CC \uD6C4 \uC0AD\uC81C\uAC00 \uAC00\uB2A5\uD569\uB2C8\uB2E4." : `🔒 활성 회원은 삭제할 수 없습니다. (잔여 ${credits}회 / 만료 ${endDate})`}
                            </p>
                        </div>;
        }
        return <div style={{
          padding: '16px',
          background: 'rgba(239, 68, 68, 0.05)',
          border: '1px solid rgba(239, 68, 68, 0.15)',
          borderRadius: '12px'
        }}>
                        <button onClick={async () => {
            if (!confirm(t('confirm_delete_member') || 'Delete this member?\n\nDeleted members can be restored from Trash.')) return;
            try {
              const result = await storageService.softDeleteMember(originalData.id);
              if (result.success) {
                alert(t("g_84bfed") || "\uD68C\uC6D0\uC774 \uC0AD\uC81C\uB418\uC5C8\uC2B5\uB2C8\uB2E4.\n\uD734\uC9C0\uD1B5 \uD0ED\uC5D0\uC11C \uBCF5\uC6D0\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.");
                if (typeof window !== 'undefined') window.dispatchEvent(new Event('member-deleted'));
              } else {
                alert((t("g_51acf1") || "\uC0AD\uC81C \uC2E4\uD328: ") + (result.error || t("g_053d5f") || "\uC54C \uC218 \uC5C6\uB294 \uC624\uB958"));
              }
            } catch (e) {
              alert((t("g_5a981d") || "\uC0AD\uC81C \uC911 \uC624\uB958: ") + e.message);
            }
          }} style={{
            width: '100%',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            background: 'transparent',
            color: '#ef4444',
            fontSize: '0.85rem',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}>
                            <Trash size={16} weight="fill" />{t("g_0f2e4c") || "\uD68C\uC6D0 \uC0AD\uC81C (\uD734\uC9C0\uD1B5\uC73C\uB85C \uC774\uB3D9)"}</button>
                        <p style={{
            margin: '8px 0 0',
            fontSize: '0.72rem',
            color: '#71717a',
            textAlign: 'center'
          }}>{t("g_fb6b44") || "\uC0AD\uC81C\uB41C \uD68C\uC6D0\uC740 \uD68C\uC6D0 \uBAA9\uB85D\uC5D0\uC11C \uC0AC\uB77C\uC9C0\uBA70, \uD734\uC9C0\uD1B5 \uD0ED\uC5D0\uC11C \uC5B8\uC81C\uB4E0 \uBCF5\uC6D0\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4."}</p>
                    </div>;
      })()}
        </div>
        </>;
};
export default MemberInfoTab;
export const determineStatusColor = member => {
  if (member.endDate === 'TBD') return 'var(--primary-gold)';
  if (!member.endDate) return '#ef4444';
  const credits = Number(member.credits || 0);
  const end = new Date(member.endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (end < today || credits <= 0) return '#ef4444';
  const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
  if (diff <= 7 || credits <= 2) return '#f59e0b';
  return '#10b981';
};