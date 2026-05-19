import { NextResponse } from "next/server";
import { spawn } from "child_process";
import { writeFile, unlink, access } from "fs/promises";
import path from "path";
import os from "os";
import crypto from "crypto";

/** Resolve the convert.py script path — dev uses the source tree, prod uses the copied scripts/ dir. */
async function resolveScriptPath(): Promise<string | null> {
  const candidates = [
    path.join(process.cwd(), "src", "server", "converter", "convert.py"),
    path.join(process.cwd(), "scripts", "convert.py"),
  ];
  for (const p of candidates) {
    try {
      await access(p);
      return p;
    } catch {
      // not found — try next
    }
  }
  return null;
}

/** Find a working Python 3 executable on PATH. */
async function findPython(): Promise<string | null> {
  for (const cmd of ["python3", "python"]) {
    try {
      await new Promise<void>((resolve, reject) => {
        const proc = spawn(cmd, ["--version"]);
        proc.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`exit ${code}`))));
        proc.on("error", reject);
      });
      return cmd;
    } catch {
      // try next candidate
    }
  }
  return null;
}

export async function POST(request: Request) {
  let tmpPath: string | null = null;

  try {
    // 1. Parse multipart/form-data
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    // 2. Write to a unique temp file preserving the original extension
    const ext = path.extname(file.name) || ".bin";
    const tmpName = `slidi-convert-${crypto.randomUUID()}${ext}`;
    tmpPath = path.join(os.tmpdir(), tmpName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(tmpPath, buffer);

    // 3. Locate Python and the conversion script
    const [python, scriptPath] = await Promise.all([findPython(), resolveScriptPath()]);

    if (!python) {
      return NextResponse.json(
        {
          error:
            "Python 3 is not available on this server. " +
            "Install Python 3 and run: pip install \"markitdown[all]\"",
        },
        { status: 503 },
      );
    }

    if (!scriptPath) {
      return NextResponse.json(
        { error: "Converter script not found. The server may be misconfigured." },
        { status: 503 },
      );
    }

    // 4. Spawn the Python process
    const { stdout, stderr, exitCode } = await new Promise<{
      stdout: string;
      stderr: string;
      exitCode: number;
    }>((resolve) => {
      const proc = spawn(python, [scriptPath, tmpPath!]);
      const outChunks: Buffer[] = [];
      const errChunks: Buffer[] = [];

      proc.stdout.on("data", (chunk: Buffer) => outChunks.push(chunk));
      proc.stderr.on("data", (chunk: Buffer) => errChunks.push(chunk));

      proc.on("close", (code) => {
        resolve({
          stdout: Buffer.concat(outChunks).toString("utf-8"),
          stderr: Buffer.concat(errChunks).toString("utf-8"),
          exitCode: code ?? 1,
        });
      });

      proc.on("error", (err) => {
        resolve({ stdout: "", stderr: err.message, exitCode: 1 });
      });
    });

    // 5. Handle conversion errors
    if (exitCode !== 0) {
      const reason = stderr.trim() || "Conversion failed with no error message.";

      // Exit code 2 = markitdown not installed
      if (exitCode === 2) {
        return NextResponse.json(
          {
            error:
              "markitdown is not installed on this server. " +
              "Run: pip install \"markitdown[all]\"",
          },
          { status: 503 },
        );
      }

      return NextResponse.json({ error: reason }, { status: 422 });
    }

    const markdown = stdout.trim();
    return NextResponse.json({ markdown, filename: file.name });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    // 6. Always clean up the temp file
    if (tmpPath) {
      unlink(tmpPath).catch(() => {});
    }
  }
}
