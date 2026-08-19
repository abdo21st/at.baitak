import { prisma } from './prisma';

/**
 * Returns a scoped Prisma Client instance that automatically filters and injects tenantId
 * for multi-tenant data isolation.
 */
export function getTenantPrisma(tenantId: string = 'default-tenant') {
  return prisma.$extends({
    query: {
      user: {
        async findMany({ args, query }) {
          (args as any).where = { ...(args as any).where, tenantId };
          return query(args);
        },
        async findFirst({ args, query }) {
          (args as any).where = { ...(args as any).where, tenantId };
          return query(args);
        },
        async create({ args, query }) {
          (args as any).data = { ...(args as any).data, tenantId };
          return query(args);
        }
      },
      department: {
        async findMany({ args, query }) {
          (args as any).where = { ...(args as any).where, tenantId };
          return query(args);
        },
        async create({ args, query }) {
          (args as any).data = { ...(args as any).data, tenantId };
          return query(args);
        }
      },
      project: {
        async findMany({ args, query }) {
          (args as any).where = { ...(args as any).where, tenantId };
          return query(args);
        },
        async create({ args, query }) {
          (args as any).data = { ...(args as any).data, tenantId };
          return query(args);
        }
      },
      rateRule: {
        async findMany({ args, query }) {
          (args as any).where = { ...(args as any).where, tenantId };
          return query(args);
        },
        async create({ args, query }) {
          (args as any).data = { ...(args as any).data, tenantId };
          return query(args);
        }
      },
      pharmacyProduct: {
        async findMany({ args, query }) {
          (args as any).where = { ...(args as any).where, tenantId };
          return query(args);
        },
        async findFirst({ args, query }) {
          (args as any).where = { ...(args as any).where, tenantId };
          return query(args);
        },
        async create({ args, query }) {
          (args as any).data = { ...(args as any).data, tenantId };
          return query(args);
        }
      },
      pharmacySupplier: {
        async findMany({ args, query }) {
          (args as any).where = { ...(args as any).where, tenantId };
          return query(args);
        },
        async findFirst({ args, query }) {
          (args as any).where = { ...(args as any).where, tenantId };
          return query(args);
        },
        async create({ args, query }) {
          (args as any).data = { ...(args as any).data, tenantId };
          return query(args);
        }
      },
      purchasingTrip: {
        async findMany({ args, query }) {
          (args as any).where = { ...(args as any).where, tenantId };
          return query(args);
        },
        async create({ args, query }) {
          (args as any).data = { ...(args as any).data, tenantId };
          return query(args);
        }
      },
      inventoryAudit: {
        async findMany({ args, query }) {
          (args as any).where = { ...(args as any).where, tenantId };
          return query(args);
        },
        async create({ args, query }) {
          (args as any).data = { ...(args as any).data, tenantId };
          return query(args);
        }
      },
      whatsAppShortageRequest: {
        async findMany({ args, query }) {
          (args as any).where = { ...(args as any).where, tenantId };
          return query(args);
        },
        async create({ args, query }) {
          (args as any).data = { ...(args as any).data, tenantId };
          return query(args);
        }
      }
    }
  });
}
