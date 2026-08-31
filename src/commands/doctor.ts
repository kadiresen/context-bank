import chalk from "chalk";
import { diagnose } from "../lib/doctor.js";

export async function doctorCommand(dir?: string): Promise<void> {
  const root = dir ?? process.cwd();
  const report = await diagnose(root);

  if (report.findings.length === 0) {
    console.log(chalk.green("Bank is healthy."));
    return;
  }

  for (const finding of report.findings) {
    const paint =
      finding.severity === "error"
        ? chalk.red
        : finding.severity === "warn"
          ? chalk.yellow
          : chalk.gray;
    console.log(
      paint(`${finding.severity}  ${finding.code}  ${finding.message}`),
    );
  }

  if (!report.ok) {
    console.log(
      chalk.red("\nRun `context-bank migrate` to switch the v1 contract to v2."),
    );
    process.exitCode = 1;
  }
}
