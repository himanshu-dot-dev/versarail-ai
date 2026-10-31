import { z } from 'zod'

export const DiffLineTypeSchema = z.enum(['add', 'delete', 'context'])
export type DiffLineType = z.infer<typeof DiffLineTypeSchema>

export const DiffLineSchema = z.object({
  type: DiffLineTypeSchema,
  content: z.string(),
  oldLineNumber: z.number().optional(),
  newLineNumber: z.number().optional()
})
export type DiffLineDTO = z.infer<typeof DiffLineSchema>

export const DiffHunkSchema = z.object({
  oldStart: z.number(),
  oldLines: z.number(),
  newStart: z.number(),
  newLines: z.number(),
  lines: z.array(DiffLineSchema)
})
export type DiffHunkDTO = z.infer<typeof DiffHunkSchema>

export const UnifiedDiffResultSchema = z.object({
  filePath: z.string(),
  patch: z.string(),
  hunks: z.array(DiffHunkSchema),
  additions: z.number(),
  deletions: z.number(),
  baselineSha256: z.string(),
  newSha256: z.string(),
  hasChanges: z.boolean(),
  hasConflict: z.boolean().optional(),
  conflictReason: z.string().optional()
})
export type UnifiedDiffResultDTO = z.infer<typeof UnifiedDiffResultSchema>

export const ReviewPatchRequestSchema = z.object({
  workspacePath: z.string().optional(),
  relativePath: z.string(),
  proposedContent: z.string().optional(),
  patchText: z.string().optional(),
  baselineSha256: z.string().optional()
})
export type ReviewPatchRequestDTO = z.infer<typeof ReviewPatchRequestSchema>

export const ApplyPatchRequestSchema = z.object({
  workspacePath: z.string().optional(),
  relativePath: z.string(),
  proposedContent: z.string().optional(),
  patchText: z.string().optional(),
  baselineSha256: z.string(),
  runId: z.string().optional()
})
export type ApplyPatchRequestDTO = z.infer<typeof ApplyPatchRequestSchema>

export const ApplyPatchResponseSchema = z.object({
  success: z.boolean(),
  filePath: z.string(),
  journalId: z.string().optional(),
  newSha256: z.string().optional(),
  error: z.string().optional(),
  isConflict: z.boolean().optional()
})
export type ApplyPatchResponseDTO = z.infer<typeof ApplyPatchResponseSchema>

export const FileChangeJournalEntrySchema = z.object({
  id: z.string(),
  runId: z.string().nullable().optional(),
  workspacePath: z.string(),
  relativePath: z.string(),
  baselineSha256: z.string(),
  diffPatch: z.string(),
  status: z.enum(['applied', 'reverted', 'failed']),
  appliedAt: z.string().nullable().optional()
})
export type FileChangeJournalEntryDTO = z.infer<typeof FileChangeJournalEntrySchema>

