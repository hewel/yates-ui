import { Plugin } from "rolldown";
import { spawn, execSync } from 'node:child_process';
import path from "node:path";

export function runAgs(): Plugin {
    return {
        name: "run-ags",
        writeBundle(options, bundle) {
            if (!this.meta.watchMode) return;
            const chunk = Object.values(bundle).find((chunk) => chunk.type === "chunk");
            if (!chunk) return;

            try {
                execSync('ags quit');
            } catch (err) { }

            spawn('ags', ['run', path.join(options.dir ?? '', chunk.fileName)], {
                stdio: 'inherit',
            });
        }
    }
}