import React from 'react';

export const PoseCanvas = ({ videoRef, canvasRef }) => (
    <div style={{ position: 'absolute', inset: 0, zIndex: 1, opacity: 0.6 }}>
        <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} 
        />
        <canvas
            ref={canvasRef}
            width={window.innerWidth}
            height={window.innerHeight}
            style={{
                position: 'absolute', inset: 0,
                width: '100%', height: '100%',
                transform: 'scaleX(-1)', // Mirror to match video
                pointerEvents: 'none'
            }}
        />
        <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: '280px', height: '350px',
            border: '1px solid rgba(255, 215, 0, 0.3)', borderRadius: '120px',
            boxShadow: '0 0 80px rgba(255, 215, 0, 0.1) inset'
        }} />
    </div>
);
