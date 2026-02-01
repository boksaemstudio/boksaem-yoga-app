
import { Icons } from '../CommonIcons';
import { STUDIO_CONFIG } from '../../studioConfig';
import { profileStyles } from './profileStyles';

const SocialLinks = ({ t }) => {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginTop: '20px' }}>
            <a href={STUDIO_CONFIG.SOCIAL.Gwangheungchang_Instagram} target="_blank" rel="noreferrer" style={profileStyles.socialBtn}><Icons.InstagramLogo size={24} color="#E1306C" /><span>{t('branchGwangheungchang')}</span></a>
            <a href={STUDIO_CONFIG.SOCIAL.Mapo_Instagram} target="_blank" rel="noreferrer" style={profileStyles.socialBtn}><Icons.InstagramLogo size={24} color="#E1306C" /><span>{t('branchMapo')}</span></a>
            <a href={STUDIO_CONFIG.SOCIAL.Youtube} target="_blank" rel="noreferrer" style={profileStyles.socialBtn}><Icons.YoutubeLogo size={24} color="#FF0000" /><span>Youtube</span></a>
            <a href={STUDIO_CONFIG.SOCIAL.Blog} target="_blank" rel="noreferrer" style={profileStyles.socialBtn}><Icons.Article size={24} color="#03C75A" /><span>Blog</span></a>
        </div>
    );
};

export default SocialLinks;
