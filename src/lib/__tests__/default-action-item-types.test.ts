import { DEFAULT_ACTION_ITEM_TYPES } from '../default-action-item-types';

describe('default-action-item-types', () => {
  describe('DEFAULT_ACTION_ITEM_TYPES', () => {
    it('should export an array of action item types', () => {
      expect(Array.isArray(DEFAULT_ACTION_ITEM_TYPES)).toBe(true);
      expect(DEFAULT_ACTION_ITEM_TYPES.length).toBeGreaterThan(0);
    });

    it('should have valid structure for each action item type', () => {
      DEFAULT_ACTION_ITEM_TYPES.forEach((type, index) => {
        expect(type).toHaveProperty('name');
        expect(type).toHaveProperty('description');
        expect(type).toHaveProperty('prompt');
        expect(type).toHaveProperty('enabled');
        expect(type).toHaveProperty('color');
        expect(type).toHaveProperty('icon');

        expect(typeof type.name).toBe('string');
        expect(typeof type.description).toBe('string');
        expect(typeof type.prompt).toBe('string');
        expect(typeof type.enabled).toBe('boolean');
        expect(typeof type.color).toBe('string');
        expect(typeof type.icon).toBe('string');

        expect(type.name.length).toBeGreaterThan(0);
        expect(type.description.length).toBeGreaterThan(0);
        expect(type.prompt.length).toBeGreaterThan(0);

        // Color should be a valid hex color
        expect(type.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });

    it('should have expected default types', () => {
      const typeNames = DEFAULT_ACTION_ITEM_TYPES.map(type => type.name);
      expect(typeNames).toContain('Follow-up Call');
      expect(typeNames).toContain('Send Documentation');
      expect(typeNames).toContain('Product Demo');
    });

    it('should have all types enabled by default', () => {
      DEFAULT_ACTION_ITEM_TYPES.forEach(type => {
        expect(type.enabled).toBe(true);
      });
    });

    it('should have unique names', () => {
      const names = DEFAULT_ACTION_ITEM_TYPES.map(type => type.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });

    it('should have Follow-up Call with expected properties', () => {
      const followUpCall = DEFAULT_ACTION_ITEM_TYPES.find(type => type.name === 'Follow-up Call');
      expect(followUpCall).toBeDefined();
      expect(followUpCall?.description).toContain('follow-up calls');
      expect(followUpCall?.color).toBe('#3B82F6');
      expect(followUpCall?.icon).toBe('Phone');
      expect(followUpCall?.prompt).toContain('follow-up calls');
    });

    it('should have Send Documentation with expected properties', () => {
      const sendDoc = DEFAULT_ACTION_ITEM_TYPES.find(type => type.name === 'Send Documentation');
      expect(sendDoc).toBeDefined();
      expect(sendDoc?.description).toContain('documents');
      expect(sendDoc?.color).toBe('#10B981');
      expect(sendDoc?.icon).toBe('FileText');
      expect(sendDoc?.prompt).toContain('documents');
    });

    it('should have Product Demo with expected properties', () => {
      const productDemo = DEFAULT_ACTION_ITEM_TYPES.find(type => type.name === 'Product Demo');
      expect(productDemo).toBeDefined();
      expect(productDemo?.description).toContain('demonstrations');
      expect(productDemo?.color).toBe('#8B5CF6');
      expect(productDemo?.icon).toBe('Monitor');
      expect(productDemo?.prompt).toContain('demo');
    });
  });
});
