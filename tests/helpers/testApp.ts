import dotenv from "dotenv";
// Carrega .env.test o quanto antes, antes de importar qualquer coisa da src/
dotenv.config({ path: ".env.test" });

import express from "express";
import router from "../../src/routes"; // caminho relativo correto

const app = express();
app.use(express.json());
app.use("/", router);

export default app;