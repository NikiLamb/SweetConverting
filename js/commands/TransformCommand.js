import { Command } from './Command.js'
import * as THREE from 'three'

/**
 * Command for handling model transformations (position, rotation, scale)
 * Supports both single and multiple model operations
 */
export class TransformCommand extends Command {
    /**
     * Creates a transform command
     * @param {SceneManager} sceneManager - Reference to the scene manager
     * @param {Array<number>} modelIndices - Array of model indices to transform
     * @param {string} transformType - Type of transform ('position', 'rotation', 'scale')
     * @param {Array<object>} oldValues - Array of old transform values {x, y, z}
     * @param {Array<object>} newValues - Array of new transform values {x, y, z}
     * @param {string} [description] - Optional custom description
     */
    constructor(sceneManager, modelIndices, transformType, oldValues, newValues, description = null) {
        const modelCount = modelIndices.length
        const modelText = modelCount === 1 ? 'model' : `${modelCount} models`
        const defaultDescription = description || `Transform ${transformType} of ${modelText}`
        
        super('TransformCommand', defaultDescription)
        
        this.sceneManager = sceneManager
        this.modelIndices = [...modelIndices] // Copy to avoid external modifications
        this.transformType = transformType
        this.oldValues = this.deepCopyValues(oldValues)
        this.newValues = this.deepCopyValues(newValues)
        
        // Validate inputs
        this.validateInputs()
        
        console.log(`Created TransformCommand: ${this.transformType} for models [${this.modelIndices.join(', ')}]`)
    }
    
    /**
     * Validates the command inputs
     */
    validateInputs() {
        if (!this.sceneManager) {
            throw new Error('TransformCommand: sceneManager is required')
        }
        
        if (!Array.isArray(this.modelIndices) || this.modelIndices.length === 0) {
            throw new Error('TransformCommand: modelIndices must be a non-empty array')
        }
        
        if (!['position', 'rotation', 'scale'].includes(this.transformType)) {
            throw new Error(`TransformCommand: invalid transformType "${this.transformType}"`)
        }
        
        if (this.oldValues.length !== this.modelIndices.length) {
            throw new Error('TransformCommand: oldValues length must match modelIndices length')
        }
        
        if (this.newValues.length !== this.modelIndices.length) {
            throw new Error('TransformCommand: newValues length must match modelIndices length')
        }
        
        // Validate that all values have x, y, z properties
        [...this.oldValues, ...this.newValues].forEach((value, index) => {
            if (!value || typeof value.x !== 'number' || typeof value.y !== 'number' || typeof value.z !== 'number') {
                throw new Error(`TransformCommand: invalid value at index ${index}, must have numeric x, y, z properties`)
            }
        })
    }
    
    /**
     * Deep copies transform values to prevent external modifications
     * @param {Array<object>} values - Array of {x, y, z} objects
     * @returns {Array<object>} - Deep copied array
     */
    deepCopyValues(values) {
        return values.map(value => ({
            x: value.x,
            y: value.y,
            z: value.z
        }))
    }
    
    /**
     * Executes the transform command (applies new values)
     */
    execute() {
        this.applyTransforms(this.newValues)
        console.log(`Executed TransformCommand: ${this.name}`)
    }
    
    /**
     * Undoes the transform command (applies old values)
     */
    undo() {
        this.applyTransforms(this.oldValues)
        console.log(`Undid TransformCommand: ${this.name}`)
    }
    
    /**
     * Applies transform values to the models
     * @param {Array<object>} values - Array of {x, y, z} values to apply
     */
    applyTransforms(values) {
        this.modelIndices.forEach((modelIndex, i) => {
            const value = values[i]
            let success = false
            
            try {
                switch (this.transformType) {
                    case 'position':
                        success = this.sceneManager.setModelPosition(modelIndex, value.x, value.y, value.z)
                        break
                    case 'rotation':
                        success = this.sceneManager.setModelRotation(modelIndex, value.x, value.y, value.z)
                        break
                    case 'scale':
                        success = this.sceneManager.setModelScale(modelIndex, value.x, value.y, value.z)
                        break
                }
                
                if (!success) {
                    console.warn(`Failed to apply ${this.transformType} to model ${modelIndex}`)
                }
            } catch (error) {
                console.error(`Error applying ${this.transformType} to model ${modelIndex}:`, error)
            }
        })
    }
    
    /**
     * Checks if this command can be merged with another transform command
     * Commands can be merged if they affect the same models and transform type
     * @param {Command} otherCommand - The command to potentially merge with
     * @returns {boolean} - True if commands can be merged
     */
    canMergeWith(otherCommand) {
        if (!(otherCommand instanceof TransformCommand)) {
            return false
        }
        
        // Must be same transform type
        if (this.transformType !== otherCommand.transformType) {
            return false
        }
        
        // Must affect same models
        if (this.modelIndices.length !== otherCommand.modelIndices.length) {
            return false
        }
        
        // Check if all model indices match
        for (let i = 0; i < this.modelIndices.length; i++) {
            if (this.modelIndices[i] !== otherCommand.modelIndices[i]) {
                return false
            }
        }
        
        return true
    }
    
    /**
     * Merges this command with another transform command
     * Updates the new values while keeping the original old values
     * @param {TransformCommand} otherCommand - The command to merge with
     */
    mergeWith(otherCommand) {
        if (!this.canMergeWith(otherCommand)) {
            throw new Error('Cannot merge incompatible commands')
        }
        
        // Update new values to the other command's new values
        this.newValues = this.deepCopyValues(otherCommand.newValues)
        
        // Update timestamp and name
        this.timestamp = otherCommand.timestamp
        this.name = otherCommand.name
        
        console.log(`Merged TransformCommand: ${this.transformType} for models [${this.modelIndices.join(', ')}]`)
    }
    
    /**
     * Checks if the command represents a meaningful change
     * @param {number} tolerance - Tolerance for floating point comparison
     * @returns {boolean} - True if the change is significant
     */
    hasSignificantChange(tolerance = 0.001) {
        for (let i = 0; i < this.oldValues.length; i++) {
            const oldVal = this.oldValues[i]
            const newVal = this.newValues[i]
            
            if (Math.abs(oldVal.x - newVal.x) > tolerance ||
                Math.abs(oldVal.y - newVal.y) > tolerance ||
                Math.abs(oldVal.z - newVal.z) > tolerance) {
                return true
            }
        }
        return false
    }
    
    /**
     * Serializes the command to JSON
     * @returns {object} - JSON representation
     */
    toJSON() {
        const baseJSON = super.toJSON()
        return {
            ...baseJSON,
            modelIndices: this.modelIndices,
            transformType: this.transformType,
            oldValues: this.oldValues,
            newValues: this.newValues
        }
    }
    
    /**
     * Deserializes the command from JSON
     * @param {object} json - JSON representation to restore from
     */
    fromJSON(json) {
        super.fromJSON(json)
        this.modelIndices = json.modelIndices
        this.transformType = json.transformType
        this.oldValues = json.oldValues
        this.newValues = json.newValues
    }
    
    /**
     * Creates a TransformCommand from current model states
     * @param {SceneManager} sceneManager - Scene manager reference
     * @param {Array<number>} modelIndices - Model indices to capture
     * @param {string} transformType - Transform type to capture
     * @returns {object} - Object with current values that can be used for command creation
     */
    static captureCurrentValues(sceneManager, modelIndices, transformType) {
        const models = sceneManager.getModels()
        const values = []
        
        modelIndices.forEach(modelIndex => {
            if (modelIndex >= 0 && modelIndex < models.length) {
                const model = models[modelIndex]
                let value = { x: 0, y: 0, z: 0 }
                
                switch (transformType) {
                    case 'position':
                        value = {
                            x: model.position.x,
                            y: model.position.y,
                            z: model.position.z
                        }
                        break
                    case 'rotation':
                        value = {
                            x: model.rotation.x * 180 / Math.PI, // Convert to degrees
                            y: model.rotation.y * 180 / Math.PI,
                            z: model.rotation.z * 180 / Math.PI
                        }
                        break
                    case 'scale':
                        value = {
                            x: model.scale.x,
                            y: model.scale.y,
                            z: model.scale.z
                        }
                        break
                }
                
                values.push(value)
            }
        })
        
        return values
    }
}
