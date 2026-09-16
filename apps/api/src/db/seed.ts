import 'dotenv/config';
import { hash } from 'bcryptjs';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users } from './schema/index.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');

const client = postgres(connectionString, { max: 1 });
const db = drizzle(client);

const passwordHash = await hash('123456a@', 10);

await db
  .insert(users)
  .values({
    email: 'admin@aelc.local',
    name: 'Admin',
    username: 'admin',
    password: passwordHash,
    role: 'admin',
  })
  .onConflictDoNothing({ target: users.username });

await client.end();
