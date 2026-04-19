import { useStudioConfig } from '../../../contexts/StudioContext';
import { useLanguageStore } from '../../../stores/useLanguageStore';
import { storageService } from '../../../services/storage';
import { X, Plus } from '@phosphor-icons/react';
// Assets loaded via STUDIO_CONFIG

const handleImageUpload = (e, target, setOptimisticImages) => {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    alert(useLanguageStore.getState().t("g_a287d2") || "\uD30C\uC77C \uC6A9\uB7C9\uC774 \uB108\uBB34 \uD07D\uB2C8\uB2E4. (\uCD5C\uB300 5MB)");
    return;
  }
  const reader = new FileReader();
  reader.onload = event => {
    const img = new Image();
    img.onload = async () => {
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
      setOptimisticImages(prev => ({
        ...prev,
        [target]: compressedBase64
      }));
      try {
        await storageService.updateImage(target, compressedBase64);
      } catch {
        alert(useLanguageStore.getState().t("g_b0e999") || "\uC774\uBBF8\uC9C0 \uC5C5\uB85C\uB4DC\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.");
      }
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
};
export const TimeTableModal = ({
  isOpen,
  onClose,
  images,
  setOptimisticImages,
  optimisticImages
}) => {
  const t = useLanguageStore(s => s.t);
  const {
    config
  } = useStudioConfig();
  if (!isOpen) return null;
  const branches = config.BRANCHES || [];
  const getImage = (key, fallback) => optimisticImages[key] || images[key] || fallback;
  return <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{
      maxWidth: '800px'
    }}>
                <div className="modal-header">
                    <h2 className="modal-title">{t("g_596554")}</h2>
                    <button onClick={onClose}><X size={24} /></button>
                </div>
                <div style={{
        display: 'grid',
        gridTemplateColumns: branches.length > 1 ? '1fr 1fr' : '1fr',
        gap: '20px',
        marginBottom: '30px'
      }}>
                    {branches.map(branch => <div key={branch.id} style={{
          background: 'rgba(255,255,255,0.03)',
          padding: '20px',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.05)'
        }}>
                            <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '15px'
          }}>
                                <h3 style={{
              margin: 0
            }}>{branch.name}{t("g_7e0dcf") || "\uC2DC\uAC04\uD45C"}</h3>
                                <button style={{
              background: 'var(--primary-gold)',
              color: 'var(--text-on-primary)',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}>
                                    {t("g_9da6e0")}
                                </button>
                            </div>
                            <img src={getImage(`timetable_${branch.id}`, config.ASSETS?.LOGO?.WIDE)} alt={`${branch.name} Schedule`} style={{
            width: '100%',
            borderRadius: '12px'
          }} />
                        </div>)}
                </div>
            </div>
        </div>;
};
export const PriceTableModal = ({
  isOpen,
  onClose,
  images,
  setOptimisticImages,
  optimisticImages
}) => {
  const t = useLanguageStore(s => s.t);
  const {
    config
  } = useStudioConfig();
  if (!isOpen) return null;
  const getImage = (key, fallback) => optimisticImages[key] || images[key] || fallback;
  return <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{
      maxWidth: '800px'
    }}>
                <div className="modal-header">
                    <h2 className="modal-title">{t("g_c0d8d0")}</h2>
                    <button onClick={onClose}><X size={24} /></button>
                </div>
                <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
                    <div style={{
          textAlign: 'center',
          background: 'rgba(255,255,255,0.02)',
          padding: '20px',
          borderRadius: '12px'
        }}>
                        <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px'
          }}>
                            <h3 style={{
              margin: 0
            }}>{t("g_5419d1")}</h3>
                            <input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'price_table_1', setOptimisticImages)} style={{
              display: 'none'
            }} id="up-price-1" />
                            <label htmlFor="up-price-1" className="action-btn sm"><Plus size={16} /> {t("g_9be281")}</label>
                        </div>
                        <img src={getImage('price_table_1', config.ASSETS?.LOGO?.WIDE)} alt={t("g_5419d1")} style={{
            width: '100%',
            borderRadius: '12px'
          }} />
                    </div>
                    <div style={{
          textAlign: 'center',
          background: 'rgba(255,255,255,0.02)',
          padding: '20px',
          borderRadius: '12px'
        }}>
                        <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px'
          }}>
                            <h3 style={{
              margin: 0
            }}>{t("g_bc719e")}</h3>
                            <input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'price_table_2', setOptimisticImages)} style={{
              display: 'none'
            }} id="up-price-2" />
                            <label htmlFor="up-price-2" className="action-btn sm"><Plus size={16} /> {t("g_9be281")}</label>
                        </div>
                        <img src={getImage('price_table_2', config.ASSETS?.LOGO?.WIDE)} alt={t("g_bc719e")} style={{
            width: '100%',
            borderRadius: '12px'
          }} />
                    </div>
                </div>
            </div>
        </div>;
};