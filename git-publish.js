/* eslint-disable */
const { execSync } = require('child_process');
const readline = require('readline');

// Helper to handle interactive arrow-key selection
function selectOption(options, promptText) {
    return new Promise((resolve) => {
        let index = 0;
        let firstRender = true;

        // Hide the terminal cursor
        process.stdout.write('\u001B[?25l');

        const render = () => {
            if (!firstRender) {
                readline.moveCursor(process.stdout, 0, -(options.length + 1));
            }
            firstRender = false;
            readline.cursorTo(process.stdout, 0);
            readline.clearScreenDown(process.stdout);
            
            console.log(`🔀 ${promptText} (Use ⬆️ / ⬇️  keys, press Enter):`);
            options.forEach((opt, i) => {
                if (i === index) {
                    console.log(` > \x1b[36m● ${opt}\x1b[0m`);
                } else {
                    console.log(`   ○ ${opt}`);
                }
            });
        };

        console.log(); // Initial blank line for spacing
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
                console.log(); // spacing
                resolve(options[index]);
                return;
            }
            if (key === '\u001b[A') { // Up arrow
                index = index > 0 ? index - 1 : options.length - 1;
                render();
            }
            if (key === '\u001b[B') { // Down arrow
                index = index < options.length - 1 ? index + 1 : 0;
                render();
            }
        };

        process.stdin.on('data', keyHandler);
    });
}

async function run() {
    const action = await selectOption(["Push to branch", "Push and merge"], "What do you want to do?");

    // Fetch local git branches
    let branches = [];
    let currentBranch = '';
    try {
        currentBranch = execSync('git branch --show-current', { encoding: 'utf-8' }).trim();
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

    if (action === "Push to branch") {
        const targetBranch = await selectOption(branches, "Select the target branch to push to");
        
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        const msg = await new Promise(resolve => rl.question('📝 Enter commit message: ', m => { rl.close(); resolve(m.trim()); }));
        if (!msg) { console.log('❌ Commit message cannot be empty.'); process.exit(1); }

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
    } else if (action === "Push and merge") {
        const fetchBranch = await selectOption(branches, "Select the branch to fetch from (source)");
        const pullIntoBranch = await selectOption(branches, "Select the branch to pull into (target)");

        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        const msg = await new Promise(resolve => rl.question('📝 Enter commit message: ', m => { rl.close(); resolve(m.trim()); }));
        if (!msg) { console.log('❌ Commit message cannot be empty.'); process.exit(1); }

        try {
            console.log('\n📦 Staging files...');
            execSync('git add .', { stdio: 'inherit' });

            console.log('✍️  Committing changes...');
            execSync(`git commit -m "${msg}"`, { stdio: 'inherit' });

            console.log(`🚀 Pushing current changes to origin ${currentBranch}...`);
            execSync(`git push origin ${currentBranch}`, { stdio: 'inherit' });

            console.log(`\n🔄 Switching to target branch ${pullIntoBranch}...`);
            execSync(`git checkout ${pullIntoBranch}`, { stdio: 'inherit' });

            console.log(`⬇️  Pulling latest changes for ${pullIntoBranch}...`);
            execSync(`git pull origin ${pullIntoBranch}`, { stdio: 'inherit' });

            console.log(`🔀 Merging ${fetchBranch} into ${pullIntoBranch}...`);
            execSync(`git merge ${fetchBranch}`, { stdio: 'inherit' });

            console.log(`🚀 Pushing merged ${pullIntoBranch} to origin...`);
            execSync(`git push origin ${pullIntoBranch}`, { stdio: 'inherit' });

            console.log(`\n🔙 Switching back to ${currentBranch}...`);
            execSync(`git checkout ${currentBranch}`, { stdio: 'inherit' });

            console.log('\n🎉 Successfully committed, merged, and pushed!');
        } catch (error) {
            console.error('\n❌ Git operation failed:', error.message);
            try { execSync(`git checkout ${currentBranch}`, { stdio: 'ignore' }); } catch(e) {}
            process.exit(1);
        }
    }
}

run();
