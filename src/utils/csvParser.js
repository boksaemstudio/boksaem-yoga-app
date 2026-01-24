export const parseCSV = (csvText) => {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());

    return lines.slice(1).map(line => {
        const values = [];
        let currentVal = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(currentVal.trim());
                currentVal = '';
            } else {
                currentVal += char;
            }
        }
        values.push(currentVal.trim());

        const obj = {};
        headers.forEach((h, i) => {
            let val = values[i] || '';
            if (val.startsWith('"') && val.endsWith('"')) {
                val = val.slice(1, -1);
            }
            obj[h] = val;
        });
        return obj;
    });
};
