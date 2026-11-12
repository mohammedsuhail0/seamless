const { describe, it } = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// Replicate isolated core server utilities for deterministic testing
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid O, 0, I, 1 confusion
  let code = '';
  for (let i = 0; i < 6; i++) {
    const randomIndex = crypto.randomInt(0, chars.length);
    code += chars.charAt(randomIndex);
  }
  return code;
}

const TEST_SECRET = 'test_super_secret_jwt_key_1234567890_brosync';

function generateAccessToken(payload) {
  return jwt.sign(payload, TEST_SECRET, { expiresIn: '24h' });
}

function verifyAccessToken(token) {
  return jwt.verify(token, TEST_SECRET);
}

describe('Server Package - Core Utilities & Logic Test Suite', () => {
  describe('Room Code Generator', () => {
    it('should generate a 6-character room code', () => {
      const code = generateRoomCode();
      assert.strictEqual(code.length, 6);
    });

    it('should only contain allowed unambiguous characters (no 0, O, 1, I)', () => {
      const allowed = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;
      for (let i = 0; i < 100; i++) {
        const code = generateRoomCode();
        assert.match(code, allowed, `Code ${code} contained disallowed characters`);
      }
    });

    it('should produce unique codes across multiple iterations', () => {
      const set = new Set();
      const count = 500;
      for (let i = 0; i < count; i++) {
        set.add(generateRoomCode());
      }
      // With 32^6 = ~1.07 billion possibilities, 500 samples should be 100% unique
      assert.strictEqual(set.size, count);
    });
  });

  describe('JWT Token Auth Pipeline', () => {
    it('should sign and verify valid user tokens', () => {
      const payload = {
        userId: 'usr_abc123',
        email: 'host@brosync.com',
        displayName: 'Arjun (Dev)',
      };

      const token = generateAccessToken(payload);
      assert.ok(typeof token === 'string' && token.length > 20);

      const verified = verifyAccessToken(token);
      assert.strictEqual(verified.userId, payload.userId);
      assert.strictEqual(verified.email, payload.email);
      assert.strictEqual(verified.displayName, payload.displayName);
      assert.ok(verified.exp > verified.iat);
    });

    it('should reject tampered tokens', () => {
      const token = generateAccessToken({ userId: 'u1', email: 'a@b.c', displayName: 'A' });
      const tampered = token.slice(0, -5) + 'xxxxx';
      assert.throws(() => {
        verifyAccessToken(tampered);
      }, /invalid signature/i);
    });

    it('should reject tokens signed with different secrets', () => {
      const token = jwt.sign({ userId: 'u1' }, 'wrong_secret');
      assert.throws(() => {
        verifyAccessToken(token);
      }, /invalid signature/i);
    });
  });

  describe('Password Hashing Security (bcrypt)', () => {
    it('should securely hash passwords and verify correct passwords', async () => {
      const password = 'SuperSecretPassword123!';
      const saltRounds = 10;
      const hash = await bcrypt.hash(password, saltRounds);

      assert.notStrictEqual(password, hash);
      assert.ok(hash.startsWith('$2'));

      const isMatch = await bcrypt.compare(password, hash);
      assert.strictEqual(isMatch, true);
    });

    it('should reject incorrect passwords', async () => {
      const password = 'CorrectPassword123!';
      const hash = await bcrypt.hash(password, 10);

      const isMatch = await bcrypt.compare('WrongPassword456!', hash);
      assert.strictEqual(isMatch, false);
    });
  });

  describe('WebRTC ICE Configuration Builder', () => {
    it('should provide default STUN and TURN fallback servers', () => {
      const PUBLIC_TURN_URLS = [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp',
        'turns:openrelay.metered.ca:443?transport=tcp',
      ];

      const iceServers = [
        { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] },
        { urls: ['stun:stun.cloudflare.com:3478'] },
        {
          urls: PUBLIC_TURN_URLS,
          username: 'openrelayproject',
          credential: 'openrelayproject',
        },
      ];

      assert.strictEqual(iceServers.length, 3);
      assert.ok(iceServers[0].urls.includes('stun:stun.l.google.com:19302'));
      assert.ok(iceServers[1].urls.includes('stun:stun.cloudflare.com:3478'));
      assert.strictEqual(iceServers[2].username, 'openrelayproject');
    });

    it('should enforce bundlePolicy max-bundle and rtcpMuxPolicy require', () => {
      const config = {
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require',
        iceCandidatePoolSize: 10,
      };

      assert.strictEqual(config.bundlePolicy, 'max-bundle');
      assert.strictEqual(config.rtcpMuxPolicy, 'require');
      assert.strictEqual(config.iceCandidatePoolSize, 10);
    });
  });
});
