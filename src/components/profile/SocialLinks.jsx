
import React from 'react';
import { Icons } from '../CommonIcons';
import { useStudioConfig } from '../../contexts/StudioContext';
import { profileStyles } from './profileStyles';

const SocialLinks = ({ t }) => {
    const { config } = useStudioConfig();
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '8px', marginTop: '20px' }}>
            {Object.entries(config.SOCIAL || {}).map(([key, url]) => {
                if (!url) return null;
                const isInsta = key.toLowerCase().includes('instagram');
                const isYoutube = key.toLowerCase().includes('youtube');
                const isBlog = key.toLowerCase().includes('blog');
                
                const Icon = isInsta ? Icons.InstagramLogo : (isYoutube ? Icons.YoutubeLogo : (isBlog ? Icons.Article : Icons.Link));
                const color = isInsta ? '#E1306C' : (isYoutube ? '#FF0000' : (isBlog ? '#03C75A' : 'white'));
                const label = key.replace('Instagram_', '');

                return (
                    <a key={key} href={url} target="_blank" rel="noreferrer" style={profileStyles.socialBtn}>
                        <Icon size={24} color={color} />
                        <span>{label}</span>
                    </a>
                );
            })}
        </div>
    );
};

export default React.memo(SocialLinks);
