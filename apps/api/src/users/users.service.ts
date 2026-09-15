import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '../db/db.constants.js';
import type { DrizzleDb } from '../db/db.types.js';
import { users } from '../db/schema/index.js';
import type { CreateUserDto } from './dto/create-user.dto.js';

@Injectable()
export class UsersService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  findAll() {
    return this.db.select().from(users);
  }

  create(dto: CreateUserDto) {
    return this.db.insert(users).values(dto).returning();
  }
}
