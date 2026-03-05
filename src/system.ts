import { spawn } from "node:child_process";

export async function copyToClipboard(command: string, text: string): Promise<void> {
  await runCommand(command, [], text, { waitForExit: false });
}

export async function sendNotification(
  command: string,
  title: string,
  body: string
): Promise<void> {
  await runCommand(command, [title, body]);
}

export async function playSound(command: string, args: string[]): Promise<void> {
  await runCommand(command, args);
}

interface RunCommandOptions {
  waitForExit?: boolean;
}

async function runCommand(
  command: string,
  args: string[],
  input?: string,
  options: RunCommandOptions = {}
): Promise<void> {
  const waitForExit = options.waitForExit ?? true;

  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["pipe", "ignore", "pipe"]
    });

    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.once("error", (error) => {
      reject(new Error(`Failed to start ${command}: ${error.message}`));
    });

    let settled = false;

    const settle = (handler: () => void): void => {
      if (settled) {
        return;
      }
      settled = true;
      handler();
    };

    const onClose = (code: number | null): void => {
      if (code === 0) {
        settle(resolve);
        return;
      }

      const extra = stderr.trim().length > 0 ? `: ${stderr.trim()}` : "";
      settle(() => reject(new Error(`${command} exited with code ${String(code)}${extra}`)));
    };

    child.once("close", onClose);

    if (input !== undefined) {
      child.stdin.write(input);
    }

    child.stdin.end();

    if (!waitForExit) {
      setTimeout(() => {
        settle(resolve);
      }, 200);
    }
  });
}
