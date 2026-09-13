import { extractInviteTokenFromPayload } from '@/utils/invite-token';

describe('extractInviteTokenFromPayload', () => {
  const token = 'a'.repeat(64);

  it('parses https invite url', () => {
    expect(
      extractInviteTokenFromPayload(`https://bereach.app/invite/${token}`),
    ).toBe(token);
  });

  it('parses custom scheme', () => {
    expect(extractInviteTokenFromPayload(`bereach://invite/${token}`)).toBe(
      token,
    );
  });

  it('parses expo go path', () => {
    expect(
      extractInviteTokenFromPayload(
        `exp://192.168.0.1:8081/--/invite/${token}`,
      ),
    ).toBe(token);
  });

  it('parses bare token', () => {
    expect(extractInviteTokenFromPayload(token)).toBe(token);
  });

  it('rejects unrelated payload', () => {
    expect(extractInviteTokenFromPayload('https://example.com/foo')).toBeNull();
  });
});
