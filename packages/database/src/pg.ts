import pg from "pg";
export { pg };
export const Client = pg.Client;
export type Client = pg.Client;
export const Pool = pg.Pool;
export type Pool = pg.Pool;
export type { ClientConfig, QueryResult } from "pg";
