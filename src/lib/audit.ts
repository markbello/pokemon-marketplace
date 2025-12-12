import { getPrisma } from '@/lib/prisma';

/**
 * Generate partition key for audit logs (format: "YYYY-MM")
 */
export function generatePartitionKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Log audit event
 */
export async function logAuditEvent(event: {
  entityType: string;
  entityId: string;
  action: string;
  userId?: string;
  changes?: object;
  ipAddress?: string;
  userAgent?: string;
  metadata?: object;
}) {
  const prisma = getPrisma();
  return prisma.auditLog.create({
    data: {
      ...event,
      partitionKey: generatePartitionKey(),
      changes: event.changes || undefined,
      metadata: event.metadata || undefined,
    },
  });
}
