// Hide Node.js server-only modules from the client-side bundler
const spawn = typeof window === "undefined" ? eval('require')("child_process").spawn : null;
const fs = typeof window === "undefined" ? eval('require')("fs") : null;
const path = typeof window === "undefined" ? eval('require')("path") : null;

export interface CliExecutionResult {
  success: boolean;
  stdout: string;
  stderr: string;
  outputFileContent?: string;
}

/**
 * Checks if a command can be executed successfully.
 */
export async function isCommandAvailable(cmd: string, args: string[] = ["--help"]): Promise<boolean> {
  return new Promise((resolve) => {
    if (!spawn) return resolve(false);
    try {
      const proc = spawn(cmd, args, { shell: true });
      proc.on("error", () => resolve(false));
      proc.on("close", (code: number | null) => {
        resolve(code !== null);
      });
    } catch {
      resolve(false);
    }
  });
}

/**
 * Spawns a local CLI process, streams logs in real-time, and optionally reads the JSON output file.
 */
export async function runCliTool(opts: {
  command: string;
  args: string[];
  outputFilePath?: string;
  onLog?: (log: string) => void;
}): Promise<CliExecutionResult> {
  const { command, args, outputFilePath, onLog } = opts;
  
  return new Promise((resolve) => {
    if (!spawn || !fs) {
      return resolve({ success: false, stdout: "", stderr: "CLI execution not supported in this environment." });
    }

    console.log(`[CLI] Spawning process: ${command} ${args.join(" ")}`);
    if (onLog) {
      onLog(`[*] Executing command: ${command} ${args.join(" ")}`);
    }

    const proc = spawn(command, args, { shell: true });
    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data: any) => {
      const chunk = data.toString();
      stdout += chunk;
      if (onLog) {
        const lines = chunk.split("\n");
        lines.forEach((line: string) => {
          const cleanLine = line.trim();
          if (cleanLine) {
            onLog(cleanLine);
          }
        });
      }
    });

    proc.stderr.on("data", (data: any) => {
      const chunk = data.toString();
      stderr += chunk;
      if (onLog) {
        const lines = chunk.split("\n");
        lines.forEach((line: string) => {
          const cleanLine = line.trim();
          if (cleanLine && !cleanLine.toLowerCase().includes("warning")) {
            onLog(`[WARN] ${cleanLine}`);
          }
        });
      }
    });

    proc.on("error", (err: Error) => {
      console.error(`[CLI] Failed to start process:`, err);
      if (onLog) {
        onLog(`[ERROR] Failed to start process: ${err.message}`);
      }
      resolve({ success: false, stdout, stderr });
    });

    proc.on("close", (code: number | null) => {
      console.log(`[CLI] Process exited with code ${code}`);
      
      let outputFileContent;
      if (outputFilePath && fs.existsSync(outputFilePath)) {
        try {
          outputFileContent = fs.readFileSync(outputFilePath, "utf8");
          fs.unlinkSync(outputFilePath);
        } catch (e) {
          console.error(`[CLI] Failed to read output file:`, e);
        }
      }

      resolve({
        success: code === 0 || (code !== null && outputFileContent !== undefined),
        stdout,
        stderr,
        outputFileContent,
      });
    });
  });
}
