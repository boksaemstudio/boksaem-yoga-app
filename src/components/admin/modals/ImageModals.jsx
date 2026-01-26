import React from 'react';
import { X, Plus } from '@phosphor-icons/react';
import { storageService } from '../../../services/storage';
import timeTable1 from '../../../assets/timetable_gwangheungchang.png';
import timeTable2 from '../../../assets/timetable_mapo.png';
import priceTable1 from '../../../assets/price_table_1.png';
import priceTable2 from '../../../assets/price_table_2.png';

const handleImageUpload = (e, target, setOptimisticImages) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
        alert('파일 용량이 너무 큽니다. (최대 5MB)');
        return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = async () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 900;
            let width = img.width;
            let height = img.height;
            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.5);

            setOptimisticImages(prev => ({ ...prev, [target]: compressedBase64 }));
            try {
                await storageService.updateImage(target, compressedBase64);
            } catch {
                alert("이미지 업로드에 실패했습니다.");
            }
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
};


export const TimeTableModal = ({ isOpen, onClose, images, setOptimisticImages, optimisticImages }) => {
    if (!isOpen) return null;
    const getImage = (key, fallback) => optimisticImages[key] || images[key] || fallback;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px' }}>
                <div className="modal-header">
                    <h2 className="modal-title">시간표 확인 및 관리</h2>
                    <button onClick={onClose}><X size={24} /></button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <h3 style={{ margin: 0 }}>광흥창점 시간표</h3>
                            <input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'timetable_gwangheungchang', setOptimisticImages)} style={{ display: 'none' }} id="up-time-1" />
                            <label htmlFor="up-time-1" className="action-btn sm"><Plus size={16} /> 변경</label>
                        </div>
                        <img src={getImage('timetable_gwangheungchang', timeTable1)} alt="광흥창 시간표" style={{ width: '100%', borderRadius: '12px' }} />
                    </div>
                    <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <h3 style={{ margin: 0 }}>마포점 시간표</h3>
                            <input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'timetable_mapo', setOptimisticImages)} style={{ display: 'none' }} id="up-time-2" />
                            <label htmlFor="up-time-2" className="action-btn sm"><Plus size={16} /> 변경</label>
                        </div>
                        <img src={getImage('timetable_mapo', timeTable2)} alt="마포 시간표" style={{ width: '100%', borderRadius: '12px' }} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export const PriceTableModal = ({ isOpen, onClose, images, setOptimisticImages, optimisticImages }) => {
    if (!isOpen) return null;
    const getImage = (key, fallback) => optimisticImages[key] || images[key] || fallback;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px' }}>
                <div className="modal-header">
                    <h2 className="modal-title">가격표 확인 및 관리</h2>
                    <button onClick={onClose}><X size={24} /></button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <h3 style={{ margin: 0 }}>가격표 1</h3>
                            <input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'price_table_1', setOptimisticImages)} style={{ display: 'none' }} id="up-price-1" />
                            <label htmlFor="up-price-1" className="action-btn sm"><Plus size={16} /> 변경</label>
                        </div>
                        <img src={getImage('price_table_1', priceTable1)} alt="가격표 1" style={{ width: '100%', borderRadius: '12px' }} />
                    </div>
                    <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <h3 style={{ margin: 0 }}>가격표 2</h3>
                            <input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'price_table_2', setOptimisticImages)} style={{ display: 'none' }} id="up-price-2" />
                            <label htmlFor="up-price-2" className="action-btn sm"><Plus size={16} /> 변경</label>
                        </div>
                        <img src={getImage('price_table_2', priceTable2)} alt="가격표 2" style={{ width: '100%', borderRadius: '12px' }} />
                    </div>
                </div>
            </div>
        </div>
    );
};
