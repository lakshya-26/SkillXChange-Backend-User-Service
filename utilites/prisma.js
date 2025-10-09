const { PrismaClient } = require('@prisma/client');

const base = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

const PARANOID_MODELS = new Set(['User', 'UserDetails', 'Skill', 'UserSkills']);

const addParanoidWhere = (args) => {
  const where = args.where || {};
  return { ...args, where: { AND: [where, { deletedAt: null }] } };
};

const prisma = base.$extends({
  query: {
    $allModels: {
      findFirst({ model, args, query }) {
        if (PARANOID_MODELS.has(model)) {
          args = addParanoidWhere(args || {});
        }
        return query(args);
      },
      findMany({ model, args, query }) {
        if (PARANOID_MODELS.has(model)) {
          args = addParanoidWhere(args || {});
        }
        return query(args);
      },
      count({ model, args, query }) {
        if (PARANOID_MODELS.has(model)) {
          args = addParanoidWhere(args || {});
        }
        return query(args);
      },
      aggregate({ model, args, query }) {
        if (PARANOID_MODELS.has(model)) {
          args = addParanoidWhere(args || {});
        }
        return query(args);
      },
      findUnique({ model, args }) {
        if (PARANOID_MODELS.has(model)) {
          const { where, select, include } = args || {};
          return base[model].findFirst({
            where: { AND: [where || {}, { deletedAt: null }] },
            select,
            include,
          });
        }
        return base[model].findUnique(args);
      },

      delete({ model, args }) {
        if (PARANOID_MODELS.has(model)) {
          return base[model].update({
            where: args.where,
            data: { deletedAt: new Date() },
          });
        }
        return base[model].delete(args);
      },
      deleteMany({ model, args }) {
        if (PARANOID_MODELS.has(model)) {
          return base[model].updateMany({
            where: args.where || {},
            data: { deletedAt: new Date() },
          });
        }
        return base[model].deleteMany(args);
      },

      updateMany({ model, args, query }) {
        if (PARANOID_MODELS.has(model)) {
          args = addParanoidWhere(args || {});
        }
        return query(args);
      },
    },
  },
});

module.exports = prisma;
