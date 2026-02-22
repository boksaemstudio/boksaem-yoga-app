import { useState, useEffect } from 'react';
import { storageService } from '../../../services/storage';
import { Image, ToggleLeft, ToggleRight, Info } from '@phosphor-icons/react';

const KioskSettingsTab = () => {
    const [settings, setSettings] = useState({ active: false, imageUrl: null });
    const [isUploading, setIsUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);

    useEffect(() => {
        const loadSettings = async () => {
            const data = await storageService.getKioskSettings();
            setSettings(data);
            setPreviewUrl(data.imageUrl);
        };
        loadSettings();
    }, []);

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            alert('파일 용량이 너무 큽니다. (최대 5MB)');
            return;
        }

        setIsUploading(true);
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new window.Image();
            img.onload = async () => {
                const canvas = document.createElement('canvas');
                // Use a larger width for full screen display
                const MAX_WIDTH = 1080; 
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

                // Compress slightly for performance, keeping decent quality for large screens
                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);

                setPreviewUrl(compressedBase64);
                
                try {
                    await storageService.updateImage('kiosk_notice', compressedBase64);
                    // Update settings with the same key reference conceptually, 
                    // though we store the data in images collection to reuse logic
                    await storageService.updateKioskSettings({ ...settings, imageUrl: compressedBase64 });
                    setSettings(prev => ({ ...prev, imageUrl: compressedBase64 }));
                    alert('이미지가 성공적으로 업로드되었습니다.');
                } catch (err) {
                    console.error('[Admin] Kiosk image upload failed:', err);
                    alert("이미지 업로드에 실패했습니다.");
                    setPreviewUrl(settings.imageUrl); // Revert
                } finally {
                    setIsUploading(false);
                }
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    const handleToggleActive = async () => {
        const newActive = !settings.active;
        try {
            await storageService.updateKioskSettings({ ...settings, active: newActive });
            setSettings(prev => ({ ...prev, active: newActive }));
        } catch (err) {
            alert('설정 변경에 실패했습니다.');
        }
    };

    const handleRemoveImage = async () => {
        if (!window.confirm('이미지를 삭제하시겠습니까?')) return;
        try {
            await storageService.updateKioskSettings({ ...settings, imageUrl: null, active: false });
            setSettings({ active: false, imageUrl: null });
            setPreviewUrl(null);
        } catch (err) {
            alert('이미지 삭제에 실패했습니다.');
        }
    };


    return (
        <div className="dashboard-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h3 className="card-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                <Image size={24} weight="fill" color="var(--primary-gold)" />
                키오스크 화면 설정
            </h3>
            
            <div style={{ padding: '16px', background: 'rgba(212, 175, 55, 0.05)', borderRadius: '12px', border: '1px solid rgba(212, 175, 55, 0.2)', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <Info size={20} color="var(--primary-gold)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    <p style={{ margin: '0 0 8px 0', color: 'var(--text-primary)', fontWeight: 'bold' }}>키오스크 공지 기능 안내</p>
                    이곳에서 이미지를 업로드하고 활성화하면, 출석체크 태블릿(키오스크) 화면 전체에 해당 이미지가 표시됩니다. 이벤트 안내나 휴관일 공지 등에 활용하세요.
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* 1. Image Upload Section */}
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h4 style={{ margin: 0, fontSize: '1.1rem' }}>화면 이미지</h4>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            {previewUrl && (
                                <button
                                    onClick={handleRemoveImage}
                                    className="action-btn sm"
                                    style={{ background: 'rgba(244, 63, 94, 0.1)', color: '#F43F5E', border: '1px solid rgba(244, 63, 94, 0.3)' }}
                                >
                                    삭제
                                </button>
                            )}
                            <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} id="upload-kiosk-notice" disabled={isUploading} />
                            <label 
                                htmlFor="upload-kiosk-notice" 
                                className="action-btn sm" 
                                style={{ 
                                    background: 'var(--primary-gold)', 
                                    color: 'black', 
                                    cursor: isUploading ? 'not-allowed' : 'pointer',
                                    opacity: isUploading ? 0.7 : 1,
                                    fontWeight: 'bold'
                                }}
                            >
                                {isUploading ? '업로드 중...' : (previewUrl ? '이미지 변경' : '이미지 업로드')}
                            </label>
                        </div>
                    </div>

                    <div style={{ 
                        background: 'rgba(0,0,0,0.3)', 
                        borderRadius: '12px', 
                        minHeight: '300px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        border: '1px dashed rgba(255,255,255,0.1)',
                        overflow: 'hidden',
                        position: 'relative'
                    }}>
                        {previewUrl ? (
                            <img src={previewUrl} alt="키오스크 공지" style={{ width: '100%', height: 'auto', maxHeight: '500px', objectFit: 'contain' }} />
                        ) : (
                            <div style={{ color: 'var(--text-tertiary)', textAlign: 'center' }}>
                                <Image size={48} weight="light" style={{ marginBottom: '8px', opacity: 0.5 }} />
                                <div>등록된 이미지가 없습니다</div>
                            </div>
                        )}
                        {isUploading && (
                            <div style={{
                                position: 'absolute', inset: 0,
                                background: 'rgba(0,0,0,0.5)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'white', fontWeight: 'bold'
                            }}>
                                처리 중...
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. Toggle Section */}
                <div style={{ 
                    background: 'rgba(255,255,255,0.02)', 
                    padding: '24px', 
                    borderRadius: '16px', 
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    opacity: previewUrl ? 1 : 0.5,
                    pointerEvents: previewUrl ? 'auto' : 'none'
                }}>
                    <div>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', color: settings.active ? '#10B981' : 'var(--text-primary)' }}>
                            {settings.active ? '출석기에 표시 중' : '출석기에 미표시'}
                        </h4>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            활성화하면 태블릿 화면에 다른 내용 대신 이 이미지가 우선 표시됩니다. (터치하면 닫힘)
                        </p>
                    </div>
                    <button 
                        onClick={handleToggleActive}
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: settings.active ? '#10B981' : 'var(--text-tertiary)',
                            padding: 0, display: 'flex'
                        }}
                        disabled={!previewUrl}
                    >
                        {settings.active ? 
                            <ToggleRight size={56} weight="fill" /> : 
                            <ToggleLeft size={56} weight="regular" />
                        }
                    </button>
                </div>
            </div>
        </div>
    );
};

export default KioskSettingsTab;
