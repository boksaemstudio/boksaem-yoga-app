import { useLanguageStore } from '../../../stores/useLanguageStore';
import { useState, useRef } from 'react';
import { UploadSimple, FileX, CheckCircle, Spinner, Robot, Table } from '@phosphor-icons/react';
import { httpsCallable } from 'firebase/functions';
import { collection, writeBatch, doc } from 'firebase/firestore';
import { functions, db } from '../../../firebase';
import { useStudioConfig } from '../../../contexts/StudioContext';
const SmartDataImporter = ({
  onImportComplete
}) => {
  const t = useLanguageStore(s => s.t);
  const [activeTab, setActiveTab] = useState('members'); // 'members', 'timetable', 'pricing'
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const {
    studioId
  } = useStudioConfig();
  const tabs = [{
    id: 'members',
    label: t("g_d35d5d") || "\uD68C\uC6D0 \uC5D1\uC140 (\uD14D\uC2A4\uD2B8)",
    type: 'text'
  }, {
    id: 'timetable',
    label: t("g_46b495") || "\uC2DC\uAC04\uD45C (\uC774\uBBF8\uC9C0)",
    type: 'image'
  }, {
    id: 'pricing',
    label: t("g_6a7c04") || "\uAC00\uACA9\uD45C (\uC774\uBBF8\uC9C0)",
    type: 'image'
  }];
  const currentTabInfo = tabs.find(tab => tab.id === activeTab);
  const handleFileChange = e => {
    const selectedFile = e.target.files[0];
    if (selectedFile) processFile(selectedFile);
  };
  const processFile = selectedFile => {
    setError(null);
    setParsedData(null);
    if (currentTabInfo.type === 'image' && !selectedFile.type.startsWith('image/')) {
      setError(t("g_1dddbf") || "\uC774\uBBF8\uC9C0 \uD30C\uC77C(JPG, PNG \uB4F1)\uB9CC \uC5C5\uB85C\uB4DC \uAC00\uB2A5\uD569\uB2C8\uB2E4.");
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
        const result = await parseStudioDocument({
          docType: activeTab,
          base64Image: base64
        });
        if (result.data.success) {
          setParsedData(result.data.data);
        } else {
          throw new Error(result.data.error || t("g_eaa199") || "\uC54C \uC218 \uC5C6\uB294 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.");
        }
      } else {
        // TEXT (Members CSV/TXT) - CHUNKING LOGIC
        const text = await file.text();
        const lines = text.split('\n').filter(line => line.trim().length > 0);

        // If it's small enough, just send it
        if (lines.length <= 40) {
          const result = await parseStudioDocument({
            docType: activeTab,
            textData: text
          });
          if (result.data.success) {
            setParsedData(result.data.data);
          } else {
            throw new Error(result.data.error || t("g_eaa199") || "\uC54C \uC218 \uC5C6\uB294 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.");
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
            console.log(`Processing chunk ${i / chunkSize + 1} / ${Math.ceil(dataLines.length / chunkSize)}`);
            const result = await parseStudioDocument({
              docType: activeTab,
              textData: chunkLines
            });
            if (result.data.success && result.data.data && result.data.data.members) {
              allMembers = [...allMembers, ...result.data.data.members];
            } else {
              console.warn("Chunk failed:", result.data.error);
              // Continue anyway to try and salvage the rest
            }
          }
          if (allMembers.length === 0) {
            throw new Error(t("g_837e86") || "\uB370\uC774\uD130\uB97C \uCD94\uCD9C\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4. \uD615\uC2DD\uC744 \uD655\uC778\uD574\uC8FC\uC138\uC694.");
          }
          setParsedData({
            members: allMembers
          });
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.message || t("g_427996") || "AI \uBB38\uC11C \uBD84\uC11D \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.");
    } finally {
      setIsProcessing(false);
    }
  };
  const convertToBase64 = file => {
    return new Promise((resolve, reject) => {
      if (file.type && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = e => {
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
          img.onerror = error => reject(error);
          img.src = e.target.result;
        };
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
      } else {
        // For non-images (unexpected in this flow, but fallback)
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
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
            startDate: now,
            // Default to now if migrating
            note: member.note || t("g_4b3a51") || "AI \uB9C8\uC774\uADF8\uB808\uC774\uC158",
            status: 'active',
            recentAttendance: null,
            createdAt: now,
            updatedAt: now
          }, {
            merge: true
          }); // Merge in case they already exist
        });
      } else if (activeTab === 'timetable' && parsedData.schedule) {
        // Save to studios/{studioId}/monthly_schedules (treating this as the default template)
        // Let's create a 'default' document that can serve as the baseline
        const docRef = doc(db, `studios/${studioId}/monthly_schedules`, 'default_template');
        batch.set(docRef, {
          schedule: parsedData.schedule,
          updatedAt: now,
          note: t("g_bb8fb8") || "AI \uB9C8\uC774\uADF8\uB808\uC774\uC158\uB41C \uAE30\uBCF8 \uC2DC\uAC04\uD45C"
        }, {
          merge: true
        });
      } else if (activeTab === 'pricing' && parsedData.pricing) {
        // [FIX] Save to settings/pricing (same path as AdminPriceManager)
        // AI now returns category-structured data matching the app's pricing format
        const {
          storageService
        } = await import('../../../services/storage');
        await storageService.savePricing(parsedData.pricing);
        // Skip batch commit for pricing - savePricing handles it directly
        if (onImportComplete) {
          onImportComplete(activeTab, parsedData);
        }
        alert(t("g_8f6dfa") || "\uAC00\uACA9\uD45C \uB370\uC774\uD130\uAC00 \uC131\uACF5\uC801\uC73C\uB85C \uC800\uC7A5\uB418\uC5C8\uC2B5\uB2C8\uB2E4!");
        handleClear();
        setIsSaving(false);
        return;
      }
      await batch.commit();
      if (onImportComplete) {
        onImportComplete(activeTab, parsedData);
      }
      alert(t("g_521adb") || "\uB370\uC774\uD130\uAC00 \uC131\uACF5\uC801\uC73C\uB85C DB\uC5D0 \uC800\uC7A5\uB418\uC5C8\uC2B5\uB2C8\uB2E4!");
      handleClear();
    } catch (err) {
      console.error("Save failed:", err);
      setError((t("g_4122ad") || "\uB370\uC774\uD130 \uC800\uC7A5 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4: ") + err.message);
    } finally {
      setIsSaving(false);
    }
  };
  return <div style={{
    background: 'rgba(0,0,0,0.2)',
    padding: '24px',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.05)',
    marginTop: '20px'
  }}>
            <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '20px'
    }}>
                <Robot size={24} color="var(--primary-gold)" weight="fill" />
                <h3 style={{
        margin: 0,
        fontSize: '1.2rem',
        color: 'var(--primary-gold)'
      }}>{t("g_76bf1c") || "AI \uC2A4\uB9C8\uD2B8 \uB370\uC774\uD130 \uC774\uC804 (\uCD08\uAE30 \uC138\uD305\uC6A9)"}</h3>
            </div>
            
            <p style={{
      fontSize: '0.9rem',
      color: 'var(--text-secondary)',
      marginBottom: '24px',
      lineHeight: '1.5'
    }}>{t("g_8077ac") || "\uC694\uAC00\uC6D0\uC5D0\uC11C \uC0AC\uC6A9\uD558\uC2DC\uB358 \uC5D1\uC140 \uD68C\uC6D0 \uBAA9\uB85D\uC774\uB098 \uC2DC\uAC04\uD45C/\uAC00\uACA9\uD45C \uC774\uBBF8\uC9C0\uB97C \uC5C5\uB85C\uB4DC\uD558\uC138\uC694."}<br />{t("g_5def97") || "AI\uAC00 \uC790\uB3D9\uC73C\uB85C \uC591\uC2DD\uC744 \uC778\uC2DD\uD558\uC5EC \uC6B0\uB9AC \uC2DC\uC2A4\uD15C\uC5D0 \uB9DE\uB294 \uD45C \uD615\uD0DC\uB85C \uBCC0\uD658\uD574 \uC90D\uB2C8\uB2E4."}</p>

            <div style={{
      display: 'flex',
      gap: '10px',
      marginBottom: '20px'
    }}>
                {tabs.map(tab => <button key={tab.id} onClick={() => {
        setActiveTab(tab.id);
        handleClear();
      }} style={{
        padding: '8px 16px',
        borderRadius: '8px',
        border: '1px solid',
        borderColor: activeTab === tab.id ? 'var(--primary-gold)' : 'rgba(255,255,255,0.1)',
        background: activeTab === tab.id ? 'rgba(var(--primary-rgb), 0.1)' : 'transparent',
        color: activeTab === tab.id ? 'var(--primary-gold)' : 'var(--text-secondary)',
        cursor: 'pointer',
        fontWeight: activeTab === tab.id ? 'bold' : 'normal',
        transition: 'all 0.2s'
      }}>
                        {tab.label}
                    </button>)}
            </div>

            {!parsedData ? <div style={{
      border: `2px dashed ${isDragging ? 'var(--primary-gold)' : 'rgba(255,255,255,0.2)'}`,
      borderRadius: '12px',
      padding: '40px',
      textAlign: 'center',
      background: isDragging ? 'rgba(var(--primary-rgb), 0.05)' : 'rgba(255,255,255,0.02)',
      transition: 'all 0.3s',
      cursor: 'pointer',
      position: 'relative'
    }} onDragOver={e => {
      e.preventDefault();
      setIsDragging(true);
    }} onDragLeave={() => setIsDragging(false)} onDrop={e => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        processFile(e.dataTransfer.files[0]);
      }
    }} onClick={() => fileInputRef.current?.click()}>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{
        display: 'none'
      }} accept={currentTabInfo.type === 'image' ? "image/*" : ".csv,.txt"} />
                    
                    {isProcessing ? <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px'
      }}>
                            <Spinner size={32} className="spin" color="var(--primary-gold)" />
                            <div style={{
          color: 'var(--primary-gold)',
          fontWeight: 'bold'
        }}>{t("g_32e1ea") || "AI\uAC00 \uBB38\uC11C\uB97C \uBD84\uC11D\uD558\uACE0 \uC788\uC2B5\uB2C8\uB2E4..."}</div>
                            <div style={{
          fontSize: '0.8rem',
          color: 'var(--text-tertiary)'
        }}>{t("g_1c6ed3") || "\uCD5C\uB300 10~20\uCD08 \uC815\uB3C4 \uC18C\uC694\uB420 \uC218 \uC788\uC2B5\uB2C8\uB2E4."}</div>
                        </div> : file ? <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px'
      }}>
                            <CheckCircle size={48} color="#10B981" weight="fill" />
                            <div style={{
          fontWeight: 'bold',
          fontSize: '1.1rem'
        }}>{file.name}</div>
                            <div style={{
          fontSize: '0.85rem',
          color: 'var(--text-tertiary)'
        }}>{(file.size / 1024).toFixed(1)} KB</div>
                            <div style={{
          display: 'flex',
          gap: '10px',
          marginTop: '10px'
        }}>
                                <button onClick={e => {
            e.stopPropagation();
            handleClear();
          }} className="action-btn" style={{
            background: 'rgba(255,255,255,0.1)',
            color: 'white',
            border: 'none'
          }}>{t("g_d9de21") || "\uCDE8\uC18C"}</button>
                                <button onClick={e => {
            e.stopPropagation();
            handleUpload();
          }} className="action-btn primary" style={{
            background: 'var(--primary-gold)',
            color: 'var(--text-on-primary)',
            fontWeight: 'bold',
            border: 'none'
          }}>{t("g_1dadc0") || "\uB370\uC774\uD130 \uCD94\uCD9C \uC2DC\uC791"}</button>
                            </div>
                        </div> : <>
                            <UploadSimple size={48} color={isDragging ? 'var(--primary-gold)' : 'var(--text-tertiary)'} style={{
          marginBottom: '16px',
          opacity: isDragging ? 1 : 0.5
        }} />
                            <div style={{
          fontSize: '1.2rem',
          fontWeight: 'bold',
          marginBottom: '8px',
          color: isDragging ? 'var(--primary-gold)' : 'var(--text-primary)'
        }}>{t("g_b4bc7e") || "\uD074\uB9AD\uD558\uAC70\uB098 \uD30C\uC77C\uC744 \uC5EC\uAE30\uB85C \uB4DC\uB798\uADF8\uD558\uC138\uC694"}</div>
                            <div style={{
          fontSize: '0.9rem',
          color: 'var(--text-tertiary)'
        }}>
                                {currentTabInfo.type === 'image' ? t("g_c290ea") || "\uC9C0\uC6D0 \uD615\uC2DD: JPG, PNG (\uCD5C\uB300 5MB)" : t("g_4535fa") || "\uC9C0\uC6D0 \uD615\uC2DD: CSV, TXT (\uC5D1\uC140 \uD30C\uC77C\uC740 CSV\uB85C \uC800\uC7A5 \uD6C4 \uC5C5\uB85C\uB4DC \uC694\uB9DD)"}
                            </div>
                        </>}
                </div> : <div style={{
      animation: 'fadeIn 0.5s ease-out'
    }}>
                    <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
                        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#10B981',
          fontWeight: 'bold'
        }}>
                            <CheckCircle size={24} weight="fill" />{t("g_3648ed") || "\uCD94\uCD9C \uC131\uACF5! \uB370\uC774\uD130\uB97C \uD655\uC778\uD574 \uC8FC\uC138\uC694."}</div>
                        <button onClick={handleClear} className="action-btn sm" style={{
          background: 'transparent',
          border: '1px solid rgba(255,255,255,0.2)'
        }}>{t("g_f7d851") || "\uB2E4\uC2DC \uC5C5\uB85C\uB4DC"}</button>
                    </div>

                    <div style={{
        background: 'rgba(0,0,0,0.3)',
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
                        <pre style={{
          margin: 0,
          padding: '16px',
          fontSize: '0.85rem',
          color: '#A7F3D0',
          overflowX: 'auto',
          maxHeight: '300px'
        }}>
                            {JSON.stringify(parsedData, null, 2)}
                        </pre>
                    </div>
                    
                    <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        marginTop: '20px'
      }}>
                        <button onClick={handleSave} disabled={isSaving} className="action-btn primary" style={{
          padding: '12px 24px',
          fontSize: '1.1rem',
          background: 'var(--primary-gold)',
          color: 'var(--text-on-primary)',
          fontWeight: 'bold'
        }}>
                            {isSaving ? <Spinner className="spin" /> : <Table size={20} weight="bold" />} 
                            {isSaving ? t("g_ccc4ba") || " \uC800\uC7A5 \uC911..." : t("g_9f6e4a") || " \uB370\uC774\uD130 \uC800\uC7A5\uD558\uAE30"}
                        </button>
                    </div>
                </div>}
            
            {error && <div style={{
      marginTop: '16px',
      padding: '16px',
      background: 'rgba(239, 68, 68, 0.2)',
      border: '1px solid #EF4444',
      color: '#FFFFFF',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      fontSize: '0.95rem',
      fontWeight: 'bold'
    }}>
                    <FileX size={24} color="#EF4444" weight="fill" />
                    <span style={{
        lineHeight: '1.4'
      }}>{error}</span>
                </div>}
        </div>;
};
export default SmartDataImporter;