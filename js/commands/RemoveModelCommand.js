import { Command } from './Command.js'

/**
 * Command for handling model removal operations
 * Supports undo by re-adding the removed model and redo by removing it again
 */
export class RemoveModelCommand extends Command {
    /**
     * Creates a remove model command
     * @param {SceneManager} sceneManager - Reference to the scene manager
     * @param {UIManager} uiManager - Reference to the UI manager
     * @param {number} modelIndex - Index of the model to remove
     * @param {THREE.Object3D} model - The model object to remove
     * @param {object} metadata - Metadata associated with the model
     */
    constructor(sceneManager, uiManager, modelIndex, model, metadata) {
        const filename = metadata.filename || 'Unknown Model'
        super('RemoveModelCommand', `Remove model: ${filename}`)
        
        this.sceneManager = sceneManager
        this.uiManager = uiManager
        this.originalIndex = modelIndex
        this.model = model
        this.metadata = { ...metadata } // Copy metadata to avoid external modifications
        
        // Store the model's current transform state for restoration
        this.modelPosition = model.position.clone()
        this.modelRotation = model.rotation.clone()
        this.modelScale = model.scale.clone()
        
        console.log(`Created RemoveModelCommand for model: ${filename} at index ${modelIndex}`)
    }
    
    /**
     * Executes the remove command (removes model from scene and updates UI)
     */
    execute() {
        try {
            // Find current index of the model (it might have changed)
            const models = this.sceneManager.getModels()
            const currentIndex = models.indexOf(this.model)
            
            if (currentIndex !== -1) {
                // Use UIManager's performModelRemoval to ensure UI is updated
                if (this.uiManager && this.uiManager.performModelRemoval) {
                    this.uiManager.performModelRemoval(currentIndex)
                    console.log(`Removed model with UI update: ${this.metadata.filename} from index ${currentIndex}`)
                } else {
                    // Fallback to direct scene removal if UI manager not available
                    const success = this.sceneManager.removeModel(currentIndex)
                    if (success) {
                        console.log(`Removed model (no UI update): ${this.metadata.filename} from index ${currentIndex}`)
                    } else {
                        console.warn(`Failed to remove model: ${this.metadata.filename}`)
                    }
                }
            } else {
                console.warn(`Model not found in scene: ${this.metadata.filename}`)
            }
            
        } catch (error) {
            console.error('Error executing RemoveModelCommand:', error)
            throw error
        }
    }
    
    /**
     * Undoes the remove command (re-adds model to scene and updates UI)
     */
    undo() {
        try {
            // Restore the model's transform state
            this.model.position.copy(this.modelPosition)
            this.model.rotation.copy(this.modelRotation)
            this.model.scale.copy(this.modelScale)
            
            // Add the model back to the scene
            this.sceneManager.addModel(this.model, this.metadata)
            
            // Update the UI to reflect the model restoration
            if (this.uiManager && this.uiManager.updateModelTree) {
                this.uiManager.updateModelTree()
                
                // Update button states
                if (this.uiManager.updateTranslateButtonState) this.uiManager.updateTranslateButtonState()
                if (this.uiManager.updateRotateButtonState) this.uiManager.updateRotateButtonState()
                if (this.uiManager.updateScaleButtonState) this.uiManager.updateScaleButtonState()
                
                console.log(`Re-added model with UI update: ${this.metadata.filename}`)
            } else {
                console.log(`Re-added model (no UI update): ${this.metadata.filename}`)
            }
            
        } catch (error) {
            console.error('Error undoing RemoveModelCommand:', error)
            throw error
        }
    }
    
    /**
     * Remove commands cannot be merged
     * @returns {boolean} - Always false
     */
    canMergeWith(otherCommand) {
        return false
    }
    
    /**
     * Serializes the command to JSON
     * Note: The actual model object cannot be serialized, so this command
     * may not survive browser refresh
     * @returns {object} - JSON representation
     */
    toJSON() {
        const baseJSON = super.toJSON()
        return {
            ...baseJSON,
            originalIndex: this.originalIndex,
            metadata: this.metadata,
            modelPosition: {
                x: this.modelPosition.x,
                y: this.modelPosition.y,
                z: this.modelPosition.z
            },
            modelRotation: {
                x: this.modelRotation.x,
                y: this.modelRotation.y,
                z: this.modelRotation.z
            },
            modelScale: {
                x: this.modelScale.x,
                y: this.modelScale.y,
                z: this.modelScale.z
            }
        }
    }
    
    /**
     * Deserializes the command from JSON
     * Note: This cannot fully restore the model object
     * @param {object} json - JSON representation to restore from
     */
    fromJSON(json) {
        super.fromJSON(json)
        this.originalIndex = json.originalIndex
        this.metadata = json.metadata
        
        // Note: The actual model object cannot be restored from JSON
        // This command may not be fully functional after deserialization
        console.warn('RemoveModelCommand restored from JSON - model object not available')
    }
}
