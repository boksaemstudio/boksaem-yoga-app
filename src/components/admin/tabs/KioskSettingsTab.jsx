import { useState, useEffect, useRef } from 'react';
import { storageService } from '../../../services/storage';
import { Image, ToggleLeft, ToggleRight, Info, VideoCamera, FilmSlate } from '@phosphor-icons/react';
import { useStudioConfig } from '../../../contexts/StudioContext';
import { ref, uploadBytes, getDownloadURL, listAll, deleteObject } from 'firebase/storage';
import { storage } from '../../../firebase';

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;  // 10MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;  // 50MB

const KioskSettingsTab = () => {
    const { config } = useStudioConfig();
    const branches = config.BRANCHES || [];
    const [settings, setSettings] = useState({ active: false, imageUrl: null, mediaType: 'image' });
    const [isUploading, setIsUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [mediaType, setMediaType] = useState('image');
    const [uploadProgress, setUploadProgress] = useState('');

    const [selectedBranch, setSelectedBranch] = useState('all');

    useEffect(() => {
        const loadSettings = async () => {
            const data = await storageService.getKioskSettings(selectedBranch);
            setSettings(data);
            setPreviewUrl(data.imageUrl);
            setMediaType(data.mediaType || 'image');
        };
        loadSettings();
        const unsubscribe = storageService.subscribe(() => loadSettings(), ['settings']);
        return () => unsubscribe();
    }, [selectedBranch]);

    const isVideoMedia = (url, type) => {
        if (type === 'video') return true;
        if (!url) return false;
        return url.match(/notice_video\.|\.mp4|\.webm|\.mov/i);
    };

    // ━━━ Storage 기반 통합 업로드 (이미지 + 영상) ━━━
    const uploadToStorage = async (file, type) => {
        setIsUploading(true);
        const localUrl = URL.createObjectURL(file);
        setPreviewUrl(localUrl);
        setMediaType(type);

        try {
            // 기존 미디어 삭제
            setUploadProgress('기존 파일 정리 중...');
            try {
                const folderRef = ref(storage, `kiosk_notices/${selectedBranch}`);
                const list = await listAll(folderRef);
                await Promise.all(list.items.map(item => deleteObject(item)));
            } catch (e) { /* 폴더가 없으면 무시 */ }

            // 업로드
            const ext = file.name.split('.').pop().toLowerCase();
            const fileName = type === 'video' ? `notice_video.${ext}` : `notice_image.${ext}`;
            const storageRef = ref(storage, `kiosk_notices/${selectedBranch}/${fileName}`);

            setUploadProgress(`업로드 중... (${(file.size / 1024 / 1024).toFixed(1)}MB)`);
            await uploadBytes(storageRef, file);

            setUploadProgress('URL 생성 중...');
            const downloadUrl = await getDownloadURL(storageRef);

            // Firestore 설정 저장
            await storageService.updateKioskSettings(selectedBranch, {
                ...settings, imageUrl: downloadUrl, mediaType: type
            });

            URL.revokeObjectURL(localUrl);
            setPreviewUrl(downloadUrl);
            setSettings(prev => ({ ...prev, imageUrl: downloadUrl, mediaType: type }));
            alert(`${type === 'video' ? '영상' : '이미지'}이(가) 성공적으로 업로드되었습니다.`);
        } catch (err) {
            console.error('[Admin] Kiosk media upload failed:', err);
            alert(`업로드에 실패했습니다: ${err.message}`);
            URL.revokeObjectURL(localUrl);
            setPreviewUrl(settings.imageUrl);
            setMediaType(settings.mediaType || 'image');
        } finally {
            setIsUploading(false);
            setUploadProgress('');
        }
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > MAX_IMAGE_SIZE) { alert(`이미지 용량이 너무 큽니다. (최대 ${MAX_IMAGE_SIZE / 1024 / 1024}MB)`); return; }
        uploadToStorage(file, 'image');
    };

    const handleVideoUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > MAX_VIDEO_SIZE) { alert(`영상 용량이 너무 큽니다. (최대 ${MAX_VIDEO_SIZE / 1024 / 1024}MB)`); return; }
        const allowed = ['video/mp4', 'video/webm', 'video/quicktime'];
        if (!allowed.includes(file.type)) { alert('지원하는 영상 형식: MP4, WebM, MOV'); return; }
        uploadToStorage(file, 'video');
    };

    const handleToggleActive = async () => {
        const newActive = !settings.active;
        try {
            await storageService.updateKioskSettings(selectedBranch, { ...settings, active: newActive });
            setSettings(prev => ({ ...prev, active: newActive }));
        } catch (err) {
            alert('설정 변경에 실패했습니다.');
        }
    };

    const handleRemoveMedia = async () => {
        if (!window.confirm('미디어를 삭제하시겠습니까?')) return;
        try {
            try {
                const folderRef = ref(storage, `kiosk_notices/${selectedBranch}`);
                const list = await listAll(folderRef);
                await Promise.all(list.items.map(item => deleteObject(item)));
            } catch (e) { /* ignore */ }

            await storageService.updateKioskSettings(selectedBranch, { imageUrl: null, mediaType: 'image', active: false });
            setSettings({ active: false, imageUrl: null, mediaType: 'image' });
            setPreviewUrl(null);
            setMediaType('image');
        } catch (err) {
            alert('삭제에 실패했습니다.');
        }
    };

    return (
        <div className="dashboard-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h3 className="card-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                <Image size={24} weight="fill" color="var(--primary-gold)" />
                키오스크 화면 설정
            </h3>

            <div style={{ padding: '16px', background: 'rgba(var(--primary-rgb), 0.05)', borderRadius: '12px', border: '1px solid rgba(var(--primary-rgb), 0.2)', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <Info size={20} color="var(--primary-gold)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    <p style={{ margin: '0 0 8px 0', color: 'var(--text-primary)', fontWeight: 'bold' }}>키오스크 공지 기능 안내</p>
                    이곳에서 <strong>이미지 또는 영상</strong>을 업로드하고 활성화하면, 출석체크 태블릿(키오스크) 화면 전체에 표시됩니다.
                    <br/><span style={{ fontSize: '0.8rem', opacity: 0.7 }}>이미지: 최대 10MB | 영상: 최대 50MB (MP4/WebM/MOV, 자동 반복 재생)</span>
                </div>
            </div>

            {/* Branch Selector */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                {[{ id: 'all', label: '전체' }, ...branches.map(b => ({ id: b.id, label: b.name.replace('점', '') }))].map(branch => (
                    <button key={branch.id} onClick={() => setSelectedBranch(branch.id)} style={{
                        flex: 1, padding: '12px',
                        background: selectedBranch === branch.id ? 'var(--primary-gold)' : 'rgba(255,255,255,0.05)',
                        color: selectedBranch === branch.id ? 'black' : 'var(--text-secondary)',
                        border: `1px solid ${selectedBranch === branch.id ? 'var(--primary-gold)' : 'var(--border-color)'}`,
                        borderRadius: '8px', fontWeight: selectedBranch === branch.id ? 'bold' : 'normal',
                        cursor: 'pointer', transition: 'all 0.2s'
                    }}>{branch.label}</button>
                ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Media Upload */}
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h4 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {isVideoMedia(previewUrl, mediaType) ? <VideoCamera size={20} weight="fill" color="var(--primary-gold)" /> : <Image size={20} weight="fill" color="var(--primary-gold)" />}
                            화면 {isVideoMedia(previewUrl, mediaType) ? '영상' : '이미지'}
                        </h4>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {previewUrl && (
                                <button onClick={handleRemoveMedia} className="action-btn sm"
                                    style={{ background: 'rgba(244,63,94,0.1)', color: '#F43F5E', border: '1px solid rgba(244,63,94,0.3)' }}>삭제</button>
                            )}
                            <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} id="upload-kiosk-image" disabled={isUploading} />
                            <label htmlFor="upload-kiosk-image" className="action-btn sm" style={{
                                background: 'var(--primary-gold)', color: 'black',
                                cursor: isUploading ? 'not-allowed' : 'pointer', opacity: isUploading ? 0.7 : 1,
                                fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px'
                            }}><Image size={16} weight="bold" /> 이미지</label>
                            <input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={handleVideoUpload} style={{ display: 'none' }} id="upload-kiosk-video" disabled={isUploading} />
                            <label htmlFor="upload-kiosk-video" className="action-btn sm" style={{
                                background: 'rgba(var(--primary-rgb),0.15)', color: 'var(--primary-gold)',
                                cursor: isUploading ? 'not-allowed' : 'pointer', opacity: isUploading ? 0.7 : 1,
                                fontWeight: 'bold', border: '1px solid rgba(var(--primary-rgb),0.4)',
                                display: 'flex', alignItems: 'center', gap: '4px'
                            }}><VideoCamera size={16} weight="bold" /> 영상</label>
                        </div>
                    </div>

                    <div style={{
                        background: 'rgba(0,0,0,0.3)', borderRadius: '12px', minHeight: '300px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '1px dashed rgba(255,255,255,0.1)', overflow: 'hidden', position: 'relative'
                    }}>
                        {previewUrl ? (
                            isVideoMedia(previewUrl, mediaType) ? (
                                <video src={previewUrl} controls loop muted playsInline
                                    style={{ width: '100%', height: 'auto', maxHeight: '500px', objectFit: 'contain' }} />
                            ) : (
                                <img src={previewUrl} alt="키오스크 공지" style={{ width: '100%', height: 'auto', maxHeight: '500px', objectFit: 'contain' }} />
                            )
                        ) : (
                            <div style={{ color: 'var(--text-tertiary)', textAlign: 'center' }}>
                                <FilmSlate size={48} weight="light" style={{ marginBottom: '8px', opacity: 0.5 }} />
                                <div>등록된 미디어가 없습니다</div>
                                <div style={{ fontSize: '0.8rem', marginTop: '4px', opacity: 0.6 }}>이미지 또는 영상을 업로드하세요</div>
                            </div>
                        )}
                        {isUploading && (
                            <div style={{
                                position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                color: 'white', fontWeight: 'bold', gap: '12px'
                            }}>
                                <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,215,0,0.3)',
                                    borderTop: '3px solid var(--primary-gold)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                {uploadProgress || '처리 중...'}
                            </div>
                        )}
                    </div>
                </div>

                {/* Toggle */}
                <div style={{
                    background: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: '16px',
                    border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', opacity: previewUrl ? 1 : 0.5, pointerEvents: previewUrl ? 'auto' : 'none'
                }}>
                    <div>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', color: settings.active ? '#10B981' : 'var(--text-primary)' }}>
                            {settings.active ? '출석기에 표시 중' : '출석기에 미표시'}
                        </h4>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            활성화하면 태블릿 화면에 이 {isVideoMedia(previewUrl, mediaType) ? '영상' : '이미지'}가 우선 표시됩니다. (터치하면 닫힘)
                        </p>
                    </div>
                    <button onClick={handleToggleActive} style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: settings.active ? '#10B981' : 'var(--text-tertiary)', padding: 0, display: 'flex'
                    }} disabled={!previewUrl}>
                        {settings.active ? <ToggleRight size={56} weight="fill" /> : <ToggleLeft size={56} weight="regular" />}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default KioskSettingsTab;
