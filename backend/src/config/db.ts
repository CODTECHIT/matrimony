import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

const isProduction = process.env.NODE_ENV === "production";

// Configure PostgreSQL connection pool for AWS RDS
const poolConfig: pg.PoolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: isProduction ? { rejectUnauthorized: false } : undefined,
    }
  : {
      host: process.env.DB_HOST || "localhost",
      port: Number(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "postgres",
      database: process.env.DB_NAME || "yfj_matrimony",
      max: 20, // Maximum pool connections
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl:
        isProduction || process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
    };

export const pool = new Pool(poolConfig);

pool.on("error", (err) => {
  console.error("[AWS RDS Postgres] Unexpected error on idle client", err);
});

export const db = {
  query: async <T extends pg.QueryResultRow = any>(
    text: string,
    params?: any[],
  ): Promise<pg.QueryResult<T>> => {
    const start = Date.now();
    try {
      const res = await pool.query<T>(text, params);
      const duration = Date.now() - start;
      if (process.env.NODE_ENV !== "production") {
        console.log(`[SQL Query] duration: ${duration}ms, rows: ${res.rowCount}`);
      }
      return res;
    } catch (error) {
      console.error("[SQL Query Error]", { text, error });
      throw error;
    }
  },
  getClient: () => pool.connect(),
};
