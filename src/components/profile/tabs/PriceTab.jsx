import { useState, useEffect } from 'react';
import MemberSalesHistory from '../MemberSalesHistory';
import { storageService } from '../../../services/storage';
import { useLanguage } from '../../../hooks/useLanguage';
import { useStudioConfig } from '../../../contexts/StudioContext';
const PriceTab = ({
  memberId,
  member,
  images,
  priceTable1,
  priceTable2,
  setLightboxImage
}) => {
  const {
    t
  } = useLanguage();
  const {
    config
  } = useStudioConfig();
  const [pricing, setPricing] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);
  useEffect(() => {
    const loadPricing = async () => {
      const data = await storageService.getPricing();
      setPricing(data);
      const keys = Object.keys(data).filter(k => k !== '_meta');
      // 일반(general)을 기본 선택
      if (keys.includes('general')) setActiveCategory('general');else if (keys.length > 0) setActiveCategory(keys[0]);
    };
    loadPricing();
  }, []);
  const paymentInfo = pricing?._meta?.payment || null;
  const holdRules = pricing?._meta?.holdRules || null;
  const discountNote = pricing?._meta?.discountNote || null;

  // 카테고리 순서: 일반적인 것 먼저, 특수한 것 뒤로
  const CATEGORY_ORDER = ['general', 'advanced'];
  const categories = pricing ? Object.entries(pricing).filter(([k]) => k !== '_meta').sort(([a], [b]) => {
    const aIdx = CATEGORY_ORDER.indexOf(a);
    const bIdx = CATEGORY_ORDER.indexOf(b);
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;
    return a.localeCompare(b);
  }) : [];
  return <div className="fade-in">
            {/* Member 결제 내역 */}
            {member && memberId && <MemberSalesHistory memberId={memberId} member={member} />}

            {/* 가격표 테이블 뷰 */}
            {pricing && categories.length > 0 && <div style={{
      marginBottom: '24px'
    }}>
                    {/* 카테고리 탭 */}
                    <div style={{
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        paddingBottom: '12px',
        marginBottom: '16px',
        borderBottom: '1px solid rgba(255,255,255,0.08)'
      }}>
                        {categories.map(([key, cat]) => <button key={key} onClick={() => setActiveCategory(key)} style={{
          padding: '8px 18px',
          borderRadius: '20px',
          border: activeCategory === key ? '1px solid var(--primary-gold)' : '1px solid rgba(255,255,255,0.12)',
          background: activeCategory === key ? 'rgba(var(--primary-rgb), 0.15)' : 'rgba(255,255,255,0.04)',
          color: activeCategory === key ? 'var(--primary-gold)' : 'var(--text-secondary)',
          fontWeight: activeCategory === key ? '700' : '500',
          fontSize: '0.85rem',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          transition: 'all 0.2s'
        }}>
                                {cat.label || key}
                            </button>)}
                    </div>

                    {/* 선택된 카테고리 가격표 */}
                    {activeCategory && pricing[activeCategory] && <div style={{
        animation: 'fadeIn 0.3s ease'
      }}>
                            {/* 기본 단가표 */}
                            <div style={{
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '14px',
          border: '1px solid rgba(255,255,255,0.08)',
          overflow: 'hidden',
          marginBottom: '16px'
        }}>
                                <div style={{
            padding: '14px 16px',
            background: 'rgba(var(--primary-rgb), 0.08)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
                                    <span style={{
              fontWeight: '700',
              color: 'var(--primary-gold)',
              fontSize: '0.95rem'
            }}>
                                        {pricing[activeCategory].label} {t('tuitionFee')}
                                    </span>
                                    {pricing[activeCategory].branches && <div style={{
              display: 'flex',
              gap: '4px'
            }}>
                                            {pricing[activeCategory].branches.map(b => <span key={b} style={{
                fontSize: '0.7rem',
                padding: '2px 8px',
                background: 'rgba(255,255,255,0.08)',
                borderRadius: '10px',
                color: 'var(--text-tertiary)'
              }}>{config.BRANCHES?.find(branch => branch.id === b)?.name || b}</span>)}
                                        </div>}
                                </div>

                                {pricing[activeCategory].options?.map((opt, idx) => <div key={idx} style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 16px',
            borderBottom: idx < pricing[activeCategory].options.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
            transition: 'background 0.2s'
          }}>
                                        <div>
                                            <div style={{
                fontWeight: '600',
                fontSize: '0.9rem',
                color: 'var(--text-primary)'
              }}>
                                                {opt.label}
                                            </div>
                                            <div style={{
                fontSize: '0.72rem',
                color: 'var(--text-tertiary)',
                marginTop: '2px'
              }}>
                                                {opt.credits === 9999 ? t('unlimited') : `${opt.credits}${t('countUnit')}`}
                                                {opt.months > 1 ? ` · ${opt.months}${t('monthUnit')}` : ''}
                                                {opt.type === 'ticket' ? ` · ${t('ticketType')}` : ''}
                                            </div>
                                        </div>
                                        <div style={{
              textAlign: 'right'
            }}>
                                            <div style={{
                fontWeight: '700',
                fontSize: '1rem',
                color: 'var(--text-primary)'
              }}>
                                                {opt.basePrice?.toLocaleString()}{t('won')}
                                            </div>
                                        </div>
                                    </div>)}
                            </div>

                            {/* 장기등록 할인 테이블 */}
                            {pricing[activeCategory].options?.some(opt => opt.discount3 || opt.discount6) && <div style={{
          background: 'rgba(16,185,129,0.04)',
          borderRadius: '14px',
          border: '1px solid rgba(16,185,129,0.12)',
          overflow: 'hidden',
          marginBottom: '16px'
        }}>
                                    <div style={{
            padding: '12px 16px',
            background: 'rgba(16,185,129,0.08)',
            borderBottom: '1px solid rgba(16,185,129,0.1)',
            fontWeight: '700',
            color: '#10B981',
            fontSize: '0.9rem'
          }}>
                                        {t('longTermDiscount')}
                                    </div>

                                    {/* 테이블 헤더 */}
                                    <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            padding: '10px 16px',
            gap: '8px',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
            fontSize: '0.72rem',
            color: 'var(--text-tertiary)',
            fontWeight: '600'
          }}>
                                        <span>{t('classLabel')}</span>
                                        <span style={{
              textAlign: 'right'
            }}>{t('threeMonthDiscount')}</span>
                                        <span style={{
              textAlign: 'right'
            }}>{t('sixMonthDiscount')}</span>
                                    </div>

                                    {pricing[activeCategory].options.filter(opt => opt.discount3 || opt.discount6).map((opt, idx, arr) => <div key={idx} style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            padding: '12px 16px',
            gap: '8px',
            borderBottom: idx < arr.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none'
          }}>
                                                <span style={{
              fontWeight: '600',
              fontSize: '0.85rem'
            }}>{opt.label}</span>
                                                <div style={{
              textAlign: 'right'
            }}>
                                                    {opt.discount3 && <>
                                                            <div style={{
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  color: '#10B981'
                }}>
                                                                {opt.discount3.toLocaleString()}{t('won')}
                                                            </div>
                                                            {opt.cashDiscount3 && <div style={{
                  fontSize: '0.68rem',
                  color: '#f59e0b'
                }}>
                                                                    {t('cashLabel')} {opt.cashDiscount3.toLocaleString()}{t('won')}
                                                                </div>}
                                                        </>}
                                                </div>
                                                <div style={{
              textAlign: 'right'
            }}>
                                                    {opt.discount6 && <>
                                                            <div style={{
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  color: '#10B981'
                }}>
                                                                {opt.discount6.toLocaleString()}{t('won')}
                                                            </div>
                                                            {opt.cashDiscount6 && <div style={{
                  fontSize: '0.68rem',
                  color: '#f59e0b'
                }}>
                                                                    {t('cashLabel')} {opt.cashDiscount6.toLocaleString()}{t('won')}
                                                                </div>}
                                                        </>}
                                                </div>
                                            </div>)}
                                </div>}
                        </div>}

                    {/* 안내사항 + 결제계좌 */}
                    <div style={{
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '14px',
        border: '1px solid rgba(255,255,255,0.08)',
        padding: '16px',
        marginBottom: '16px'
      }}>
                        {discountNote && <div style={{
          fontSize: '0.82rem',
          color: '#f59e0b',
          fontWeight: '600',
          marginBottom: '12px',
          lineHeight: '1.5'
        }}>
                                ⭐ {discountNote}
                            </div>}

                        {holdRules && <div style={{
          fontSize: '0.8rem',
          color: 'var(--text-secondary)',
          marginBottom: '12px',
          lineHeight: '1.6'
        }}>
                                📋 <strong>{t('deferRules')}</strong><br />
                                {holdRules.map((rule, i) => <span key={i}>• {rule}<br /></span>)}
                            </div>}

                        {paymentInfo && (() => {
          const handleCopyAccount = () => {
            const text = `${paymentInfo.bank} ${paymentInfo.account} ${paymentInfo.holder}`;
            navigator.clipboard.writeText(text).then(() => alert(t('accountCopied') || t("g_59a092") || "\uACC4\uC88C\uBC88\uD638\uAC00 \uBCF5\uC0AC\uB418\uC5C8\uC2B5\uB2C8\uB2E4.")).catch(() => alert(t("g_58a303") || "\uBCF5\uC0AC \uAE30\uB2A5\uC744 \uC9C0\uC6D0\uD558\uC9C0 \uC54A\uB294 \uBE0C\uB77C\uC6B0\uC800\uC785\uB2C8\uB2E4. \uC9C1\uC811 \uD14D\uC2A4\uD2B8\uB97C \uC120\uD0DD\uD574 \uBCF5\uC0AC\uD574\uC8FC\uC138\uC694."));
          };
          return <div onClick={handleCopyAccount} style={{
            background: 'rgba(var(--primary-rgb), 0.06)',
            borderRadius: '10px',
            border: '1px solid rgba(var(--primary-rgb), 0.12)',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            cursor: 'pointer',
            position: 'relative'
          }}>
                                    <div style={{
              fontWeight: '700',
              color: 'var(--primary-gold)',
              fontSize: '0.9rem',
              marginBottom: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
                                        <span>{t('paymentAccount')}</span>
                                        <span style={{
                fontSize: '0.75rem',
                background: 'rgba(var(--primary-rgb), 0.15)',
                padding: '4px 8px',
                borderRadius: '12px'
              }}>{t("g_9ce64c") || "\uD83D\uDCCB \uBCF5\uC0AC\uD558\uAE30"}</span>
                                    </div>
                                    <div style={{
              fontSize: '0.85rem',
              color: 'var(--text-primary)'
            }}>
                                        <strong>{paymentInfo.bank}</strong> {paymentInfo.account}
                                    </div>
                                    <div style={{
              fontSize: '0.82rem',
              color: 'var(--text-secondary)'
            }}>
                                        {t('accountHolder')}: {paymentInfo.holder}
                                    </div>
                                </div>;
        })()}
                    </div>
                </div>}

            {/* 기존 가격표 이미지 */}
            {(images.price_table_1 || priceTable1) && <img src={images.price_table_1 || priceTable1} style={{
      width: '100%',
      borderRadius: '15px',
      marginBottom: '15px',
      cursor: 'pointer'
    }} alt="price" onClick={() => setLightboxImage(images.price_table_1 || priceTable1)} />}
            {(images.price_table_2 || priceTable2) && <img src={images.price_table_2 || priceTable2} style={{
      width: '100%',
      borderRadius: '15px',
      cursor: 'pointer'
    }} alt="price" onClick={() => setLightboxImage(images.price_table_2 || priceTable2)} />}
        </div>;
};
export default PriceTab;