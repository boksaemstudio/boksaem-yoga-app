import { useState } from 'react';
import { useLanguageStore } from '../../../stores/useLanguageStore';
import { CaretDown, CaretUp, CheckCircle, Clock, CalendarCheck, Bell, Robot, ShieldCheck, Users, Warning, Info, Lightbulb, CreditCard, ArrowsClockwise } from '@phosphor-icons/react';
import { useStudioConfig } from '../../../contexts/StudioContext';

/**
 * Operations Guide Tab — Explains all business rules in plain language
 * Reads actual settings from config and displays dynamically without Firestore calls
 */
const OperationsGuideTab = () => {
  const t = useLanguageStore(s => s.t);
  const {
    config
  } = useStudioConfig();
  const policies = config?.POLICIES || {};
  const bookingRules = policies.BOOKING_RULES || {};
  const creditRules = policies.CREDIT_RULES || {};
  const holdRules = policies.HOLD_RULES || [];
  const [openSections, setOpenSections] = useState({
    members: true,
    membership: false,
    booking: false,
    alerts: false,
    automation: false
  });
  const toggle = key => setOpenSections(prev => ({
    ...prev,
    [key]: !prev[key]
  }));
  const Badge = ({
    children
  }) => <span style={{
    fontSize: '0.7rem',
    padding: '2px 8px',
    borderRadius: '6px',
    background: 'rgba(212, 175, 55, 0.15)',
    color: 'var(--primary-gold)',
    fontWeight: '700',
    whiteSpace: 'nowrap'
  }}>
            ⚙️ {children}
        </span>;
  const RuleCard = ({
    icon,
    title,
    description,
    badge,
    tip
  }) => <div style={{
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    gap: '14px',
    alignItems: 'flex-start'
  }}>
            <div style={{
      width: '36px',
      height: '36px',
      borderRadius: '10px',
      background: 'rgba(255,255,255,0.05)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }}>
                {icon}
            </div>
            <div style={{
      flex: 1,
      minWidth: 0
    }}>
                <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'wrap',
        marginBottom: '6px'
      }}>
                    <span style={{
          fontWeight: '700',
          color: 'white',
          fontSize: '0.9rem'
        }}>{title}</span>
                    {badge && <Badge>{badge}</Badge>}
                </div>
                <p style={{
        margin: 0,
        color: '#a1a1aa',
        fontSize: '0.82rem',
        lineHeight: '1.6'
      }}>{description}</p>
                {tip && <div style={{
        marginTop: '8px',
        padding: '8px 10px',
        borderRadius: '8px',
        background: 'rgba(59, 130, 246, 0.08)',
        border: '1px solid rgba(59, 130, 246, 0.15)',
        fontSize: '0.78rem',
        color: '#93c5fd',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '6px'
      }}>
                        <Lightbulb size={14} weight="fill" style={{
          flexShrink: 0,
          marginTop: '2px'
        }} />
                        <span>{tip}</span>
                    </div>}
            </div>
        </div>;
  const SectionHeader = ({
    sectionKey,
    icon,
    title,
    count,
    color = 'var(--primary-gold)'
  }) => <button onClick={() => toggle(sectionKey)} style={{
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 18px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '14px',
    cursor: 'pointer',
    color: 'white',
    transition: 'all 0.2s'
  }}>
            <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    }}>
                <div style={{
        width: '32px',
        height: '32px',
        borderRadius: '8px',
        background: `${color}15`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
                    {icon}
                </div>
                <span style={{
        fontWeight: '700',
        fontSize: '1rem'
      }}>{title}</span>
                <span style={{
        fontSize: '0.7rem',
        color: '#71717a',
        fontWeight: '600'
      }}>{count}{t("g_90e697") || "개 규칙"}</span>
            </div>
            {openSections[sectionKey] ? <CaretUp size={18} weight="bold" color="#71717a" /> : <CaretDown size={18} weight="bold" color="#71717a" />}
        </button>;
  return <div style={{
    maxWidth: '700px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  }}>

            {/* Header */}
            <div style={{
      textAlign: 'center',
      padding: '20px 0 10px'
    }}>
                <h2 style={{
        color: 'white',
        fontSize: '1.3rem',
        fontWeight: '800',
        margin: '0 0 6px'
      }}>{t("g_142faf")}</h2>
                <p style={{
        color: '#71717a',
        fontSize: '0.85rem',
        margin: 0
      }}>{t("g_2d8c42")}</p>
            </div>

            {/* ━━━ 1. Members & Attendance ━━━ */}
            <SectionHeader sectionKey="members" icon={<Users size={18} weight="fill" color="var(--primary-gold)" />} title={t("g_6c98b9")} count={7} />
            {openSections.members && <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      paddingLeft: '4px'
    }}>
                    <RuleCard icon={<CheckCircle size={20} weight="fill" color="#10b981" />} title={t("g_3b30db")} description={t("g_659448")} tip={t("g_b3a503")} />
                    <RuleCard icon={<Warning size={20} weight="fill" color="#ef4444" />} title={t("g_903bc8")} description={t("g_att_refusal_desc") || "기간 만료 또는 잔여 횟수가 0인 회원이 키오스크에 출석을 시도하면 자동으로 출석이 거부됩니다. (화면에 사유 표시)"} tip={t("g_d1d6ca")} />
                    <RuleCard icon={<Clock size={20} weight="fill" color="#3b82f6" />} title={t("g_37dcab")} description={t("g_bed607") || "수강권 등록 시 시작일을 '미확정(TBD)'으로 설정할 수 있습니다. 회원이 처음 출석하는 날이 자동으로 시작일로 지정되며, 이에 따라 종료일도 자동 계산됩니다."} badge={t("g_71cb52")} tip={t("g_10eef2")} />
                    <RuleCard icon={<Clock size={20} weight="fill" color="#f59e0b" />} title={t("g_cf74e3")} description={`${t("g_hold_desc") || "회원의 수강을 일시적으로 정지합니다. 정지 기간 중 출석하면 홀딩이 자동 해제되며, 정지된 일수만큼 수강 종료일이 연장됩니다."}${holdRules.length > 0 ? ` ${t("g_hold_current") || "현재 설정된 규칙"}: ${holdRules.map(r => `${r.durationMonths}${t("g_months") || "개월"} → max ${r.maxCount}x, ${r.maxWeeks}${t("g_weeks") || "주"}`).join(' | ')}` : ''}`} badge={holdRules.length > 0 ? `${holdRules.length} ${t("g_rules_set") || "개 규칙 설정됨"}` : t("g_c6c674") || "설정 안 됨"} tip={t("g_cc0c9d")} />
                    <RuleCard icon={<CalendarCheck size={20} weight="fill" color="#8b5cf6" />} title={t("g_87daa9")} description={t("g_cdb53b")} badge={t("g_2d0195")} tip={t("g_6ceff0")} />
                    <RuleCard icon={<Users size={20} weight="fill" color="#71717a" />} title={t("g_f0db5c")} description={(t("g_00a928") || "잔여 횟수가 있지만 일정 기간 출석하지 않은 회원은 '잠든 회원'으로 자동 분류됩니다. 대시보드에서 조회할 수 있습니다.")} badge={`${policies.DORMANT_THRESHOLD_DAYS || 14} ${t("g_days_inactive") || "일간 미출석"}`} />
                    <RuleCard icon={<Bell size={20} weight="fill" color="#f43f5e" />} title={t("g_e0d5d1")} description={(t("g_42608c") || "수강 종료일이 다가오는 회원을 식별합니다. 대시보드에 만료 임박 뱃지가 표시되며 안내 메시지를 보낼 수 있습니다.")} badge={`${policies.EXPIRING_THRESHOLD_DAYS || 7} ${t("g_days_before_end") || "일 전부터 표시"}`} />
                </div>}

            {/* ━━━ 1-2. Membership Registration Logic ━━━ */}
            <SectionHeader sectionKey="membership" icon={<CreditCard size={18} weight="fill" color="#10b981" />} title={t("g_86d85f")} count={5} color="#10b981" />
            {openSections.membership && <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      paddingLeft: '4px'
    }}>
                    <RuleCard icon={<CreditCard size={20} weight="fill" color="#10b981" />} title={t("g_174339")} description={t("g_enddate_calc_desc") || "종료일은 항상 '시작일 + 수강기간(개월) - 1일'로 자동 계산됩니다. 예: 시작일 3/25 + 3개월 = 종료일 6/24"} badge={t("g_97c0ec")} tip={t("g_c162b8")} />
                    <RuleCard icon={<ArrowsClockwise size={20} weight="fill" color="#3b82f6" />} title={t("g_4a25a0")} description={t("g_5956ba")} badge={t("g_ad23a4")} />
                    <RuleCard icon={<ArrowsClockwise size={20} weight="fill" color="#f59e0b" />} title={t("g_537220")} description={t("g_a6202a")} badge={t("g_d77f76")} tip={t("g_1ee0fd")} />
                    <RuleCard icon={<ArrowsClockwise size={20} weight="fill" color="#ef4444" />} title={t("g_d233cf")} description={t("g_fa4940")} badge={t("g_ef4d34")} />
                    <RuleCard icon={<CalendarCheck size={20} weight="fill" color="#8b5cf6" />} title={t("g_a072f1")} description={t("g_028afd")} badge={t("g_7d8844")} tip={t("g_e1f1a3")} />
                </div>}

            {/* ━━━ 2. Booking System ━━━ */}
            <SectionHeader sectionKey="booking" icon={<CalendarCheck size={18} weight="fill" color="#3b82f6" />} title={t("g_91df7a")} count={6} color="#3b82f6" />
            {openSections.booking && <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      paddingLeft: '4px'
    }}>
                    {!policies.ALLOW_BOOKING && <div style={{
        padding: '12px 16px',
        background: 'rgba(245, 158, 11, 0.08)',
        border: '1px solid rgba(245, 158, 11, 0.2)',
        borderRadius: '10px',
        color: '#fbbf24',
        fontSize: '0.82rem',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
                            <Info size={16} weight="fill" /> {t("g_800777")}
                        </div>}
                    <RuleCard icon={<CalendarCheck size={20} weight="fill" color="#3b82f6" />} title={t("g_eb1f56")} description={`${t("g_booking_window_desc") || `수업 시작 ${bookingRules.windowDays || 7}일 전부터 예약이 열립니다. 지난 수업은 예약 불가합니다.`}`} badge={`${bookingRules.windowDays || 7} ${t("g_days_before") || "일 전"}`} />
                    <RuleCard icon={<Users size={20} weight="fill" color="#6366f1" />} title={t("g_bfc02d")} description={`${t("g_max_booking_desc") || `동시에 최대 ${bookingRules.maxActiveBookings || 3}개 예약 가능하며, 하루 최대 ${bookingRules.maxDailyBookings || 2}회 예약 가능합니다.`}`} badge={`${bookingRules.maxActiveBookings || 3} ${t("g_active") || "개 유지"} / ${bookingRules.maxDailyBookings || 2} ${t("g_per_day") || "회/일"}`} />
                    <RuleCard icon={<Users size={20} weight="fill" color="#10b981" />} title={t("g_a0f8d2")} description={`${t("g_capacity_desc") || `기본 정원은 수업당 ${bookingRules.defaultCapacity || 15}명입니다. 정원이 다 차면`} ${bookingRules.enableWaitlist !== false ? t("g_662e6c") || "자동으로 대기 명단에 등록됩니다. 취소자가 생기면 대기 1순위 회원이 자동 확정되고 알림이 발송됩니다." : t("g_fcc7d1") || "예약이 거부됩니다 (대기 명단 비활성화)."}`} badge={`${t("g_capacity") || "정원"}: ${bookingRules.defaultCapacity || 15}`} tip={bookingRules.enableWaitlist !== false ? t("g_627804") || "대기 명단 활성화: 취소 발생 시 자동 승급 및 알림 발송" : undefined} />
                    <RuleCard icon={<Warning size={20} weight="fill" color="#ef4444" />} title={t("g_6655b5")} description={`${t("g_noshow_desc") || `예약 후 출석하지 않으면 수업 종료 후 자동으로 노쇼(No-show) 처리됩니다. 횟수가 ${bookingRules.noshowCreditDeduct || 1}회 차감되며 관리자에게 알림 전송.`}`} badge={`${t("g_noshow_deduct") || "노쇼 차감"}: -${bookingRules.noshowCreditDeduct || 1}`} tip={t("g_bcb1e9")} />
                    <RuleCard icon={<Clock size={20} weight="fill" color="#f59e0b" />} title={t("g_97eaa7")} description={`${t("g_cancel_desc") || `수업 시작 ${bookingRules.cancelDeadlineHours || 3}시간 전까지만 취소 가능합니다. 마감 시간 이후에는 취소 불가(노쇼 처리).`}`} badge={`${bookingRules.cancelDeadlineHours || 3}h ${t("g_before_class") || "시간 전"}`} />
                    <RuleCard icon={<Info size={20} weight="fill" color="#8b5cf6" />} title={t("g_3957df")} description={creditRules.mode === 'weekly' ? `${t("g_weekly_mode_desc") || "주간 모드: 매주 횟수가 갱신됩니다. 회원별 주간 최대 출석 횟수 제한이 적용됩니다."}` : t("g_91c1ba") || "전체 횟수 모드: 등록 시 부여된 총 횟수에서 출석/예약 시마다 1회씩 차감됩니다. 주간 제한 없음."} badge={creditRules.mode === 'weekly' ? t("g_ff872c") || "주간 갱신 모드" : t("g_32e689") || "전체 횟수 모드"} />
                </div>}

            {/* ━━━ 3. Alerts & Security ━━━ */}
            <SectionHeader sectionKey="alerts" icon={<Bell size={18} weight="fill" color="#f43f5e" />} title={t("g_445472")} count={3} color="#f43f5e" />
            {openSections.alerts && <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      paddingLeft: '4px'
    }}>
                    <RuleCard icon={<Bell size={20} weight="fill" color="#f43f5e" />} title={t("g_129193")} description={t("g_22398c")} tip={t("g_notif_approval_tip") || "메시지 발송 전 반드시 관리자의 승인(검토)을 거치도록 설정되어 있어 안전합니다."} />
                    <RuleCard icon={<ShieldCheck size={20} weight="fill" color="#10b981" />} title={t("g_b5358f")} description={t("g_c2729f")} badge={t("g_968f63")} />
                    <RuleCard icon={<Clock size={20} weight="fill" color="#6366f1" />} title={t("g_279785")} description={t("g_bb4c8d")} badge={t("g_702647")} tip={t("g_1f4f53")} />
                </div>}

            {/* ━━━ 4. AI & Automation ━━━ */}
            <SectionHeader sectionKey="automation" icon={<Robot size={18} weight="fill" color="#8b5cf6" />} title={t("g_a984c7")} count={3} color="#8b5cf6" />
            {openSections.automation && <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      paddingLeft: '4px'
    }}>
                    <RuleCard icon={<Robot size={20} weight="fill" color="#8b5cf6" />} title={t("g_bcf36d")} description={t("g_b8d960")} tip={t("g_a22f86")} />
                    <RuleCard icon={<ShieldCheck size={20} weight="fill" color="#10b981" />} title={t("g_c104d8")} description={t("g_01ed30")} badge={t("g_c685c1")} />
                    <RuleCard icon={<Warning size={20} weight="fill" color="#f59e0b" />} title={t("g_a313bf")} description={t("g_160b40")} badge={t("g_6d9d1a")} />
                </div>}

            {/* Footer */}
            <div style={{
      textAlign: 'center',
      padding: '20px 0',
      color: '#52525b',
      fontSize: '0.78rem'
    }}>
                <p>{t("g_a702ee")}</p>
                <p>{t("g_4f1777")} <strong style={{
          color: '#a1a1aa'
        }}>{t("g_dbd740")}</strong> {t("g_3614c7")}</p>
            </div>
        </div>;
};
export default OperationsGuideTab;