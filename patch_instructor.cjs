const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'instructor', 'InstructorLogin.jsx');
let content = fs.readFileSync(filePath, 'utf8');

const targetStr = `                </button>

            </div>
        </div>;`;

if (content.indexOf(targetStr) !== -1) {
  content = content.replace(targetStr, `                </button>

                {/* SaaS Demo Quick Login Button */}
                {typeof window !== 'undefined' && (window.location.hostname.includes('passflow') || config?.tenantId === 'demo-yoga' || window.location.hostname === 'localhost') && instructors && instructors.length > 0 && <button type="button" onClick={e => {
          e.preventDefault();
          const demoInstName = typeof instructors[0] === 'string' ? instructors[0] : instructors[0].name;
          setName(demoInstName);
          setPhoneLast4("1234");
          setTimeout(() => {
            storageService.loginInstructor(demoInstName, "1234").then(result => {
                if (result.success) onLogin(result.name);
                else setError(result.message || t("g_3857a0"));
            }).catch(() => setError(t("g_8b3197")));
          }, 100);
        }} disabled={loading} style={{
          width: '100%',
          padding: '14px',
          borderRadius: '10px',
          border: '1px solid rgba(212, 175, 55, 0.4)',
          background: 'rgba(212, 175, 55, 0.15)',
          color: 'var(--primary-gold)',
          fontWeight: 'bold',
          fontSize: '1rem',
          cursor: 'pointer',
          marginTop: '12px'
        }}>{t("g_f52787") || "\\uD83D\\uDE80 \\uB370\\uBAA8 \\uACC4\\uC815 \\uAC04\\uD3B8 \\uC2DC\\uC791"}</button>}

            </div>
        </div>;`);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log("Success");
} else {
    // Try regex
    content = content.replace(/<\/button>\s*<\/div>\s*<\/div>;/, `</button>

                {/* SaaS Demo Quick Login Button */}
                {typeof window !== 'undefined' && (window.location.hostname.includes('passflow') || config?.tenantId === 'demo-yoga' || window.location.hostname === 'localhost') && instructors && instructors.length > 0 && <button type="button" onClick={e => {
          e.preventDefault();
          const demoInstName = typeof instructors[0] === 'string' ? instructors[0] : instructors[0].name;
          setName(demoInstName);
          setPhoneLast4("1234");
          setTimeout(() => {
            storageService.loginInstructor(demoInstName, "1234").then(result => {
                if (result.success) onLogin(result.name);
                else setError(result.message || t("g_3857a0"));
            }).catch(() => setError(t("g_8b3197")));
          }, 100);
        }} disabled={loading} style={{
          width: '100%',
          padding: '14px',
          borderRadius: '10px',
          border: '1px solid rgba(212, 175, 55, 0.4)',
          background: 'rgba(212, 175, 55, 0.15)',
          color: 'var(--primary-gold)',
          fontWeight: 'bold',
          fontSize: '1rem',
          cursor: 'pointer',
          marginTop: '12px'
        }}>{t("g_f52787") || "\\uD83D\\uDE80 \\uB370\\uBAA8 \\uACC4\\uC815 \\uAC04\\uD3B8 \\uC2DC\\uC791"}</button>}

            </div>
        </div>;`);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log("Success Regex");
}
