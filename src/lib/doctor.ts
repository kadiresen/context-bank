import path from "node:path";
import { CLINE_DIR, findClineContracts, hasClineBank } from "./cline.js";
import { CAPS, hasStaleUncommittedMarker, isLegacyContract } from "./contract.js";
import { BANK_FILES, aiPath, agentsPath, readIfExists } from "./scan.js";

export type Finding = {
  code: string;
  severity: "error" | "warn" | "info";
  message: string;
  file: string;
};

export type Report = {
  ok: boolean;
  findings: Finding[];
};

export async function diagnose(root: string): Promise<Report> {
  const findings: Finding[] = [];
  const rules = await readIfExists(aiPath(root, "rules.md"));
  if (rules === null) {
    findings.push({
      code: "missing-rules",
      severity: "error",
      message: "Missing .ai/rules.md",
      file: path.join(root, ".ai/rules.md"),
    });
  }

  const agents = await readIfExists(agentsPath(root));
  if (agents === null) {
    findings.push({
      code: "missing-agents",
      severity: "error",
      message: "Missing AGENTS.md",
      file: agentsPath(root),
    });
  } else if (isLegacyContract(agents)) {
    findings.push({
      code: "legacy-contract",
      severity: "error",
      message: "AGENTS.md still uses the v1 every-task update contract",
      file: agentsPath(root),
    });
  }

  for (const name of BANK_FILES) {
    const file = aiPath(root, name);
    const text = await readIfExists(file);
    if (text === null) continue;
    if (isLegacyContract(text)) {
      findings.push({
        code: "legacy-contract",
        severity: "warn",
        message: `${name} still contains the v1 mandatory-update banner`,
        file,
      });
    }
    if (hasStaleUncommittedMarker(text)) {
      findings.push({
        code: "stale-uncommitted-marker",
        severity: "warn",
        message: `${name} still says HENÜZ COMMIT YOK`,
        file,
      });
    }
    const cap = CAPS[name];
    if (cap && text.length > cap) {
      findings.push({
        code: "over-cap",
        severity: "warn",
        message:
          name === "architecture.md"
            ? `${name} is ${text.length} chars (cap ${cap}); not auto-compacted, trim it by hand to the current shape`
            : `${name} is ${text.length} chars (cap ${cap})`,
        file,
      });
    }
  }

  if (await hasClineBank(root)) {
    findings.push(
      rules === null
        ? {
            code: "cline-bank",
            severity: "warn",
            message: "Cline Memory Bank found in memory-bank/. Run `context-bank migrate` to convert it.",
            file: path.join(root, CLINE_DIR),
          }
        : {
            code: "cline-leftover",
            severity: "warn",
            message: "memory-bank/ is still here next to .ai/; delete it after review so Cline stops loading it",
            file: path.join(root, CLINE_DIR),
          },
    );
  }
  for (const { rel } of await findClineContracts(root)) {
    findings.push({
      code: "cline-contract",
      severity: "warn",
      message: `${rel} still tells Cline to read every memory bank file on every task`,
      file: path.join(root, rel),
    });
  }

  return {
    ok: !findings.some((f) => f.severity === "error"),
    findings,
  };
}
