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

    // 파일명 검증 (회원현황_YYYYMMDD.csv 형식)
    if (!file.name.match(/회원현황_\d{8}\.csv/)) {
      alert(t("g_85c3ec") || "\uD30C\uC77C\uBA85\uC774 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4. \"\uD68C\uC6D0\uD604\uD669_YYYYMMDD.csv\" \uD615\uC2DD\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.");
      return;
    }
    try {
      // 실제 마이그레이션 모드일 경우 최종 확인
      if (!isDryRun) {
        // [Agent Admin Mode] Skip explicit confirmation if in agent mode
        const isAgentMode = window.__AGENT_ADMIN_MODE__ === true;
        if (!isAgentMode) {
          const confirmed = window.confirm(t("g_f6599c") || "\u26A0\uFE0F [\uC8FC\uC758] \uC2E4\uC81C \uB9C8\uC774\uADF8\uB808\uC774\uC158\uC744 \uC2E4\uD589\uD558\uBA74 \uAE30\uC874 \uBAA8\uB4E0 \uD68C\uC6D0, \uB9E4\uCD9C, \uCD9C\uC11D, \uD478\uC2DC \uB370\uC774\uD130\uAC00 \uC0AD\uC81C\uB41C \uD6C4 \uC0C8\uB85C \uB4F1\uB85D\uB429\uB2C8\uB2E4.\n\n\uC815\uB9D0\uB85C \uC9C4\uD589\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?");
          if (!confirmed) return;
          const secondConfirm = window.prompt(t("g_0bcfdf") || "\uC0AD\uC81C \uBC0F \uC774\uC804\uC744 \uD655\uC815\uD558\uB824\uBA74 \"\uB9C8\uC774\uADF8\uB808\uC774\uC158\"\uC774\uB77C\uACE0 \uC785\uB825\uD574\uC8FC\uC138\uC694.");
          if (secondConfirm !== (t("g_64e330") || "\uB9C8\uC774\uADF8\uB808\uC774\uC158")) {
            alert(t("g_8b32bf") || "\uC785\uB825\uC774 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC544 \uCDE8\uC18C\uB418\uC5C8\uC2B5\uB2C8\uB2E4.");
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
                {t('CSV 회원 데이터 마이그레이션')}
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
                            {isDryRun ? t("g_b107ef") || "\uD83D\uDD0D \uAC80\uC99D \uBAA8\uB4DC (Dry Run)" : t("g_dde952") || "\u26A0\uFE0F \uC2E4\uC81C \uB9C8\uC774\uADF8\uB808\uC774\uC158 & \uCD08\uAE30\uD654 \uBAA8\uB4DC"}
                        </div>
                        <div style={{
            fontSize: '0.85rem',
            opacity: 0.8
          }}>
                            {isDryRun ? t("g_6eb8ad") || "\uC2E4\uC81C \uB370\uC774\uD130 \uBCC0\uACBD \uC5C6\uC774 CSV \uD30C\uC77C \uD615\uC2DD\uB9CC \uAC80\uC99D\uD569\uB2C8\uB2E4." : t("g_5e513a") || "\uAE30\uC874 \uB370\uC774\uD130\uB97C \uBAA8\uB450 \uC9C0\uC6B0\uACE0 CSV \uAE30\uBC18\uC73C\uB85C \uC0C8\uB85C \uC2DC\uC791\uD569\uB2C8\uB2E4. (\uD68C\uC6D0/\uB9E4\uCD9C/\uCD9C\uC11D/\uD478\uC2DC \uC0AD\uC81C)"}
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
                        {t('CSV 파일 업로드 (마이그레이션 실행)')}
                    </p>
                    <p style={{
        fontSize: '0.85rem',
        color: 'var(--text-secondary)',
        marginBottom: '20px'
      }}>
                        {t('파일명:')} <code>{t('회원현황_YYYYMMDD.csv')}</code>
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
                        {t('파일 선택')}
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
                        {migrationStatus === 'uploading' && (t("g_6a8296") || "CSV \uD30C\uC77C \uC77D\uB294 \uC911...")}
                        {migrationStatus === 'processing' && `마이그레이션 진행 중 (${isDryRun ? t("g_cecc21") || "\uAC80\uC99D \uBAA8\uB4DC" : t("g_dd1366") || "\uC2E4\uC81C \uBAA8\uB4DC"})`}
                        {migrationStatus === 'cleaning' && (t("g_d60c4d") || "\uAE30\uC874 \uB370\uC774\uD130 \uC0AD\uC81C \uC911...")}
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
          }}>{t("g_7004eb") || "\uB9C8\uC774\uADF8\uB808\uC774\uC158 \uC644\uB8CC"}{isDryRun && (t("g_208a0b") || "(\uAC80\uC99D \uBAA8\uB4DC)")}
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
            }}>{t('성공')}</div>
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
            }}>{t('실패')}</div>
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
            }}>{t('건너뜀')}</div>
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
            }}>{t('매출 기록')}</div>
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
                                <strong>{t("g_3ccf0e") || "\uC5D0\uB7EC \uB85C\uADF8 ("}{results.errors.length}{t("g_bcbcd4") || "\uAC74)"}</strong>
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
                        {t('새 파일 업로드')}
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
      }}>{t('마이그레이션 중 오류가 발생했습니다.')}</p>
                    <button onClick={resetMigration} style={{
        padding: '12px 24px',
        background: 'var(--primary-gold)',
        color: 'var(--text-on-primary)',
        border: 'none',
        borderRadius: '8px',
        fontWeight: 'bold',
        cursor: 'pointer'
      }}>
                        {t('다시 시도')}
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
                    <strong>{t('사용 안내')}</strong>
                </div>
                <ul style={{
        fontSize: '0.85rem',
        lineHeight: '1.6',
        paddingLeft: '28px',
        opacity: 0.9
      }}>
                    <li>{t('먼저')} <strong>{t('검증 모드')}</strong>{t('로 테스트하여 데이터를 확인하세요.')}</li>
                    <li>{t('검증 완료 후')} <strong>{t('실제 마이그레이션 모드')}</strong>{t('로 전환하여 진행하세요.')}</li>
                    <li>{t('중복 전화번호가 있으면 기존 회원 데이터를 업데이트합니다.')}</li>
                    <li>{t('판매금액이 0이 아닌 경우 자동으로 매출 기록이 추가됩니다.')}</li>
                </ul>
            </div>
        </div>;
}