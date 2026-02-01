

const InstallGuideModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '320px', textAlign: 'center', padding: '30px' }}>
                <h3 style={{ marginBottom: '15px', color: 'var(--primary-gold)' }}>홈 화면에 추가하기</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '20px' }}>
                    브라우저 메뉴에서 <br />
                    <strong>&apos;홈 화면에 추가&apos;</strong> 또는 <br />
                    <strong>&apos;앱 설치&apos;</strong>를 선택해 주세요. <br /><br />
                    아이폰(iOS)은 하단 <strong>&apos;공유&apos;</strong> 버튼 클릭 후 <br />
                    <strong>&apos;홈 화면에 추가&apos;</strong>를 누르시면 됩니다.
                </p>
                <button className="action-btn primary" onClick={onClose} style={{ width: '100%' }}>확인</button>
            </div>
        </div>
    );
};

export default InstallGuideModal;
