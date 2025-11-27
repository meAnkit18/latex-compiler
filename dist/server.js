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
const crypto_1 = require("crypto");
const app = (0, express_1.default)();
const upload = (0, multer_1.default)({ dest: os_1.default.tmpdir() });
app.post("/compile", upload.single("tex_file"), (req, res) => {
    if (!req.file)
        return res.status(400).send("No file uploaded");
    const id = (0, crypto_1.randomUUID)();
    const texPath = path_1.default.join(os_1.default.tmpdir(), `${id}.tex`);
    const pdfPath = path_1.default.join(os_1.default.tmpdir(), `${id}.pdf`);
    fs_1.default.renameSync(req.file.path, texPath);
    const cmd = `pdflatex -interaction=nonstopmode -halt-on-error -output-directory=${os_1.default.tmpdir()} ${texPath}`;
    (0, child_process_1.exec)(cmd, { timeout: 15000 }, (err) => {
        if (err)
            return res.status(500).send("Compile error");
        if (!fs_1.default.existsSync(pdfPath))
            return res.status(500).send("No PDF generated");
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "attachment; filename=output.pdf");
        fs_1.default.createReadStream(pdfPath).pipe(res);
    });
});
app.get("/", (_, res) => res.send("TinyTeX LaTeX Compiler Running"));
app.listen(process.env.PORT || 10000, () => console.log("Running on port " + (process.env.PORT || 10000)));
