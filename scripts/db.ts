// Sobe um PostgreSQL local (sem Docker) para desenvolvimento.
// Uso: npm run db:start  (deixe o terminal aberto enquanto desenvolve)
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import path from "node:path";

const dataDir = path.join(process.cwd(), ".pgdata");
const firstRun = !existsSync(dataDir);

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: "postgres",
  password: "postgres",
  port: 54329,
  persistent: true,
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
});

async function main() {
  if (firstRun) await pg.initialise();
  await pg.start();
  // Cria o banco (ignora o erro se ele já existir)
  await pg.createDatabase("lf_workspace").catch(() => {});
  console.log("PostgreSQL rodando em postgresql://postgres:postgres@localhost:54329/lf_workspace");

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
