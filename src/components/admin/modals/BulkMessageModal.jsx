import React, { useState, useRef } from 'react';
import { X, PaperPlaneTilt, Calendar, CurrencyKrw, Info, Copy } from '@phosphor-icons/react';
import { storageService } from '../../../services/storage';
import { STUDIO_CONFIG } from '../../../studioConfig';

const BulkMessageModal = ({ isOpen, onClose, selectedMemberIds, memberCount }) => {
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [isScheduled, setIsScheduled] = useState(false);
    const [scheduledTime, setScheduledTime] = useState('');
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const scheduleInputRef = useRef(null);

    if (!isOpen) return null;

    const templates = [
        "회원님, 재등록 기간입니다. 확인 부탁드려요! 🧘‍♀️",
        "안녕하세요! 이번 주 휴강 안내드립니다.",
        "오랜만이네요! 수련하러 오세요 ✨",
        "수강권이 7일 남았습니다.",
        "[공지] 다음 주 수업 일정 변경 안내"
    ];

    // [Solapi] AlimTalk Templates
    const alimTalkTemplates = STUDIO_CONFIG.ALIMTALK_TEMPLATES || [];
    const selectedTemplate = alimTalkTemplates.find(t => t.id === selectedTemplateId);

    const calculateCost = (msg) => {
        let bytes = 0;
        for (let i = 0; i < msg.length; i++) {
            const code = msg.charCodeAt(i);
            bytes += (code >> 7) ? 2 : 1;
        }
        const isLMS = bytes > 90;
        // AlimTalk is usually cheaper (e.g., 15 KRW), but fallback to LMS if failed. 
        // Let's assume standard LMS cost for safety estimation or 15 won if AlimTalk.
        const costPerMsg = selectedTemplateId ? 15 : (isLMS ? 45 : 18);
        return { bytes, isLMS, costPerMsg, totalCost: costPerMsg * memberCount };
    };

    const costInfo = calculateCost(message);

    const handleSend = async () => {
        if (!message.trim()) return;
        if (isScheduled && !scheduledTime) {
            alert("예약 시간을 선택해주세요.");
            return;
        }

        const method = selectedTemplateId ? '알림톡' : (costInfo.isLMS ? 'LMS' : 'SMS');
        if (!confirm(`${memberCount}명에게 ${method}를 전송하시겠습니까?\n예상 비용: 약 ${costInfo.totalCost.toLocaleString()}원`)) {
            return;
        }

        setSending(true);
        try {
            // [Solapi] Pass selectedTemplateId
            await storageService.sendBulkMessages(selectedMemberIds, message, isScheduled ? scheduledTime : null, selectedTemplateId);
            alert("전송이 시작되었습니다.");
            onClose();
            setMessage('');
            setIsScheduled(false);
            setScheduledTime('');
            setSelectedTemplateId('');
        } catch (error) {
            console.error("Bulk send failed:", error);
            alert("전송 실패: " + error.message);
        } finally {
            setSending(false);
        }
    };

    // [UX] Auto-open picker when scheduled is checked
    const handleScheduleToggle = (e) => {
        const checked = e.target.checked;
        setIsScheduled(checked);
        if (checked) {
            setTimeout(() => {
                try {
                    if (scheduleInputRef.current) scheduleInputRef.current.showPicker();
                } catch (err) { console.log('showPicker not supported', err); }
            }, 100);
        }
    };

    const handleTemplateSelect = (e) => {
        const id = e.target.value;
        setSelectedTemplateId(id);
    };

    const handleCopyTemplate = () => {
        if (selectedTemplate && selectedTemplate.content) {
            setMessage(selectedTemplate.content);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center',
            zIndex: 1000, backdropFilter: 'blur(5px)'
        }}>
            <div className="fade-in" style={{
                background: '#1d1d2b', width: '90%', maxWidth: '500px',
                borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)',
                padding: '24px', color: 'white',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0, color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <PaperPlaneTilt weight="fill" color="var(--primary-gold)" />
                        단체 메시지 전송
                    </h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}>
                        <X size={24} />
                    </button>
                </div>

                <div style={{ marginBottom: '16px', color: '#e4e4e7', fontSize: '0.95rem' }}>
                    <span style={{ color: 'var(--primary-gold)', fontWeight: 'bold' }}>{memberCount}명</span>의 회원에게 메시지를 보냅니다.
                </div>

                {/* [Solapi] Template Selection */}
                <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: '#a1a1aa' }}>발송 유형 (알림톡/문자)</label>
                    <select
                        value={selectedTemplateId}
                        onChange={handleTemplateSelect}
                        style={{
                            width: '100%', padding: '10px', borderRadius: '8px',
                            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                            color: 'white', outline: 'none', cursor: 'pointer'
                        }}
                    >
                        {alimTalkTemplates.map(t => (
                            <option key={t.id} value={t.id} style={{ background: '#1d1d2b' }}>
                                {t.name}
                            </option>
                        ))}
                    </select>

                    {/* [NEW] AlimTalk Template Preview */}
                    {selectedTemplateId && selectedTemplate && (
                        <div style={{ 
                            marginTop: '12px', padding: '12px', 
                            background: 'rgba(212, 175, 55, 0.05)', 
                            borderRadius: '8px', border: '1px dashed rgba(212, 175, 55, 0.3)' 
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--primary-gold)' }}>
                                    <Info size={14} /> 알림톡 템플릿 가이드
                                </div>
                                <button 
                                    onClick={handleCopyTemplate}
                                    style={{ 
                                        background: 'rgba(212, 175, 55, 0.2)', color: 'white', 
                                        border: 'none', borderRadius: '4px', padding: '4px 8px', 
                                        fontSize: '0.7rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' 
                                    }}
                                >
                                    <Copy size={12} /> 내용 복사하기
                                </button>
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#e4e4e7', lineHeight: '1.4', wordBreak: 'break-all' }}>
                                {selectedTemplate.content}
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '12px', marginBottom: '16px' }}>
                    <textarea
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        placeholder={selectedTemplateId ? "알림톡 템플릿 내용과 일치하게 입력해주세요." : "전송할 내용을 입력하세요..."}
                        style={{
                            width: '100%', height: '120px', background: 'transparent', border: 'none',
                            color: 'white', fontSize: '1rem', resize: 'none', outline: 'none'
                        }}
                    />
                    
                    {/* Cost Info */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px', marginTop: '10px' }}>
                        <span style={{ fontSize: '0.8rem', color: selectedTemplateId ? 'var(--primary-gold)' : '#a1a1aa' }}>
                            {selectedTemplateId ? '카카오 알림톡' : (costInfo.isLMS ? 'LMS' : 'SMS')}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: '#a1a1aa' }}>
                            <span>{costInfo.bytes}B</span>
                            <span style={{ color: costInfo.isLMS ? '#f59e0b' : '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <CurrencyKrw size={14} />
                                약 {costInfo.totalCost.toLocaleString()}원
                            </span>
                        </div>
                    </div>
                </div>

                {/* Scheduling */}
                <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px' }}>
                    <input 
                        type="checkbox" 
                        id="bulkSchedule" 
                        checked={isScheduled} 
                        onChange={handleScheduleToggle}
                        style={{ accentColor: 'var(--primary-gold)', width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    <label htmlFor="bulkSchedule" style={{ color: '#e4e4e7', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={16} /> 예약 발송
                    </label>
                    {isScheduled && (
                        <input 
                            ref={scheduleInputRef}
                            type="datetime-local" 
                            value={scheduledTime}
                            onChange={e => setScheduledTime(e.target.value)}
                            onClick={() => {
                                try {
                                    if(scheduleInputRef.current) scheduleInputRef.current.showPicker();
                                } catch(e) { /* ignore */ }
                            }}
                            style={{ 
                                background: 'rgba(255,255,255,0.1)', 
                                border: '1px solid rgba(255,255,255,0.2)', 
                                borderRadius: '6px', 
                                padding: '6px 8px', 
                                color: 'white', 
                                fontSize: '0.9rem',
                                marginLeft: 'auto',
                                cursor: 'pointer'
                            }}
                        />
                    )}
                </div>

                {/* Templates (Quick Text) - Only show if standard SMS/LMS mode */}
                {!selectedTemplateId && (
                    <div style={{ marginBottom: '25px' }}>
                        <p style={{ color: '#a1a1aa', fontSize: '0.85rem', marginBottom: '8px' }}>자주 쓰는 문구</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {templates.map((t, i) => (
                                <button
                                    key={i}
                                    onClick={() => setMessage(t)}
                                    style={{
                                        background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '20px', padding: '6px 12px', color: '#e4e4e7', fontSize: '0.8rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {t.length > 15 ? t.substring(0, 15) + '...' : t}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <button
                    onClick={handleSend}
                    disabled={sending || !message.trim()}
                    style={{
                        width: '100%',
                        background: sending ? '#52525b' : 'var(--primary-gold)',
                        color: sending ? '#d4d4d8' : 'black',
                        border: 'none', borderRadius: '12px', padding: '14px',
                        fontSize: '1rem', fontWeight: 'bold', cursor: sending ? 'wait' : 'pointer',
                        boxShadow: sending ? 'none' : '0 4px 12px rgba(212, 175, 55, 0.3)'
                    }}
                >
                    {sending ? '전송 중...' : (isScheduled ? '예약 발송하기' : '전송하기')}
                </button>
            </div>
        </div>
    );
};

export default BulkMessageModal;
