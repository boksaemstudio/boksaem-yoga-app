
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export const AttendanceHeatmap = ({ data }) => {
    if (!data || data.length === 0) return <div className="text-gray-500 text-center py-4">데이터가 없습니다.</div>;
    return (
        <div style={{ width: '100%', height: 300 }}>
            <h4 style={{ marginBottom: '10px', color: 'var(--text-secondary)' }}>시간대별 출석 분포</h4>
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
            <h4 style={{ marginBottom: '10px', color: 'var(--text-secondary)' }}>월별 매출 추이 (최근 6개월)</h4>
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
            <h4 style={{ marginBottom: '10px', color: 'var(--text-secondary)' }}>회원 상태 비율</h4>
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
