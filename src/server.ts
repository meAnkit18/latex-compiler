import express from "express";
import multer from "multer";
import { exec } from "child_process";
import path from "path";
import os from "os";
import fs from "fs";
import { randomUUID } from "crypto";

const app = express();
const upload = multer({ dest: os.tmpdir() });

app.post("/compile", upload.single("tex_file"), (req, res) => {
    if (!req.file) return res.status(400).send("No file uploaded");

    const id = randomUUID();
    const texPath = path.join(os.tmpdir(), `${id}.tex`);
    const pdfPath = path.join(os.tmpdir(), `${id}.pdf`);

    fs.renameSync(req.file.path, texPath);

    const cmd = `pdflatex -interaction=nonstopmode -halt-on-error -output-directory=${os.tmpdir()} ${texPath}`;

    exec(cmd, { timeout: 15000 }, (err) => {
        if (err) return res.status(500).send("Compile error");

        if (!fs.existsSync(pdfPath)) return res.status(500).send("No PDF generated");

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "attachment; filename=output.pdf");

        fs.createReadStream(pdfPath).pipe(res);
    });
});

app.get("/", (_, res) => res.send("TinyTeX LaTeX Compiler Running"));

app.listen(process.env.PORT || 10000, () =>
    console.log("Running on port " + (process.env.PORT || 10000))
);
