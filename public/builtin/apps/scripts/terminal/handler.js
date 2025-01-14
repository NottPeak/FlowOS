/* eslint-env browser */

import BrowserFS from 'https://cdn.jsdelivr.net/npm/browserfs@1.4.3/+esm';
import c from 'https://cdn.jsdelivr.net/npm/ansi-colors@4.1.3/+esm';
import sh from 'https://cdn.jsdelivr.net/npm/shell-quote@1.8.1/+esm';

export class CommandsAddon {
    _disposables = [];

    promptMSG = async () => `${c.blue('')}${c.bgBlue(` flow@${this.user.username}`)}${c.bgCyan(c.blue('') + ` ${this.dir.path}`)}${c.cyan('')} `;

    constructor(options, usr, dir) {
        this.commandsMap = options.commands;

        this.user = usr;
        this.dir = dir;

        this.current = '';

        BrowserFS.install(window);
        BrowserFS.configure({
            fs: 'AsyncMirror',
            options: {
                sync: { fs: 'InMemory' },
                async: { fs: 'IndexedDB',
                    options: {
                        storeName: 'root'
                    }
                }
            }
        }, async (e) => {
	        if (e) console.error(e);
    
  	        this.fs = require('fs');
            this.promptMSG = async () => `${c.blue('')}${c.bgBlue(` flow@${this.user.username}`)}${c.bgCyan(c.blue('') + ` ${this.fs.realpathSync(this.dir.path)}`)}${c.cyan('')} `;
        });
    }

    activate(term) {
        this.terminal = term;

        this.terminal.prompt = async () => {
            this.terminal.write('\r' + await this.promptMSG());
        };
        
        this.terminal.writeln('Welcome to FluSH!');
        this.terminal.writeln('');
        this.terminal.prompt();

        this.terminal.attachCustomKeyEventHandler(async (key) => {
            if (key.code === 'KeyV' && key.ctrlKey && key.type === 'keydown') {
                term.write(await navigator.clipboard.readText());
                this.current += await navigator.clipboard.readText();
                return false;
            }
        
            if (key.code === 'KeyC' && key.ctrlKey && key.type === 'keydown') {
                const selection = term.getSelection();
                if (selection) {
                    await navigator.clipboard.writeText(selection);
                    return false;
                }
            }
        
            return true;
        });

        this.terminal.onKey(({ key, domEvent: ev }) => {
            let printable = !ev.altKey && !ev.altGraphKey && !ev.ctrlKey && !ev.metaKey
                && !ev.key.includes('Arrow');
        
            if (ev.keyCode == 13) {
                if (this.current.length == 0) return;
                term.writeln('');
                const args = sh.parse(this.current);

                import('./commands/' + args[0] + '.js').then(async (command) => {
                    const cmd = await command.exec(this.fs, this.terminal, this.user, this.dir, args);
                    if (cmd && !Array.isArray(cmd)) {
                        term.writeln(cmd);
                    } else if (Array.isArray(cmd)) {
                        cmd.forEach(ln => term.writeln(ln));
                    };
                    term.prompt();
                }).catch((e) => {
                    console.error(e);
                    term.writeln(c.red(e.message));
                    term.prompt();
                });
        
                this.current = '';
            } else if (ev.keyCode == 8) {
                if (this.current.length > 0) {
                    term.write('\b \b');
                    this.current = this.current.slice(0, -1);
                }
            } else if (printable) {
                this.current += key;
                term.write(key);
            }
        });
    }

    dispose() {

    }
}