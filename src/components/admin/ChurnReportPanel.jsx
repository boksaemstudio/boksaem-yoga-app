import { useLanguageStore } from '../../stores/useLanguageStore';
import { useState, useMemo, useRef } from 'react';
import { Warning, PaperPlaneTilt, X, PencilSimple } from '@phosphor-icons/react';
import { storageService } from '../../services/storage';
import { getChurnAnalysis, generateChurnMessage } from '../../services/aiService';
import { getCurrentStudioId } from '../../utils/resolveStudioId';
const SMS_ENABLED_STUDIOS = ['boksaem-yoga'];
const DEMO_STUDIOS = ['demo-yoga'];
const KAKAO_PASSFLOW_URL = 'http://pf.kakao.com/_zDxiMX/chat';

/**
 * getChurnRisk — 이탈 위험도 계산
 * 
 * @param {Object} member - 회원 객체
 * @returns {{ level: 'critical'|'high'|'medium', label: string, color: string, daysSince: number, reason: string }}
 */
const getChurnRisk = (member) => {
  const t = useLanguageStore.getState().t;
  const now = Date.now();
  let lastDateMs = member.lastAttendance ? new Date(member.lastAttendance).getTime() : null;
  if (!lastDateMs && member.regDate) {
    lastDateMs = new Date(member.regDate).getTime();
  }
  if (!lastDateMs) {
    return {
      level: 'critical',
      label: t("g_d31e5c") || "\u26A0 \uC704\uD5D8",
      color: '#EF4444',
      daysSince: 999,
      reason: t("g_0e7fa0") || "\uCD9C\uC11D \uAE30\uB85D \uC5C6\uC74C"
    };
  }
  const daysSince = Math.ceil((now - lastDateMs) / (1000 * 60 * 60 * 24));
  const credits = Number(member.credits || 0);

  // Critical: 30일+ 미출석 OR 잔여 1회 이하 + 14일+ 미출석
  if (daysSince >= 30 || daysSince >= 14 && credits <= 1) {
    return {
      level: 'critical',
      label: t("g_d31e5c") || "\u26A0 \uC704\uD5D8",
      color: '#EF4444',
      daysSince,
      reason: daysSince >= 30 ? `${daysSince}일 미출석` : `${daysSince}일 미출석 + 잔여 ${credits}회`
    };
  }

  // High: 21~29일 미출석
  if (daysSince >= 21) {
    return {
      level: 'high',
      label: t("g_3c19bc") || "\uD83D\uDD36 \uC8FC\uC758",
      color: '#F59E0B',
      daysSince,
      reason: `${daysSince}일째 미출석`
    };
  }

  // Medium: 14~20일 미출석
  return {
    level: 'medium',
    label: t("g_532784") || "\uD83D\uDCA4 \uAD00\uCC30",
    color: '#60A5FA',
    daysSince,
    reason: `${daysSince}일째 미출석`
  };
};

/**
 * AI가 추천하는 맞춤 안부 메시지 생성
 */
const getRecommendedMessage = (member, risk) => {
  const name = member.name;
  if (risk.level === 'critical') {
    return `${name} 회원님, 안녕하세요! 요즘 못 뵈어서 궁금했어요 😊 몸 상태는 괜찮으신가요? 다시 함께 수련할 수 있으면 좋겠어요. 언제든 편하게 오세요! 🧘‍♀️`;
  }
  if (risk.level === 'high') {
    return `${name} 회원님, 요즘 바쁘신가 봐요! 틈날 때 한 번 오시면 몸이 가벼워질 거예요 ✨ 기다리고 있을게요! 🧘‍♀️`;
  }
  return `${name} 회원님, 오랜만이에요! 수련하러 오세요 😊 함께하면 더 좋아요! 🧘‍♀️`;
};
const ChurnReportPanel = ({
  dormantMembers,
  onSendMessage,
  onClose,
  sales
}) => {
  const t = useLanguageStore(s => s.t);
  const [sendingId, setSendingId] = useState(null);
  const [sentIds, setSentIds] = useState(new Set());
  const [sendMode, setSendMode] = useState('push_first');
  const [activeLevel, setActiveLevel] = useState(null);
  // [SaaS] SMS 가용 여부
  const studioId = getCurrentStudioId();
  const isSmsAvailable = SMS_ENABLED_STUDIOS.includes(studioId);
  const isDemo = DEMO_STUDIOS.includes(studioId);
  // [NEW] 컨펌 모달 상태 — 메시지 미리보기 + 편집 가능
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [editMessage, setEditMessage] = useState('');
  const [detailedAiMessage, setDetailedAiMessage] = useState(null);
  const [detailedAiLoading, setDetailedAiLoading] = useState(false);
  const detailedAiCalledRef = useRef(false);

  // 이탈 위험도별 분류 및 정렬
  const analysisResults = useMemo(() => {
    if (!dormantMembers || dormantMembers.length === 0) return [];
    return dormantMembers.map(m => ({
      member: m,
      risk: getChurnRisk(m)
    })).sort((a, b) => {
      const levelOrder = {
        critical: 0,
        high: 1,
        medium: 2
      };
      if (levelOrder[a.risk.level] !== levelOrder[b.risk.level]) {
        return levelOrder[a.risk.level] - levelOrder[b.risk.level];
      }
      return b.risk.daysSince - a.risk.daysSince;
    });
  }, [dormantMembers]);
  const criticalCount = analysisResults.filter(r => r.risk.level === 'critical').length;
  const highCount = analysisResults.filter(r => r.risk.level === 'high').length;
  const mediumCount = analysisResults.filter(r => r.risk.level === 'medium').length;

  // 예상 손실 금액 계산 — sales에서 회원별 마지막 결제 금액 lookup
  const lastPaymentMap = useMemo(() => {
    const map = new Map(); // memberId -> lastAmount
    if (!sales || sales.length === 0) return map;
    // sales를 날짜 역순 정렬 (최근 결제가 앞에)
    const sorted = [...sales].sort((a, b) => {
      const da = a.date || a.timestamp || '';
      const db = b.date || b.timestamp || '';
      return String(db || '').localeCompare(String(da || ''));
    });
    sorted.forEach(s => {
      if (!map.has(s.memberId)) {
        const amt = Number(s.amount) || 0;
        if (amt > 0) map.set(s.memberId, amt);
      }
    });
    return map;
  }, [sales]);
  const getMemberLoss = member => {
    // 1순위: sales의 마지막 결제 금액
    if (lastPaymentMap.has(member.id)) return lastPaymentMap.get(member.id);
    // 2순위: member.price
    return Number(member.price) || 0;
  };
  const calcLoss = level => analysisResults.filter(r => r.risk.level === level).reduce((sum, r) => sum + getMemberLoss(r.member), 0);
  const criticalLoss = calcLoss('critical');
  const highLoss = calcLoss('high');
  const mediumLoss = calcLoss('medium');

  // [AI] 메시지 미리보기 — AI가 맞춤 메시지 생성
  const [messageLoading, setMessageLoading] = useState(false);
  const openConfirm = async (member, risk) => {
    setConfirmTarget({
      member,
      risk
    });
    setEditMessage('');
    setMessageLoading(true);
    try {
      const aiMsg = await generateChurnMessage({
        name: member.name,
        daysSince: risk.daysSince,
        credits: Number(member.credits || 0),
        subject: member.subject || t("g_8209e5") || "\uC77C\uBC18",
        level: risk.level === 'critical' ? t("g_be3a65") || "\uC704\uD5D8" : risk.level === 'high' ? t("g_e0898a") || "\uC8FC\uC758" : t("g_cc1ca7") || "\uAD00\uCC30"
      });
      setEditMessage(aiMsg);
    } catch {
      setEditMessage(getRecommendedMessage(member, risk));
    } finally {
      setMessageLoading(false);
    }
  };

  // [NEW] 컨펌 후 전송
  const handleConfirmSend = async () => {
    if (!confirmTarget || !editMessage.trim()) return;
    const isDemoSite = window.location.hostname.includes('passflow') || localStorage.getItem('lastStudioId') === 'demo-yoga';
    if (isDemoSite) {
      alert(t("g_233984") || "\uB370\uBAA8 \uD658\uACBD\uC5D0\uC11C\uB294 \uBA54\uC2DC\uC9C0 \uBC1C\uC1A1 \uAE30\uB2A5\uC774 \uC81C\uD55C\uB418\uC5B4 \uC788\uC2B5\uB2C8\uB2E4.");
      return;
    }
    const {
      member
    } = confirmTarget;
    setSendingId(member.id);
    setConfirmTarget(null);
    try {
      await storageService.addMessage(member.id, editMessage.trim(), null, sendMode);
      setSentIds(prev => new Set([...prev, member.id]));
      alert(`✅ ${member.name} 회원에게 전송되었습니다.`);
    } catch (err) {
      console.error('[ChurnReport] Send failed:', err);
      alert((t("g_0bfa3d") || "\uC804\uC1A1 \uC2E4\uD328: ") + err.message);
    } finally {
      setSendingId(null);
    }
  };

  // [SAFE] 일괄전송 — 안전장치: 컨펌 모달에서 메시지 미리보기 후 전송
  const [bulkConfirm, setBulkConfirm] = useState(null); // { level, targets, messages }
  const [bulkMessages, setBulkMessages] = useState([]); // [{ member, message }]

  const [bulkLoading, setBulkLoading] = useState(false);
  const openBulkConfirm = async targetLevel => {
    const targets = analysisResults.filter(r => r.risk.level === targetLevel && !sentIds.has(r.member.id));
    if (targets.length === 0) {
      alert(t("g_93df87") || "\uC804\uC1A1 \uB300\uC0C1\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.");
      return;
    }
    const levelLabel = targetLevel === 'critical' ? t("g_be3a65") || "\uC704\uD5D8" : targetLevel === 'high' ? t("g_e0898a") || "\uC8FC\uC758" : t("g_cc1ca7") || "\uAD00\uCC30";
    setBulkConfirm({
      level: targetLevel,
      label: levelLabel,
      count: targets.length
    });
    setBulkLoading(true);
    setBulkMessages([]);

    // 각 회원별 AI 메시지 생성 (병렬 처리)
    const msgPromises = targets.map(async ({
      member,
      risk
    }) => {
      try {
        const msg = await generateChurnMessage({
          name: member.name,
          daysSince: risk.daysSince,
          credits: Number(member.credits || 0),
          subject: member.subject || t("g_8209e5") || "\uC77C\uBC18",
          level: risk.level === 'critical' ? t("g_be3a65") || "\uC704\uD5D8" : risk.level === 'high' ? t("g_e0898a") || "\uC8FC\uC758" : t("g_cc1ca7") || "\uAD00\uCC30"
        });
        return {
          member,
          message: msg
        };
      } catch {
        return {
          member,
          message: getRecommendedMessage(member, risk)
        };
      }
    });
    const msgs = await Promise.all(msgPromises);
    setBulkMessages(msgs);
    setBulkLoading(false);
  };
  const handleBulkConfirmSend = async () => {
    if (!bulkConfirm || bulkMessages.length === 0) return;
    const isDemoSite = window.location.hostname.includes('passflow') || localStorage.getItem('lastStudioId') === 'demo-yoga';
    if (isDemoSite) {
      alert(t("g_233984") || "\uB370\uBAA8 \uD658\uACBD\uC5D0\uC11C\uB294 \uBA54\uC2DC\uC9C0 \uBC1C\uC1A1 \uAE30\uB2A5\uC774 \uC81C\uD55C\uB418\uC5B4 \uC788\uC2B5\uB2C8\uB2E4.");
      return;
    }
    for (const {
      member,
      message
    } of bulkMessages) {
      try {
        await storageService.addMessage(member.id, message, null, sendMode);
        setSentIds(prev => new Set([...prev, member.id]));
      } catch (err) {
        console.error(`[ChurnReport] Send failed for ${member.name}:`, err);
      }
    }
    alert(`${bulkMessages.length}명에게 전송 완료!`);
    setBulkConfirm(null);
    setBulkMessages([]);
  };
  if (analysisResults.length === 0) {
    return <div style={{
      background: 'rgba(16, 185, 129, 0.1)',
      border: '1px solid rgba(16, 185, 129, 0.3)',
      borderRadius: '16px',
      padding: '24px',
      textAlign: 'center'
    }}>
                <span style={{
        fontSize: '2rem'
      }}>🎉</span>
                <p style={{
        color: '#10b981',
        fontWeight: '700',
        marginTop: '10px'
      }}>{t("g_529687") || "\uC774\uD0C8 \uC704\uD5D8 \uD68C\uC6D0\uC774 \uC5C6\uC2B5\uB2C8\uB2E4!"}</p>
                <p style={{
        color: '#a1a1aa',
        fontSize: '0.9rem'
      }}>{t("g_a6cfc5") || "\uBAA8\uB4E0 \uD65C\uC131 \uD68C\uC6D0\uC774 \uCD5C\uADFC 2\uC8FC \uB0B4\uC5D0 \uCD9C\uC11D\uD558\uACE0 \uC788\uC2B5\uB2C8\uB2E4."}</p>
            </div>;
  }
  return <div className="fade-in" style={{
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '16px',
    padding: '20px',
    marginBottom: '20px',
    position: 'relative'
  }}>
            {/* Header */}
            <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '16px'
    }}>
                <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
                    <span style={{
          fontSize: '1.5rem'
        }}>🧠</span>
                    <div>
                        <h3 style={{
            margin: 0,
            fontSize: '1.1rem',
            color: 'white'
          }}>{t("g_3cf804") || "AI \uC774\uD0C8 \uC608\uCE21 \uBCF4\uACE0\uC11C"}</h3>
                        <p style={{
            margin: 0,
            fontSize: '0.8rem',
            color: '#a1a1aa'
          }}>{t("g_c90029") || "\uCD9C\uC11D \uD328\uD134 \uAE30\uBC18 \uC774\uD0C8 \uC704\uD5D8 \uBD84\uC11D"}</p>
                    </div>
                </div>
                {onClose && <button onClick={onClose} style={{
        background: 'none',
        border: 'none',
        color: '#a1a1aa',
        cursor: 'pointer'
      }}>
                        <X size={20} />
                    </button>}
            </div>

            {/* AI 상세 분석 */}
            {(() => {
      if (analysisResults.length > 0 && !detailedAiCalledRef.current && !detailedAiMessage && !detailedAiLoading) {
        detailedAiCalledRef.current = true;
        setDetailedAiLoading(true);
        const riskMembers = analysisResults.slice(0, 30).map(({
          member,
          risk
        }) => ({
          name: member.name,
          daysSince: risk.daysSince,
          credits: Number(member.credits || 0),
          subject: member.subject || t("g_8209e5") || "\uC77C\uBC18",
          level: risk.level === 'critical' ? t("g_be3a65") || "\uC704\uD5D8" : risk.level === 'high' ? t("g_e0898a") || "\uC8FC\uC758" : t("g_cc1ca7") || "\uAD00\uCC30"
        }));
        getChurnAnalysis({
          branch: t("g_d1d0de") || "\uC804\uCCB4",
          activeCount: 0,
          totalMembers: 0,
          criticalCount,
          highCount,
          mediumCount,
          detailed: true,
          riskMembers
        }).then(result => {
          setDetailedAiMessage(result || null);
        }).catch(() => setDetailedAiMessage(null)).finally(() => setDetailedAiLoading(false));
      }
      return null;
    })()}
            <div style={{
      marginBottom: '16px',
      borderRadius: '12px',
      overflow: 'hidden',
      background: 'linear-gradient(135deg, rgba(168,85,247,0.06), rgba(59,130,246,0.04))',
      border: '1px solid rgba(168,85,247,0.15)'
    }}>
                {detailedAiLoading ? <div style={{
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" style={{
          animation: 'spin 2s ease-in-out infinite',
          flexShrink: 0
        }}>
                            <circle cx="12" cy="12" r="10" fill="none" stroke="rgba(168,85,247,0.2)" strokeWidth="2" />
                            <path d="M12 2 a10 10 0 0 1 10 10" fill="none" stroke="#A855F7" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        <div>
                            <div style={{
            color: '#A855F7',
            fontSize: '0.85rem',
            fontWeight: '700'
          }}>{t("g_e5735e") || "\uD83E\uDDE0 AI\uAC00 \uD68C\uC6D0\uBCC4 \uB370\uC774\uD130\uB97C \uC0C1\uC138 \uBD84\uC11D \uC911..."}</div>
                            <div style={{
            color: '#a1a1aa',
            fontSize: '0.75rem',
            marginTop: '2px'
          }}>{t("g_3cf307") || "\uC774\uB984, \uBBF8\uCD9C\uC11D \uAE30\uAC04, \uC794\uC5EC \uD69F\uC218, \uC218\uAC15 \uACFC\uBAA9\uC744 \uC885\uD569 \uBD84\uC11D\uD569\uB2C8\uB2E4"}</div>
                        </div>
                    </div> : detailedAiMessage && (detailedAiMessage.critical || detailedAiMessage.high || detailedAiMessage.medium || detailedAiMessage.summary) ? <div>
                        {/* 등급별 미시 분석 */}
                        {[{
          key: 'critical',
          label: t("g_786dde") || "\u26A0 \uC704\uD5D8 \uB4F1\uAE09 \uBD84\uC11D",
          color: '#EF4444',
          bg: 'rgba(239,68,68,0.08)',
          border: 'rgba(239,68,68,0.15)'
        }, {
          key: 'high',
          label: t("g_fb8678") || "\uD83D\uDD36 \uC8FC\uC758 \uB4F1\uAE09 \uBD84\uC11D",
          color: '#F59E0B',
          bg: 'rgba(245,158,11,0.08)',
          border: 'rgba(245,158,11,0.15)'
        }, {
          key: 'medium',
          label: t("g_91cddf") || "\uD83D\uDCA4 \uAD00\uCC30 \uB4F1\uAE09 \uBD84\uC11D",
          color: '#60A5FA',
          bg: 'rgba(96,165,250,0.08)',
          border: 'rgba(96,165,250,0.15)'
        }].map(({
          key,
          label,
          color,
          bg,
          border
        }) => detailedAiMessage[key] && detailedAiMessage[key] !== (t("g_61408f") || "\uD574\uB2F9 \uC5C6\uC74C") && <div key={key} style={{
          padding: '12px 16px',
          borderBottom: `1px solid ${border}`,
          background: bg
        }}>
                                    <div style={{
            fontSize: '0.75rem',
            fontWeight: '700',
            color,
            marginBottom: '4px'
          }}>{label}</div>
                                    <div style={{
            fontSize: '0.82rem',
            color: '#d4d4d8',
            lineHeight: '1.5'
          }}>{detailedAiMessage[key]}</div>
                                </div>)}
                        {/* 거시적 총평 */}
                        {detailedAiMessage.summary && <div style={{
          padding: '14px 16px',
          background: 'rgba(168,85,247,0.06)'
        }}>
                                <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '6px'
          }}>
                                    <span style={{
              fontSize: '0.75rem',
              padding: '2px 8px',
              borderRadius: '4px',
              background: 'rgba(168,85,247,0.2)',
              color: '#A855F7',
              fontWeight: '700'
            }}>{t("g_e1d37b") || "\uD83E\uDDE0 AI \uC885\uD569 \uCD1D\uD3C9"}</span>
                                </div>
                                <div style={{
            fontSize: '0.88rem',
            color: '#e4e4e7',
            lineHeight: '1.7'
          }}>{detailedAiMessage.summary}</div>
                            </div>}
                    </div> : detailedAiMessage?.message ? <div style={{
        padding: '14px 16px'
      }}>
                        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginBottom: '6px'
        }}>
                            <span style={{
            fontSize: '0.75rem',
            padding: '2px 8px',
            borderRadius: '4px',
            background: 'rgba(168,85,247,0.2)',
            color: '#A855F7',
            fontWeight: '700'
          }}>{t("g_993127") || "AI \uBD84\uC11D"}</span>
                        </div>
                        <div style={{
          fontSize: '0.88rem',
          color: '#e4e4e7',
          lineHeight: '1.6'
        }}>{detailedAiMessage.message}</div>
                    </div> : <div style={{
        padding: '14px 16px',
        fontSize: '0.85rem',
        color: '#a1a1aa'
      }}>{t("g_647d1f") || "\uD83D\uDCCA \uC774\uD0C8 \uC704\uD5D8 \uD68C\uC6D0"}{analysisResults.length}{t("g_257c88") || "\uBA85\uC774 \uAC10\uC9C0\uB418\uC5C8\uC2B5\uB2C8\uB2E4."}</div>}
            </div>

            {/* Risk Summary Cards */}
            <div style={{
      display: 'flex',
      gap: '8px',
      marginBottom: '16px'
    }}>
                {[{
        level: 'critical',
        label: t("g_d31e5c") || "\u26A0 \uC704\uD5D8",
        count: criticalCount,
        loss: criticalLoss,
        color: '#EF4444',
        bg: 'rgba(239, 68, 68, 0.1)'
      }, {
        level: 'high',
        label: t("g_3c19bc") || "\uD83D\uDD36 \uC8FC\uC758",
        count: highCount,
        loss: highLoss,
        color: '#F59E0B',
        bg: 'rgba(245, 158, 11, 0.1)'
      }, {
        level: 'medium',
        label: t("g_532784") || "\uD83D\uDCA4 \uAD00\uCC30",
        count: mediumCount,
        loss: mediumLoss,
        color: '#60A5FA',
        bg: 'rgba(96, 165, 250, 0.1)'
      }].map(cat => <div key={cat.level} onClick={() => setActiveLevel(prev => prev === cat.level ? null : cat.level)} style={{
        flex: 1,
        padding: '12px',
        borderRadius: '10px',
        background: cat.bg,
        border: `1px solid ${activeLevel === cat.level ? cat.color : cat.color + '30'}`,
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        transform: activeLevel === cat.level ? 'scale(1.03)' : 'scale(1)',
        boxShadow: activeLevel === cat.level ? `0 4px 12px ${cat.color}30` : 'none'
      }}>
                        <div style={{
          fontSize: '0.8rem',
          color: cat.color,
          marginBottom: '4px'
        }}>{cat.label}</div>
                        <div style={{
          fontSize: '1.5rem',
          fontWeight: '800',
          color: cat.color
        }}>{cat.count}{t("g_7b3c6e") || "\uBA85"}</div>
                        {cat.loss > 0 && <div style={{
          fontSize: '0.75rem',
          color: cat.color,
          opacity: 0.85,
          marginTop: '2px',
          fontWeight: '600'
        }}>
                                💸 {cat.loss >= 10000 ? `${Math.round(cat.loss / 10000)}만원` : `${cat.loss.toLocaleString()}원`}
                            </div>}
                        {cat.count > 0 && <button onClick={e => {
          e.stopPropagation();
          openBulkConfirm(cat.level);
        }} style={{
          marginTop: '6px',
          fontSize: '0.7rem',
          padding: '3px 8px',
          background: `${cat.color}20`,
          color: cat.color,
          border: `1px solid ${cat.color}40`,
          borderRadius: '4px',
          cursor: 'pointer'
        }}>{t("g_0ba0b4") || "\uC77C\uAD04 \uC804\uC1A1"}</button>}
                    </div>)}
            </div>

            {/* Send Mode Selector (compact) */}
            <div style={{
      display: 'flex',
      gap: '6px',
      marginBottom: '14px',
      justifyContent: 'center'
    }}>
                {[{
        id: 'push_only',
        label: t("g_347c6c") || "\uD83D\uDCF1 \uD478\uC2DC\uB9CC",
        color: '#10b981'
      }, {
        id: 'push_first',
        label: t("g_2aec9d") || "\uD83D\uDCF1\u27A1\uD83D\uDCE9 \uD478\uC2DC\uC6B0\uC120",
        color: 'var(--primary-gold)'
      }, {
        id: 'sms_only',
        label: '📩 SMS',
        color: '#3B82F6'
      }].map(mode => {
        const isSmsMode = mode.id !== 'push_only';
        const smsBlocked = isSmsMode && !isSmsAvailable && !isDemo;
        return <button key={mode.id} onClick={() => {
          if (smsBlocked) {
            if (window.confirm(t("g_37f52d") || "\uBC1C\uC2E0\uC790 \uBC88\uD638\uAC00 \uB4F1\uB85D\uB418\uC5B4 \uC788\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.\n\nSMS \uBC1C\uC1A1\uC744 \uC704\uD574\uC11C\uB294 \uBC1C\uC2E0\uC790 \uBC88\uD638 \uB4F1\uB85D\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.\n\uD328\uC2A4\uD50C\uB85C\uC6B0 \uCE74\uCE74\uC624\uD1A1\uC73C\uB85C \uBB38\uC758\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?")) {
              window.open(KAKAO_PASSFLOW_URL, '_blank');
            }
            return;
          }
          setSendMode(mode.id);
        }} style={{
          padding: '4px 10px',
          borderRadius: '6px',
          fontSize: '0.75rem',
          border: sendMode === mode.id ? `1px solid ${mode.color}` : '1px solid rgba(255,255,255,0.1)',
          background: smsBlocked ? 'rgba(255,255,255,0.02)' : sendMode === mode.id ? `${mode.color}15` : 'transparent',
          color: smsBlocked ? '#52525b' : sendMode === mode.id ? mode.color : '#a1a1aa',
          cursor: smsBlocked ? 'not-allowed' : 'pointer',
          fontWeight: sendMode === mode.id ? '700' : '400',
          opacity: smsBlocked ? 0.5 : 1
        }}>
                        {mode.label}{smsBlocked ? t("g_50a212") || " (\uB4F1\uB85D \uD544\uC694)" : ''}
                    </button>;
      })}
            </div>

            {/* Member Risk List */}
            <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      maxHeight: '400px',
      overflowY: 'auto'
    }}>
                {(activeLevel ? analysisResults.filter(r => r.risk.level === activeLevel) : analysisResults).map(({
        member,
        risk
      }) => <div key={member.id} style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px',
        borderRadius: '10px',
        background: sentIds.has(member.id) ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${sentIds.has(member.id) ? 'rgba(16, 185, 129, 0.3)' : `${risk.color}25`}`,
        opacity: sentIds.has(member.id) ? 0.6 : 1,
        transition: 'all 0.2s ease'
      }}>
                        {/* Risk Badge */}
                        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '10px',
          background: `${risk.color}15`,
          border: `1px solid ${risk.color}30`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
                            <span style={{
            fontSize: '0.65rem',
            color: risk.color,
            fontWeight: '700'
          }}>{risk.label}</span>
                            <span style={{
            fontSize: '0.9rem',
            fontWeight: '800',
            color: risk.color
          }}>{risk.daysSince}{t("g_95e431") || "\uC77C"}</span>
                        </div>

                        {/* Member Info */}
                        <div style={{
          flex: 1,
          minWidth: 0
        }}>
                            <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '2px'
          }}>
                                <span style={{
              fontWeight: '700',
              color: 'white',
              fontSize: '0.95rem'
            }}>{member.name}</span>
                                <span style={{
              fontSize: '0.75rem',
              color: '#a1a1aa'
            }}>{member.phone}</span>
                            </div>
                            <div style={{
            fontSize: '0.8rem',
            color: risk.color
          }}>{risk.reason}</div>
                            <div style={{
            fontSize: '0.75rem',
            color: '#71717a',
            marginTop: '2px'
          }}>{t("g_34c1e0") || "\uC794\uC5EC"}{member.credits}{t("g_7c1715") || "\uD68C \u2022"}{member.subject || t("g_8209e5") || "\uC77C\uBC18"}
                            </div>
                        </div>

                        {/* Action */}
                        {sentIds.has(member.id) ? <div style={{
          padding: '6px 12px',
          borderRadius: '6px',
          background: 'rgba(16, 185, 129, 0.15)',
          color: '#10b981',
          fontSize: '0.8rem',
          fontWeight: '700',
          flexShrink: 0
        }}>{t("g_3af6e6") || "\u2713 \uC804\uC1A1\uB428"}</div> : <button onClick={() => openConfirm(member, risk)} disabled={sendingId === member.id} style={{
          padding: '8px 14px',
          borderRadius: '8px',
          background: sendingId === member.id ? '#52525b' : 'rgba(255,255,255,0.1)',
          color: sendingId === member.id ? '#d4d4d8' : 'white',
          border: '1px solid rgba(255,255,255,0.2)',
          cursor: sendingId === member.id ? 'wait' : 'pointer',
          fontSize: '0.8rem',
          fontWeight: '700',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
                                <PaperPlaneTilt size={14} weight="fill" />
                                {sendingId === member.id ? '...' : t("g_274cb0") || "\uBCF4\uB0B4\uAE30"}
                            </button>}
                    </div>)}
            </div>

            {/* Footer Info */}
            <div style={{
      marginTop: '14px',
      padding: '10px',
      borderRadius: '8px',
      background: 'rgba(var(--primary-rgb), 0.05)',
      border: '1px dashed rgba(var(--primary-rgb), 0.2)',
      fontSize: '0.78rem',
      color: '#a1a1aa',
      lineHeight: '1.5'
    }}>
                💡 <strong>{t("g_acf420") || "\uAE30\uC900"}</strong>{t("g_698cdf") || ": \uC704\uD5D8(30\uC77C+ \uBBF8\uCD9C\uC11D \uB610\uB294 \uC794\uC5EC \u22641\uD68C) \u2192 \uC8FC\uC758(21~29\uC77C) \u2192 \uAD00\uCC30(14~20\uC77C)"}<br />📨 <strong>{t("g_918b33") || "\uBA54\uC2DC\uC9C0"}</strong>{t("g_7f40ac") || "\uB294 \uC774\uD0C8 \uC704\uD5D8\uB3C4\uC5D0 \uB9DE\uCDB0 \uC790\uB3D9 \uC0DD\uC131\uB418\uBA70, \uC804\uC1A1 \uC804 \uB0B4\uC6A9\uC744 \uD655\uC778\xB7\uC218\uC815\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4."}</div>

            {/* ─── [NEW] 메시지 컨펌 모달 ─── */}
            {confirmTarget && <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.7)',
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }} onClick={() => setConfirmTarget(null)}>
                    <div onClick={e => e.stopPropagation()} style={{
        background: '#1e1e1e',
        borderRadius: '16px',
        padding: '24px',
        width: '100%',
        maxWidth: '420px',
        border: '1px solid rgba(255,255,255,0.15)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
      }}>
                        {/* 모달 헤더 */}
                        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
                            <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
                                <PaperPlaneTilt size={20} weight="fill" color="var(--primary-gold)" />
                                <h3 style={{
              margin: 0,
              fontSize: '1rem',
              color: 'white'
            }}>
                                    {confirmTarget.member.name}{t("g_bf3a2a") || "\uD68C\uC6D0\uC5D0\uAC8C \uBCF4\uB0B4\uAE30"}</h3>
                            </div>
                            <button onClick={() => setConfirmTarget(null)} style={{
            background: 'none',
            border: 'none',
            color: '#a1a1aa',
            cursor: 'pointer'
          }}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* 위험도 정보 */}
                        <div style={{
          padding: '8px 12px',
          borderRadius: '8px',
          marginBottom: '12px',
          background: `${confirmTarget.risk.color}10`,
          border: `1px solid ${confirmTarget.risk.color}30`,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
                            <span style={{
            fontSize: '0.85rem',
            color: confirmTarget.risk.color,
            fontWeight: '700'
          }}>
                                {confirmTarget.risk.label}
                            </span>
                            <span style={{
            fontSize: '0.8rem',
            color: '#a1a1aa'
          }}>
                                {confirmTarget.risk.reason}{t("g_cfc786") || "\u2022 \uC794\uC5EC"}{confirmTarget.member.credits}{t("g_8a602f") || "\uD68C"}</span>
                        </div>

                        {/* 전송 방식 표시 */}
                        <div style={{
          fontSize: '0.8rem',
          color: '#a1a1aa',
          marginBottom: '8px'
        }}>{t("g_6f4539") || "\uC804\uC1A1 \uBC29\uC2DD:"}<span style={{
            color: 'var(--primary-gold)',
            fontWeight: '700'
          }}>
                                {sendMode === 'push_only' ? t("g_ef14f7") || "\uD83D\uDCF1 \uC571 \uD478\uC2DC\uB9CC" : sendMode === 'push_first' ? t("g_91eeaf") || "\uD83D\uDCF1\u27A1\uD83D\uDCE9 \uD478\uC2DC \uC6B0\uC120" : t("g_ba4e61") || "\uD83D\uDCE9 SMS\uB9CC"}
                            </span>
                        </div>

                        {/* 메시지 편집 영역 */}
                        <div style={{
          marginBottom: '16px'
        }}>
                            <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '6px'
          }}>
                                <PencilSimple size={14} color="#a1a1aa" />
                                <span style={{
              fontSize: '0.8rem',
              color: '#a1a1aa'
            }}>
                                    {messageLoading ? t("g_3dbf4d") || "\uD83E\uDDE0 AI\uAC00 \uB9DE\uCDA4 \uBA54\uC2DC\uC9C0\uB97C \uC791\uC131 \uC911..." : t("g_524d8d") || "AI\uAC00 \uC791\uC131\uD55C \uBA54\uC2DC\uC9C0 (\uC218\uC815 \uAC00\uB2A5)"}
                                </span>
                                {messageLoading && <svg width="14" height="14" viewBox="0 0 24 24" style={{
              animation: 'spin 2s ease-in-out infinite'
            }}>
                                        <circle cx="12" cy="12" r="10" fill="none" stroke="rgba(168,85,247,0.3)" strokeWidth="2" />
                                        <path d="M12 2 a10 10 0 0 1 10 10" fill="none" stroke="#A855F7" strokeWidth="2" strokeLinecap="round" />
                                    </svg>}
                            </div>
                            <textarea value={editMessage} onChange={e => setEditMessage(e.target.value)} rows={4} style={{
            width: '100%',
            padding: '12px',
            borderRadius: '10px',
            background: 'rgba(255,255,255,0.05)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.15)',
            fontSize: '0.9rem',
            lineHeight: '1.5',
            resize: 'vertical',
            outline: 'none',
            boxSizing: 'border-box',
            fontFamily: 'inherit'
          }} />
                            <div style={{
            fontSize: '0.7rem',
            color: '#71717a',
            marginTop: '4px',
            textAlign: 'right'
          }}>
                                {editMessage.length}{t("g_4e19f2") || "\uC790"}</div>
                        </div>

                        {/* 전송 / 취소 버튼 */}
                        <div style={{
          display: 'flex',
          gap: '10px'
        }}>
                            <button onClick={() => setConfirmTarget(null)} style={{
            flex: 1,
            padding: '12px',
            borderRadius: '10px',
            background: 'rgba(255,255,255,0.05)',
            color: '#a1a1aa',
            border: '1px solid rgba(255,255,255,0.1)',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: '600'
          }}>{t("g_d9de21") || "\uCDE8\uC18C"}</button>
                            <button onClick={handleConfirmSend} disabled={!editMessage.trim()} style={{
            flex: 2,
            padding: '12px',
            borderRadius: '10px',
            background: editMessage.trim() ? 'var(--primary-gold)' : '#52525b',
            color: editMessage.trim() ? 'var(--text-on-primary)' : '#a1a1aa',
            border: 'none',
            cursor: editMessage.trim() ? 'pointer' : 'not-allowed',
            fontSize: '0.9rem',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}>
                                <PaperPlaneTilt size={16} weight="fill" />{t("g_9760b2") || "\uC804\uC1A1\uD558\uAE30"}</button>
                        </div>
                    </div>
                </div>}

            {/* ─── 일괄전송 컨펌 모달 ─── */}
            {bulkConfirm && <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.8)',
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }} onClick={() => {
      setBulkConfirm(null);
      setBulkMessages([]);
    }}>
                    <div onClick={e => e.stopPropagation()} style={{
        background: '#1e1e1e',
        borderRadius: '16px',
        padding: '24px',
        width: '100%',
        maxWidth: '500px',
        maxHeight: '80vh',
        overflowY: 'auto',
        border: '1px solid rgba(255,255,255,0.15)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
      }}>
                        {/* 헤더 */}
                        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
                            <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
                                <Warning size={20} weight="fill" color="#F59E0B" />
                                <h3 style={{
              margin: 0,
              fontSize: '1rem',
              color: 'white'
            }}>{t("g_8a06b9") || "\uC77C\uAD04\uC804\uC1A1 \uD655\uC778 \u2014"}{bulkConfirm.label} {bulkConfirm.count}{t("g_7b3c6e") || "\uBA85"}</h3>
                            </div>
                            <button onClick={() => {
            setBulkConfirm(null);
            setBulkMessages([]);
          }} style={{
            background: 'none',
            border: 'none',
            color: '#a1a1aa',
            cursor: 'pointer'
          }}>
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{
          padding: '10px',
          borderRadius: '10px',
          marginBottom: '14px',
          background: bulkLoading ? 'rgba(168, 85, 247, 0.1)' : 'rgba(245, 158, 11, 0.1)',
          border: `1px solid ${bulkLoading ? 'rgba(168, 85, 247, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
          fontSize: '0.8rem',
          color: bulkLoading ? '#A855F7' : '#F59E0B',
          textAlign: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}>
                            {bulkLoading ? <>
                                    <svg width="16" height="16" viewBox="0 0 24 24" style={{
              animation: 'spin 2s ease-in-out infinite'
            }}>
                                        <circle cx="12" cy="12" r="10" fill="none" stroke="rgba(168,85,247,0.3)" strokeWidth="2" />
                                        <path d="M12 2 a10 10 0 0 1 10 10" fill="none" stroke="#A855F7" strokeWidth="2" strokeLinecap="round" />
                                    </svg>{t("g_4ee7c9") || "\uD83E\uDDE0 AI\uAC00"}{bulkConfirm.count}{t("g_a3485f") || "\uBA85\uC5D0\uAC8C \uAC01\uAC01 \uB9DE\uCDA4 \uBA54\uC2DC\uC9C0\uB97C \uC791\uC131 \uC911..."}</> : `⚠️ 아래 ${bulkMessages.length}명에게 AI가 작성한 맞춤 메시지가 전송됩니다.`}
                        </div>

                        <div style={{
          fontSize: '0.8rem',
          color: '#a1a1aa',
          marginBottom: '10px'
        }}>{t("g_6f4539") || "\uC804\uC1A1 \uBC29\uC2DD:"}<span style={{
            color: 'var(--primary-gold)',
            fontWeight: '700'
          }}>
                                {sendMode === 'push_only' ? t("g_ef14f7") || "\uD83D\uDCF1 \uC571 \uD478\uC2DC\uB9CC" : sendMode === 'push_first' ? t("g_91eeaf") || "\uD83D\uDCF1\u27A1\uD83D\uDCE9 \uD478\uC2DC \uC6B0\uC120" : t("g_ba4e61") || "\uD83D\uDCE9 SMS\uB9CC"}
                            </span>
                        </div>

                        {/* 메시지 목록 — 개별 편집 가능 */}
                        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          marginBottom: '16px'
        }}>
                            {bulkMessages.map(({
            member,
            message
          }, idx) => <div key={member.id} style={{
            padding: '12px',
            borderRadius: '10px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)'
          }}>
                                    <div style={{
              fontWeight: '700',
              color: 'white',
              fontSize: '0.9rem',
              marginBottom: '6px'
            }}>
                                        {member.name} <span style={{
                fontSize: '0.75rem',
                color: '#a1a1aa',
                fontWeight: '400'
              }}>{member.phone}</span>
                                    </div>
                                    <textarea value={message} onChange={e => {
              const updated = [...bulkMessages];
              updated[idx] = {
                member,
                message: e.target.value
              };
              setBulkMessages(updated);
            }} rows={2} style={{
              width: '100%',
              padding: '8px',
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.05)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.1)',
              fontSize: '0.85rem',
              lineHeight: '1.4',
              resize: 'vertical',
              outline: 'none',
              boxSizing: 'border-box',
              fontFamily: 'inherit'
            }} />
                                </div>)}
                        </div>

                        {/* 전송 / 취소 */}
                        <div style={{
          display: 'flex',
          gap: '10px'
        }}>
                            <button onClick={() => {
            setBulkConfirm(null);
            setBulkMessages([]);
          }} style={{
            flex: 1,
            padding: '12px',
            borderRadius: '10px',
            background: 'rgba(255,255,255,0.05)',
            color: '#a1a1aa',
            border: '1px solid rgba(255,255,255,0.1)',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: '600'
          }}>{t("g_d9de21") || "\uCDE8\uC18C"}</button>
                            <button onClick={handleBulkConfirmSend} style={{
            flex: 2,
            padding: '12px',
            borderRadius: '10px',
            background: '#EF4444',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}>
                                <PaperPlaneTilt size={16} weight="fill" />
                                {bulkMessages.length}{t("g_9e1139") || "\uBA85\uC5D0\uAC8C \uC804\uC1A1"}</button>
                        </div>
                    </div>
                </div>}
        </div>;
};
export { getChurnRisk, getRecommendedMessage };
export default ChurnReportPanel;