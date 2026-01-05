import { spawn } from "node:child_process";

const isWindows = process.platform === "win32";
const npmCommand = "npm";
const childProcesses = new Set();

const runCommand = (command, args) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} exited with code ${code ?? "unknown"}`));
    });
  });

const spawnCommand = (command, args, options = {}) => {
  const child = spawn(command, args, { stdio: "inherit", ...options });
  childProcesses.add(child);
  child.on("exit", () => childProcesses.delete(child));
  return child;
};

const shutdown = (exitCode = 0, signal = "SIGINT") => {
  for (const child of childProcesses) {
    try {
      child.kill(signal);
    } catch {
      // Ignore errors when process already exited.
    }
  }
  process.exit(exitCode);
};

const handleChildExit = (name, otherChild) => (code, signal) => {
  if (signal) {
    console.error(`${name} exited with signal ${signal}`);
    if (otherChild) {
      try {
        otherChild.kill(signal);
      } catch {
        // Ignore errors when process already exited.
      }
    }
    process.exit(1);
  }
  shutdown(code ?? 0);
};

process.on("SIGINT", () => shutdown(0, "SIGINT"));
process.on("SIGTERM", () => shutdown(0, "SIGTERM"));

const main = async () => {
  try {
    await runCommand("docker", [
      "compose",
      "-f",
      "infra/docker-compose.yml",
      "up",
      "-d",
    ]);
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : "Failed to start Docker Compose"
    );
    process.exit(1);
  }

  const backend = spawnCommand(npmCommand, ["run", "dev"], {
    cwd: "backend",
    shell: isWindows,
  });
  const frontend = spawnCommand(npmCommand, ["run", "dev"], {
    cwd: "frontend",
    shell: isWindows,
  });

  backend.on("exit", handleChildExit("backend", frontend));
  frontend.on("exit", handleChildExit("frontend", backend));
};

main();
