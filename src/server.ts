import express from "express";
import multer from "multer";
import { exec } from "child_process";
import path from "path";
import os from "os";
import fs from "fs";
import { promises as fsp } from "fs";
import { randomUUID } from "crypto";

const app = express();

// upload temp dir
const upload = multer({
    dest: path.join(os.tmpdir(), "latex_uploads"),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5 MB max
    }
});

app.get("/", (_req, res) => {
    res.send("LaTeX Compiler API is running. POST /compile with a .tex file.");
});

app.post("/compile", upload.single("tex_file"), async (req, res) => {
    if (!req.file) {
        return res.status(400).send("No file uploaded. Field name must be 'tex_file'.");
    }

    if (!req.file.originalname.endsWith(".tex")) {
        // delete temp file
        await fsp.unlink(req.file.path).catch(() => { });
        return res.status(400).send("Only .tex files are allowed.");
    }

    const jobId = randomUUID();
    const tmpDir = os.tmpdir();
    const texPath = path.join(tmpDir, `${jobId}.tex`);
    const pdfPath = path.join(tmpDir, `${jobId}.pdf`);

    try {
        // Move uploaded file to our desired texPath
        await fsp.rename(req.file.path, texPath);
    } catch (err) {
        console.error("Error moving file:", err);
        return res.status(500).send("Internal error saving uploaded file.");
    }

    const cmd = `pdflatex -interaction=nonstopmode -halt-on-error -output-directory=${tmpDir} ${texPath}`;

    console.log("Running:", cmd);

    const child = exec(cmd, { timeout: 20000 }, async (error, _stdout, stderr) => {
        if (error) {
            console.error("LaTeX error:", error);
            console.error("stderr:", stderr);

            await cleanupFiles(texPath, pdfPath);

            return res
                .status(500)
                .send("LaTeX compile error:\n" + (stderr?.toString() || error.message));
        }

        try {
            await fsp.access(pdfPath);
        } catch {
            await cleanupFiles(texPath, pdfPath);
            return res.status(500).send("PDF not generated. Check LaTeX source.");
        }

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", 'attachment; filename="output.pdf"');

        const readStream = fs.createReadStream(pdfPath);

        readStream.on("error", async (err) => {
            console.error("Error reading PDF:", err);
            await cleanupFiles(texPath, pdfPath);
            if (!res.headersSent) {
                res.status(500).send("Error reading generated PDF.");
            }
        });

        readStream.on("close", async () => {
            await cleanupFiles(texPath, pdfPath);
        });

        readStream.pipe(res);
    });
});

// helper to remove temp files
async function cleanupFiles(texPath: string, pdfPath: string) {
    await fsp.unlink(texPath).catch(() => { });
    await fsp.unlink(pdfPath).catch(() => { });
}

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
