export class UIManager {
    constructor(sceneManager, modelLoaders, modelConverter) {
        this.sceneManager = sceneManager
        this.modelLoaders = modelLoaders
        this.modelConverter = modelConverter
        
        // Current state
        this.currentLoadedFileType = null
        this.currentModel = null
        this.isProcessing = false // Add processing flag
        
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
        
        // Loading overlay elements
        this.elements.loadingOverlay = document.getElementById('loading-overlay')
        this.elements.loadingStatusText = document.getElementById('loading-status-text')
        
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
                if (this.isProcessing) return // Prevent action if processing
                console.log('Load model button clicked!')
                this.elements.modelFileInput.click()
            })
            
            this.elements.modelFileInput.addEventListener('change', (event) => {
                if (this.isProcessing) return // Prevent action if processing
                this.handleFileLoad(event)
            })
        }
        
        if (this.elements.clearButton) {
            this.elements.clearButton.addEventListener('click', () => {
                if (this.isProcessing) return // Prevent action if processing
                this.handleClearModels()
            })
        }
        
        // Conversion UI event listeners
        if (this.elements.formatSelector) {
            this.elements.formatSelector.addEventListener('change', () => {
                if (this.isProcessing) return // Prevent action if processing
                this.handleFormatChange()
            })
        }
        
        if (this.elements.convertButton) {
            this.elements.convertButton.addEventListener('click', () => {
                if (this.isProcessing) return // Prevent action if processing
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
        
        // Check if already processing
        if (this.isProcessing) {
            console.log('Already processing, ignoring file load request')
            return
        }
        
        try {
            this.showLoadingState('Loading file...')
            const result = await this.modelLoaders.loadModelFile(file, (status) => {
                this.updateLoadingStatus(status)
            })
            this.handleModelLoaded(result.model, result.fileType)
        } catch (error) {
            console.error('Error loading model:', error)
            this.showError('Failed to load model: ' + error.message)
        } finally {
            this.hideLoadingState()
            // Clear the file input to allow reloading the same file
            event.target.value = ''
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
        
        // Check if already processing
        if (this.isProcessing) return
        
        // Get all models from the scene for export
        const allModels = this.sceneManager.getAllModelsAsGroup()
        if (!allModels) {
            this.updateConversionStatus('No models to export!')
            setTimeout(() => this.updateConversionStatus(''), 3000)
            return
        }
        
        // Disable button immediately
        this.elements.convertButton.disabled = true
        const modelCount = this.sceneManager.getModels().length
        const statusPrefix = modelCount > 1 ? `Converting ${modelCount} models...` : 'Converting...'
        this.updateConversionStatus(statusPrefix)
        
        // Show loading overlay for conversion
        this.showLoadingState('Converting model to ' + selectedFormat.toUpperCase() + '...')
        
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
            this.hideLoadingState()
            // Re-enable button only if format is still selected
            if (this.elements.formatSelector.value) {
                this.elements.convertButton.disabled = false
            }
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
    
    showLoadingState(statusText = 'Loading...') {
        if (this.elements.loadingOverlay) {
            this.isProcessing = true // Set processing flag
            document.body.classList.add('processing') // Add processing class to body
            
            this.elements.loadingOverlay.style.display = 'flex'
            this.updateLoadingStatus(statusText)
            
            // Disable UI elements
            this.setUIElementsEnabled(false)
        }
    }
    
    hideLoadingState() {
        if (this.elements.loadingOverlay) {
            this.isProcessing = false // Clear processing flag
            document.body.classList.remove('processing') // Remove processing class from body
            
            this.elements.loadingOverlay.style.display = 'none'
            this.updateLoadingStatus('')
            
            // Re-enable UI elements
            this.setUIElementsEnabled(true)
        }
    }
    
    updateLoadingStatus(text) {
        if (this.elements.loadingStatusText) {
            this.elements.loadingStatusText.textContent = text
        }
    }
    
    setUIElementsEnabled(enabled) {
        // Disable/enable all interactive elements
        const elementsToToggle = [
            this.elements.modelLoadButton,
            this.elements.modelFileInput,
            this.elements.clearButton,
            this.elements.formatSelector,
            this.elements.convertButton
        ]
        
        elementsToToggle.forEach(element => {
            if (element) {
                element.disabled = !enabled
                // Add additional attributes for better compatibility
                if (!enabled) {
                    element.setAttribute('aria-disabled', 'true')
                    element.style.pointerEvents = 'none'
                } else {
                    element.removeAttribute('aria-disabled')
                    element.style.pointerEvents = ''
                }
            }
        })
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