import React from 'react';

// [LUXURY] Glassmorphic Modal Component
const CustomGlassModal = ({ message, isConfirm, onConfirm, onCancel }) => (
    <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.8)', 
        zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fadeIn 0.2s ease-out'
    }}>
        <div style={{
            background: 'rgba(25, 25, 28, 0.95)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '24px',
            padding: '30px',
            width: '85%',
            maxWidth: '320px',
            textAlign: 'center',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            transform: 'scale(1)',
            animation: 'scaleUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}>
           <h3 style={{ color: 'white', fontSize: '1.1rem', marginBottom: '20px', fontWeight: '600', lineHeight: '1.5' }}>
               {message}
           </h3>
           <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
               {isConfirm && (
                   <button onClick={onCancel} style={{
                       padding: '12px 24px', borderRadius: '14px', border: 'none',
                       background: 'rgba(255,255,255,0.1)', color: 'white', fontWeight: '600', flex: 1
                   }}>
                       취소
                   </button>
               )}
               <button onClick={onConfirm || onCancel} style={{
                   padding: '12px 24px', borderRadius: '14px', border: 'none',
                   background: 'var(--primary-gold)', color: 'black', fontWeight: '700', flex: 1,
                   boxShadow: '0 4px 15px rgba(255, 215, 0, 0.2)'
               }}>
                   확인
               </button>
           </div>
        </div>
    </div>
);

export default CustomGlassModal;
