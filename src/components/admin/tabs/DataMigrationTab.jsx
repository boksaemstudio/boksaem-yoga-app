import { useState } from 'react';
import { useLanguageStore } from '../../../stores/useLanguageStore';
import { Upload, CheckCircle, XCircle, WarningCircle, FileText } from '@phosphor-icons/react';
import { parseCSV } from '../../../utils/csvParser';
import { storageService } from '../../../services/storage';
import { useStudioConfig } from '../../../contexts/StudioContext';
export default function DataMigrationTab() {
  const t = useLanguageStore(s => s.t);
  const {
    config
  } = useStudioConfig();
  const [migrationStatus, setMigrationStatus] = useState('idle'); // idle, uploading, processing, complete, error, cleaning
  const [progress, setProgress] = useState({
    current: 0,
    total: 0,
    currentName: ''
  });
  const [results, setResults] = useState(null);
  const [isDryRun, setIsDryRun] = useState(true);
  const handleFileUpload = async event => {
    const file = event.target.files[0];
    if (!file) return;

    // 파일명 검증 (Member현황_YYYYMMDD.csv 형식)
    if (!file.name.match(/Member현황_\d{8}\.csv/)) {
      alert(t("g_cfad6d") || "파일명이 올바르지 않습니다. \"Member현황_YYYYMMDD.csv\" 형식이어야 합니다.");
      return;
    }
    try {
      // 실제 마이그레이션 모드일 경우 최종 확인
      if (!isDryRun) {
        // [Agent Admin Mode] Skip explicit confirmation if in agent mode
        const isAgentMode = window.__AGENT_ADMIN_MODE__ === true;
        if (!isAgentMode) {
          const confirmed = window.confirm(t("g_28bee6") || "⚠️ [주의] 실제 마이그레이션을 실행하면 기존 모든 Member, 매출, 출석, 푸시 데이터가 삭제된 후 새로 등록됩니다.\n\n정말로 진행하시겠습니까?");
          if (!confirmed) return;
          const secondConfirm = window.prompt(t("g_ce7f1f") || "삭제 및 이전을 확정하려면 \"마이그레이션\"이라고 입력해주세요.");
          if (secondConfirm !== (t("g_b41aa0") || "Migration")) {
            alert(t("g_f36971") || "입력이 올바르지 않아 취소되었습니다.");
            return;
          }
        } else {
          console.log('[Agent Mode] Auto-confirming migration process...');
        }
      }
      setMigrationStatus('uploading');

      // CSV 파일 읽기
      const text = await file.text();
      const csvData = parseCSV(text);
      console.log(`[Migration UI] Parsed ${csvData.length} rows from CSV`);
      setMigrationStatus('processing');
      setProgress({
        current: 0,
        total: csvData.length,
        currentName: ''
      });

      // 마이그레이션 실행 (내부에서 !isDryRun일 경우 자동 초기화 수행)
      const migrationResults = await storageService.migrateMembersFromCSV(csvData, isDryRun, (current, total, name) => {
        setProgress({
          current,
          total,
          currentName: name
        });
      }, config.BRANCHES || []);
      setResults(migrationResults);
      setMigrationStatus('complete');
    } catch (error) {
      console.error('[Migration UI] Error:', error);
      setMigrationStatus('error');
      alert(`마이그레이션 실패: ${error.message}`);
    }

    // 파일 입력 초기화
    event.target.value = '';
  };
  const resetMigration = () => {
    setMigrationStatus('idle');
    setProgress({
      current: 0,
      total: 0,
      currentName: ''
    });
    setResults(null);
  };
  return <div style={{
    padding: '20px',
    paddingBottom: '200px',
    maxWidth: '900px',
    margin: '0 auto'
  }}>
            <h2 style={{
      fontSize: '1.2rem',
      fontWeight: 'bold',
      marginBottom: '20px',
      color: 'var(--text-primary)'
    }}>
                {t("g_774794")}
            </h2>

            {/* Dry Run 모드 토글 */}
            <div style={{
      padding: '16px',
      borderRadius: '12px',
      background: isDryRun ? 'rgba(var(--primary-rgb), 0.1)' : 'rgba(244, 63, 94, 0.1)',
      border: `1px solid ${isDryRun ? 'var(--primary-gold)' : '#F43F5E'}`,
      marginBottom: '20px'
    }}>
                <label style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        cursor: 'pointer'
      }}>
                    <input type="checkbox" checked={isDryRun} onChange={e => setIsDryRun(e.target.checked)} disabled={migrationStatus === 'processing'} style={{
          width: '20px',
          height: '20px'
        }} />
                    <div style={{
          flex: 1
        }}>
                        <div style={{
            fontWeight: 'bold',
            marginBottom: '4px'
          }}>
                            {isDryRun ? t("g_925d79") || "🔍 검증 모드 (Dry Run)" : t("g_b8778c") || "⚠️ 실제 마이그레이션 & 초기화 모드"}
                        </div>
                        <div style={{
            fontSize: '0.85rem',
            opacity: 0.8
          }}>
                            {isDryRun ? t("g_8ae049") || "실제 데이터 변경 없이 CSV 파일 형식만 검증합니다." : t("g_0d3acc") || "기존 데이터를 모두 지우고 CSV 기반으로 새로 시작합니다. (Member/매출/출석/푸시 삭제)"}
                        </div>
                    </div>
                </label>
            </div>

            {/* 파일 업로드 영역 */}
            {migrationStatus === 'idle' && <div style={{
      border: '2px dashed var(--primary-gold)',
      borderRadius: '12px',
      padding: '40px',
      textAlign: 'center',
      background: 'rgba(var(--primary-rgb), 0.05)'
    }}>
                    <Upload size={48} color="var(--primary-gold)" style={{
        marginBottom: '16px'
      }} />
                    <p style={{
        fontSize: '1rem',
        marginBottom: '8px',
        color: 'var(--text-primary)'
      }}>
                        {t("g_aca729")}
                    </p>
                    <p style={{
        fontSize: '0.85rem',
        color: 'var(--text-secondary)',
        marginBottom: '20px'
      }}>
                        {t("g_df4b96")} <code>{t("g_56bd4c")}</code>
                    </p>
                    <label style={{
        display: 'inline-block',
        padding: '12px 24px',
        background: 'var(--primary-gold)',
        color: 'var(--text-on-primary)',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 'bold'
      }}>
                        {t("g_11f4a3")}
                        <input type="file" accept=".csv" onChange={handleFileUpload} style={{
          display: 'none'
        }} />
                    </label>
                </div>}

            {/* 진행 중 (업로드, 처리, 삭제 공용) */}
            {(migrationStatus === 'uploading' || migrationStatus === 'processing' || migrationStatus === 'cleaning') && <div style={{
      padding: '30px',
      borderRadius: '12px',
      background: migrationStatus === 'cleaning' ? 'rgba(244, 63, 94, 0.1)' : 'rgba(var(--primary-rgb), 0.1)',
      border: `1px solid ${migrationStatus === 'cleaning' ? '#F43F5E' : 'var(--primary-gold)'}`,
      textAlign: 'center'
    }}>
                    <div style={{
        fontSize: '1rem',
        fontWeight: 'bold',
        marginBottom: '16px'
      }}>
                        {migrationStatus === 'uploading' && (t("g_30ba5b") || "CSV 파일 읽는 중...")}
                        {migrationStatus === 'processing' && `마이그레이션 진행 중 (${isDryRun ? t("g_f72491") || "검증 모드" : t("g_7df3c2") || "실제 모드"})`}
                        {migrationStatus === 'cleaning' && (t("g_5b307c") || "기존 데이터 Deleting...")}
                    </div>
                    {migrationStatus === 'processing' && <>
                            <div style={{
          width: '100%',
          height: '8px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '4px',
          overflow: 'hidden',
          marginBottom: '12px'
        }}>
                                <div style={{
            width: `${progress.current / progress.total * 100}%`,
            height: '100%',
            background: 'var(--primary-gold)',
            transition: 'width 0.3s'
          }} />
                            </div>
                            <div style={{
          fontSize: '0.9rem',
          color: 'var(--text-secondary)'
        }}>
                                {progress.current} / {progress.total} - {progress.currentName}
                            </div>
                        </>}
                </div>}

            {/* 완료 */}
            {migrationStatus === 'complete' && results && <div>
                    <div style={{
        padding: '20px',
        borderRadius: '12px',
        background: 'rgba(76, 217, 100, 0.1)',
        border: '1px solid #4CD964',
        marginBottom: '20px'
      }}>
                        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '12px'
        }}>
                            <CheckCircle size={32} color="#4CD964" weight="fill" />
                            <h3 style={{
            fontSize: '1.1rem',
            fontWeight: 'bold'
          }}>{t("g_65a92c") || "마이그레이션 완료"}{isDryRun && (t("g_ac253d") || "(검증 모드)")}
                            </h3>
                        </div>
                        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '12px'
        }}>
                            <div style={{
            padding: '12px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
                                <div style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: '#4CD964'
            }}>{results.success}</div>
                                <div style={{
              fontSize: '0.8rem',
              opacity: 0.8
            }}>{t("g_13e288")}</div>
                            </div>
                            <div style={{
            padding: '12px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
                                <div style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: '#F43F5E'
            }}>{results.failed}</div>
                                <div style={{
              fontSize: '0.8rem',
              opacity: 0.8
            }}>{t("g_086147")}</div>
                            </div>
                            <div style={{
            padding: '12px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
                                <div style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: '#FFB800'
            }}>{results.skipped}</div>
                                <div style={{
              fontSize: '0.8rem',
              opacity: 0.8
            }}>{t("g_dc99d1")}</div>
                            </div>
                            <div style={{
            padding: '12px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
                                <div style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: 'var(--primary-gold)'
            }}>{results.sales.length}</div>
                                <div style={{
              fontSize: '0.8rem',
              opacity: 0.8
            }}>{t("g_47bb17")}</div>
                            </div>
                        </div>
                    </div>

                    {/* 에러 로그 */}
                    {results.errors.length > 0 && <div style={{
        padding: '16px',
        borderRadius: '12px',
        background: 'rgba(244, 63, 94, 0.1)',
        border: '1px solid #F43F5E',
        marginBottom: '20px',
        maxHeight: '300px',
        overflowY: 'auto'
      }}>
                            <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '12px'
        }}>
                                <WarningCircle size={20} color="#F43F5E" />
                                <strong>{t("g_974c63") || "에러 로그 ("}{results.errors.length}{t("g_a0fd7f") || "건)"}</strong>
                            </div>
                            {results.errors.map((err, idx) => <div key={idx} style={{
          padding: '8px',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '6px',
          marginBottom: '6px',
          fontSize: '0.85rem'
        }}>
                                    <strong>Row {err.row}</strong> - {err.name}: {err.error}
                                </div>)}
                        </div>}

                    <button onClick={resetMigration} style={{
        padding: '12px 24px',
        background: 'var(--primary-gold)',
        color: 'var(--text-on-primary)',
        border: 'none',
        borderRadius: '8px',
        fontWeight: 'bold',
        cursor: 'pointer',
        width: '100%'
      }}>
                        {t("g_42a8f0")}
                    </button>
                </div>}

            {/* 에러 */}
            {migrationStatus === 'error' && <div style={{
      padding: '20px',
      borderRadius: '12px',
      background: 'rgba(244, 63, 94, 0.1)',
      border: '1px solid #F43F5E',
      textAlign: 'center'
    }}>
                    <XCircle size={48} color="#F43F5E" style={{
        marginBottom: '16px'
      }} />
                    <p style={{
        fontSize: '1rem',
        marginBottom: '20px'
      }}>{t("g_82e910")}</p>
                    <button onClick={resetMigration} style={{
        padding: '12px 24px',
        background: 'var(--primary-gold)',
        color: 'var(--text-on-primary)',
        border: 'none',
        borderRadius: '8px',
        fontWeight: 'bold',
        cursor: 'pointer'
      }}>
                        {t("g_09c041")}
                    </button>
                </div>}

            {/* 안내 사항 */}
            <div style={{
      marginTop: '30px',
      padding: '16px',
      borderRadius: '12px',
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.1)'
    }}>
                <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '8px',
        marginBottom: '8px'
      }}>
                    <FileText size={20} color="var(--primary-gold)" />
                    <strong>{t("g_5a67f5")}</strong>
                </div>
                <ul style={{
        fontSize: '0.85rem',
        lineHeight: '1.6',
        paddingLeft: '28px',
        opacity: 0.9
      }}>
                    <li>{t("g_bc09d8")} <strong>{t("g_cecc21")}</strong>{t("g_1eeea3")}</li>
                    <li>{t("g_ad637f")} <strong>{t("g_a39ac0")}</strong>{t("g_bff667")}</li>
                    <li>{t("g_7ae11b")}</li>
                    <li>{t("g_c4e8e2")}</li>
                </ul>
            </div>
        </div>;
}