export function initDatePolyfill() {
  const originalToLocaleDateString = Date.prototype.toLocaleDateString;
  Date.prototype.toLocaleDateString = function(locale, options) {
    if (locale === 'sv-SE') {
      try {
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Seoul',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
        const parts = formatter.formatToParts(this);
        const y = parts.find(p => p.type === 'year')?.value;
        const m = parts.find(p => p.type === 'month')?.value;
        const d = parts.find(p => p.type === 'day')?.value;
        if (y && m && d) return `${y}-${m}-${d}`;
      } catch (e) {
        console.warn("Date polyfill error:", e);
      }
    }
    return originalToLocaleDateString.call(this, locale, options);
  };
}
