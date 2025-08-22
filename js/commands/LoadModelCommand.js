import { Command } from './Command.js'

/**
 * Command for handling model loading operations
 * Supports undo by removing the loaded model and redo by re-adding it
 */
export class LoadModelCommand extends Command {
    /**
     * Creates a load model command
     * @param {SceneManager} sceneManager - Reference to the scene manager
     * @param {UIManager} uiManager - Reference to the UI manager
     * @param {THREE.Object3D} model - The loaded model object
     * @param {object} metadata - Metadata associated with the model
     * @param {number} modelIndex - Index where the model was added
     */
    constructor(sceneManager, uiManager, model, metadata, modelIndex) {
        const filename = metadata.filename || 'Unknown Model'
        super('LoadModelCommand', `Load model: ${filename}`)
        
        this.sceneManager = sceneManager
        this.uiManager = uiManager
        this.model = model
        this.metadata = { ...metadata } // Copy metadata to avoid external modifications
        this.modelIndex = modelIndex
        
        // Store the model's initial state for restoration
        this.initialPosition = model.position.clone()
        this.initialRotation = model.rotation.clone()
        this.initialScale = model.scale.clone()
        
        console.log(`Created LoadModelCommand for model: ${filename} at index ${modelIndex}`)
    }
    
    /**
     * Executes the load command (adds model to scene and updates UI)
     * This is called for redo operations
     */
    execute() {
        try {
            // Restore the model's transform state
            this.model.position.copy(this.initialPosition)
            this.model.rotation.copy(this.initialRotation)
            this.model.scale.copy(this.initialScale)
            
            // Add the model back to the scene at the correct index
            this.sceneManager.addModel(this.model, this.metadata)
            
            // Update the model index in case it changed
            const models = this.sceneManager.getModels()
            this.modelIndex = models.indexOf(this.model)
            
            // Update the UI to reflect the model addition
            if (this.uiManager && this.uiManager.updateModelTree) {
                this.uiManager.updateModelTree()
                
                // Update button states
                if (this.uiManager.updateTranslateButtonState) this.uiManager.updateTranslateButtonState()
                if (this.uiManager.updateRotateButtonState) this.uiManager.updateRotateButtonState()
                if (this.uiManager.updateScaleButtonState) this.uiManager.updateScaleButtonState()
                
                console.log(`Re-added model with UI update: ${this.metadata.filename} at index ${this.modelIndex}`)
            } else {
                console.log(`Re-added model (no UI update): ${this.metadata.filename} at index ${this.modelIndex}`)
            }
            
        } catch (error) {
            console.error('Error executing LoadModelCommand:', error)
            throw error
        }
    }
    
    /**
     * Undoes the load command (removes model from scene and updates UI)
     */
    undo() {
        try {
            // Find current index of the model
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
            console.error('Error undoing LoadModelCommand:', error)
            throw error
        }
    }
    
    /**
     * Load commands cannot be merged
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
            metadata: this.metadata,
            modelIndex: this.modelIndex,
            initialPosition: {
                x: this.initialPosition.x,
                y: this.initialPosition.y,
                z: this.initialPosition.z
            },
            initialRotation: {
                x: this.initialRotation.x,
                y: this.initialRotation.y,
                z: this.initialRotation.z
            },
            initialScale: {
                x: this.initialScale.x,
                y: this.initialScale.y,
                z: this.initialScale.z
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
        this.metadata = json.metadata
        this.modelIndex = json.modelIndex
        
        // Note: The actual model object cannot be restored from JSON
        // This command may not be fully functional after deserialization
        console.warn('LoadModelCommand restored from JSON - model object not available')
    }
}
