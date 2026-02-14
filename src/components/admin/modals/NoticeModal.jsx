import { useState } from 'react';
import { X } from '@phosphor-icons/react';
import { storageService } from '../../../services/storage';

const NoticeModal = ({ isOpen, onClose, onSuccess }) => {
    const [newNotice, setNewNotice] = useState({ title: '', content: '', image: null });
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleCreateNotice = async () => {
        if (!newNotice.title || !newNotice.content) return;
        if (!newNotice.image) {
            alert('이미지를 1개 이상 첨부해주세요.');
            return;
        }
        if (isSubmitting) return;

        setIsSubmitting(true);
        try {
            await storageService.addNotice(newNotice.title, newNotice.content, newNotice.image);
            setNewNotice({ title: '', content: '', image: null });
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
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            alert('파일 용량이 너무 큽니다. (최대 5MB)');
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
                setNewNotice({ ...newNotice, image: compressedBase64 });
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
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
                        style={{ height: '200px', resize: 'none' }}
                        placeholder="공지할 내용을 상세히 입력해주세요."
                        value={newNotice.content}
                        onChange={e => setNewNotice({ ...newNotice, content: e.target.value })}
                        lang="ko"
                    />
                </div>
                <div className="form-group">
                    <label className="form-label">이미지 첨부 <span style={{ color: '#ff6b6b', fontWeight: 700 }}>*필수</span></label>
                    <input type="file" accept="image/*" className="form-input" onChange={handleImageUpload} />
                    {!newNotice.image && (
                        <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: 'rgba(255,107,107,0.8)' }}>공지 등록 시 이미지를 반드시 첨부해주세요.</p>
                    )}
                    {newNotice.image && (
                        <div style={{ marginTop: '10px', position: 'relative' }}>
                            <img src={newNotice.image} style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px' }} />
                            <button onClick={() => setNewNotice({ ...newNotice, image: null })} style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(0,0,0,0.5)', borderRadius: '50%', color: 'white', border: 'none', padding: '5px' }}>
                                <X size={16} />
                            </button>
                        </div>
                    )}
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
