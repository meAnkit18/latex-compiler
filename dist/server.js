"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const fs_1 = __importDefault(require("fs"));
const fs_2 = require("fs");
const crypto_1 = require("crypto");
const app = (0, express_1.default)();
// upload temp dir
const upload = (0, multer_1.default)({
    dest: path_1.default.join(os_1.default.tmpdir(), "latex_uploads"),
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
        await fs_2.promises.unlink(req.file.path).catch(() => { });
        return res.status(400).send("Only .tex files are allowed.");
    }
    const jobId = (0, crypto_1.randomUUID)();
    const tmpDir = os_1.default.tmpdir();
    const texPath = path_1.default.join(tmpDir, `${jobId}.tex`);
    const pdfPath = path_1.default.join(tmpDir, `${jobId}.pdf`);
    try {
        // Move uploaded file to our desired texPath
        await fs_2.promises.rename(req.file.path, texPath);
    }
    catch (err) {
        console.error("Error moving file:", err);
        return res.status(500).send("Internal error saving uploaded file.");
    }
    const cmd = `pdflatex -interaction=nonstopmode -halt-on-error -output-directory=${tmpDir} ${texPath}`;
    console.log("Running:", cmd);
    const child = (0, child_process_1.exec)(cmd, { timeout: 20000 }, async (error, _stdout, stderr) => {
        if (error) {
            console.error("LaTeX error:", error);
            console.error("stderr:", stderr);
            await cleanupFiles(texPath, pdfPath);
            return res
                .status(500)
                .send("LaTeX compile error:\n" + (stderr?.toString() || error.message));
        }
        try {
            await fs_2.promises.access(pdfPath);
        }
        catch {
            await cleanupFiles(texPath, pdfPath);
            return res.status(500).send("PDF not generated. Check LaTeX source.");
        }
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", 'attachment; filename="output.pdf"');
        const readStream = fs_1.default.createReadStream(pdfPath);
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
async function cleanupFiles(texPath, pdfPath) {
    await fs_2.promises.unlink(texPath).catch(() => { });
    await fs_2.promises.unlink(pdfPath).catch(() => { });
}
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
