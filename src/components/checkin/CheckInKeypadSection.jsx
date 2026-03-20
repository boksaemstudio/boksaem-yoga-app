import React, { memo } from 'react';
import Keypad from '../Keypad';

const CheckInKeypadSection = memo(({
    pin,
    loading,
    isReady,
    loadingMessage,
    keypadLocked,
    showSelectionModal,
    message,
    handleKeyPress,
    handleClear,
    handleSubmit
}) => {
    return (
        <div className="checkin-keypad-section" style={{ position: 'relative', background: 'transparent', boxShadow: 'none', border: 'none' }}>
            {/* [UX] Loading Overlay */}
            {loading && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(0,0,0,0.85)', borderRadius: '24px', zIndex: 100, padding: '20px', textAlign: 'center'
                }}>
                    <div style={{
                        width: '40px', height: '40px', border: '3px solid rgba(255,215,0,0.3)',
                        borderTop: '3px solid var(--primary-gold)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '20px'
                    }} />
                    <p style={{ color: 'var(--primary-gold)', fontSize: '1.2rem', fontWeight: 600, margin: 0 }}>
                        {loadingMessage || '출석 확인 중...'}
                    </p>
                    <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginTop: '8px' }}>잠시만 기다려주세요</p>
                </div>
            )}

            {/* [PERF] Warm-up Overlay */}
            {!isReady && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(0,0,0,0.7)', borderRadius: '24px', zIndex: 100
                }}>
                    <div style={{
                        width: '50px', height: '50px', border: '4px solid rgba(255,215,0,0.3)',
                        borderTop: '4px solid var(--primary-gold)', borderRadius: '50%', animation: 'spin 1s linear infinite'
                    }} />
                    <p style={{ marginTop: '20px', color: 'var(--primary-gold)', fontSize: '1.2rem', fontWeight: 600 }}>
                        출석 시스템 준비 중...
                    </p>
                </div>
            )}

            {pin.length === 0 && !message && isReady && (
                <div className="keypad-floating-instruction">
                    전화번호 뒤 4자리를 눌러주세요
                </div>
            )}

            <Keypad
                onKeyPress={handleKeyPress}
                onClear={handleClear}
                onSubmit={handleSubmit}
                disabled={loading || keypadLocked || !!message || showSelectionModal || !isReady}
            />
        </div>
    );
});

CheckInKeypadSection.displayName = 'CheckInKeypadSection';
export default CheckInKeypadSection;
