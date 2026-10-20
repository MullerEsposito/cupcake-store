import { User } from '../src/modules/users/entities/User.ts';
import { Product } from '../src/modules/catalog/entities/Product.ts';

export function createTypeOrmFixture(overrides = {}) {
  const baseUser = { id: '1', name: 'Cliente', email: 'cliente@example.com', role: 'CLIENTE',
    passwordHash: 'hash', active: true, failedAttempts: 0, blockedUntil: null };
  const store = {
    products: async () => [],
    product: async () => null,
    register: async input => ({ ...baseUser, ...input }),
    login: async () => baseUser,
    user: async () => baseUser,
    saveLoginState: async () => {},
    ...overrides
  };
  const events = [];
  const writes = [];
  const repositories = new Map();
  function getRepository(target, scope) {
    events.push({ type: 'repository', entity: target.name, scope });
    if (target === User) {
      return {
        target: target,
        manager: { transaction: operation => dataSource.transaction(operation) },
        findOneBy: async criteria => {
          events.push({ type: 'findOneBy', criteria, scope });
          const user = await store.user(criteria.id);
          return user && user.active !== false ? user : null;
        },
        create: input => input,
        save: input => store.register(input),
        update: async (criteria, state) => {
          events.push({ type: 'update', criteria, state, scope });
          writes.push({ id: criteria.id, state });
          await store.saveLoginState(criteria.id, state);
        },
        createQueryBuilder: alias => {
          let parameters;
          const query = {
            addSelect: column => { events.push({ type: 'addSelect', column, scope }); return query; },
            where: (condition, values) => { parameters = values; events.push({ type: 'where', condition, values, scope }); return query; },
            setLock: mode => { events.push({ type: 'lock', mode, scope }); return query; },
            getOne: async () => { events.push({ type: 'getOne', alias, scope }); return store.login(parameters.email); }
          };
          return query;
        }
      };
    }
    if (target === Product) {
      let id;
      const query = {
        innerJoin: (...args) => { events.push({ type: 'join', args }); return query; },
        select: () => query,
        addSelect: () => query,
        where: (condition, values) => { events.push({ type: 'where', condition, values }); return query; },
        andWhere: (condition, values) => { id = values.id; events.push({ type: 'andWhere', condition, values }); return query; },
        orderBy: (...args) => { events.push({ type: 'orderBy', args }); return query; },
        addOrderBy: (...args) => { events.push({ type: 'addOrderBy', args }); return query; },
        getRawMany: () => store.products(),
        getRawOne: () => store.product(id)
      };
      return { target: target, manager: { transaction: operation => dataSource.transaction(operation) }, createQueryBuilder: () => query };
    }
    throw new Error('Entidade não prevista no DataSource de teste');
  }
  const dataSource = {
    isInitialized: true,
    events, writes,
    getRepository: target => {
      if (!repositories.has(target)) repositories.set(target, getRepository(target, 'global'));
      return repositories.get(target);
    },
    transaction: async operation => {
      events.push({ type: 'BEGIN' });
      try {
        const result = await operation({ getRepository: target => getRepository(target, 'transaction') });
        events.push({ type: 'COMMIT' });
        return result;
      } catch (error) {
        events.push({ type: 'ROLLBACK' });
        throw error;
      } finally {
        events.push({ type: 'RELEASE' });
      }
    }
  };
  return dataSource;
}
