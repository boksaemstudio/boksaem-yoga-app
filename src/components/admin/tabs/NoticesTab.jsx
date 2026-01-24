import React from 'react';
import { Plus, Megaphone, Trash } from '@phosphor-icons/react';
import { storageService } from '../../../services/storage';

const NoticesTab = ({ notices, setShowNoticeModal, refreshData }) => {
    const handleDeleteNotice = async (id) => {
        if (window.confirm('이 공지사항을 삭제하시겠습니까?')) {
            await storageService.deleteNotice(id);
            refreshData();
        }
    };

    return (
        <div className="dashboard-card shadow-lg" style={{ background: 'rgba(25,25,25,0.7)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', paddingBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                    <h3 className="outfit-font" style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>소식 및 공지 관리</h3>
                    <p style={{ margin: '5px 0 0 0', opacity: 0.5, fontSize: '0.85rem' }}>회원용 앱의 메인 화면에 표시되는 공지사항입니다.</p>
                </div>
                <button onClick={() => setShowNoticeModal(true)} className="action-btn primary" style={{ width: 'auto', padding: '12px 24px' }}>
                    <Plus size={20} weight="bold" style={{ marginRight: '8px' }} /> 공지 작성하기
                </button>
            </div>
            <div className="card-list">
                {notices.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 0', opacity: 0.5 }}>
                        <Megaphone size={48} style={{ marginBottom: '15px' }} />
                        <p>등록된 공지사항이 없습니다.</p>
                    </div>
                ) : (
                    notices.map(notice => (
                        <div key={notice.id} className="glass-panel" style={{
                            marginBottom: '20px',
                            padding: '24px',
                            border: '1px solid rgba(212,175,55,0.2)',
                            background: 'linear-gradient(145deg, rgba(35,35,35,0.7), rgba(25,25,25,0.8))',
                            position: 'relative'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                                <div>
                                    <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--primary-gold)', marginBottom: '4px' }}>
                                        {notice.title}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', opacity: 0.5 }}>
                                        {notice.date || (notice.timestamp ? new Date(notice.timestamp).toLocaleDateString() : '날짜 정보 없음')} 등록
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDeleteNotice(notice.id)}
                                    className="action-btn"
                                    style={{ minWidth: 'auto', padding: '8px', color: 'rgba(255,107,107,0.7)', backgroundColor: 'transparent' }}
                                    title="공지 삭제"
                                >
                                    <Trash size={20} />
                                </button>
                            </div>
                            <div style={{
                                fontSize: '1rem',
                                opacity: 0.9,
                                lineHeight: 1.7,
                                whiteSpace: 'pre-wrap',
                                color: 'var(--text-primary)',
                                padding: '15px',
                                background: 'rgba(0,0,0,0.2)',
                                borderRadius: '8px'
                            }}>
                                {notice.image && (
                                    <img src={notice.image} alt="공지 이미지" style={{ width: '100%', borderRadius: '8px', marginBottom: '15px' }} />
                                )}
                                {notice.content}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default NoticesTab;
