import { DEFAULT_ANALYSIS_PARAMETERS } from '../analysis-constants'

describe('Analysis Constants', () => {
  describe('DEFAULT_ANALYSIS_PARAMETERS', () => {
    it('should be defined and be an object', () => {
      expect(DEFAULT_ANALYSIS_PARAMETERS).toBeDefined()
      expect(typeof DEFAULT_ANALYSIS_PARAMETERS).toBe('object')
      expect(DEFAULT_ANALYSIS_PARAMETERS).not.toBeNull()
    })

    it('should contain parameter objects with required properties', () => {
      const paramKeys = Object.keys(DEFAULT_ANALYSIS_PARAMETERS)
      expect(paramKeys.length).toBeGreaterThan(0)
      
      paramKeys.forEach(key => {
        const param = DEFAULT_ANALYSIS_PARAMETERS[key as keyof typeof DEFAULT_ANALYSIS_PARAMETERS]
        expect(param).toHaveProperty('id')
        expect(param).toHaveProperty('name')
        expect(param).toHaveProperty('description')
        expect(param).toHaveProperty('prompt')
        expect(param).toHaveProperty('enabled')
        
        expect(typeof param.id).toBe('string')
        expect(typeof param.name).toBe('string')
        expect(typeof param.description).toBe('string')
        expect(typeof param.prompt).toBe('string')
        expect(typeof param.enabled).toBe('boolean')
        
        expect(param.id).toBeTruthy()
        expect(param.name).toBeTruthy()
        expect(param.description).toBeTruthy()
        expect(param.prompt).toBeTruthy()
      })
    })

    it('should include common analysis parameters', () => {
      const paramKeys = Object.keys(DEFAULT_ANALYSIS_PARAMETERS)
      
      // Should include some basic analysis types
      expect(paramKeys).toContain('call_objective')
      expect(paramKeys).toContain('rapport_building')
    })

    it('should have consistent id and key naming', () => {
      const paramKeys = Object.keys(DEFAULT_ANALYSIS_PARAMETERS)
      
      paramKeys.forEach(key => {
        const param = DEFAULT_ANALYSIS_PARAMETERS[key as keyof typeof DEFAULT_ANALYSIS_PARAMETERS]
        expect(param.id).toBe(key)
      })
    })

    it('should have meaningful descriptions', () => {
      const paramKeys = Object.keys(DEFAULT_ANALYSIS_PARAMETERS)
      
      paramKeys.forEach(key => {
        const param = DEFAULT_ANALYSIS_PARAMETERS[key as keyof typeof DEFAULT_ANALYSIS_PARAMETERS]
        expect(param.description.length).toBeGreaterThan(10)
        expect(param.prompt.length).toBeGreaterThan(50)
      })
    })
  })
})
