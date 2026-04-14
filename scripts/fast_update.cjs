const fs = require('fs');
const file = 'c:/Users/boksoon/.gemini/antigravity/scratch/yoga-app/src/pages/SuperAdminPage.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /{inq\.email}<\/span>[\s\S]*?{inq\.lang\?\.toUpperCase\(\)}<\/span>[\s\S]*?<\/div>/,
`{inq.studioName || inq.email}</span>
                                            {inq.lang && <span style={{fontSize: '0.75rem', padding: '2px 8px', borderRadius: '8px', background: 'rgba(99,102,241,0.15)', color: '#6366f1'}}>{inq.lang.toUpperCase()}</span>}
                                            {inq.country && <span style={{fontSize: '0.75rem', padding: '2px 8px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981'}}>{inq.country}</span>}
                                        </div>`
);

content = content.replace(
  /{\/\* Original message \*\/}/,
`{/* Additional Metadata */}
                                    <div style={{ marginBottom: '10px', fontSize: '0.85rem', color: '#9ca3af', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                                        <span>📧 {inq.email}</span>
                                        {inq.phone && <span>📞 {inq.phone}</span>}
                                        {inq.source && <span>🔗 {inq.source}</span>}
                                    </div>
                                    {inq.features && inq.features.length > 0 && (
                                        <div style={{ marginBottom: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {inq.features.map((f, idx) => (
                                                <span key={f+"-"+idx} style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', color: '#f59e0b' }}>{f}</span>
                                            ))}
                                        </div>
                                    )}
                                    {/* Original message */}`
);

fs.writeFileSync(file, content);
console.log('updated superadminpage');
