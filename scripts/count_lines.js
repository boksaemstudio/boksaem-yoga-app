import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

function getFiles(dir, filesList = []) {
    if (!fs.existsSync(dir)) return filesList;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (file === 'node_modules' || file === '.git' || file === 'dist') continue;
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            getFiles(filePath, filesList);
        } else {
            if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
                filesList.push(filePath);
            }
        }
    }
    return filesList;
}

function analyzeLines() {
    const allFiles = [...getFiles(path.join(rootDir, 'src')), ...getFiles(path.join(rootDir, 'functions'))];
    const stats = [];

    for (const file of allFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n').length;
        stats.push({ file: file.replace(rootDir, ''), lines });
    }

    stats.sort((a, b) => b.lines - a.lines);
    
    console.log("=== Top 20 Largest Files ===");
    for (let i = 0; i < Math.min(20, stats.length); i++) {
        console.log(`${stats[i].lines} lines: ${stats[i].file}`);
    }
}

analyzeLines();
