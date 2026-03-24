import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudioConfig } from '../contexts/StudioContext';
import { CaretLeft } from '@phosphor-icons/react';

const PrivacyPolicyPage = () => {
    const navigate = useNavigate();
    const { config } = useStudioConfig();
    const studioName = config?.IDENTITY?.NAME || '본 서비스';
    const primaryColor = config?.THEME?.PRIMARY_COLOR || 'var(--primary-gold)';

    const sectionStyle = { marginBottom: '28px' };
    const h2Style = { fontSize: '1.1rem', fontWeight: '700', color: primaryColor, marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px' };
    const pStyle = { fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.7', marginBottom: '8px' };
    const ulStyle = { fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.8', paddingLeft: '20px', marginBottom: '8px' };
    const today = new Date().toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--bg-primary, #0a0a0f)',
            color: 'var(--text-primary, #e5e5e5)',
            padding: '0 16px 60px'
        }}>
            {/* Header */}
            <div style={{
                position: 'sticky', top: 0, zIndex: 10,
                background: 'var(--bg-primary, #0a0a0f)',
                padding: '16px 0',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', gap: '12px'
            }}>
                <button
                    onClick={() => navigate(-1)}
                    style={{
                        background: 'none', border: 'none', color: 'var(--text-primary)',
                        cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center'
                    }}
                >
                    <CaretLeft size={24} weight="bold" />
                </button>
                <h1 style={{ fontSize: '1.15rem', fontWeight: '800', margin: 0 }}>개인정보처리방침</h1>
            </div>

            <div style={{ maxWidth: '720px', margin: '0 auto', paddingTop: '24px' }}>
                <div style={sectionStyle}>
                    <p style={{ ...pStyle, fontWeight: '600', color: 'var(--text-primary)' }}>
                        {studioName} (이하 "회사")은(는) 「개인정보 보호법」 제30조에 따라 정보주체의 개인정보를 보호하고 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 하기 위하여 다음과 같이 개인정보 처리방침을 수립·공개합니다.
                    </p>
                </div>

                <div style={sectionStyle}>
                    <h2 style={h2Style}>제1조 (개인정보의 처리 목적)</h2>
                    <p style={pStyle}>회사는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.</p>
                    <ul style={ulStyle}>
                        <li>회원 등록 및 관리: 회원 가입 의사 확인, 회원제 서비스 제공에 따른 본인 식별·인증, 회원자격 유지·관리</li>
                        <li>수업 출석 관리: 수업 출석 확인 및 이력 관리, 잔여 수강 횟수 관리</li>
                        <li>안면 인식 출석: 비대면 출석을 위한 안면 특징 데이터 수집·처리 (동의 시)</li>
                        <li>서비스 개선: 서비스 이용 통계 분석 및 서비스 품질 개선</li>
                        <li>고지·안내: 수업 일정 변경, 휴관일 안내 등 필수 알림 발송</li>
                    </ul>
                </div>

                <div style={sectionStyle}>
                    <h2 style={h2Style}>제2조 (처리하는 개인정보 항목)</h2>
                    <p style={pStyle}>회사는 다음의 개인정보 항목을 처리하고 있습니다.</p>
                    <ul style={ulStyle}>
                        <li><strong>필수항목:</strong> 이름, 연락처(전화번호)</li>
                        <li><strong>선택항목:</strong> 생년월일, 성별, 메모</li>
                        <li><strong>자동수집항목:</strong> 출석 일시, 수강 이력, 서비스 이용 기록</li>
                        <li><strong>안면인식 동의 시:</strong> 안면 특징 벡터(수치 데이터) — 원본 사진은 저장하지 않으며, 수치 데이터로 원본 복원이 불가능합니다</li>
                    </ul>
                </div>

                <div style={sectionStyle}>
                    <h2 style={h2Style}>제3조 (개인정보의 처리 및 보유 기간)</h2>
                    <p style={pStyle}>회사는 법령에 따른 개인정보 보유·이용 기간 또는 정보주체로부터 개인정보를 수집 시에 동의받은 개인정보 보유·이용 기간 내에서 개인정보를 처리·보유합니다.</p>
                    <ul style={ulStyle}>
                        <li>회원 등록 정보: <strong>회원 탈퇴 시까지</strong> (탈퇴 후 지체 없이 파기)</li>
                        <li>출석 및 수강 이력: <strong>최종 이용일로부터 1년</strong></li>
                        <li>안면 특징 데이터: <strong>회원 탈퇴 시 즉시 파기</strong></li>
                    </ul>
                </div>

                <div style={sectionStyle}>
                    <h2 style={h2Style}>제4조 (개인정보의 제3자 제공)</h2>
                    <p style={pStyle}>회사는 정보주체의 개인정보를 제1조에서 명시한 범위 내에서만 처리하며, 정보주체의 동의, 법률의 특별한 규정 등의 경우를 제외하고는 개인정보를 제3자에게 제공하지 않습니다.</p>
                </div>

                <div style={sectionStyle}>
                    <h2 style={h2Style}>제5조 (개인정보의 안전성 확보 조치)</h2>
                    <p style={pStyle}>회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.</p>
                    <ul style={ulStyle}>
                        <li><strong>데이터 암호화:</strong> 개인정보는 AES-256 암호화된 상태로 저장되며, SSL/TLS를 통해 암호화되어 전송됩니다</li>
                        <li><strong>접근통제:</strong> 개인정보에 대한 접근을 관리자 인증(비밀번호)을 통해 통제하고 있습니다</li>
                        <li><strong>클라우드 보안:</strong> Google Cloud Platform(Firebase) 기반의 인프라를 사용하며, Google의 보안 표준에 따라 데이터가 보호됩니다</li>
                        <li><strong>최소 수집 원칙:</strong> 서비스에 필요한 최소한의 개인정보만 수집합니다</li>
                    </ul>
                </div>

                <div style={sectionStyle}>
                    <h2 style={h2Style}>제6조 (정보주체의 권리·의무 및 행사방법)</h2>
                    <p style={pStyle}>정보주체는 회사에 대해 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다.</p>
                    <ul style={ulStyle}>
                        <li>개인정보 열람 요구</li>
                        <li>오류 등이 있을 경우 정정 요구</li>
                        <li>삭제 요구</li>
                        <li>처리정지 요구</li>
                    </ul>
                    <p style={pStyle}>위 권리 행사는 회사에 서면, 전화, 구두 등의 방법으로 하실 수 있으며, 회사는 이에 대해 지체 없이 조치하겠습니다.</p>
                </div>

                <div style={sectionStyle}>
                    <h2 style={h2Style}>제7조 (안면인식 데이터에 관한 특칙)</h2>
                    <ul style={ulStyle}>
                        <li>안면인식 출석 기능은 <strong>회원의 별도 동의</strong> 하에 제공됩니다</li>
                        <li>수집되는 데이터는 <strong>안면 특징 벡터(수치 배열)</strong>로, 원본 사진을 저장하지 않습니다</li>
                        <li>해당 수치 데이터로 원본 얼굴 이미지를 복원하는 것은 <strong>기술적으로 불가능</strong>합니다</li>
                        <li>해당 데이터는 출석 확인 목적으로만 사용되며, 회원 탈퇴 시 <strong>즉시 삭제</strong>됩니다</li>
                        <li>안면인식을 원하지 않는 회원은 수동 출석 방식을 이용할 수 있습니다</li>
                    </ul>
                </div>

                <div style={sectionStyle}>
                    <h2 style={h2Style}>제8조 (개인정보 보호책임자)</h2>
                    <p style={pStyle}>회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.</p>
                    <div style={{
                        background: 'rgba(255,255,255,0.03)', borderRadius: '10px',
                        padding: '16px', border: '1px solid rgba(255,255,255,0.06)',
                        fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.8'
                    }}>
                        <div><strong style={{ color: 'var(--text-primary)' }}>개인정보 보호책임자</strong></div>
                        <div>소속: {studioName}</div>
                        <div>직책: 대표</div>
                        <div>연락처: 해당 스튜디오로 문의</div>
                    </div>
                </div>

                <div style={sectionStyle}>
                    <h2 style={h2Style}>제9조 (개인정보처리방침의 변경)</h2>
                    <p style={pStyle}>이 개인정보처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경 내용의 추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.</p>
                </div>

                <div style={{
                    textAlign: 'center', padding: '20px',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    fontSize: '0.85rem', color: '#71717a'
                }}>
                    <p>본 방침은 <strong>{today}</strong>부터 시행됩니다.</p>
                    <p style={{ marginTop: '4px' }}>© {new Date().getFullYear()} {studioName}. All rights reserved.</p>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicyPage;
