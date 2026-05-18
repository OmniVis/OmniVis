const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const IGNORED_MESSAGES = ['cleanup', 'quick fix', 'fix', 'chore'];

function getLogs(projectDir, projectName) {
    try {
        const fullPath = path.resolve(__dirname, projectDir);
        console.log(`Fetching logs for ${projectName} from ${fullPath}`);
        
        // Fetch 50 to have enough after filtering
        const output = execSync('git log -n 50 --pretty=format:"%h|%ad|%s" --date=short', {
            cwd: fullPath,
            encoding: 'utf-8'
        });

        const logs = output.split('\n').map(line => {
            const [hash, date, ...subjectParts] = line.split('|');
            const subject = subjectParts.join('|'); // Rejoin if subject contained |
            
            let cleanedSubject = subject ? subject.trim() : '';
            // Filter out Co-Authored-By noise
            cleanedSubject = cleanedSubject.replace(/Co-Authored-By: Claude Sonnet 4.6 noreply@anthropic.com/g, '').trim();
            
            return {
                hash,
                date,
                subject: cleanedSubject,
                project: projectName
            };
        }).filter(item => {
            if (!item.hash) return false;
            
            const msg = item.subject.toLowerCase();
            
            // Filter out merges
            if (item.subject.startsWith('Merge')) return false;
            
            // Filter out specific noise
            if (IGNORED_MESSAGES.includes(msg)) return false;
            
            // Filter out sensitive keywords
            const sensitiveKeywords = ['security', 'vuln', 'secret', 'password', 'leak', 'exploit'];
            if (sensitiveKeywords.some(keyword => msg.includes(keyword))) return false;
            
            // Filter out very short or empty messages
            if (msg.length < 3) return false;

            return true;
        });

        // Parse conventional commits
        return logs.map(item => {
            const regex = /^(\w+)(?:\(([^)]+)\))?:\s*(.+)$/;
            const match = item.subject.match(regex);
            
            if (match) {
                return {
                    ...item,
                    type: match[1],
                    scope: match[2] || null,
                    message: match[3]
                };
            } else {
                return {
                    ...item,
                    type: null,
                    scope: null,
                    message: item.subject
                };
            }
        });
    } catch (error) {
        console.error(`Error fetching logs for ${projectName}:`, error.message);
        return [];
    }
}

function injectIntoHtml(logs) {
    const htmlPath = path.resolve(__dirname, 'index.html');
    if (!fs.existsSync(htmlPath)) {
        console.error(`Error: index.html not found at ${htmlPath}`);
        return;
    }

    let htmlContent = fs.readFileSync(htmlPath, 'utf-8');
    
    const replacement = `let changelogData = ${JSON.stringify(logs, null, 2)};`;
    
    const regex = /let changelogData = \[[\s\S]*?\];/;
    if (regex.test(htmlContent)) {
        htmlContent = htmlContent.replace(regex, replacement);
        fs.writeFileSync(htmlPath, htmlContent, 'utf-8');
        console.log(`Successfully updated ${logs.length} commits in index.html`);
    } else {
        console.error('Error: Could not find target line or previous data in index.html');
    }
}

function generateChangelog() {
    // Get logs and limit to 30 PER PROJECT
    const slidiLogs = getLogs('../slidi', 'Slidi').slice(0, 30);
    const graphiLogs = getLogs('../graphi', 'Graphi').slice(0, 30);

    const allLogs = [...slidiLogs, ...graphiLogs];
    
    // Sort by date descending
    allLogs.sort((a, b) => new Date(b.date) - new Date(a.date));

    injectIntoHtml(allLogs);
}

generateChangelog();
