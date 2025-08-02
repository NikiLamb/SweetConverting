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
        const file = event.target.files[0]
        if (!file) {
            console.log('No file selected')
            return
        }
        
        try {
            this.showLoadingState()
            const result = await this.modelLoaders.loadModelFile(file)
            this.handleModelLoaded(result.model, result.fileType)
        } catch (error) {
            console.error('Error loading model:', error)
            this.showError('Failed to load model: ' + error.message)
        } finally {
            this.hideLoadingState()
        }
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
    
    showLoadingState() {
        // You can implement loading indicators here
        console.log('Loading model...')
    }
    
    hideLoadingState() {
        // You can implement hiding loading indicators here
        console.log('Loading complete')
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