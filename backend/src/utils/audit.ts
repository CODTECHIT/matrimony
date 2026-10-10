import { db } from "../config/db.js";

export interface AuditLogOptions {
  adminId: string;
  adminName?: string;
  action: string;
  targetType: string;
  targetId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
}

export async function logAdminAction(opts: AuditLogOptions): Promise<void> {
  try {
    await db.query(
      `INSERT INTO audit_logs (admin_id, admin_name, action, target_type, target_id, metadata, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        opts.adminId,
        opts.adminName || "Admin",
        opts.action,
        opts.targetType,
        opts.targetId || null,
        JSON.stringify(opts.metadata || {}),
        opts.ipAddress || null,
      ],
    );
  } catch (err) {
    console.error("[AuditLog Error]", err);
  }
}
