import { useState, useEffect } from 'react';
import { storageService } from '../../../services/storage';
import { Image, ToggleLeft, ToggleRight, Info, VideoCamera, FilmSlate, Trash, CheckCircle } from '@phosphor-icons/react';
import { useStudioConfig } from '../../../contexts/StudioContext';
import { ref, uploadBytes, getDownloadURL, listAll, deleteObject, getMetadata } from 'firebase/storage';
import { storage } from '../../../firebase';
import { tenantStoragePath } from '../../../utils/tenantStorage';

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

const KioskSettingsTab = () => {
    const { config, updateConfig, refreshConfig } = useStudioConfig();
    const branches = config.BRANCHES || [];
    const [settings, setSettings] = useState({ active: false, imageUrl: null, mediaType: 'image' });
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState('');
    const [selectedBranch, setSelectedBranch] = useState('all');
    const [gallery, setGallery] = useState([]);
    const [loadingGallery, setLoadingGallery] = useState(true);
    const [tempOpacities, setTempOpacities] = useState({});

    // ─── 설정 + 갤러리 로드 ───
    useEffect(() => {
        const loadAll = async () => {
            setLoadingGallery(true);
            // 1. 키오스크 설정
            const data = await storageService.getKioskSettings(selectedBranch);
            setSettings(data);
            
            // 2. Storage에서 모든 미디어 파일 로드 (테넌트 격리 경로 + 레거시 fallback)
            try {
                const tenantFolder = ref(storage, tenantStoragePath(`kiosk_notices/${selectedBranch}`));
                const legacyFolder = ref(storage, `kiosk_notices/${selectedBranch}`);

                const parseItems = async (listResult) => {
                    return Promise.all(listResult.items.map(async (item) => {
                        const url = await getDownloadURL(item);
                        let meta = {};
                        try { meta = await getMetadata(item); } catch (e) { /* ignore */ }
                        const isVideo = item.name.match(/\.(mp4|webm|mov)$/i) || meta.contentType?.startsWith('video');
                        return {
                            name: item.name,
                            url,
                            type: isVideo ? 'video' : 'image',
                            size: meta.size || 0,
                            createdAt: meta.timeCreated || '',
                            fullPath: item.fullPath,
                            isActive: url === data.imageUrl
                        };
                    }));
                };

                // 새 경로 먼저, 구 경로 fallback (중복 제거: fullPath 기준)
                const tenantList = await listAll(tenantFolder).catch(() => ({ items: [] }));
                const tenantItems = await parseItems(tenantList);
                const legacyList = await listAll(legacyFolder).catch(() => ({ items: [] }));
                const legacyItems = await parseItems(legacyList);

                const seenPaths = new Set(tenantItems.map(i => i.name));
                const mergedItems = [
                    ...tenantItems,
                    ...legacyItems.filter(i => !seenPaths.has(i.name))
                ];
                mergedItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                setGallery(mergedItems);
            } catch (e) {
                setGallery([]);
            }
            setLoadingGallery(false);
        };
        loadAll();
        const unsubscribe = storageService.subscribe(() => loadAll(), ['settings']);
        return () => unsubscribe();
    }, [selectedBranch]);

    const isVideoMedia = (url, type) => {
        if (type === 'video') return true;
        if (!url) return false;
        return url.match(/\.(mp4|webm|mov)/i);
    };

    // ─── 업로드 (기존 삭제 안 함 → 갤러리에 추가) ───
    const uploadToStorage = async (file, type) => {
        setIsUploading(true);
        try {
            const ext = file.name.split('.').pop().toLowerCase();
            const ts = Date.now();
            const fileName = `${type}_${ts}.${ext}`;
            const storageRef = ref(storage, tenantStoragePath(`kiosk_notices/${selectedBranch}/${fileName}`));

            setUploadProgress(`업로드 중... (${(file.size / 1024 / 1024).toFixed(1)}MB)`);
            await uploadBytes(storageRef, file);

            setUploadProgress('URL 생성 중...');
            const downloadUrl = await getDownloadURL(storageRef);

            // 업로드한 파일을 자동으로 활성 미디어로 설정
            await storageService.updateKioskSettings(selectedBranch, {
                ...settings, imageUrl: downloadUrl, mediaType: type
            });
            setSettings(prev => ({ ...prev, imageUrl: downloadUrl, mediaType: type }));

            // 갤러리에 추가
            let meta = {};
            try { meta = await getMetadata(storageRef); } catch (e) { /* ignore */ }
            setGallery(prev => [{
                name: fileName, url: downloadUrl, type, size: file.size,
                createdAt: meta.timeCreated || new Date().toISOString(),
                fullPath: storageRef.fullPath,
                isActive: true
            }, ...prev.map(g => ({ ...g, isActive: false }))]);

            alert(`✅ ${type === 'video' ? '영상' : '이미지'} 업로드 완료!`);
        } catch (err) {
            console.error('[Admin] Upload failed:', err);
            alert(`업로드 실패: ${err.message}`);
        } finally {
            setIsUploading(false);
            setUploadProgress('');
        }
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > MAX_IMAGE_SIZE) { alert(`이미지 최대 ${MAX_IMAGE_SIZE / 1024 / 1024}MB`); return; }
        uploadToStorage(file, 'image');
        e.target.value = '';
    };

    const handleVideoUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > MAX_VIDEO_SIZE) { alert(`영상 최대 ${MAX_VIDEO_SIZE / 1024 / 1024}MB`); return; }
        const allowed = ['video/mp4', 'video/webm', 'video/quicktime'];
        if (!allowed.includes(file.type)) { alert('지원 형식: MP4, WebM, MOV'); return; }
        uploadToStorage(file, 'video');
        e.target.value = '';
    };

    // ─── 갤러리에서 선택 → 키오스크에 표시 ───
    const handleSelectMedia = async (item) => {
        try {
            await storageService.updateKioskSettings(selectedBranch, {
                ...settings, imageUrl: item.url, mediaType: item.type
            });
            setSettings(prev => ({ ...prev, imageUrl: item.url, mediaType: item.type }));
            setGallery(prev => prev.map(g => ({ ...g, isActive: g.url === item.url })));
        } catch (err) {
            alert('선택 실패: ' + err.message);
        }
    };

    // ─── 개별 삭제 ───
    const handleDeleteItem = async (item) => {
        if (!window.confirm(`이 ${item.type === 'video' ? '영상' : '이미지'}을 삭제할까요?`)) return;
        try {
            const itemRef = ref(storage, item.fullPath);
            await deleteObject(itemRef);

            // 활성 미디어였으면 해제
            if (item.isActive) {
                await storageService.updateKioskSettings(selectedBranch, { imageUrl: null, mediaType: 'image', active: false });
                setSettings({ active: false, imageUrl: null, mediaType: 'image' });
            }
            setGallery(prev => prev.filter(g => g.url !== item.url));
        } catch (err) {
            alert('삭제 실패: ' + err.message);
        }
    };

    const handleToggleActive = async () => {
        const newActive = !settings.active;
        try {
            await storageService.updateKioskSettings(selectedBranch, { ...settings, active: newActive });
            setSettings(prev => ({ ...prev, active: newActive }));
        } catch (err) {
            alert('설정 변경 실패');
        }
    };

    const activeMedia = gallery.find(g => g.isActive) || null;

    return (
        <div className="dashboard-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h3 className="card-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                <Image size={24} weight="fill" color="var(--primary-gold)" />
                키오스크 화면 설정
            </h3>

            {/* ━━━ 출석 화면 로고 설정 (SaaS) ━━━ */}
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)', marginBottom: '24px' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    📷 출석 화면 로고
                </h4>
                <p style={{ margin: '0 0 20px 0', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                    출석체크 키오스크 숫자패드 위에 표시될 로고입니다. 최대 2개까지 등록할 수 있습니다.
                    <br />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                        등록하지 않으면 설정 탭의 스튜디오 로고가 표시됩니다.
                    </span>
                </p>

                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    {[0, 1].map((slotIdx) => {
                        const logos = config.KIOSK?.LOGOS || [];
                        const logoUrl = logos[slotIdx] || '';
                        const bgs = config.KIOSK?.LOGO_BGS || [];
                        const opacities = config.KIOSK?.LOGO_OPACITIES || [];
                        const currentBg = bgs[slotIdx] || 'transparent'; // 'transparent', 'white', 'black'
                        const dbOpacity = typeof opacities[slotIdx] === 'number' ? opacities[slotIdx] : 1.0;
                        const currentOpacity = tempOpacities[slotIdx] !== undefined ? tempOpacities[slotIdx] : dbOpacity;
                        
                        const inputId = `kiosk-logo-upload-${slotIdx}`;

                        const bgRgb = currentBg === 'white' ? '255,255,255' : currentBg === 'black' ? '0,0,0' : null;
                        const finalBg = bgRgb ? `rgba(${bgRgb}, ${currentOpacity})` : 'transparent';

                        return (
                            <div key={slotIdx} style={{
                                flex: '1 1 200px', minHeight: '140px',
                                background: 'rgba(0,0,0,0.3)', borderRadius: '12px',
                                border: logoUrl ? '2px solid var(--primary-gold)' : '2px dashed rgba(255,255,255,0.15)',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                position: 'relative', overflow: 'hidden', transition: 'all 0.2s', paddingBottom: logoUrl ? '10px' : '0'
                            }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', position: 'absolute', top: '8px', left: '12px', fontWeight: 'bold', zIndex: 10 }}>
                                    로고 {slotIdx + 1}
                                </div>
                                {logoUrl ? (
                                    <>
                                        {/* 이미지만 감싸는 컨테이너에 선택한 배경 부여 (프리뷰 흐릿함 방지) */}
                                        <div style={{
                                            width: '100%', display: 'flex', justifyContent: 'center', padding: '16px 0',
                                            background: finalBg,
                                        }}>
                                            <img src={logoUrl} alt={`키오스크 로고 ${slotIdx + 1}`} style={{ maxHeight: '70px', maxWidth: '80%', objectFit: 'contain' }} />
                                        </div>

                                        {/* 배경색 선택 UI */}
                                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', alignItems: 'center', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                            <span>배경:</span>
                                            {['transparent', 'white', 'black'].map(bgValue => (
                                                <label key={bgValue} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                                                    <input 
                                                        type="radio" 
                                                        checked={currentBg === bgValue} 
                                                        onChange={async () => {
                                                            const newBgs = [...bgs];
                                                            while (newBgs.length <= slotIdx) newBgs.push('transparent');
                                                            newBgs[slotIdx] = bgValue;
                                                            try {
                                                                await updateConfig({ KIOSK: { ...(config.KIOSK || {}), LOGO_BGS: newBgs } });
                                                                await refreshConfig();
                                                            } catch(e) { alert('변경 실패: ' + e.message); }
                                                        }}
                                                    />
                                                    {bgValue === 'transparent' ? '없음' : bgValue === 'white' ? '흰' : '검'}
                                                </label>
                                            ))}
                                        </div>

                                        {/* 농도 조절 슬라이더 */}
                                        {currentBg !== 'transparent' && (
                                            <div style={{ padding: '0 16px', marginTop: '8px', width: '100%', boxSizing: 'border-box' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                                                    <span>농도 조절</span>
                                                    <span>{Math.round(currentOpacity * 100)}%</span>
                                                </div>
                                                <input 
                                                    type="range" 
                                                    min="0.1" max="1.0" step="0.05" 
                                                    value={currentOpacity}
                                                    onChange={(e) => setTempOpacities(prev => ({...prev, [slotIdx]: parseFloat(e.target.value)}))}
                                                    onMouseUp={async () => {
                                                        const newOpacs = [...opacities];
                                                        while (newOpacs.length <= slotIdx) newOpacs.push(1.0);
                                                        newOpacs[slotIdx] = currentOpacity;
                                                        try {
                                                            await updateConfig({ KIOSK: { ...(config.KIOSK || {}), LOGO_OPACITIES: newOpacs } });
                                                            await refreshConfig();
                                                        } catch(e) {}
                                                    }}
                                                    onTouchEnd={async () => {
                                                        const newOpacs = [...opacities];
                                                        while (newOpacs.length <= slotIdx) newOpacs.push(1.0);
                                                        newOpacs[slotIdx] = currentOpacity;
                                                        try {
                                                            await updateConfig({ KIOSK: { ...(config.KIOSK || {}), LOGO_OPACITIES: newOpacs } });
                                                            await refreshConfig();
                                                        } catch(e) {}
                                                    }}
                                                    style={{ width: '100%', cursor: 'pointer' }}
                                                />
                                            </div>
                                        )}

                                        <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                                            <label htmlFor={inputId} style={{
                                                padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', cursor: 'pointer',
                                                background: 'rgba(255,255,255,0.1)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.1)'
                                            }}>변경</label>
                                            <button onClick={async () => {
                                                const newLogos = [...logos];
                                                const newBgs = [...bgs];
                                                const newOpacs = [...opacities];
                                                
                                                newLogos[slotIdx] = '';
                                                newBgs[slotIdx] = 'transparent';
                                                newOpacs[slotIdx] = 1.0;
                                                
                                                while (newLogos.length > 0 && !newLogos[newLogos.length - 1]) newLogos.pop();
                                                while (newBgs.length > 0 && newBgs[newBgs.length - 1] === 'transparent') newBgs.pop();

                                                try {
                                                    await updateConfig({ KIOSK: { ...(config.KIOSK || {}), LOGOS: newLogos, LOGO_BGS: newBgs } });
                                                    await refreshConfig();
                                                } catch(e) { alert('삭제 실패: ' + e.message); }
                                            }} style={{
                                                padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', cursor: 'pointer',
                                                background: 'rgba(244,63,94,0.1)', color: '#F43F5E', border: '1px solid rgba(244,63,94,0.3)'
                                            }}>삭제</button>
                                        </div>
                                    </>
                                ) : (
                                    <label htmlFor={inputId} style={{
                                        cursor: 'pointer', textAlign: 'center', padding: '20px',
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px'
                                    }}>
                                        <Image size={32} weight="light" color="rgba(255,255,255,0.2)" />
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                                            {slotIdx === 0 ? '클릭하여 업로드' : '(선택사항)'}
                                        </span>
                                    </label>
                                )}
                                <input
                                    type="file" accept="image/*" id={inputId}
                                    style={{ display: 'none' }}
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        if (file.size > 5 * 1024 * 1024) { alert('최대 5MB까지 업로드 가능합니다.'); return; }
                                        try {
                                            setIsUploading(true);
                                            setUploadProgress(`로고 ${slotIdx + 1} 업로드 중...`);
                                            const ext = file.name.split('.').pop().toLowerCase();
                                            const storageRef = ref(storage, tenantStoragePath(`kiosk_logo_${slotIdx}_${Date.now()}.${ext}`));
                                            await uploadBytes(storageRef, file, { contentType: file.type });
                                            const url = await getDownloadURL(storageRef);

                                            const newLogos = [...(config.KIOSK?.LOGOS || [])];
                                            // 슬롯 크기 맞추기
                                            while (newLogos.length <= slotIdx) newLogos.push('');
                                            newLogos[slotIdx] = url;

                                            await updateConfig({ KIOSK: { ...(config.KIOSK || {}), LOGOS: newLogos } });
                                            await refreshConfig();
                                            alert(`✅ 로고 ${slotIdx + 1} 업로드 완료!`);
                                        } catch (err) {
                                            console.error('[Kiosk] Logo upload failed:', err);
                                            alert('업로드 실패: ' + err.message);
                                        } finally {
                                            setIsUploading(false);
                                            setUploadProgress('');
                                        }
                                        e.target.value = '';
                                    }}
                                />
                            </div>
                        );
                    })}
                </div>
                {isUploading && <div style={{ marginTop: '12px', textAlign: 'center', color: 'var(--primary-gold)', fontSize: '0.85rem', fontWeight: 'bold' }}>{uploadProgress}</div>}
            </div>

            <div style={{ padding: '16px', background: 'rgba(var(--primary-rgb), 0.05)', borderRadius: '12px', border: '1px solid rgba(var(--primary-rgb), 0.2)', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <Info size={20} color="var(--primary-gold)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.7' }}>
                    <p style={{ margin: '0 0 10px 0', color: 'var(--text-primary)', fontWeight: 'bold' }}>키오스크 공지 기능 안내</p>
                    출석체크 태블릿 화면에 이미지나 영상을 표시할 수 있습니다.
                    <br/><strong style={{ color: 'var(--primary-gold)' }}>사용 방법:</strong>
                    <ol style={{ margin: '6px 0 6px 0', paddingLeft: '18px', lineHeight: '1.8' }}>
                        <li>아래 <strong>📎 업로드</strong> 버튼으로 이미지 또는 영상 파일을 올립니다</li>
                        <li>갤러리에서 <strong>표시할 미디어를 선택</strong>합니다</li>
                        <li>하단의 <strong>"출석기에 표시"</strong> 토글을 켜면 태블릿에 표시됩니다</li>
                    </ol>
                    <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>지원 파일: 이미지(최대 10MB) | 영상(최대 50MB, MP4/WebM/MOV)</span>
                </div>
            </div>

            {/* Branch Selector (다중 지점일 때만 노출) */}
            {branches.length > 1 && (
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
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                {/* ─── 현재 활성 미디어 미리보기 ─── */}
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h4 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {activeMedia?.type === 'video' ? <VideoCamera size={20} weight="fill" color="var(--primary-gold)" /> : <Image size={20} weight="fill" color="var(--primary-gold)" />}
                            선택된 미디어
                        </h4>
                        {/* 업로드 버튼 (통합) */}
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input type="file" accept="image/*,video/mp4,video/webm,video/quicktime" onChange={(e) => {
                                const file = e.target.files[0];
                                if (!file) return;
                                const isVideo = file.type.startsWith('video/');
                                if (isVideo) {
                                    if (file.size > MAX_VIDEO_SIZE) { alert(`영상 최대 ${MAX_VIDEO_SIZE / 1024 / 1024}MB`); return; }
                                    const allowed = ['video/mp4', 'video/webm', 'video/quicktime'];
                                    if (!allowed.includes(file.type)) { alert('지원 형식: MP4, WebM, MOV'); return; }
                                    uploadToStorage(file, 'video');
                                } else {
                                    if (file.size > MAX_IMAGE_SIZE) { alert(`이미지 최대 ${MAX_IMAGE_SIZE / 1024 / 1024}MB`); return; }
                                    uploadToStorage(file, 'image');
                                }
                                e.target.value = '';
                            }} style={{ display: 'none' }} id="upload-kiosk-media" disabled={isUploading} />
                            <label htmlFor="upload-kiosk-media" className="action-btn sm" style={{
                                background: 'var(--primary-gold)', color: 'var(--text-on-primary)',
                                cursor: isUploading ? 'not-allowed' : 'pointer', opacity: isUploading ? 0.7 : 1,
                                fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px'
                            }}>📎 업로드</label>
                        </div>
                    </div>

                    <div style={{
                        background: 'rgba(0,0,0,0.3)', borderRadius: '12px', minHeight: '200px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '1px dashed rgba(255,255,255,0.1)', overflow: 'hidden', position: 'relative'
                    }}>
                        {settings.imageUrl ? (
                            isVideoMedia(settings.imageUrl, settings.mediaType) ? (
                                <video src={settings.imageUrl} controls loop muted playsInline
                                    style={{ width: '100%', height: 'auto', maxHeight: '400px', objectFit: 'contain' }} />
                            ) : (
                                <img src={settings.imageUrl} alt="키오스크 공지" style={{ width: '100%', height: 'auto', maxHeight: '400px', objectFit: 'contain' }} />
                            )
                        ) : (
                            <div style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: '40px' }}>
                                <FilmSlate size={48} weight="light" style={{ marginBottom: '8px', opacity: 0.5 }} />
                                <div>아래 갤러리에서 선택하거나</div>
                                <div style={{ fontSize: '0.8rem', marginTop: '4px', opacity: 0.6 }}>위 버튼으로 새로 업로드하세요</div>
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

                {/* ─── 갤러리: 업로드된 모든 미디어 ─── */}
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                    <h4 style={{ margin: '0 0 16px 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        📂 미디어 갤러리
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>
                            ({gallery.length}개)
                        </span>
                    </h4>

                    {loadingGallery ? (
                        <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-tertiary)' }}>불러오는 중...</div>
                    ) : gallery.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-tertiary)' }}>
                            업로드된 미디어가 없습니다
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                            {gallery.map((item) => (
                                <div key={item.url} style={{
                                    borderRadius: '12px', overflow: 'hidden', position: 'relative',
                                    border: item.isActive ? '2px solid var(--primary-gold)' : '1px solid var(--border-color)',
                                    background: 'rgba(0,0,0,0.3)', cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    boxShadow: item.isActive ? '0 0 12px rgba(var(--primary-rgb), 0.3)' : 'none'
                                }}
                                onClick={() => handleSelectMedia(item)}
                                >
                                    {/* 썸네일 */}
                                    <div style={{ width: '100%', height: '120px', overflow: 'hidden', position: 'relative' }}>
                                        {item.type === 'video' ? (
                                            <video src={item.url} muted preload="metadata"
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                onLoadedData={e => { e.target.currentTime = 1; }}
                                            />
                                        ) : (
                                            <img src={item.url} alt={item.name}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        )}
                                        {/* 타입 뱃지 */}
                                        <div style={{
                                            position: 'absolute', top: '6px', left: '6px',
                                            padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem',
                                            background: item.type === 'video' ? 'rgba(239, 68, 68, 0.8)' : 'rgba(59, 130, 246, 0.8)',
                                            color: 'white', fontWeight: 'bold'
                                        }}>
                                            {item.type === 'video' ? '🎬 영상' : '🖼 이미지'}
                                        </div>
                                        {/* 활성 뱃지 */}
                                        {item.isActive && (
                                            <div style={{
                                                position: 'absolute', top: '6px', right: '6px',
                                                background: 'rgba(16, 185, 129, 0.9)', borderRadius: '50%',
                                                width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                            }}>
                                                <CheckCircle size={16} weight="fill" color="white" />
                                            </div>
                                        )}
                                    </div>
                                    {/* 하단 정보 */}
                                    <div style={{ padding: '8px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                            {(item.size / 1024 / 1024).toFixed(1)}MB
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteItem(item); }}
                                            style={{
                                                background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)',
                                                borderRadius: '6px', padding: '4px 8px', cursor: 'pointer',
                                                color: '#F43F5E', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '3px'
                                            }}
                                        >
                                            <Trash size={12} /> 삭제
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Toggle */}
                <div style={{
                    background: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: '16px',
                    border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', opacity: settings.imageUrl ? 1 : 0.5, pointerEvents: settings.imageUrl ? 'auto' : 'none'
                }}>
                    <div>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', color: settings.active ? '#10B981' : 'var(--text-primary)' }}>
                            {settings.active ? '출석기에 표시 중' : '출석기에 미표시'}
                        </h4>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            활성화하면 태블릿 화면에 선택한 미디어가 우선 표시됩니다. (터치하면 닫힘)
                        </p>
                    </div>
                    <button onClick={handleToggleActive} style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: settings.active ? '#10B981' : 'var(--text-tertiary)', padding: 0, display: 'flex'
                    }} disabled={!settings.imageUrl}>
                        {settings.active ? <ToggleRight size={56} weight="fill" /> : <ToggleLeft size={56} weight="regular" />}
                    </button>
                </div>

                {/* ─── 추가 옵션 ─── */}
                <div style={{
                    background: 'rgba(255,255,255,0.02)', padding: '20px 24px', borderRadius: '16px',
                    border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '16px',
                    opacity: settings.active ? 1 : 0.5, pointerEvents: settings.active ? 'auto' : 'none'
                }}>
                    <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>⚙️ 공지 화면 옵션</h4>

                    {/* 터치 안내 텍스트 */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <div>
                            <div style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
                                터치 안내 텍스트 표시
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                하단에 "👆 화면을 터치하면 출석부로 이동합니다" 안내 표시
                            </div>
                        </div>
                        <button onClick={async () => {
                            const newVal = !(settings.showTouchGuide !== false);
                            try {
                                await storageService.updateKioskSettings(selectedBranch, { ...settings, showTouchGuide: newVal });
                                setSettings(prev => ({ ...prev, showTouchGuide: newVal }));
                            } catch (err) { alert('설정 변경 실패'); }
                        }} style={{
                            background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex',
                            color: settings.showTouchGuide !== false ? '#10B981' : 'var(--text-tertiary)'
                        }}>
                            {settings.showTouchGuide !== false ? <ToggleRight size={44} weight="fill" /> : <ToggleLeft size={44} weight="regular" />}
                        </button>
                    </div>

                    {/* 근접 감지 자동 복귀 */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
                        <div>
                            <div style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
                                근접 감지 자동 복귀
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                카메라로 사람 접근 감지 시 자동으로 출석체크 화면 전환
                            </div>
                        </div>
                        <button onClick={async () => {
                            const newVal = !settings.proximityReturn;
                            try {
                                await storageService.updateKioskSettings(selectedBranch, { ...settings, proximityReturn: newVal });
                                setSettings(prev => ({ ...prev, proximityReturn: newVal }));
                            } catch (err) { alert('설정 변경 실패'); }
                        }} style={{
                            background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex',
                            color: settings.proximityReturn ? '#10B981' : 'var(--text-tertiary)'
                        }}>
                            {settings.proximityReturn ? <ToggleRight size={44} weight="fill" /> : <ToggleLeft size={44} weight="regular" />}
                        </button>
                    </div>
                </div>

                {/* ─── 키오스크 운영 시간 설정 ─── */}
                <div style={{
                    background: 'rgba(255,255,255,0.02)', padding: '20px 24px', borderRadius: '16px',
                    border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '16px',
                }}>
                    <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>⏰ 키오스크 운영 시간 (자동 ON/OFF)</h4>

                    {/* 운영 시간 자동화 토글 */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <div>
                            <div style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
                                자동 ON/OFF 스케줄 사용
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                설정된 운영 시간 외에는 화면과 동작을 끄고 절전(대기) 모드 진입
                            </div>
                        </div>
                        <button onClick={async () => {
                            const newVal = !settings.autoOnOff;
                            try {
                                await storageService.updateKioskSettings(selectedBranch, { ...settings, autoOnOff: newVal });
                                setSettings(prev => ({ ...prev, autoOnOff: newVal }));
                            } catch (err) { alert('설정 변경 실패'); }
                        }} style={{
                            background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex',
                            color: settings.autoOnOff ? '#10B981' : 'var(--text-tertiary)'
                        }}>
                            {settings.autoOnOff ? <ToggleRight size={44} weight="fill" /> : <ToggleLeft size={44} weight="regular" />}
                        </button>
                    </div>

                    {/* 시간 입력 */}
                    {settings.autoOnOff && (
                        <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>시작 시간 (켜짐)</label>
                                <input 
                                    type="time" 
                                    value={settings.autoOnTime || '06:00'}
                                    onChange={async (e) => {
                                        const newVal = e.target.value;
                                        setSettings(prev => ({ ...prev, autoOnTime: newVal }));
                                        await storageService.updateKioskSettings(selectedBranch, { ...settings, autoOnTime: newVal });
                                    }}
                                    style={{
                                        width: '100%', padding: '12px 16px', fontSize: '1.2rem', fontWeight: 'bold', fontFamily: 'var(--font-main)',
                                        background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '12px', color: 'var(--text-primary)'
                                    }}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>종료 시간 (꺼짐)</label>
                                <input 
                                    type="time" 
                                    value={settings.autoOffTime || '23:00'}
                                    onChange={async (e) => {
                                        const newVal = e.target.value;
                                        setSettings(prev => ({ ...prev, autoOffTime: newVal }));
                                        await storageService.updateKioskSettings(selectedBranch, { ...settings, autoOffTime: newVal });
                                    }}
                                    style={{
                                        width: '100%', padding: '12px 16px', fontSize: '1.2rem', fontWeight: 'bold', fontFamily: 'var(--font-main)',
                                        background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '12px', color: 'var(--text-primary)'
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default KioskSettingsTab;
