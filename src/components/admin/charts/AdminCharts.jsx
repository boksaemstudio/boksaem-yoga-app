import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';
import { useLanguageStore } from '../../../stores/useLanguageStore';
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
export const AttendanceHeatmap = ({
  data
}) => {
  const t = useLanguageStore(s => s.t);
  if (!data || data.length === 0) return <div className="text-gray-500 text-center py-4">{t('admin_trend_no_data') || t("g_3e7e53") || t("g_3e7e53") || t("g_3e7e53") || t("g_3e7e53") || t("g_3e7e53") || "\uB370\uC774\uD130\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4."}</div>;
  return <div style={{
    width: '100%',
    height: 300
  }}>
            <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '10px'
    }}>
                <h4 style={{
        margin: 0,
        color: 'var(--text-secondary)'
      }}>{t('admin_trend_dist_time') || t("g_da5e01") || t("g_da5e01") || t("g_da5e01") || t("g_da5e01") || t("g_da5e01") || "\uC2DC\uAC04\uB300\uBCC4 \uCD9C\uC11D \uBD84\uD3EC"}</h4>
                <div className="tooltip-container" style={{
        display: 'inline-flex',
        cursor: 'pointer'
      }}>
                    <div style={{
          width: '14px',
          height: '14px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.1)',
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '9px',
          fontWeight: 'bold'
        }}>i</div>
                    <div className="tooltip-text" style={{
          width: '220px',
          left: 0,
          transform: 'translateX(0)',
          color: '#fff',
          fontSize: '0.8rem'
        }}>
                        {t('admin_trend_dist_time_desc') || t("g_3df0c2") || t("g_3df0c2") || t("g_3df0c2") || t("g_3df0c2") || t("g_3df0c2") || "\uCD5C\uADFC \uCD9C\uC11D \uB85C\uADF8\uB97C \uAE30\uBC18\uC73C\uB85C \uC2DC\uAC04\uB300\uBCC4 \uC774\uC6A9 \uBE48\uB3C4\uB97C \uBCF4\uC5EC\uC90D\uB2C8\uB2E4."}
                    </div>
                </div>
            </div>
            <ResponsiveContainer>
                <BarChart data={data} margin={{
        top: 20,
        right: 30,
        left: 20,
        bottom: 5
      }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                    <XAxis dataKey="time" stroke="#ccc" />
                    <YAxis stroke="#ccc" />
                    <Tooltip contentStyle={{
          backgroundColor: '#333',
          borderColor: '#444',
          color: '#fff'
        }} itemStyle={{
          color: '#fff'
        }} />
                    <Line type="monotone" dataKey="amount" stroke="#82ca9d" name={t('admin_trend_rev') || t("g_69735f") || t("g_69735f") || t("g_69735f") || t("g_69735f") || t("g_69735f") || "\uB9E4\uCD9C"} strokeWidth={2} isAnimationActive={false} />
                </BarChart>
            </ResponsiveContainer>
        </div>;
};
export const RevenueTrend = ({
  data
}) => {
  const t = useLanguageStore(s => s.t);
  if (!data || data.length === 0) return <div className="text-center py-4" style={{
    color: 'gray'
  }}>{t('admin_trend_no_data') || t("g_3e7e53") || t("g_3e7e53") || t("g_3e7e53") || t("g_3e7e53") || t("g_3e7e53") || "\uB370\uC774\uD130\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4."}</div>;
  return <div style={{
    width: '100%',
    height: 300
  }}>
            <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '10px'
    }}>
                <h4 style={{
        margin: 0,
        color: 'var(--text-secondary)'
      }}>{t('admin_trend_rev_dist') || t("g_e29671") || t("g_e29671") || t("g_e29671") || t("g_e29671") || t("g_e29671") || "\uC6D4\uBCC4 \uB9E4\uCD9C \uCD94\uC774 (\uCD5C\uADFC 6\uAC1C\uC6D4)"}</h4>
                <div className="tooltip-container" style={{
        display: 'inline-flex',
        cursor: 'pointer'
      }}>
                    <div style={{
          width: '14px',
          height: '14px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.1)',
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '9px',
          fontWeight: 'bold'
        }}>i</div>
                    <div className="tooltip-text" style={{
          width: '220px',
          left: 0,
          transform: 'translateX(0)',
          color: '#fff',
          fontSize: '0.8rem'
        }}>
                        {t('admin_trend_rev_desc') || t("g_56e8f6") || t("g_56e8f6") || t("g_56e8f6") || t("g_56e8f6") || t("g_56e8f6") || "\uCD5C\uADFC 6\uAC1C\uC6D4 \uAC04\uC758 \uC6D4 \uC804\uCCB4 \uB9E4\uCD9C \uD569\uACC4\uC785\uB2C8\uB2E4. \uD658\uBD88/\uCDE8\uC18C \uB0B4\uC5ED\uC774 \uBC1C\uC0DD\uD560 \uACBD\uC6B0 \uCC28\uAC10 \uBC18\uC601\uB429\uB2C8\uB2E4."}
                    </div>
                </div>
            </div>
            <ResponsiveContainer>
                <LineChart data={data} margin={{
        top: 20,
        right: 30,
        left: 20,
        bottom: 5
      }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                    <XAxis dataKey="month" stroke="#ccc" />
                    <YAxis stroke="#ccc" />
                    <Tooltip contentStyle={{
          backgroundColor: '#333',
          borderColor: '#444',
          color: '#fff'
        }} formatter={value => new Intl.NumberFormat('ko-KR').format(value) + (t("g_771dc3") || t("g_771dc3") || t("g_771dc3") || t("g_771dc3") || t("g_771dc3") || "\uC6D0")} />
                    <Line type="monotone" dataKey="amount" stroke="#82ca9d" name={t('admin_trend_rev') || t("g_69735f") || t("g_69735f") || t("g_69735f") || t("g_69735f") || t("g_69735f") || "\uB9E4\uCD9C"} strokeWidth={2} isAnimationActive={false} />
                </LineChart>
            </ResponsiveContainer>
        </div>;
};
export const MemberStatusPie = ({
  data
}) => {
  const t = useLanguageStore(s => s.t);
  if (!data || data.length === 0) return <div className="text-center py-4" style={{
    color: 'gray'
  }}>{t('admin_trend_no_data') || t("g_3e7e53") || t("g_3e7e53") || t("g_3e7e53") || t("g_3e7e53") || t("g_3e7e53") || "\uB370\uC774\uD130\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4."}</div>;
  return <div style={{
    width: '100%',
    height: 300
  }}>
            <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '10px'
    }}>
                <h4 style={{
        margin: 0,
        color: 'var(--text-secondary)'
      }}>{t('admin_trend_mem_status') || t("g_1de35b") || t("g_1de35b") || t("g_1de35b") || t("g_1de35b") || t("g_1de35b") || "\uD68C\uC6D0 \uC0C1\uD0DC \uBE44\uC728"}</h4>
                <div className="tooltip-container" style={{
        display: 'inline-flex',
        cursor: 'pointer'
      }}>
                    <div style={{
          width: '14px',
          height: '14px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.1)',
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '9px',
          fontWeight: 'bold'
        }}>i</div>
                    <div className="tooltip-text" style={{
          width: '240px',
          left: 'auto',
          right: 0,
          transform: 'translateX(0)',
          color: '#fff',
          fontSize: '0.8rem'
        }} dangerouslySetInnerHTML={{
          __html: t('admin_trend_mem_desc_html') || `<strong>활동중:</strong> 정상적인 수강 가능 회원<br/><strong>주춤(잠듦):</strong> 활성 상태이나 14일 이상 미출석<br/><strong>만료:</strong> 잔여 횟수 소진 및 기한 만료`
        }}>
                    </div>
                </div>
            </div>
            <ResponsiveContainer>
                <PieChart>
                    <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5} dataKey="value" isAnimationActive={false} label={({
          name,
          percent
        }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {data.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{
          backgroundColor: '#333',
          borderColor: '#444',
          color: '#fff'
        }} />
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        </div>;
};