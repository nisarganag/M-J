import fields from "../data/site-copy-fields.json"

export const COPY_FIELDS = fields
export type CopyKey = keyof typeof COPY_FIELDS
export type SiteCopy = Record<CopyKey, string>
export const DEFAULT_COPY = Object.fromEntries(Object.entries(COPY_FIELDS).map(([key, spec]) => [key, spec.initial])) as SiteCopy
