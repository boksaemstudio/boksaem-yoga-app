import { Icons } from '../CommonIcons';
import rys200Logo from '../../assets/RYS200.png';

const MembershipInfo = ({ member, daysRemaining, t }) => {
    const IconMap = {
        Fire: Icons.Fire,
        Plant: Icons.Plant,
        Leaf: Icons.Leaf,
        Sparkle: Icons.Sparkle,
        Waves: Icons.Waves,
        Boat: Icons.Boat,
        Barbell: Icons.Barbell,
        Sprout: Icons.Sprout
    };

    return (
        <div style={{ padding: '0 0 20px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: 0, color: 'white' }}>{member.displayName || member.name} 님</h1>
                <span style={{ background: 'var(--primary-gold)', color: 'black', padding: '3px 10px', borderRadius: '5px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                    {t('branch' + (member.homeBranch === 'gwangheungchang' ? 'Gwangheungchang' : 'Mapo'))}
                </span>

                <span style={{ background: 'rgba(255,255,255,0.1)', color: 'white', padding: '3px 10px', borderRadius: '5px', fontSize: '0.75rem' }}>{member.phone}</span>
                <img src={rys200Logo} alt="RYS200" style={{ height: '49px', width: 'auto', marginLeft: 'auto', filter: 'brightness(0) invert(1)' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', paddingTop: '15px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '4px', color: 'white' }}>{t('currentMembership')}</div>
                    <div style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--primary-gold)' }}>
                        {t(`class_${member.membershipType}`) !== `class_${member.membershipType}` ? t(`class_${member.membershipType}`) : (member.membershipType || t('class_regular'))} ({member.subject || t('ticket')})
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '4px', color: 'white' }}>{t('remainingCredits')}</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>{member.credits > 200 ? t('unlimited') : `${member.credits}${t('times')}`}</div>
                </div>
                <div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '4px', color: 'white' }}>{t('expiryDate')}</div>
                    <div style={{ fontSize: '1rem', color: 'white' }}>
                        {(() => {
                            if (!member.endDate || member.endDate === 'unlimited') return t('unlimited');
                            if (member.endDate === 'TBD') return '첫 출석 시 확정';
                            const date = new Date(member.endDate);
                            if (isNaN(date.getTime())) return member.endDate; // Invalid date string, just show it
                            try {
                                return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
                            } catch {
                                return member.endDate;
                            }
                        })()}
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '4px', color: 'white' }}>{t('daysLeft')}</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: 'white' }}>{member.endDate ? (daysRemaining >= 0 ? `D-${daysRemaining}` : t('expired')) : '-'}</div>
                </div>
            </div>
        </div>
    );
};

export default MembershipInfo;
