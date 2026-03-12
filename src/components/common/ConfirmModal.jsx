import React, { useEffect } from 'react';
import styled from 'styled-components';
import { WarningCircle } from '@phosphor-icons/react';

const Overlay = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(4px);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
    animation: fadeIn 0.2s ease-out;
`;

const ModalContainer = styled.div`
    background: var(--bg-surface);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 24px;
    width: 90%;
    max-width: 400px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
`;

const Header = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
`;

const Title = styled.h3`
    margin: 0;
    font-size: 1.25rem;
    color: var(--text-primary);
`;

const Message = styled.div`
    color: var(--text-secondary);
    font-size: 0.95rem;
    line-height: 1.5;
    margin-bottom: 24px;
`;

const ButtonGroup = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 24px;
`;

const Button = styled.button`
    padding: 10px 16px;
    border-radius: 8px;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    border: none;

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

const CancelButton = styled(Button)`
    background: rgba(255, 255, 255, 0.1);
    color: var(--text-primary);

    &:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.15);
    }
`;

const ConfirmButton = styled(Button)`
    background: ${props => props.$isDestructive ? 'rgba(255, 71, 87, 0.15)' : 'var(--primary-theme-color)'};
    color: ${props => props.$isDestructive ? '#ff4757' : 'black'};
    border: ${props => props.$isDestructive ? '1px solid #ff4757' : 'none'};

    &:hover:not(:disabled) {
        background: ${props => props.$isDestructive ? '#ff4757' : 'var(--primary-theme-skeleton)'};
        color: ${props => props.$isDestructive ? 'white' : 'black'};
    }
`;


const ConfirmModal = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title = '확인', 
    message, 
    confirmText = '확인', 
    cancelText = '취소',
    isDestructive = false
}) => {
    
    // Disable background scrolling when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <Overlay onClick={onClose}>
            <ModalContainer onClick={(e) => e.stopPropagation()}>
                <Header>
                    {isDestructive && <WarningCircle size={28} color="#ff4757" weight="fill" />}
                    <Title>{title}</Title>
                </Header>
                <Message>{message}</Message>
                <ButtonGroup>
                    <CancelButton onClick={onClose}>{cancelText}</CancelButton>
                    <ConfirmButton onClick={onConfirm} $isDestructive={isDestructive}>
                        {confirmText}
                    </ConfirmButton>
                </ButtonGroup>
            </ModalContainer>
        </Overlay>
    );
};

export default ConfirmModal;
