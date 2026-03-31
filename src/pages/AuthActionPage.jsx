import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import { auth } from '../firebase';
import './AuthActionPage.css';

const AuthActionPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    
    const mode = searchParams.get('mode');
    const oobCode = searchParams.get('oobCode');
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [email, setEmail] = useState('');
    
    // Form states
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (!mode || !oobCode) {
            setError('유효하지 않은 요청입니다. 링크가 올바른지 다시 확인해주세요.');
            setLoading(false);
            return;
        }

        if (mode === 'resetPassword') {
            // 암호 코드 검증 및 이메일 주소 가져오기
            verifyPasswordResetCode(auth, oobCode)
                .then((resolvedEmail) => {
                    setEmail(resolvedEmail);
                    setLoading(false);
                })
                .catch((err) => {
                    console.error('Verify error:', err);
                    setError('만료되었거나 유효하지 않은 비밀번호 재설정 링크입니다. 원장님께 새로운 링크 발급을 요청해주세요.');
                    setLoading(false);
                });
        } else {
            setError(`지원하지 않는 인증 모드입니다: ${mode}`);
            setLoading(false);
        }
    }, [mode, oobCode]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (newPassword.length < 6) {
            alert('비밀번호는 최소 6자 이상이어야 합니다.');
            return;
        }
        if (newPassword !== confirmPassword) {
            alert('비밀번호가 서로 일치하지 않습니다.');
            return;
        }

        setIsSubmitting(true);
        try {
            await confirmPasswordReset(auth, oobCode, newPassword);
            setSuccess(true);
        } catch (err) {
            console.error('Confirm error:', err);
            alert('비밀번호 변경에 실패했습니다: ' + err.message);
        }
        setIsSubmitting(false);
    };

    if (loading) {
        return (
            <div className="auth-action-container loading">
                <div className="spinner"></div>
                <p>인증 정보를 확인하는 중입니다...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="auth-action-container">
                <div className="auth-card error">
                    <div className="logo-placeholder">PassFlow Ai</div>
                    <h2>접근 오류</h2>
                    <p className="error-text">{error}</p>
                    <button className="back-btn" onClick={() => navigate('/login')}>로그인 화면으로 돌아가기</button>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="auth-action-container">
                <div className="auth-card success">
                    <img src="/logo192.png" alt="PassFlow Logo" className="pf-logo" onError={(e) => {e.target.style.display='none'}} />
                    <h1 className="pf-brand">PassFlow Ai</h1>
                    <div className="success-icon">✅</div>
                    <h2>비밀번호 설정 완료!</h2>
                    <p>축하합니다. 관리자 계정의 비밀번호가 성공적으로 설정되었습니다.</p>
                    <button className="primary-btn" onClick={() => navigate('/login')}>지금 바로 로그인하기</button>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-action-container">
            <div className="auth-card">
                {/* Fallback to text if logo image is missing during loading */}
                <div className="pf-header">
                    <img src="/logo192.png" alt="PassFlow Logo" className="pf-logo" onError={(e) => {e.target.style.display='none'}} />
                    <h1 className="pf-brand">PassFlow Ai</h1>
                </div>
                
                <h2>관리자 비밀번호 설정</h2>
                <p className="subtitle">
                    환영합니다!<br/>
                    <span className="email-highlight">{email}</span> 계정의<br/>새로운 비밀번호를 설정해주세요.
                </p>

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label>새 비밀번호 (6자 이상)</label>
                        <input 
                            type="password" 
                            placeholder="안전한 비밀번호 입력"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                        />
                    </div>
                    
                    <div className="form-group">
                        <label>비밀번호 확인</label>
                        <input 
                            type="password" 
                            placeholder="비밀번호 다시 입력"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="primary-btn submit-btn" disabled={isSubmitting}>
                        {isSubmitting ? '설정 중...' : '비밀번호 저장 및 완료'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AuthActionPage;
