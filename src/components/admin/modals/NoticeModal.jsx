import { useState } from 'react';
import { useLanguageStore } from '../../../stores/useLanguageStore';
import { X, Plus } from '@phosphor-icons/react';
import { storageService } from '../../../services/storage';
const NoticeModal = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const t = useLanguageStore(s => s.t);
  const [newNotice, setNewNotice] = useState({
    title: '',
    content: '',
    images: [],
    sendPush: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  if (!isOpen) return null;
  const handleCreateNotice = async () => {
    if (!newNotice.title || !newNotice.content) return;
    if (newNotice.images.length === 0) {
      alert(t("g_bb546b") || "Please attach at least 1 image.");
      return;
    }
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await storageService.addNotice(newNotice.title, newNotice.content, newNotice.images, newNotice.sendPush);
      setNewNotice({
        title: '',
        content: '',
        images: [],
        sendPush: true
      });
      alert(t("g_020b42") || "Notice has been posted.");
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error creating notice:', err);
      alert(t("g_590ea6") || "Error posting notice.");
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleImageUpload = e => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    if (newNotice.images.length + files.length > 4) {
      alert(t("g_e53d2f") || "Maximum 4 images allowed.");
      return;
    }
    files.forEach(file => {
      // ⚡ [FIX] 용량 제한 제거: "알아서 압축하면 되잖아" (사용자 요청)
      // 5MB 체크 로직 삭제 -> Canvas 압축 후 Storage 업로드로 처리

      const reader = new FileReader();
      reader.onload = event => {
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
          const compressedBase64 = canvas.toDataURL('image/webp', 0.5);
          setNewNotice(prev => ({
            ...prev,
            images: [...prev.images, compressedBase64]
          }));
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });

    // Reset input so same file can be selected again if needed
    e.target.value = '';
  };
  const removeImage = index => {
    setNewNotice(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };
  return <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{
      maxWidth: '600px',
      maxHeight: '90vh',
      overflowY: 'auto'
    }}>
                <div className="modal-header">
                    <h2 className="modal-title">{t("g_b4a169")}</h2>
                    <button onClick={onClose}><X size={24} /></button>
                </div>
                <div className="form-group">
                    <label className="form-label">{t("g_df7719")}</label>
                    <input className="form-input" placeholder={t("g_456fc4")} value={newNotice.title} onChange={e => setNewNotice({
          ...newNotice,
          title: e.target.value
        })} lang="ko" style={{
          userSelect: 'text',
          WebkitUserSelect: 'text'
        }} // ✨ FIX: Enable copy/paste menu
        />
                </div>
                <div className="form-group">
                    <label className="form-label">{t("g_191df8")}</label>
                    <textarea className="form-input" style={{
          height: '150px',
          resize: 'none',
          userSelect: 'text',
          WebkitUserSelect: 'text'
        }} // ✨ FIX: Enable copy/paste menu
        placeholder={t("g_003090")} value={newNotice.content} onChange={e => setNewNotice({
          ...newNotice,
          content: e.target.value
        })} lang="ko" />
                </div>
                
                <div className="form-group">
                    <label className="form-label" style={{
          display: 'flex',
          justifyContent: 'space-between'
        }}>
                        <span>{t("g_46819d")} <span style={{
              color: '#ff6b6b',
              fontWeight: 700
            }}>{t("g_639d82")}</span></span>
                        <span style={{
            fontSize: '0.8rem',
            opacity: 0.7
          }}>{newNotice.images.length} / 4</span>
                    </label>
                    
                    <div style={{
          display: 'flex',
          gap: '10px',
          marginBottom: '10px',
          overflowX: 'auto',
          paddingBottom: '5px'
        }}>
                        {newNotice.images.map((imgSrc, idx) => <div key={idx} style={{
            position: 'relative',
            flexShrink: 0,
            width: '100px',
            height: '100px'
          }}>
                                <img src={imgSrc} alt={`Notice attachment image ${idx + 1}`} style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.1)'
            }} />
                                <button onClick={() => removeImage(idx)} style={{
              position: 'absolute',
              top: '-5px',
              right: '-5px',
              background: 'rgba(255, 71, 87, 0.9)',
              borderRadius: '50%',
              color: 'white',
              border: 'none',
              padding: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
                                    <X size={12} weight="bold" />
                                </button>
                            </div>)}
                        
                        {newNotice.images.length < 4 && <label style={{
            width: '100px',
            height: '100px',
            border: '2px dashed rgba(255,255,255,0.2)',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'rgba(255,255,255,0.5)',
            fontSize: '0.8rem',
            background: 'rgba(255,255,255,0.02)',
            flexShrink: 0
          }}>
                                <Plus size={24} style={{
              marginBottom: '4px'
            }} />
                                <span>{t("g_818cb2")}</span>
                                <input type="file" accept="image/*" multiple onChange={handleImageUpload} style={{
              display: 'none'
            }} />
                            </label>}
                    </div>
                </div>

                <div className="form-group" style={{
        marginBottom: '20px'
      }}>
                    <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          cursor: 'pointer',
          background: 'rgba(255,255,255,0.05)',
          padding: '12px',
          borderRadius: '8px'
        }}>
                        <input type="checkbox" checked={newNotice.sendPush} onChange={e => setNewNotice({
            ...newNotice,
            sendPush: e.target.checked
          })} style={{
            width: '18px',
            height: '18px',
            accentColor: 'var(--primary-gold)'
          }} />
                        <div style={{
            display: 'flex',
            flexDirection: 'column'
          }}>
                            <span style={{
              fontWeight: 'bold',
              fontSize: '0.95rem'
            }}>{t("g_2e3090")}</span>
                            <span style={{
              fontSize: '0.8rem',
              color: 'rgba(255,255,255,0.5)'
            }}>{t("g_4189dd")}</span>
                        </div>
                    </label>
                </div>
                <div className="modal-actions">
                    <button onClick={onClose} style={{
          padding: '10px 20px',
          color: 'var(--text-secondary)'
        }}>{t("g_d9de21")}</button>
                    <button onClick={handleCreateNotice} className="action-btn primary" disabled={isSubmitting}>
                        {isSubmitting ? t("g_5d6870") || "저장 중..." : t("g_8c04ab") || "등록하기"}
                    </button>
                </div>
            </div>
        </div>;
};
export default NoticeModal;