import { useState } from 'react';
import { X, Plus } from '@phosphor-icons/react';
import { storageService } from '../../../services/storage';

const NoticeModal = ({ isOpen, onClose, onSuccess }) => {
    const [newNotice, setNewNotice] = useState({ title: '', content: '', images: [], sendPush: true });
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleCreateNotice = async () => {
        if (!newNotice.title || !newNotice.content) return;
        if (newNotice.images.length === 0) {
            alert('이미지를 1개 이상 첨부해주세요.');
            return;
        }
        if (isSubmitting) return;

        setIsSubmitting(true);
        try {
            await storageService.addNotice(newNotice.title, newNotice.content, newNotice.images, newNotice.sendPush);
            setNewNotice({ title: '', content: '', images: [], sendPush: true });
            alert('공지사항이 등록되었습니다.');
            onSuccess();
            onClose();
        } catch (err) {
            console.error('Error creating notice:', err);
            alert('공지사항 등록 중 오류가 발생했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleImageUpload = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        if (newNotice.images.length + files.length > 4) {
            alert('이미지는 최대 4장까지만 첨부할 수 있습니다.');
            return;
        }

        files.forEach(file => {
            if (file.size > 5 * 1024 * 1024) {
                alert(`파일 용량이 너무 큽니다: ${file.name} (최대 5MB)`);
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 900;
                    let width = img.width;
                    let height = img.height;

                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    const compressedBase64 = canvas.toDataURL('image/jpeg', 0.5);
                    setNewNotice(prev => ({ ...prev, images: [...prev.images, compressedBase64] }));
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });
        
        // Reset input so same file can be selected again if needed
        e.target.value = '';
    };

    const removeImage = (index) => {
        setNewNotice(prev => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index)
        }));
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
                <div className="modal-header">
                    <h2 className="modal-title">공지사항 작성</h2>
                    <button onClick={onClose}><X size={24} /></button>
                </div>
                <div className="form-group">
                    <label className="form-label">제목</label>
                    <input
                        className="form-input"
                        placeholder="예: [안내] 동절기 수업 시간 변경"
                        value={newNotice.title}
                        onChange={e => setNewNotice({ ...newNotice, title: e.target.value })}
                        lang="ko"
                    />
                </div>
                <div className="form-group">
                    <label className="form-label">내용</label>
                    <textarea
                        className="form-input"
                        style={{ height: '150px', resize: 'none' }}
                        placeholder="공지할 내용을 상세히 입력해주세요."
                        value={newNotice.content}
                        onChange={e => setNewNotice({ ...newNotice, content: e.target.value })}
                        lang="ko"
                    />
                </div>
                
                <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>이미지 첨부 <span style={{ color: '#ff6b6b', fontWeight: 700 }}>*필수</span></span>
                        <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>{newNotice.images.length} / 4</span>
                    </label>
                    
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', overflowX: 'auto', paddingBottom: '5px' }}>
                        {newNotice.images.map((imgSrc, idx) => (
                            <div key={idx} style={{ position: 'relative', flexShrink: 0, width: '100px', height: '100px' }}>
                                <img src={imgSrc} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }} />
                                <button 
                                    onClick={() => removeImage(idx)}
                                    style={{ 
                                        position: 'absolute', top: '-5px', right: '-5px', 
                                        background: 'rgba(255, 71, 87, 0.9)', borderRadius: '50%', 
                                        color: 'white', border: 'none', padding: '4px', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}
                                >
                                    <X size={12} weight="bold" />
                                </button>
                            </div>
                        ))}
                        
                        {newNotice.images.length < 4 && (
                            <label style={{ 
                                width: '100px', height: '100px', 
                                border: '2px dashed rgba(255,255,255,0.2)', borderRadius: '8px',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem',
                                background: 'rgba(255,255,255,0.02)', flexShrink: 0
                            }}>
                                <Plus size={24} style={{ marginBottom: '4px' }} />
                                <span>추가하기</span>
                                <input type="file" accept="image/*" multiple onChange={handleImageUpload} style={{ display: 'none' }} />
                            </label>
                        )}
                    </div>
                </div>

                <div className="form-group" style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px' }}>
                        <input 
                            type="checkbox" 
                            checked={newNotice.sendPush} 
                            onChange={e => setNewNotice({ ...newNotice, sendPush: e.target.checked })}
                            style={{ width: '18px', height: '18px', accentColor: 'var(--primary-gold)' }} 
                        />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>전체 푸시 알림 보내기</span>
                            <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>체크 해제 시 알림 없이 조용히 등록됩니다.</span>
                        </div>
                    </label>
                </div>
                <div className="modal-actions">
                    <button onClick={onClose} style={{ padding: '10px 20px', color: 'var(--text-secondary)' }}>취소</button>
                    <button onClick={handleCreateNotice} className="action-btn primary" disabled={isSubmitting}>
                        {isSubmitting ? '저장 중...' : '등록하기'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NoticeModal;
