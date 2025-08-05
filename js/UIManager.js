export class UIManager {
    constructor(sceneManager, modelLoaders, modelConverter) {
        this.sceneManager = sceneManager
        this.modelLoaders = modelLoaders
        this.modelConverter = modelConverter
        
        // Current state
        this.currentLoadedFileType = null
        this.currentModel = null
        
        // UI Elements
        this.elements = {}
        
        this.initializeUI()
    }
    
    initializeUI() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupUI())
        } else {
            this.setupUI()
        }
    }
    
    setupUI() {
        this.findUIElements()
        this.setupEventListeners()
        this.setupViewerContainer()
    }
    
    findUIElements() {
        // Main UI elements
        this.elements.modelLoadButton = document.getElementById('model-load-button')
        this.elements.modelFileInput = document.getElementById('model-file-input')
        this.elements.clearButton = document.getElementById('clear-models')
        this.elements.viewerContainer = document.getElementById('viewer-container')
        
        // Conversion UI elements
        this.elements.conversionSection = document.getElementById('conversion-section')
        this.elements.formatSelector = document.getElementById('format-selector')
        this.elements.convertButton = document.getElementById('convert-button')
        this.elements.conversionStatus = document.getElementById('conversion-status')
        
        this.validateUIElements()
    }
    
    validateUIElements() {
        const mainElements = ['modelLoadButton', 'modelFileInput', 'clearButton', 'viewerContainer']
        const conversionElements = ['conversionSection', 'formatSelector', 'convertButton', 'conversionStatus']
        
        const missingMain = mainElements.filter(key => !this.elements[key])
        const missingConversion = conversionElements.filter(key => !this.elements[key])
        
        if (missingMain.length > 0) {
            console.error('Missing main UI elements:', missingMain)
        } else {
            console.log('Main UI elements found successfully')
        }
        
        if (missingConversion.length > 0) {
            console.error('Missing conversion UI elements:', missingConversion)
        } else {
            console.log('Conversion UI elements found successfully')
        }
    }
    
    setupEventListeners() {
        // Main UI event listeners
        if (this.elements.modelLoadButton && this.elements.modelFileInput) {
            this.elements.modelLoadButton.addEventListener('click', () => {
                console.log('Load model button clicked!')
                this.elements.modelFileInput.click()
            })
            
            this.elements.modelFileInput.addEventListener('change', (event) => {
                this.handleFileLoad(event)
            })
        }
        
        if (this.elements.clearButton) {
            this.elements.clearButton.addEventListener('click', () => {
                this.handleClearModels()
            })
        }
        
        // Conversion UI event listeners
        if (this.elements.formatSelector) {
            this.elements.formatSelector.addEventListener('change', () => {
                this.handleFormatChange()
            })
        }
        
        if (this.elements.convertButton) {
            this.elements.convertButton.addEventListener('click', () => {
                this.handleConversion()
            })
        }
        
        console.log('Event listeners set up successfully')
    }
    
    setupViewerContainer() {
        if (this.elements.viewerContainer && this.sceneManager) {
            const rendererElement = this.sceneManager.getRendererElement()
            if (!this.elements.viewerContainer.contains(rendererElement)) {
                this.elements.viewerContainer.appendChild(rendererElement)
            }
        }
    }
    
    async handleFileLoad(event) {
        const files = Array.from(event.target.files)
        
        if (files.length === 0) {
            console.log('No files selected')
            return
        }
        
        console.log(`Loading ${files.length} file(s)...`)
        
        // Track loading results
        const results = {
            successful: 0,
            failed: 0,
            errors: []
        }
        
        try {
            this.showLoadingState(`Loading ${files.length} model${files.length > 1 ? 's' : ''}...`)
            
            // Load all files
            for (let i = 0; i < files.length; i++) {
                const file = files[i]
                try {
                    // Update loading message with progress
                    this.updateLoadingMessage(`Loading ${i + 1} of ${files.length}: ${file.name}`)
                    
                    console.log(`Loading file: ${file.name}`)
                    const result = await this.modelLoaders.loadModelFile(file)
                    results.successful++
                    
                    // Update state for the last loaded model
                    this.currentModel = result.model
                    this.currentLoadedFileType = result.fileType
                } catch (error) {
                    console.error(`Error loading file ${file.name}:`, error)
                    results.failed++
                    results.errors.push({
                        fileName: file.name,
                        error: error.message
                    })
                }
            }
            
            // Show results
            if (results.successful > 0) {
                this.updateConversionUI(this.currentLoadedFileType)
                
                // Recenter camera to show all loaded models
                this.sceneManager.recenterCameraOnAllModels()
                
                // Update status message
                let message = `Successfully loaded ${results.successful} model${results.successful > 1 ? 's' : ''}`
                if (results.failed > 0) {
                    message += `, ${results.failed} failed`
                }
                console.log(message)
                
                // Show errors if any
                if (results.errors.length > 0) {
                    const errorDetails = results.errors.map(e => `${e.fileName}: ${e.error}`).join('\n')
                    this.showError(`Some files failed to load:\n${errorDetails}`)
                }
            } else {
                this.showError('Failed to load any models')
            }
            
        } catch (error) {
            console.error('Error during file loading:', error)
            this.showError('An unexpected error occurred while loading files')
        } finally {
            this.hideLoadingState()
        }
        
        // Ensure viewer container has the renderer
        this.setupViewerContainer()
        
        // Reset file input to allow re-selecting the same files
        event.target.value = ''
    }
    
    handleModelLoaded(model, fileType) {
        this.currentModel = model
        this.currentLoadedFileType = fileType
        this.updateConversionUI(fileType)
        
        // Ensure viewer container has the renderer
        this.setupViewerContainer()
        
        console.log(`${fileType.toUpperCase()} Model loaded successfully`)
    }
    
    handleClearModels() {
        this.sceneManager.clearModels()
        this.modelLoaders.resetLoadedModelsCount()  // Reset position counter
        this.currentModel = null
        this.currentLoadedFileType = null
        this.hideConversionSection()
        
        console.log("Models cleared")
    }
    
    handleFormatChange() {
        if (this.elements.convertButton && this.elements.formatSelector) {
            this.elements.convertButton.disabled = !this.elements.formatSelector.value
        }
    }
    
    async handleConversion() {
        const selectedFormat = this.elements.formatSelector.value
        if (!selectedFormat) return
        
        // Get all models from the scene for export
        const allModels = this.sceneManager.getAllModelsAsGroup()
        if (!allModels) {
            this.updateConversionStatus('No models to export!')
            setTimeout(() => this.updateConversionStatus(''), 3000)
            return
        }
        
        this.elements.convertButton.disabled = true
        const modelCount = this.sceneManager.getModels().length
        const statusPrefix = modelCount > 1 ? `Converting ${modelCount} models...` : 'Converting...'
        this.updateConversionStatus(statusPrefix)
        
        try {
            await this.modelConverter.exportModel(allModels, selectedFormat)
            const successMessage = modelCount > 1 ? `All ${modelCount} models exported successfully!` : 'Conversion completed!'
            this.updateConversionStatus(successMessage)
            setTimeout(() => {
                // Reset to show model count if multiple models
                if (modelCount > 1) {
                    this.updateConversionStatus(`${modelCount} models loaded - all will be exported together`)
                } else {
                    this.updateConversionStatus('')
                }
            }, 3000)
        } catch (error) {
            console.error('Export error:', error)
            this.updateConversionStatus('Export failed!')
            setTimeout(() => {
                // Reset to show model count if multiple models
                if (modelCount > 1) {
                    this.updateConversionStatus(`${modelCount} models loaded - all will be exported together`)
                } else {
                    this.updateConversionStatus('')
                }
            }, 3000)
        } finally {
            this.elements.convertButton.disabled = false
        }
    }
    
    updateConversionUI(fileType) {
        if (!this.elements.formatSelector || !this.elements.conversionSection) {
            console.error('Conversion UI elements not available')
            return
        }
        
        // Clear existing options
        this.elements.formatSelector.innerHTML = '<option value="">Select format...</option>'
        
        // Get supported formats for this file type
        const supportedFormats = this.modelConverter.getSupportedFormats(fileType)
        
        if (supportedFormats.length > 0) {
            supportedFormats.forEach(format => {
                const option = document.createElement('option')
                option.value = format.value
                option.textContent = format.label
                this.elements.formatSelector.appendChild(option)
            })
            this.showConversionSection()
        } else {
            this.hideConversionSection()
        }
        
        // Reset conversion UI state
        if (this.elements.convertButton) {
            this.elements.convertButton.disabled = true
        }
        this.elements.formatSelector.value = ''
        
        // Update status to show how many models are loaded
        const modelCount = this.sceneManager.getModels().length
        if (modelCount > 1) {
            this.updateConversionStatus(`${modelCount} models loaded - all will be exported together`)
        } else {
            this.updateConversionStatus('')
        }
    }
    
    showConversionSection() {
        if (this.elements.conversionSection) {
            this.elements.conversionSection.style.display = 'block'
        }
    }
    
    hideConversionSection() {
        if (this.elements.conversionSection) {
            this.elements.conversionSection.style.display = 'none'
        }
    }
    
    updateConversionStatus(message) {
        if (this.elements.conversionStatus) {
            this.elements.conversionStatus.textContent = message
        }
    }
    
    showLoadingState(message = 'Loading models...') {
        // Create loading overlay if it doesn't exist
        if (!this.loadingOverlay) {
            this.loadingOverlay = document.createElement('div')
            this.loadingOverlay.id = 'loading-overlay'
            this.loadingOverlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
            `
            
            const loadingContent = document.createElement('div')
            loadingContent.style.cssText = `
                background: #333;
                padding: 20px;
                border-radius: 8px;
                color: white;
                text-align: center;
            `
            
            this.loadingText = document.createElement('div')
            this.loadingText.style.marginBottom = '10px'
            
            const spinner = document.createElement('div')
            spinner.style.cssText = `
                border: 3px solid #f3f3f3;
                border-top: 3px solid #3498db;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                animation: spin 1s linear infinite;
                margin: 0 auto;
            `
            
            // Add CSS animation
            const style = document.createElement('style')
            style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `
            document.head.appendChild(style)
            
            loadingContent.appendChild(this.loadingText)
            loadingContent.appendChild(spinner)
            this.loadingOverlay.appendChild(loadingContent)
        }
        
        this.loadingText.textContent = message
        document.body.appendChild(this.loadingOverlay)
        console.log(message)
    }
    
    updateLoadingMessage(message) {
        if (this.loadingText) {
            this.loadingText.textContent = message
        }
        console.log(message)
    }
    
    hideLoadingState() {
        console.log('Loading complete')
        if (this.loadingOverlay && this.loadingOverlay.parentNode) {
            this.loadingOverlay.parentNode.removeChild(this.loadingOverlay)
        }
    }
    
    showError(message) {
        // You can implement error display here
        console.error(message)
        alert(message) // Simple alert for now
    }
    
    // Getter methods for accessing current state
    getCurrentModel() {
        return this.currentModel
    }
    
    getCurrentFileType() {
        return this.currentLoadedFileType
    }
}