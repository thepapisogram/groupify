/* eslint-disable */
const { execSync } = require('child_process');
const readline = require('readline');

// Helper to handle interactive arrow-key selection
function selectBranch(branches) {
    return new Promise((resolve) => {
        let index = 0;

        // Hide the terminal cursor
        process.stdout.write('\u001B[?25l');

        const render = () => {
            // Clear previous lines
            if (index >= 0) {
                readline.cursorTo(process.stdout, 0);
                readline.clearScreenDown(process.stdout);
            }
            console.log('\n🔀 Select the target branch (Use ⬆️ / ⬇️  keys, press Enter):');
            branches.forEach((branch, i) => {
                if (i === index) {
                    console.log(` > \x1b[36m● ${branch}\x1b[0m`); // Highlighted cyan
                } else {
                    console.log(`   ○ ${branch}`);
                }
            });
        };

        render();

        // Listen to raw keyboard inputs
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.setEncoding('utf8');

        const keyHandler = (key) => {
            if (key === '\u0003') { // Ctrl+C to exit
                process.stdout.write('\u001B[?25h'); // Restore cursor
                process.exit();
            }
            if (key === '\r' || key === '\n') { // Enter key
                process.stdin.setRawMode(false);
                process.stdin.removeListener('data', keyHandler);
                process.stdout.write('\u001B[?25h'); // Restore cursor
                resolve(branches[index]);
                return;
            }
            if (key === '\u001b[A') { // Up arrow
                index = index > 0 ? index - 1 : branches.length - 1;
                // Move cursor back up to redraw cleanly
                readline.moveCursor(process.stdout, 0, -(branches.length + 1));
                render();
            }
            if (key === '\u001b[B') { // Down arrow
                index = index < branches.length - 1 ? index + 1 : 0;
                readline.moveCursor(process.stdout, 0, -(branches.length + 1));
                render();
            }
        };

        process.stdin.on('data', keyHandler);
    });
}

async function run() {
    // 1. Get the commit message
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const getCommitMessage = () => new Promise(resolve => {
        rl.question('📝 Enter commit message: ', msg => {
            rl.close();
            resolve(msg.trim());
        });
    });

    const msg = await getCommitMessage();
    if (!msg) {
        console.log('❌ Commit message cannot be empty.');
        process.exit(1);
    }

    // 2. Fetch local git branches
    let branches = [];
    try {
        const output = execSync('git branch --format="%(refname:short)"', { encoding: 'utf-8' });
        branches = output.split('\n').map(b => b.trim()).filter(Boolean);
    } catch (error) {
        console.error('❌ Failed to read git branches:', error.message);
        process.exit(1);
    }

    if (branches.length === 0) {
        console.log('❌ No git branches found.');
        process.exit(1);
    }

    // 3. User selects the branch using arrow keys
    const targetBranch = await selectBranch(branches);

    // 4. Run git commands
    try {
        console.log('\n📦 Staging files...');
        execSync('git add .', { stdio: 'inherit' });

        console.log('✍️  Committing changes...');
        execSync(`git commit -m "${msg}"`, { stdio: 'inherit' });

        console.log(`🚀 Pushing to origin ${targetBranch}...`);
        execSync(`git push origin ${targetBranch}`, { stdio: 'inherit' });

        console.log('\n🎉 Successfully updated and pushed!');
    } catch (error) {
        console.error('\n❌ Git operation failed:', error.message);
        process.exit(1);
    }
}

run();
