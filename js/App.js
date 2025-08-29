import { SceneManager } from './SceneManager.js'
import { ModelLoaders } from './ModelLoaders.js'
import { ModelConverter } from './ModelConverter.js'
import { UIManager } from './UIManager.js'
import { HistoryManager } from './HistoryManager.js'

export class App {
    constructor() {
        this.canvas = null
        this.sceneManager = null
        this.modelLoaders = null
        this.modelConverter = null
        this.uiManager = null
        this.historyManager = null
        
        this.init()
    }
    
    init() {
        try {
            console.log('Starting app initialization...')
            this.setupCanvas()
            console.log('Canvas setup complete')
            this.initializeModules()
            console.log('Modules initialization complete')
            console.log('3D Model Viewer App initialized successfully')
        } catch (error) {
            console.error('Failed to initialize app:', error)
            this.handleInitializationError(error)
        }
    }
    
    setupCanvas() {
        console.log('Setting up canvas...')
        this.canvas = document.querySelector('canvas.webgl')
        if (!this.canvas) {
            throw new Error('Canvas element with class "webgl" not found')
        }
        console.log('Canvas found:', this.canvas)
        console.log('Canvas dimensions:', this.canvas.width, 'x', this.canvas.height)
        console.log('Canvas style:', this.canvas.style.cssText)
    }
    
    initializeModules() {
        // Initialize History Manager first (independent)
        this.historyManager = new HistoryManager()
        
        // Initialize Scene Manager (core Three.js functionality)
        this.sceneManager = new SceneManager(this.canvas)
        
        // Initialize Model Loaders (depends on Scene Manager)
        this.modelLoaders = new ModelLoaders(this.sceneManager)
        
        // Initialize Model Converter (depends on Model Loaders for preprocessing)
        this.modelConverter = new ModelConverter(this.modelLoaders)
        
        // Initialize UI Manager last (depends on all other modules)
        this.uiManager = new UIManager(
            this.sceneManager,
            this.modelLoaders,
            this.modelConverter,
            this.historyManager
        )
        
        // Set up cross-module dependencies
        this.setupModuleDependencies()
    }
    
    /**
     * Sets up dependencies between modules
     */
    setupModuleDependencies() {
        // Set up history manager references in other modules
        this.sceneManager.setHistoryManager(this.historyManager)
        this.modelLoaders.setHistoryManager(this.historyManager)
        
        // Set up UI manager reference in model loaders for UI updates
        this.modelLoaders.setUIManager(this.uiManager)
        
        console.log('Module dependencies configured')
    }
    
    handleInitializationError(error) {
        const errorMessage = `Failed to initialize the 3D Model Viewer: ${error.message}`
        console.error(errorMessage)
        
        // Try to show error to user
        const body = document.body
        if (body) {
            const errorDiv = document.createElement('div')
            errorDiv.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: #ff4444;
                color: white;
                padding: 20px;
                border-radius: 5px;
                font-family: Arial, sans-serif;
                text-align: center;
                z-index: 9999;
            `
            errorDiv.innerHTML = `
                <h3>Application Error</h3>
                <p>${errorMessage}</p>
                <p>Please refresh the page or check the console for more details.</p>
            `
            body.appendChild(errorDiv)
        }
    }
    
    // Public API methods for external access if needed
    getSceneManager() {
        return this.sceneManager
    }
    
    getModelLoaders() {
        return this.modelLoaders
    }
    
    getModelConverter() {
        return this.modelConverter
    }
    
    getUIManager() {
        return this.uiManager
    }
    
    getHistoryManager() {
        return this.historyManager
    }
    
    // Method to load a model programmatically
    async loadModel(file) {
        if (!this.modelLoaders) {
            throw new Error('Model loaders not initialized')
        }
        
        try {
            const result = await this.modelLoaders.loadModelFile(file)
            return result
        } catch (error) {
            console.error('Error loading model:', error)
            throw error
        }
    }
    
    // Method to clear all models
    clearModels() {
        if (this.sceneManager) {
            this.sceneManager.clearModels()
        }
        if (this.uiManager) {
            this.uiManager.handleClearModels()
        }
    }
    
    // Method to export all models
    async exportModel(format) {
        const allModels = this.sceneManager?.getAllModelsAsGroup()
        if (!allModels) {
            throw new Error('No models loaded to export')
        }
        
        if (!this.modelConverter) {
            throw new Error('Model converter not initialized')
        }
        
        try {
            // Use the UI manager's export flow which includes modal and progress tracking
            if (this.uiManager && this.uiManager.modalManager) {
                this.uiManager.modalManager.showExportModal(format)
                
                const progressCallback = (message) => {
                    this.uiManager.modalManager.updateProgress(message)
                }
                
                const result = await this.modelConverter.exportModel(allModels, format, progressCallback)
                this.uiManager.modalManager.showExportSuccess(format, result.filename)
                return result
            } else {
                // Fallback to direct export without UI
                return await this.modelConverter.exportModel(allModels, format)
            }
        } catch (error) {
            console.error('Error exporting models:', error)
            
            if (this.uiManager && this.uiManager.modalManager) {
                const errorMessage = error.message || 'Unknown export error'
                const errorParts = errorMessage.split('\nHint:')
                const mainError = errorParts[0]
                const hint = errorParts[1] ? `Hint: ${errorParts[1]}` : ''
                this.uiManager.modalManager.showExportError(mainError, hint)
            }
            
            throw error
        }
    }
    
    // Method to get application status
    getStatus() {
        return {
            initialized: !!(this.sceneManager && this.modelLoaders && this.modelConverter && this.uiManager),
            hasModel: !!this.uiManager?.getCurrentModel(),
            currentFileType: this.uiManager?.getCurrentFileType(),
            modelsCount: this.sceneManager?.getModels().length || 0
        }
    }
}