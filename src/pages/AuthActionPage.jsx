import { useLanguageStore } from '../stores/useLanguageStore';
import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import { auth } from '../firebase';
import './AuthActionPage.css';
const AuthActionPage = () => {
  const t = useLanguageStore(s => s.t);
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
      setError(t("g_117dd4") || t("g_117dd4") || t("g_117dd4") || t("g_117dd4") || t("g_117dd4") || "\uC720\uD6A8\uD558\uC9C0 \uC54A\uC740 \uC694\uCCAD\uC785\uB2C8\uB2E4. \uB9C1\uD06C\uAC00 \uC62C\uBC14\uB978\uC9C0 \uB2E4\uC2DC \uD655\uC778\uD574\uC8FC\uC138\uC694.");
      setLoading(false);
      return;
    }
    if (mode === 'resetPassword') {
      // 암호 코드 검증 및 이메일 주소 가져오기
      verifyPasswordResetCode(auth, oobCode).then(resolvedEmail => {
        setEmail(resolvedEmail);
        setLoading(false);
      }).catch(err => {
        console.error('Verify error:', err);
        setError(t("g_bb9b02") || t("g_bb9b02") || t("g_bb9b02") || t("g_bb9b02") || t("g_bb9b02") || "\uB9CC\uB8CC\uB418\uC5C8\uAC70\uB098 \uC720\uD6A8\uD558\uC9C0 \uC54A\uC740 \uBE44\uBC00\uBC88\uD638 \uC7AC\uC124\uC815 \uB9C1\uD06C\uC785\uB2C8\uB2E4. \uC6D0\uC7A5\uB2D8\uAED8 \uC0C8\uB85C\uC6B4 \uB9C1\uD06C \uBC1C\uAE09\uC744 \uC694\uCCAD\uD574\uC8FC\uC138\uC694.");
        setLoading(false);
      });
    } else {
      setError(`지원하지 않는 인증 모드입니다: ${mode}`);
      setLoading(false);
    }
  }, [mode, oobCode]);
  const handleSubmit = async e => {
    e.preventDefault();
    if (newPassword.length < 6) {
      alert(t("g_be3a8d") || t("g_be3a8d") || t("g_be3a8d") || t("g_be3a8d") || t("g_be3a8d") || "\uBE44\uBC00\uBC88\uD638\uB294 \uCD5C\uC18C 6\uC790 \uC774\uC0C1\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.");
      return;
    }
    if (newPassword !== confirmPassword) {
      alert(t("g_7b4e64") || t("g_7b4e64") || t("g_7b4e64") || t("g_7b4e64") || t("g_7b4e64") || "\uBE44\uBC00\uBC88\uD638\uAC00 \uC11C\uB85C \uC77C\uCE58\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.");
      return;
    }
    setIsSubmitting(true);
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setSuccess(true);
    } catch (err) {
      console.error('Confirm error:', err);
      alert((t("g_c2e1a5") || t("g_c2e1a5") || t("g_c2e1a5") || t("g_c2e1a5") || t("g_c2e1a5") || "\uBE44\uBC00\uBC88\uD638 \uBCC0\uACBD\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4: ") + err.message);
    }
    setIsSubmitting(false);
  };
  if (loading) {
    return <div className="auth-action-container loading">
                <div className="spinner"></div>
                <p>{t("g_4b4877") || t("g_4b4877") || t("g_4b4877") || t("g_4b4877") || t("g_4b4877") || "\uC778\uC99D \uC815\uBCF4\uB97C \uD655\uC778\uD558\uB294 \uC911\uC785\uB2C8\uB2E4..."}</p>
            </div>;
  }
  if (error) {
    return <div className="auth-action-container">
                <div className="auth-card error">
                    <div className="logo-placeholder">PassFlow Ai</div>
                    <h2>{t("g_65026f") || t("g_65026f") || t("g_65026f") || t("g_65026f") || t("g_65026f") || "\uC811\uADFC \uC624\uB958"}</h2>
                    <p className="error-text">{error}</p>
                    <button className="back-btn" onClick={() => navigate('/login')}>{t("g_69e269") || t("g_69e269") || t("g_69e269") || t("g_69e269") || t("g_69e269") || "\uB85C\uADF8\uC778 \uD654\uBA74\uC73C\uB85C \uB3CC\uC544\uAC00\uAE30"}</button>
                </div>
            </div>;
  }
  if (success) {
    return <div className="auth-action-container">
                <div className="auth-card success">
                    <img src="/logo192.png" alt="PassFlow Logo" className="pf-logo" onError={e => {
          e.target.style.display = 'none';
        }} />
                    <h1 className="pf-brand">PassFlow Ai</h1>
                    <div className="success-icon">✅</div>
                    <h2>{t("g_fac070") || t("g_fac070") || t("g_fac070") || t("g_fac070") || t("g_fac070") || "\uBE44\uBC00\uBC88\uD638 \uC124\uC815 \uC644\uB8CC!"}</h2>
                    <p>{t("g_c6d3db") || t("g_c6d3db") || t("g_c6d3db") || t("g_c6d3db") || t("g_c6d3db") || "\uCD95\uD558\uD569\uB2C8\uB2E4. \uAD00\uB9AC\uC790 \uACC4\uC815\uC758 \uBE44\uBC00\uBC88\uD638\uAC00 \uC131\uACF5\uC801\uC73C\uB85C \uC124\uC815\uB418\uC5C8\uC2B5\uB2C8\uB2E4."}</p>
                    <button className="primary-btn" onClick={() => navigate('/login')}>{t("g_5be3bb") || t("g_5be3bb") || t("g_5be3bb") || t("g_5be3bb") || t("g_5be3bb") || "\uC9C0\uAE08 \uBC14\uB85C \uB85C\uADF8\uC778\uD558\uAE30"}</button>
                </div>
            </div>;
  }
  return <div className="auth-action-container">
            <div className="auth-card">
                {/* Fallback to text if logo image is missing during loading */}
                <div className="pf-header">
                    <img src="/logo192.png" alt="PassFlow Logo" className="pf-logo" onError={e => {
          e.target.style.display = 'none';
        }} />
                    <h1 className="pf-brand">PassFlow Ai</h1>
                </div>
                
                <h2>{t("g_ff7760") || t("g_ff7760") || t("g_ff7760") || t("g_ff7760") || t("g_ff7760") || "\uAD00\uB9AC\uC790 \uBE44\uBC00\uBC88\uD638 \uC124\uC815"}</h2>
                <p className="subtitle">{t("g_8cf680") || t("g_8cf680") || t("g_8cf680") || t("g_8cf680") || t("g_8cf680") || "\uD658\uC601\uD569\uB2C8\uB2E4!"}<br />
                    <span className="email-highlight">{email}</span>{t("g_fbeada") || t("g_fbeada") || t("g_fbeada") || t("g_fbeada") || t("g_fbeada") || "\uACC4\uC815\uC758"}<br />{t("g_3074db") || t("g_3074db") || t("g_3074db") || t("g_3074db") || t("g_3074db") || "\uC0C8\uB85C\uC6B4 \uBE44\uBC00\uBC88\uD638\uB97C \uC124\uC815\uD574\uC8FC\uC138\uC694."}</p>

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label>{t("g_bcc599") || t("g_bcc599") || t("g_bcc599") || t("g_bcc599") || t("g_bcc599") || "\uC0C8 \uBE44\uBC00\uBC88\uD638 (6\uC790 \uC774\uC0C1)"}</label>
                        <input type="password" placeholder={t("g_038d15") || t("g_038d15") || t("g_038d15") || t("g_038d15") || t("g_038d15") || "\uC548\uC804\uD55C \uBE44\uBC00\uBC88\uD638 \uC785\uB825"} value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                    </div>
                    
                    <div className="form-group">
                        <label>{t("g_58513a") || t("g_58513a") || t("g_58513a") || t("g_58513a") || t("g_58513a") || "\uBE44\uBC00\uBC88\uD638 \uD655\uC778"}</label>
                        <input type="password" placeholder={t("g_bcaa2c") || t("g_bcaa2c") || t("g_bcaa2c") || t("g_bcaa2c") || t("g_bcaa2c") || "\uBE44\uBC00\uBC88\uD638 \uB2E4\uC2DC \uC785\uB825"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                    </div>

                    <button type="submit" className="primary-btn submit-btn" disabled={isSubmitting}>
                        {isSubmitting ? t("g_d98339") || t("g_d98339") || t("g_d98339") || t("g_d98339") || t("g_d98339") || "\uC124\uC815 \uC911..." : t("g_6a4de0") || t("g_6a4de0") || t("g_6a4de0") || t("g_6a4de0") || t("g_6a4de0") || "\uBE44\uBC00\uBC88\uD638 \uC800\uC7A5 \uBC0F \uC644\uB8CC"}
                    </button>
                </form>
            </div>
        </div>;
};
export default AuthActionPage;