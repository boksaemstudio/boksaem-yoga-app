import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { useStudioConfig } from '../../contexts/StudioContext';
import { useLanguage } from '../../hooks/useLanguage';

const MyStatsChart = ({ logs }) => {
    const { t } = useLanguage();
    const { config } = useStudioConfig();
    const COLORS = [config.THEME?.PRIMARY_COLOR || 'var(--primary-gold)', '#FF6B6B', '#48dbfb', '#1dd1a1', '#feca57', '#5f27cd'];
    
    if (!logs || !Array.isArray(logs) || logs.length === 0) return null;

    // Aggregate by className
    const classCounts = {};
    logs.forEach(log => {
        const name = log.className || t('etcLabel');
        classCounts[name] = (classCounts[name] || 0) + 1;
    });

    const data = Object.entries(classCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    // Filter top 5 + others if too many? For now just show all or top 6
    const finalData = data.slice(0, 6);

    return (
        <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '16px',
            padding: '20px',
            marginTop: '20px',
            marginBottom: '20px',
            border: '1px solid rgba(255, 255, 255, 0.05)'
        }}>
            <h3 style={{
                color: 'var(--primary-gold)',
                fontSize: '1rem',
                margin: '0 0 16px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
            }}>
                📊 {t('myYogaTaste')}
            </h3>
            <div style={{ width: '100%', height: 250 }}>
                <ResponsiveContainer>
                    <PieChart>
                        <Pie
                            data={finalData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={90}
                            fill="#8884d8"
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {finalData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1e1e1e', borderColor: '#444', color: '#fff', borderRadius: '8px' }}
                            itemStyle={{ color: '#fff' }}
                            formatter={(value) => [`${value}${t('countUnit')}`, t('practiceCount')]}
                        />
                        <Legend
                            verticalAlign="bottom"
                            height={36}
                            iconType="circle"
                            formatter={(value, entry) => {
                                const total = finalData.reduce((acc, cur) => acc + cur.value, 0);
                                const percent = ((entry.payload.value / total) * 100).toFixed(0);
                                return <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>{value} {percent}%</span>;
                            }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: '8px' }}>
                {t('analyzedRecent', { n: logs.length })}
            </div>
        </div>
    );
};

export default MyStatsChart;
