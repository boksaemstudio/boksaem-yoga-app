import { useState } from 'react';
import { CaretDown, CaretUp, CheckCircle, Clock, CalendarCheck, Bell, Robot, ShieldCheck, Users, Warning, Info, Lightbulb, CreditCard, ArrowsClockwise } from '@phosphor-icons/react';
import { useStudioConfig } from '../../../contexts/StudioContext';

/**
 * 운영 가이드 탭 — 업장의 모든 비즈니스 규칙을 원장이 이해하기 쉬운 말로 설명
 * Firestore 호출 없이 현재 config에서 실제 설정값을 읽어 동적으로 표시
 */
const OperationsGuideTab = () => {
    const { config } = useStudioConfig();
    const policies = config?.POLICIES || {};
    const bookingRules = policies.BOOKING_RULES || {};
    const creditRules = policies.CREDIT_RULES || {};
    const holdRules = policies.HOLD_RULES || [];

    const [openSections, setOpenSections] = useState({ members: true, membership: false, booking: false, alerts: false, automation: false });

    const toggle = (key) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

    const Badge = ({ children }) => (
        <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '6px', background: 'rgba(212, 175, 55, 0.15)', color: 'var(--primary-gold)', fontWeight: '700', whiteSpace: 'nowrap' }}>
            ⚙️ {children}
        </span>
    );

    const RuleCard = ({ icon, title, description, badge, tip }) => (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '16px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                    <span style={{ fontWeight: '700', color: 'white', fontSize: '0.9rem' }}>{title}</span>
                    {badge && <Badge>{badge}</Badge>}
                </div>
                <p style={{ margin: 0, color: '#a1a1aa', fontSize: '0.82rem', lineHeight: '1.6' }}>{description}</p>
                {tip && (
                    <div style={{ marginTop: '8px', padding: '8px 10px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.15)', fontSize: '0.78rem', color: '#93c5fd', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                        <Lightbulb size={14} weight="fill" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span>{tip}</span>
                    </div>
                )}
            </div>
        </div>
    );

    const SectionHeader = ({ sectionKey, icon, title, count, color = 'var(--primary-gold)' }) => (
        <button
            onClick={() => toggle(sectionKey)}
            style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 18px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '14px', cursor: 'pointer', color: 'white', transition: 'all 0.2s'
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {icon}
                </div>
                <span style={{ fontWeight: '700', fontSize: '1rem' }}>{title}</span>
                <span style={{ fontSize: '0.7rem', color: '#71717a', fontWeight: '600' }}>{count}개 규칙</span>
            </div>
            {openSections[sectionKey] ? <CaretUp size={18} weight="bold" color="#71717a" /> : <CaretDown size={18} weight="bold" color="#71717a" />}
        </button>
    );

    return (
        <div style={{ maxWidth: '700px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* 헤더 */}
            <div style={{ textAlign: 'center', padding: '20px 0 10px' }}>
                <h2 style={{ color: 'white', fontSize: '1.3rem', fontWeight: '800', margin: '0 0 6px' }}>📖 운영 가이드</h2>
                <p style={{ color: '#71717a', fontSize: '0.85rem', margin: 0 }}>이 앱의 모든 자동화 규칙과 정책을 한 눈에 확인하세요</p>
            </div>

            {/* ━━━ 1. 회원 & 출석 ━━━ */}
            <SectionHeader sectionKey="members" icon={<Users size={18} weight="fill" color="var(--primary-gold)" />} title="회원 & 출석" count={7} />
            {openSections.members && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingLeft: '4px' }}>
                    <RuleCard
                        icon={<CheckCircle size={20} weight="fill" color="#10b981" />}
                        title="출석 체크 & 횟수 차감"
                        description="키오스크에서 회원이 출석하면 잔여 횟수가 자동으로 1회 차감됩니다. 관리자가 수동 출석 처리 시에는 차감 여부를 선택할 수 있습니다."
                        tip="같은 날 여러 수업 출석도 가능합니다(다중 출석). 각 출석마다 1회씩 차감됩니다."
                    />
                    <RuleCard
                        icon={<Warning size={20} weight="fill" color="#ef4444" />}
                        title="출석 거부 (자동 차단)"
                        description="기간이 만료(종료일 초과)되었거나 잔여 횟수가 0인 회원은 키오스크에서 자동으로 출석이 거부됩니다. 화면에 '기간 만료' 또는 '횟수 부족' 사유가 표시됩니다."
                        tip="관리자 대시보드에서는 거부된 출석 시도도 기록으로 남아 확인할 수 있습니다."
                    />
                    <RuleCard
                        icon={<Clock size={20} weight="fill" color="#3b82f6" />}
                        title="TBD: 시작일 미확정 등록"
                        description='회원 등록 시 시작일을 "TBD(미정)"로 설정할 수 있습니다. 이 회원이 처음 출석하는 날이 자동으로 시작일이 되고, 수강 기간에 따라 종료일이 자동 계산됩니다.'
                        badge="첫 출석 시 자동 확정"
                        tip="예: 3개월 수강권을 TBD로 등록 → 4월 1일 첫 출석 → 시작일 4/1, 종료일 6/30 자동 설정"
                    />
                    <RuleCard
                        icon={<Clock size={20} weight="fill" color="#f59e0b" />}
                        title="홀딩 (수강 일시정지)"
                        description={`회원의 수강권을 일시정지할 수 있습니다. 홀딩 중에 출석하면 자동으로 해제되며, 실제 정지한 일수만큼 종료일이 자동 연장됩니다.${holdRules.length > 0 ? ` 현재 설정된 홀딩 규칙: ${holdRules.map(r => `${r.durationMonths}개월권 → 최대 ${r.maxCount}회, ${r.maxWeeks}주`).join(' | ')}` : ''}`}
                        badge={holdRules.length > 0 ? `${holdRules.length}개 규칙 설정됨` : '미설정'}
                        tip="예: 7일 홀딩 후 출석 → 종료일이 7일 뒤로 자동 연장"
                    />
                    <RuleCard
                        icon={<CalendarCheck size={20} weight="fill" color="#8b5cf6" />}
                        title="선등록 (미래 수강권 예약)"
                        description="현재 수강권이 진행 중인 회원에게 다음 수강권을 미리 등록할 수 있습니다. 기존 횟수가 소진되거나 기간이 만료되면 첫 출석 시 선등록 수강권이 자동 활성화됩니다. 활성화 시 기존 잔여 횟수는 무조건 0이 되고, 새 수강권의 횟수와 기간으로 교체됩니다."
                        badge="소진/만료 시 자동 전환"
                        tip="선등록 수강권은 시작일 옵션(TBD/직접지정/즉시출석)에 따라 종료일이 산정됩니다."
                    />
                    <RuleCard
                        icon={<Users size={20} weight="fill" color="#71717a" />}
                        title="잠든 회원 자동 분류"
                        description={`잔여 횟수가 있지만 일정 기간 출석하지 않은 회원은 '잠든 회원'으로 자동 분류됩니다. 대시보드에서 이 회원들을 한 눈에 확인하고 관리할 수 있습니다.`}
                        badge={`${policies.DORMANT_THRESHOLD_DAYS || 14}일 미출석`}
                    />
                    <RuleCard
                        icon={<Bell size={20} weight="fill" color="#f43f5e" />}
                        title="만료 임박 알림"
                        description={`종료일이 가까워진 회원을 미리 파악할 수 있습니다. 대시보드에 만료 임박 배지가 표시되며, 자동 알림을 보낼 수 있습니다.`}
                        badge={`종료 ${policies.EXPIRING_THRESHOLD_DAYS || 7}일 전부터`}
                    />
                </div>
            )}

            {/* ━━━ 1-2. 회원권 등록/재등록 로직 ━━━ */}
            <SectionHeader sectionKey="membership" icon={<CreditCard size={18} weight="fill" color="#10b981" />} title="회원권 등록 · 재등록 로직" count={5} color="#10b981" />
            {openSections.membership && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingLeft: '4px' }}>
                    <RuleCard
                        icon={<CreditCard size={20} weight="fill" color="#10b981" />}
                        title="종료일 산정 기준"
                        description="종료일은 항상 '시작일 + 수강권 기간(개월) - 1일'로 자동 계산됩니다. 예를 들어 시작일이 3월 25일이고 3개월 수강권이면 종료일은 6월 24일입니다."
                        badge="시작일 기준 자동 계산"
                        tip="예: 3/25 + 1개월 → 4/24 | 3/25 + 3개월 → 6/24 | 4/1 + 3개월 → 6/30"
                    />
                    <RuleCard
                        icon={<ArrowsClockwise size={20} weight="fill" color="#3b82f6" />}
                        title="횟수 0 + 기간 남음 → 재등록"
                        description="잔여 횟수가 0이지만 종료일이 아직 남아있는 경우 재등록하면, 선택한 시작일부터 새 수강권 기간만큼 종료일이 산정됩니다. 기존의 남은 기간은 무시됩니다."
                        badge="시작일부터 새로 계산"
                    />
                    <RuleCard
                        icon={<ArrowsClockwise size={20} weight="fill" color="#f59e0b" />}
                        title="횟수 남음 + 기간 종료 → 재등록"
                        description="기간이 만료되었지만 잔여 횟수가 남아있는 경우 재등록하면, 기존 잔여 횟수는 삭제(0)되고 새 수강권의 횟수가 부여됩니다. 종료일도 새 수강권 기간에 따라 새로 산정됩니다."
                        badge="기존 횟수 삭제 → 새로 부여"
                        tip="예: 기존 5회 남았지만 기간 만료 → 재등록 시 새 수강권 35회로 교체"
                    />
                    <RuleCard
                        icon={<ArrowsClockwise size={20} weight="fill" color="#ef4444" />}
                        title="횟수 0 + 기간 종료 → 재등록 (신규와 동일)"
                        description="횟수도 0이고 기간도 지난 경우 재등록하면, 신규 등록과 완전히 동일하게 처리됩니다. 선택한 시작일부터 수강권 기간에 따라 종료일이 산정되고 새 횟수가 부여됩니다."
                        badge="신규 등록과 동일"
                    />
                    <RuleCard
                        icon={<CalendarCheck size={20} weight="fill" color="#8b5cf6" />}
                        title="선등록 시 회원권 전환"
                        description="현재 수강권이 활성 상태인 회원에게 선등록하면, 기존 횟수가 소진되거나 기간이 만료되었을 때 첫 출석 시 자동으로 전환됩니다. 전환 시 기존 잔여 횟수는 0이 되고, 새 수강권의 횟수와 기간으로 완전히 교체됩니다."
                        badge="기존 횟수 사라짐"
                        tip="시작일 옵션(TBD/직접지정/즉시출석)에 따라 종료일이 산정됩니다. 어떤 경우든 기존 횟수는 보존되지 않습니다."
                    />
                </div>
            )}

            {/* ━━━ 2. 예약 시스템 ━━━ */}
            <SectionHeader sectionKey="booking" icon={<CalendarCheck size={18} weight="fill" color="#3b82f6" />} title="예약 시스템" count={6} color="#3b82f6" />
            {openSections.booking && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingLeft: '4px' }}>
                    {!policies.ALLOW_BOOKING && (
                        <div style={{ padding: '12px 16px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '10px', color: '#fbbf24', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Info size={16} weight="fill" /> 현재 예약 기능이 비활성화되어 있습니다. 설정 탭에서 활성화할 수 있습니다.
                        </div>
                    )}
                    <RuleCard
                        icon={<CalendarCheck size={20} weight="fill" color="#3b82f6" />}
                        title="예약 가능 기간"
                        description={`수업 시작 ${bookingRules.windowDays || 7}일 전부터 예약할 수 있습니다. 지난 수업은 예약할 수 없습니다.`}
                        badge={`${bookingRules.windowDays || 7}일 전부터`}
                    />
                    <RuleCard
                        icon={<Users size={20} weight="fill" color="#6366f1" />}
                        title="동시 예약 & 하루 예약 한도"
                        description={`한 회원이 동시에 유지할 수 있는 예약은 최대 ${bookingRules.maxActiveBookings || 3}건, 하루에 예약할 수 있는 수업은 최대 ${bookingRules.maxDailyBookings || 2}건입니다.`}
                        badge={`동시 ${bookingRules.maxActiveBookings || 3}건 / 하루 ${bookingRules.maxDailyBookings || 2}건`}
                    />
                    <RuleCard
                        icon={<Users size={20} weight="fill" color="#10b981" />}
                        title="정원 관리 & 대기열"
                        description={`수업당 정원은 기본 ${bookingRules.defaultCapacity || 15}명입니다. 정원이 차면 ${bookingRules.enableWaitlist !== false ? '자동으로 대기열에 등록되며, 누군가 취소하면 대기 1번째 회원이 자동으로 예약 확정되고 푸시 알림을 받습니다.' : '예약이 거부됩니다 (대기열 비활성화).'}`}
                        badge={`정원 ${bookingRules.defaultCapacity || 15}명`}
                        tip={bookingRules.enableWaitlist !== false ? '대기열 활성화 상태: 취소 발생 시 자동 승격 + 알림' : undefined}
                    />
                    <RuleCard
                        icon={<Warning size={20} weight="fill" color="#ef4444" />}
                        title="노쇼 (미출석) 자동 처리"
                        description={`예약 후 수업에 출석하지 않으면 수업 시간이 지난 후 자동으로 '노쇼'로 처리됩니다. 노쇼 시 잔여 횟수가 ${bookingRules.noshowCreditDeduct || 1}회 차감되며, 관리자에게 알림이 발송됩니다.`}
                        badge={`노쇼 시 ${bookingRules.noshowCreditDeduct || 1}회 차감`}
                        tip="매시간 자동으로 체크합니다. 수업 시간이 지나야 노쇼로 처리됩니다."
                    />
                    <RuleCard
                        icon={<Clock size={20} weight="fill" color="#f59e0b" />}
                        title="취소 마감 시간"
                        description={`수업 시작 ${bookingRules.cancelDeadlineHours || 3}시간 전까지만 취소할 수 있습니다. 마감 이후에는 취소가 불가능하며 출석하지 않으면 노쇼 처리됩니다.`}
                        badge={`수업 ${bookingRules.cancelDeadlineHours || 3}시간 전`}
                    />
                    <RuleCard
                        icon={<Info size={20} weight="fill" color="#8b5cf6" />}
                        title="크레딧 정책 모드"
                        description={creditRules.mode === 'weekly'
                            ? `주간 모드: 매주 ${['일', '월', '화', '수', '목', '금', '토'][creditRules.weeklyResetDay || 1]}요일에 주간 횟수가 리셋됩니다. 회원별 주간 수강 횟수 제한이 적용됩니다.`
                            : '총횟수 모드: 등록 시 부여된 총 횟수에서 출석/예약마다 1회씩 차감됩니다. 주간 제한 없이 원하는 만큼 수강 가능합니다.'}
                        badge={creditRules.mode === 'weekly' ? '주간 리셋 모드' : '총횟수 차감 모드'}
                    />
                </div>
            )}

            {/* ━━━ 3. 알림 & 보안 ━━━ */}
            <SectionHeader sectionKey="alerts" icon={<Bell size={18} weight="fill" color="#f43f5e" />} title="알림 & 보안" count={3} color="#f43f5e" />
            {openSections.alerts && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingLeft: '4px' }}>
                    <RuleCard
                        icon={<Bell size={20} weight="fill" color="#f43f5e" />}
                        title="크레딧 소진 알림"
                        description="회원의 잔여 횟수가 0이 되면 AI가 해당 회원의 수강 패턴을 분석하여 맞춤형 알림 메시지를 자동 생성합니다. 관리자가 승인하면 회원에게 푸시 알림으로 발송됩니다."
                        tip="자동 발송이 아닌 '관리자 승인 후 발송' 방식이므로 안심하셔도 됩니다."
                    />
                    <RuleCard
                        icon={<ShieldCheck size={20} weight="fill" color="#10b981" />}
                        title="일일 리포트 (매일 23시)"
                        description="매일 밤 11시에 오늘의 출석 수, 신규 가입 수, 보안 이상 여부를 정리한 요약 보고서가 관리자에게 푸시 알림으로 발송됩니다."
                        badge="매일 23:00"
                    />
                    <RuleCard
                        icon={<Clock size={20} weight="fill" color="#6366f1" />}
                        title="예약 메시지 자동 발송"
                        description="관리자가 예약한 알림 메시지(수업 리마인더, 이벤트 안내 등)는 10분 간격으로 자동 발송됩니다. 푸시 알림 우선이며, 푸시 실패 시 SMS로 대체 발송합니다."
                        badge="10분 주기"
                        tip="푸시 → SMS 순서로 발송합니다. 앱 미설치 회원에게도 SMS로 전달됩니다."
                    />
                </div>
            )}

            {/* ━━━ 4. AI & 자동화 ━━━ */}
            <SectionHeader sectionKey="automation" icon={<Robot size={18} weight="fill" color="#8b5cf6" />} title="AI & 자동화" count={3} color="#8b5cf6" />
            {openSections.automation && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingLeft: '4px' }}>
                    <RuleCard
                        icon={<Robot size={20} weight="fill" color="#8b5cf6" />}
                        title="AI 대시보드 브리핑"
                        description="관리자 대시보드에 접속하면 AI가 현재 시간대에 맞는 전략적 분석을 제공합니다. 활성 회원 수, 매출, 출석률 등 실시간 데이터를 기반으로 실행 가능한 인사이트를 생성합니다."
                        tip="AI는 제공된 데이터의 정확한 수치만 사용하며, 임의의 숫자를 생성하지 않습니다."
                    />
                    <RuleCard
                        icon={<ShieldCheck size={20} weight="fill" color="#10b981" />}
                        title="데이터 자동 백업"
                        description="매일 오전과 오후, 하루 2회 Firestore 데이터가 자동으로 백업됩니다. 데이터 손실 시 백업 시점으로 복원할 수 있습니다."
                        badge="1일 2회"
                    />
                    <RuleCard
                        icon={<Warning size={20} weight="fill" color="#f59e0b" />}
                        title="유령 토큰 자동 정리"
                        description="60일 이상 업데이트되지 않은 만료된 푸시 알림 토큰을 자동으로 정리합니다. 이를 통해 불필요한 알림 발송 시도를 줄이고 시스템 효율을 유지합니다."
                        badge="60일 초과 시 삭제"
                    />
                </div>
            )}

            {/* 하단 안내 */}
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#52525b', fontSize: '0.78rem' }}>
                <p>위 설정값은 현재 업장의 실제 설정을 반영합니다.</p>
                <p>설정 변경은 <strong style={{ color: '#a1a1aa' }}>⚙️ 설정</strong> 탭에서 할 수 있습니다.</p>
            </div>
        </div>
    );
};

export default OperationsGuideTab;
