import { useState, useRef } from 'react';
import { UploadSimple, FileX, CheckCircle, Spinner, Robot, Table } from '@phosphor-icons/react';
import { httpsCallable } from 'firebase/functions';
import { collection, writeBatch, doc } from 'firebase/firestore';
import { functions, db } from '../../../firebase';
import { useStudioConfig } from '../../../contexts/StudioContext';

const SmartDataImporter = ({ onImportComplete }) => {
    const [activeTab, setActiveTab] = useState('members'); // 'members', 'timetable', 'pricing'
    const [file, setFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [parsedData, setParsedData] = useState(null);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);
    const { studioId } = useStudioConfig();

    const tabs = [
        { id: 'members', label: '회원 엑셀 (텍스트)', type: 'text' },
        { id: 'timetable', label: '시간표 (이미지)', type: 'image' },
        { id: 'pricing', label: '가격표 (이미지)', type: 'image' }
    ];

    const currentTabInfo = tabs.find(t => t.id === activeTab);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) processFile(selectedFile);
    };

    const processFile = (selectedFile) => {
        setError(null);
        setParsedData(null);
        
        if (currentTabInfo.type === 'image' && !selectedFile.type.startsWith('image/')) {
            setError('이미지 파일(JPG, PNG 등)만 업로드 가능합니다.');
            return;
        }

        setFile(selectedFile);
    };

    const handleUpload = async () => {
        if (!file) return;

        setIsProcessing(true);
        setError(null);

        try {
            const parseStudioDocument = httpsCallable(functions, 'parseStudioDocument');

            if (currentTabInfo.type === 'image') {
                const base64 = await convertToBase64(file);
                const result = await parseStudioDocument({ docType: activeTab, base64Image: base64 });
                if (result.data.success) {
                    setParsedData(result.data.data);
                } else {
                    throw new Error(result.data.error || '알 수 없는 오류가 발생했습니다.');
                }
            } else {
                // TEXT (Members CSV/TXT) - CHUNKING LOGIC
                const text = await file.text();
                const lines = text.split('\n').filter(line => line.trim().length > 0);
                
                // If it's small enough, just send it
                if (lines.length <= 40) {
                    const result = await parseStudioDocument({ docType: activeTab, textData: text });
                    if (result.data.success) {
                        setParsedData(result.data.data);
                    } else {
                        throw new Error(result.data.error || '알 수 없는 오류가 발생했습니다.');
                    }
                } else {
                    // Chunk processing (30 lines per chunk)
                    const chunkSize = 30;
                    let allMembers = [];
                    
                    // Optional: keep header if it exists (first line)
                    const header = lines[0];
                    const dataLines = lines.slice(1);
                    
                    for (let i = 0; i < dataLines.length; i += chunkSize) {
                        const chunkLines = [header, ...dataLines.slice(i, i + chunkSize)].join('\n');
                        console.log(`Processing chunk ${i/chunkSize + 1} / ${Math.ceil(dataLines.length/chunkSize)}`);
                        
                        const result = await parseStudioDocument({ docType: activeTab, textData: chunkLines });
                        if (result.data.success && result.data.data && result.data.data.members) {
                            allMembers = [...allMembers, ...result.data.data.members];
                        } else {
                            console.warn("Chunk failed:", result.data.error);
                            // Continue anyway to try and salvage the rest
                        }
                    }
                    
                    if (allMembers.length === 0) {
                        throw new Error('데이터를 추출하지 못했습니다. 형식을 확인해주세요.');
                    }
                    
                    setParsedData({ members: allMembers });
                }
            }
        } catch (err) {
            console.error(err);
            setError(err.message || 'AI 문서 분석 중 오류가 발생했습니다.');
        } finally {
            setIsProcessing(false);
        }
    };

    const convertToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            if (file.type && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        const ctx = canvas.getContext('2d');
                        // 1. Fill white background for transparent PNGs
                        ctx.fillStyle = '#FFFFFF';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        // 2. Draw image on top
                        ctx.drawImage(img, 0, 0);
                        // 3. Export as high-quality JPEG (guarantees no transparency, smaller payload)
                        resolve(canvas.toDataURL('image/jpeg', 0.9));
                    };
                    img.onerror = (error) => reject(error);
                    img.src = e.target.result;
                };
                reader.onerror = (error) => reject(error);
                reader.readAsDataURL(file);
            } else {
                // For non-images (unexpected in this flow, but fallback)
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve(reader.result);
                reader.onerror = (error) => reject(error);
            }
        });
    };

    const handleClear = () => {
        setFile(null);
        setParsedData(null);
        setError(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSave = async () => {
        if (!parsedData || !studioId) return;

        setIsSaving(true);
        setError(null);
        
        try {
            const batch = writeBatch(db);
            const now = new Date();

            if (activeTab === 'members' && parsedData.members) {
                // Save to studios/{studioId}/members
                parsedData.members.forEach(member => {
                    // Create a clean phone number as ID or let Firestore generate one
                    const memberId = member.phone ? member.phone.replace(/[^0-9]/g, '') : doc(collection(db, `studios/${studioId}/members`)).id;
                    const docRef = doc(db, `studios/${studioId}/members`, memberId);
                    
                    batch.set(docRef, {
                        name: member.name,
                        phone: member.phone || '',
                        credits: member.credits || 0,
                        originalCredits: member.credits || 0,
                        endDate: member.endDate ? new Date(member.endDate) : null,
                        startDate: now, // Default to now if migrating
                        note: member.note || 'AI 마이그레이션',
                        status: 'active',
                        recentAttendance: null,
                        createdAt: now,
                        updatedAt: now
                    }, { merge: true }); // Merge in case they already exist
                });
            } else if (activeTab === 'timetable' && parsedData.schedule) {
                // Save to studios/{studioId}/monthly_schedules (treating this as the default template)
                // Let's create a 'default' document that can serve as the baseline
                const docRef = doc(db, `studios/${studioId}/monthly_schedules`, 'default_template');
                batch.set(docRef, {
                    schedule: parsedData.schedule,
                    updatedAt: now,
                    note: 'AI 마이그레이션된 기본 시간표'
                }, { merge: true });
            } else if (activeTab === 'pricing' && parsedData.pricing) {
                // [FIX] Save to settings/pricing (same path as AdminPriceManager)
                // AI now returns category-structured data matching the app's pricing format
                const { storageService } = await import('../../../services/storage');
                await storageService.savePricing(parsedData.pricing);
                // Skip batch commit for pricing - savePricing handles it directly
                if (onImportComplete) {
                    onImportComplete(activeTab, parsedData);
                }
                alert('가격표 데이터가 성공적으로 저장되었습니다!');
                handleClear();
                setIsSaving(false);
                return;
            }

            await batch.commit();

            if (onImportComplete) {
                onImportComplete(activeTab, parsedData);
            }
            alert('데이터가 성공적으로 DB에 저장되었습니다!');
            handleClear();
        } catch (err) {
            console.error("Save failed:", err);
            setError("데이터 저장 중 오류가 발생했습니다: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '24px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', marginTop: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                <Robot size={24} color="var(--primary-gold)" weight="fill" />
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--primary-gold)' }}>AI 스마트 데이터 이전 (초기 세팅용)</h3>
            </div>
            
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.5' }}>
                요가원에서 사용하시던 엑셀 회원 목록이나 시간표/가격표 이미지를 업로드하세요.<br/>
                AI가 자동으로 양식을 인식하여 우리 시스템에 맞는 표 형태로 변환해 줍니다.
            </p>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => { setActiveTab(tab.id); handleClear(); }}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '8px',
                            border: '1px solid',
                            borderColor: activeTab === tab.id ? 'var(--primary-gold)' : 'rgba(255,255,255,0.1)',
                            background: activeTab === tab.id ? 'rgba(var(--primary-rgb), 0.1)' : 'transparent',
                            color: activeTab === tab.id ? 'var(--primary-gold)' : 'var(--text-secondary)',
                            cursor: 'pointer',
                            fontWeight: activeTab === tab.id ? 'bold' : 'normal',
                            transition: 'all 0.2s'
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {!parsedData ? (
                <div 
                    style={{
                        border: `2px dashed ${isDragging ? 'var(--primary-gold)' : 'rgba(255,255,255,0.2)'}`,
                        borderRadius: '12px', padding: '40px', textAlign: 'center',
                        background: isDragging ? 'rgba(var(--primary-rgb), 0.05)' : 'rgba(255,255,255,0.02)',
                        transition: 'all 0.3s', cursor: 'pointer', position: 'relative'
                    }}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                            processFile(e.dataTransfer.files[0]);
                        }
                    }}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        style={{ display: 'none' }} 
                        accept={currentTabInfo.type === 'image' ? "image/*" : ".csv,.txt"}
                    />
                    
                    {isProcessing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                            <Spinner size={32} className="spin" color="var(--primary-gold)" />
                            <div style={{ color: 'var(--primary-gold)', fontWeight: 'bold' }}>AI가 문서를 분석하고 있습니다...</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>최대 10~20초 정도 소요될 수 있습니다.</div>
                        </div>
                    ) : file ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                            <CheckCircle size={48} color="#10B981" weight="fill" />
                            <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{file.name}</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>{(file.size / 1024).toFixed(1)} KB</div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleClear(); }}
                                    className="action-btn"
                                    style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none' }}
                                >
                                    취소
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleUpload(); }}
                                    className="action-btn primary"
                                    style={{ background: 'var(--primary-gold)', color: 'var(--text-on-primary)', fontWeight: 'bold', border: 'none' }}
                                >
                                    데이터 추출 시작
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <UploadSimple size={48} color={isDragging ? 'var(--primary-gold)' : 'var(--text-tertiary)'} style={{ marginBottom: '16px', opacity: isDragging ? 1 : 0.5 }} />
                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '8px', color: isDragging ? 'var(--primary-gold)' : 'var(--text-primary)' }}>
                                클릭하거나 파일을 여기로 드래그하세요
                            </div>
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-tertiary)' }}>
                                {currentTabInfo.type === 'image' ? '지원 형식: JPG, PNG (최대 5MB)' : '지원 형식: CSV, TXT (엑셀 파일은 CSV로 저장 후 업로드 요망)'}
                            </div>
                        </>
                    )}
                </div>
            ) : (
                <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10B981', fontWeight: 'bold' }}>
                            <CheckCircle size={24} weight="fill" />
                            추출 성공! 데이터를 확인해 주세요.
                        </div>
                        <button onClick={handleClear} className="action-btn sm" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)' }}>
                            다시 업로드
                        </button>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <pre style={{ margin: 0, padding: '16px', fontSize: '0.85rem', color: '#A7F3D0', overflowX: 'auto', maxHeight: '300px' }}>
                            {JSON.stringify(parsedData, null, 2)}
                        </pre>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                        <button 
                            onClick={handleSave}
                            disabled={isSaving}
                            className="action-btn primary" 
                            style={{ padding: '12px 24px', fontSize: '1.1rem', background: 'var(--primary-gold)', color: 'var(--text-on-primary)', fontWeight: 'bold' }}
                        >
                            {isSaving ? <Spinner className="spin" /> : <Table size={20} weight="bold" />} 
                            {isSaving ? ' 저장 중...' : ' 데이터 저장하기'}
                        </button>
                    </div>
                </div>
            )}
            
            {error && (
                <div style={{ marginTop: '16px', padding: '16px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #EF4444', color: '#FFFFFF', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.95rem', fontWeight: 'bold' }}>
                    <FileX size={24} color="#EF4444" weight="fill" />
                    <span style={{ lineHeight: '1.4' }}>{error}</span>
                </div>
            )}
        </div>
    );
};

export default SmartDataImporter;
