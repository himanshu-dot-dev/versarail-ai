import { z } from 'zod'

export const PermissionResponseSchema = z.object({
  requestId: z.string().uuid('Invalid request UUID'),
  decision: z.enum(['allow', 'deny']),
  rememberScope: z.enum(['once', 'session', 'always']).optional()
})

export type PermissionResponseInput = z.infer<typeof PermissionResponseSchema>

