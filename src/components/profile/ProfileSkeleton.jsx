/**
 * ProfileSkeleton — 로딩 중 표시되는 스켈레톤 UI
 * MemberProfile.jsx에서 추출
 */
const ProfileSkeleton = () => (
    <div style={{ padding: '20px', minHeight: '100vh', background: '#08080A' }}>
        {/* Skeleton Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', paddingTop: 'env(safe-area-inset-top)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="skeleton" style={{ width: '30px', height: '30px', borderRadius: '50%' }} />
                <div className="skeleton" style={{ width: '100px', height: '24px' }} />
            </div>
            <div className="skeleton" style={{ width: '80px', height: '32px' }} />
        </div>

        {/* Skeleton Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="skeleton" style={{ width: '100%', height: '180px', borderRadius: '20px' }} />
            <div className="skeleton" style={{ width: '100%', height: '100px', borderRadius: '20px' }} />
            <div className="skeleton" style={{ width: '100%', height: '100px', borderRadius: '20px' }} />
        </div>

        {/* Skeleton Bottom Nav */}
        <div style={{ position: 'fixed', bottom: 'calc(20px + env(safe-area-inset-bottom))', left: '20px', right: '20px', height: '75px', borderRadius: '25px', background: 'rgba(20,20,20,0.8)', border: '1px solid rgba(255,255,255,0.1)' }} />
    </div>
);

export default ProfileSkeleton;
