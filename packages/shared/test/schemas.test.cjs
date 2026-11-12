const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  registerSchema,
  loginSchema,
  roomCreateSchema,
  roomJoinSchema,
  chatMessageSchema,
  chatReactionSchema,
  QualityPreset,
  RoomStatus,
  MemberRole,
} = require('../dist/index.js');

describe('Shared Package - Enums & Schemas Test Suite', () => {
  describe('QualityPreset Enums', () => {
    it('should define correct QualityPreset values', () => {
      assert.strictEqual(QualityPreset.AUTO, 'AUTO');
      assert.strictEqual(QualityPreset.HD_720, 'HD_720');
      assert.strictEqual(QualityPreset.FHD_1080, 'FHD_1080');
    });

    it('should define correct RoomStatus values', () => {
      assert.strictEqual(RoomStatus.WAITING, 'WAITING');
      assert.strictEqual(RoomStatus.ACTIVE, 'ACTIVE');
      assert.strictEqual(RoomStatus.CLOSED, 'CLOSED');
    });

    it('should define correct MemberRole values', () => {
      assert.strictEqual(MemberRole.HOST, 'HOST');
      assert.strictEqual(MemberRole.VIEWER, 'VIEWER');
      assert.strictEqual(MemberRole.GUEST, 'GUEST');
    });
  });

  describe('roomCreateSchema validation', () => {
    it('should accept High Definition preset (FHD_1080)', () => {
      const result = roomCreateSchema.safeParse({
        name: 'Movie Night High Def',
        isPrivate: false,
        qualityPreset: QualityPreset.FHD_1080,
      });
      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data.qualityPreset, 'FHD_1080');
      }
    });

    it('should accept Balanced preset (HD_720)', () => {
      const result = roomCreateSchema.safeParse({
        name: 'Gaming Session Balanced',
        isPrivate: true,
        qualityPreset: QualityPreset.HD_720,
      });
      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data.qualityPreset, 'HD_720');
      }
    });

    it('should accept AUTO preset and default to AUTO if omitted', () => {
      const result = roomCreateSchema.safeParse({
        name: 'Auto Room',
      });
      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data.qualityPreset, 'AUTO');
        assert.strictEqual(result.data.isPrivate, false);
      }
    });

    it('should reject invalid qualityPreset strings (like "HIGH")', () => {
      const result = roomCreateSchema.safeParse({
        name: 'Invalid Room',
        qualityPreset: 'HIGH',
      });
      assert.strictEqual(result.success, false);
    });

    it('should reject empty room names', () => {
      const result = roomCreateSchema.safeParse({
        name: '',
      });
      assert.strictEqual(result.success, false);
    });
  });

  describe('registerSchema validation', () => {
    it('should accept valid user registration', () => {
      const result = registerSchema.safeParse({
        email: 'testuser@brosync.com',
        displayName: 'TestUser',
        password: 'Password123!',
      });
      assert.strictEqual(result.success, true);
    });

    it('should reject password without uppercase letter', () => {
      const result = registerSchema.safeParse({
        email: 'testuser@brosync.com',
        displayName: 'TestUser',
        password: 'password123',
      });
      assert.strictEqual(result.success, false);
    });

    it('should reject password without numbers', () => {
      const result = registerSchema.safeParse({
        email: 'testuser@brosync.com',
        displayName: 'TestUser',
        password: 'PasswordNoNumber',
      });
      assert.strictEqual(result.success, false);
    });

    it('should reject passwords shorter than 8 characters', () => {
      const result = registerSchema.safeParse({
        email: 'testuser@brosync.com',
        displayName: 'TestUser',
        password: 'Pass1',
      });
      assert.strictEqual(result.success, false);
    });
  });

  describe('roomJoinSchema validation', () => {
    it('should accept 6-character room codes and transform to uppercase', () => {
      const result = roomJoinSchema.safeParse({
        roomCode: 'abc123',
        displayName: 'Viewer1',
      });
      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data.roomCode, 'ABC123');
      }
    });

    it('should reject room codes that are not 6 characters', () => {
      const tooShort = roomJoinSchema.safeParse({
        roomCode: 'AB12',
        displayName: 'Viewer1',
      });
      assert.strictEqual(tooShort.success, false);

      const tooLong = roomJoinSchema.safeParse({
        roomCode: 'ABC1234',
        displayName: 'Viewer1',
      });
      assert.strictEqual(tooLong.success, false);
    });
  });

  describe('chatReactionSchema validation', () => {
    it('should accept valid emojis', () => {
      const validEmojis = ['👍', '😂', '🔥', '❤️', '😮'];
      for (const emoji of validEmojis) {
        const result = chatReactionSchema.safeParse({
          roomId: 'clh81h1x600003b6w5qjv2q7x',
          emoji,
        });
        assert.strictEqual(result.success, true);
      }
    });

    it('should reject invalid emojis', () => {
      const result = chatReactionSchema.safeParse({
        roomId: 'clh81h1x600003b6w5qjv2q7x',
        emoji: '💩',
      });
      assert.strictEqual(result.success, false);
    });
  });
});
