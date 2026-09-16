import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../db/db.constants.js';
import type { DrizzleDb } from '../db/db.types.js';
import { users } from '../db/schema/index.js';
import type { LoginDto } from './dto/login.dto.js';

export interface AuthenticatedUser {
  id: string;
  username: string;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly jwtService: JwtService,
  ) {}

  async login({ username, password }: LoginDto) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.username, username));

    if (!user?.password || !(await compare(password, user.password))) {
      throw new UnauthorizedException('Invalid username or password');
    }

    const payload: AuthenticatedUser = {
      id: user.id,
      username: user.username!,
      role: user.role,
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: payload,
    };
  }

  async validateToken(token: string): Promise<AuthenticatedUser> {
    try {
      return await this.jwtService.verifyAsync<AuthenticatedUser>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
