
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export const AttendanceHeatmap = ({ data }) => {
    if (!data || data.length === 0) return <div className="text-gray-500 text-center py-4">데이터가 없습니다.</div>;
    return (
        <div style={{ width: '100%', height: 300 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <h4 style={{ margin: 0, color: 'var(--text-secondary)' }}>시간대별 출석 분포</h4>
                <div className="tooltip-container" style={{ display: 'inline-flex', cursor: 'pointer' }}>
                    <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 'bold' }}>i</div>
                    <div className="tooltip-text" style={{ width: '220px', left: 0, transform: 'translateX(0)', color: '#fff', fontSize: '0.8rem' }}>
                        최근 출석 로그를 기반으로 시간대별 이용 빈도를 보여줍니다.
                    </div>
                </div>
            </div>
            <ResponsiveContainer>
                <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                    <XAxis dataKey="time" stroke="#ccc" />
                    <YAxis stroke="#ccc" />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#333', borderColor: '#444', color: '#fff' }}
                        itemStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="count" fill="var(--primary-gold)" name="출석 수" isAnimationActive={false} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export const RevenueTrend = ({ data }) => {
    if (!data || data.length === 0) return <div className="text-center py-4" style={{ color: 'gray' }}>데이터가 없습니다.</div>;

    return (
        <div style={{ width: '100%', height: 300 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <h4 style={{ margin: 0, color: 'var(--text-secondary)' }}>월별 매출 추이 (최근 6개월)</h4>
                <div className="tooltip-container" style={{ display: 'inline-flex', cursor: 'pointer' }}>
                    <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 'bold' }}>i</div>
                    <div className="tooltip-text" style={{ width: '220px', left: 0, transform: 'translateX(0)', color: '#fff', fontSize: '0.8rem' }}>
                        최근 6개월 간의 월 전체 매출 합계입니다. 환불/취소 내역이 발생할 경우 차감 반영됩니다.
                    </div>
                </div>
            </div>
            <ResponsiveContainer>
                <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                    <XAxis dataKey="month" stroke="#ccc" />
                    <YAxis stroke="#ccc" />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#333', borderColor: '#444', color: '#fff' }}
                        formatter={(value) => new Intl.NumberFormat('ko-KR').format(value) + '원'}
                    />
                    <Line type="monotone" dataKey="amount" stroke="#82ca9d" name="매출" strokeWidth={2} isAnimationActive={false} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export const MemberStatusPie = ({ data }) => {
    if (!data || data.length === 0) return <div className="text-center py-4" style={{ color: 'gray' }}>데이터가 없습니다.</div>;

    return (
        <div style={{ width: '100%', height: 300 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <h4 style={{ margin: 0, color: 'var(--text-secondary)' }}>회원 상태 비율</h4>
                <div className="tooltip-container" style={{ display: 'inline-flex', cursor: 'pointer' }}>
                    <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 'bold' }}>i</div>
                    <div className="tooltip-text" style={{ width: '220px', left: 'auto', right: 0, transform: 'translateX(0)', color: '#fff', fontSize: '0.8rem' }}>
                        <strong>활동중:</strong> 정상적인 수강 가능 회원<br/>
                        <strong>주춤(잠듦):</strong> 활성 상태이나 14일 이상 미출석<br/>
                        <strong>만료:</strong> 잔여 횟수 소진 및 기한 만료
                    </div>
                </div>
            </div>
            <ResponsiveContainer>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                        isAnimationActive={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#333', borderColor: '#444', color: '#fff' }} />
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};
