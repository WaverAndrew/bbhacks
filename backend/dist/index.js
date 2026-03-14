"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const config_1 = require("./config");
const schema_1 = require("./db/schema");
const lp_1 = require("./routes/lp");
const coverage_1 = require("./routes/coverage");
const oracle_1 = require("./routes/oracle");
const loans_1 = require("./routes/loans");
const client_1 = require("./xrpl/client");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});
app.use("/lp", lp_1.lpRouter);
app.use("/coverage", coverage_1.coverageRouter);
app.use("/oracle", oracle_1.oracleRouter);
app.use("/loan", loans_1.loansRouter);
async function start() {
    await (0, schema_1.initDb)();
    const server = app.listen(config_1.PORT, () => {
        console.log(`Backend listening on http://localhost:${config_1.PORT}`);
    });
    process.on("SIGINT", async () => {
        server.close();
        await (0, client_1.disconnectClient)();
        process.exit(0);
    });
    process.on("SIGTERM", async () => {
        server.close();
        await (0, client_1.disconnectClient)();
        process.exit(0);
    });
}
start().catch((e) => {
    console.error(e);
    process.exit(1);
});
//# sourceMappingURL=index.js.map