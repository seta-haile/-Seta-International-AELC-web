import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(255),
});

export class CreateUserDto extends createZodDto(CreateUserSchema) {}
