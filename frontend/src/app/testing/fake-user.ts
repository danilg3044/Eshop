import { Role, User } from '../core/models';

export function fakeUser(role: Role = 'USER', email = 'dana@example.com'): User {
  return {
    id: 1, email, role, provider: 'LOCAL', enabled: true, createdAt: '2026-01-01T00:00:00Z',
    profile: { firstName: 'Dana', lastName: 'Cohen', phone: null, addressLine: '1 Main St', city: 'Haifa', postalCode: null, country: null },
  };
}
