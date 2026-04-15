/**
 * KioskSettingsTab에 로고 반전(Invert) 토글 추가
 */
const fs = require('fs');
const p = 'src/components/admin/tabs/KioskSettingsTab.jsx';
let c = fs.readFileSync(p, 'utf8');

// 배경색 선택 div 닫는 태그 바로 뒤에 반전 토글 삽입
const marker = `</label>)}\r\n                                        </div>\r\n\r\n                                        {/* 농도 조절 슬라이더 */}`;
const invertUI = `</label>)}\r
                                        </div>\r
\r
                                        {/* 이미지 반전(Invert) 토글 */}\r
                                        <div style={{\r
                display: 'flex',\r
                gap: '8px',\r
                marginTop: '8px',\r
                alignItems: 'center',\r
                fontSize: '0.7rem',\r
                color: 'var(--text-secondary)'\r
              }}>\r
                                            <span>{t('kiosk_logo_invert') || 'Invert:'}</span>\r
                                            {[false, true].map(invertValue => <label key={String(invertValue)} style={{\r
                  display: 'flex',\r
                  alignItems: 'center',\r
                  gap: '4px',\r
                  cursor: 'pointer'\r
                }}>\r
                                                    <input type="radio" checked={isInverted === invertValue} onChange={async () => {\r
                    const newInverts = [...inverts];\r
                    while (newInverts.length <= slotIdx) newInverts.push(false);\r
                    newInverts[slotIdx] = invertValue;\r
                    try {\r
                      await updateConfig({\r
                        KIOSK: {\r
                          ...(config.KIOSK || {}),\r
                          LOGO_INVERTS: newInverts\r
                        }\r
                      });\r
                      await refreshConfig();\r
                    } catch (e) {\r
                      alert((t("g_f4eb20") || "Change failed: ") + e.message);\r
                    }\r
                  }} />\r
                                                    {invertValue ? (t('kiosk_logo_invert_on') || 'On') : (t('kiosk_logo_invert_off') || 'Off')}\r
                                                </label>)}\r
                                        </div>\r
\r
                                        {/* 농도 조절 슬라이더 */}`;

if (c.includes(marker)) {
    c = c.replace(marker, invertUI);
    fs.writeFileSync(p, c, 'utf8');
    console.log('✅ 반전 토글 UI 삽입 완료');
} else {
    // CRLF가 아닌 LF 시도
    const markerLF = marker.replace(/\r\n/g, '\n');
    if (c.includes(markerLF)) {
        c = c.replace(markerLF, invertUI.replace(/\r\n/g, '\n'));
        fs.writeFileSync(p, c, 'utf8');
        console.log('✅ 반전 토글 UI 삽입 완료 (LF)');
    } else {
        console.log('❌ 마커를 찾을 수 없습니다. 수동 확인 필요');
        // 부분 매칭 시도
        const partial = '</label>)}' + '\r\n' + '                                        </div>';
        console.log('partial exists:', c.includes(partial));
        const partial2 = '농도 조절 슬라이더';
        console.log('농도 exists:', c.includes(partial2));
    }
}
