// Sobe um PostgreSQL local (sem Docker) para desenvolvimento.
// Uso: npm run db:start  (deixe o terminal aberto enquanto desenvolve)
// Usuário, senha, porta e nome do banco vêm do DATABASE_URL do seu .env (nada fica no código).
import "dotenv/config";
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import path from "node:path";

const url = new URL(process.env.DATABASE_URL ?? "");
if (!url.password) {
  console.error("Defina DATABASE_URL no .env (veja .env.example) antes de rodar npm run db:start.");
  process.exit(1);
}

const database = url.pathname.slice(1);
const dataDir = path.join(process.cwd(), ".pgdata");
const firstRun = !existsSync(dataDir);

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  port: Number(url.port),
  persistent: true,
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
});

async function main() {
  if (firstRun) await pg.initialise();
  await pg.start();
  // Cria o banco (ignora o erro se ele já existir)
  await pg.createDatabase(database).catch(() => {});
  console.log(`PostgreSQL rodando em localhost:${url.port}, banco "${database}"`);

  const stop = async () => {
    await pg.stop();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
