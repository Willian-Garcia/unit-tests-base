// tests/jest.setup.ts
import dotenv from "dotenv";
import { Pool } from "pg";
import Redis, { RedisOptions } from "ioredis";

dotenv.config({ path: ".env.test" });

// garante que os tipos globais existem neste arquivo também
declare global {
  // eslint-disable-next-line no-var
  var pool: Pool;
  // eslint-disable-next-line no-var
  var redis: Redis;
}

// 🔴 mock do redis da aplicação para usar a conexão global dos testes
jest.mock("src/configs/redis", () => {
  const getTarget = () => (global as any).redis;
  const proxy = new Proxy({}, {
    get: (_t, prop: string) => {
      const target = getTarget();
      const val = (target as any)[prop];
      return typeof val === "function" ? val.bind(target) : val; // método -> bind, prop -> retorna
    },
    set: (_t, prop: string, value: any) => {
      (getTarget() as any)[prop] = value;
      return true;
    },
  });
  return { __esModule: true, default: proxy };
});


beforeAll(async () => {
  // Postgres
  global.pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  await global.pool.query("SELECT 1");

  // Redis (NÃO envie password se estiver vazia)
  const redisOpts: RedisOptions = {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT || 6379),
    lazyConnect: true,
  };
  if (process.env.REDIS_PASSWORD) {
    redisOpts.password = process.env.REDIS_PASSWORD;
  }
  global.redis = new Redis(redisOpts);
  await global.redis.connect();

  // estado limpo para a suíte inteira
  await global.pool.query("TRUNCATE TABLE contacts RESTART IDENTITY CASCADE;");
  await global.pool.query("TRUNCATE TABLE users RESTART IDENTITY CASCADE;");
  await global.redis.flushall();

  // silenciar erros no console durante testes
  jest.spyOn(console, "error").mockImplementation(() => {});
});

beforeEach(async () => {
  // isolar cada teste (uma vez por teste já basta)
  await global.pool.query("TRUNCATE TABLE contacts RESTART IDENTITY CASCADE;");
  await global.pool.query("TRUNCATE TABLE users RESTART IDENTITY CASCADE;");
  await global.redis.flushall();
});

// Se preferir, remova este bloco para não fazer limpeza duas vezes
// afterEach(async () => {
//   await global.pool.query("TRUNCATE TABLE contacts RESTART IDENTITY CASCADE;");
//   await global.pool.query("TRUNCATE TABLE users RESTART IDENTITY CASCADE;");
//   await global.redis.flushall();
// });

afterAll(async () => {
  await global.redis.quit();
  await global.pool.end();
  jest.restoreAllMocks();
}, 10000); // timeout extra para fechar conexões com calma
