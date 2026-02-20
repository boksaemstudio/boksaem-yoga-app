import { useState, useEffect } from 'react';
import { storageService } from '../../services/storage';
import SimpleImageModal from '../common/SimpleImageModal';

const InstructorNotices = () => {
    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState(null);

    useEffect(() => {
        const loadNotices = async () => {
            try {
                const data = await storageService.loadNotices();
                setNotices(data || []);
            } catch (e) {
                console.error('Failed to load notices:', e);
            } finally {
                setLoading(false);
            }
        };
        loadNotices();

        const unsubscribe = storageService.subscribe(() => {
            setNotices(storageService.getNotices() || []);
        });
        return () => unsubscribe();
    }, []);

    if (loading) return <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>로딩 중...</div>;

    return (
        <div style={{ padding: '16px' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>공지</h2>
            {notices.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>공지사항이 없습니다</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {notices.map((notice, idx) => (
                        <div key={notice.id || idx} style={{ background: 'var(--bg-surface)', padding: '16px', borderRadius: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                <h3 style={{ margin: 0, fontSize: '1rem' }}>{notice.title}</h3>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{notice.createdAt ? new Date(notice.createdAt).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }) : ''}</span>
                            </div>
                            {((notice.images && notice.images.length > 0) || notice.image || notice.imageUrl) && (
                                <div style={{
                                    display: 'flex',
                                    gap: '10px',
                                    overflowX: 'auto',
                                    paddingBottom: '10px',
                                    marginBottom: '12px',
                                    scrollSnapType: 'x mandatory',
                                    WebkitOverflowScrolling: 'touch'
                                }}>
                                    {notice.images && notice.images.length > 0 ? (
                                        notice.images.map((img, idx) => (
                                            <img 
                                                key={idx} 
                                                src={img} 
                                                alt={notice.title} 
                                                style={{ 
                                                    minWidth: '280px', 
                                                    maxWidth: '100%',
                                                    height: 'auto', 
                                                    maxHeight: '300px',
                                                    objectFit: 'cover', 
                                                    borderRadius: '8px', 
                                                    scrollSnapAlign: 'start',
                                                    cursor: 'pointer'
                                                }}
                                                onClick={() => setSelectedImage(img)}
                                            />
                                        ))
                                    ) : (
                                        <img 
                                            src={notice.image || notice.imageUrl} 
                                            alt={notice.title} 
                                            style={{ width: '100%', borderRadius: '8px', cursor: 'pointer' }}

                                            onClick={() => setSelectedImage(notice.image || notice.imageUrl)}
                                        />
                                    )}
                                </div>
                            )}
                            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{notice.content}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Image Modal for Notices */}
            <SimpleImageModal 
                isOpen={!!selectedImage} 
                imageSrc={selectedImage} 
                onClose={() => setSelectedImage(null)} 
            />
        </div>
    );
};

export default InstructorNotices;
