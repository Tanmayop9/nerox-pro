import { spawn } from "child_process";
import { config } from "dotenv";

// Load environment variables
config();

// Function to start a script
function runScript(path) {
  const proc = spawn("node", [path], { stdio: "inherit" });
  proc.on("close", (code) => console.log(`${path} exited with code ${code}`));
  proc.on("error", (err) => console.error(`${path} failed to start:\n`, err));
  return proc;
}

// Start main script
runScript("./src/index.js");
