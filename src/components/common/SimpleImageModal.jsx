import React from 'react';
import { createPortal } from 'react-dom';
import { X } from '@phosphor-icons/react';

const SimpleImageModal = ({ isOpen, onClose, imageSrc }) => {
    if (!isOpen || !imageSrc) return null;

    return createPortal(
        <div 
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'black', // 완전 불투명
                zIndex: 9999, // 최상위
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
                backdropFilter: 'none' // 성능 최적화 및 뒤쪽 요소 간섭 제거
            }}
            onClick={onClose}
        >
            <button 
                onClick={onClose}
                style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    background: 'rgba(255, 255, 255, 0.15)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '44px',
                    height: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'white',
                    zIndex: 10000,
                    backdropFilter: 'blur(4px)'
                }}
            >
                <X size={28} />
            </button>
            
            <img 
                src={imageSrc} 
                alt="Enlarged view" 
                style={{
                    maxWidth: '100%',
                    maxHeight: '90vh',
                    objectFit: 'contain',
                    borderRadius: '4px',
                    boxShadow: '0 4px 30px rgba(0,0,0,0.5)'
                }}
                onClick={(e) => e.stopPropagation()} 
            />
        </div>,
        document.body
    );
};

export default SimpleImageModal;
