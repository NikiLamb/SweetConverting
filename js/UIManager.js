export class UIManager {
    constructor(sceneManager, modelLoaders, modelConverter) {
        this.sceneManager = sceneManager
        this.modelLoaders = modelLoaders
        this.modelConverter = modelConverter
        
        // Current state
        this.currentLoadedFileType = null
        this.currentModel = null
        
        // Selection state for model tree
        this.selectedModelIndices = new Set()
        
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
        
        // Model tree UI elements
        this.elements.modelTreeContainer = document.getElementById('model-tree-container')
        this.elements.modelTreeContent = document.getElementById('model-tree-content')
        
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
        
        // Global event listeners for model tree selection
        this.setupModelTreeEventListeners()
        
        console.log('Event listeners set up successfully')
    }
    
    setupModelTreeEventListeners() {
        // Handle ESC key to unselect all models
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                this.unselectAllModels()
            }
        })
        
        // Handle clicks outside the model tree to unselect all models
        document.addEventListener('click', (event) => {
            // Check if the click is outside the model tree container
            if (this.elements.modelTreeContainer && 
                !this.elements.modelTreeContainer.contains(event.target)) {
                this.unselectAllModels()
            }
        })
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
                
                // Update the model tree
                this.updateModelTree()
                
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
        
        // Update the model tree
        this.updateModelTree()
        
        console.log(`${fileType.toUpperCase()} Model loaded successfully`)
    }
    
    handleClearModels() {
        this.sceneManager.clearModels()
        this.modelLoaders.resetLoadedModelsCount()  // Reset position counter
        this.currentModel = null
        this.currentLoadedFileType = null
        this.hideConversionSection()
        
        // Update the model tree (will hide it since no models)
        this.updateModelTree()
        
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
    
    updateModelTree() {
        const models = this.sceneManager.getModels()
        const metadata = this.sceneManager.getModelMetadata()
        
        if (!this.elements.modelTreeContainer || !this.elements.modelTreeContent) {
            return
        }
        
        // Show/hide the model tree based on whether models are loaded
        if (models.length === 0) {
            this.elements.modelTreeContainer.style.display = 'none'
            this.selectedModelIndices.clear()
            return
        }
        
        this.elements.modelTreeContainer.style.display = 'block'
        
        // Clear existing content
        this.elements.modelTreeContent.innerHTML = ''
        
        // Add each model to the tree
        metadata.forEach((meta, index) => {
            const item = document.createElement('div')
            item.className = 'model-tree-item'
            item.setAttribute('data-index', index)
            
            // Add selected class if this item is selected
            if (this.selectedModelIndices.has(index)) {
                item.classList.add('selected')
            }
            
            // Extract filename without extension
            const filename = meta.filename || 'Unnamed Model'
            const nameWithoutExtension = filename.substring(0, filename.lastIndexOf('.')) || filename
            
            // Create model name element
            const nameElement = document.createElement('div')
            nameElement.className = 'model-name'
            nameElement.textContent = nameWithoutExtension
            
            // Create delete button with trash icon
            const deleteButton = document.createElement('button')
            deleteButton.className = 'delete-button'
            deleteButton.setAttribute('data-index', index)
            deleteButton.innerHTML = `
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6M14 11v6" 
                          stroke="#818181" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `
            deleteButton.addEventListener('click', (event) => {
                event.stopPropagation() // Prevent item selection when deleting
                this.handleRemoveModel(index)
            })
            
            // Create file type tag
            const tagElement = document.createElement('div')
            tagElement.className = `file-type-tag ${meta.fileType.toLowerCase()}`
            tagElement.textContent = meta.fileType
            
            // Add click handler for item selection
            item.addEventListener('click', (event) => {
                event.stopPropagation() // Prevent global click handler from running
                this.handleModelItemClick(index, event.ctrlKey || event.metaKey)
            })
            
            item.appendChild(nameElement)
            item.appendChild(deleteButton)
            item.appendChild(tagElement)
            
            this.elements.modelTreeContent.appendChild(item)
        })
    }
    
    handleModelItemClick(index, isMultiSelect) {
        if (isMultiSelect) {
            // Toggle selection for this item when Ctrl/Cmd is held
            if (this.selectedModelIndices.has(index)) {
                this.selectedModelIndices.delete(index)
            } else {
                this.selectedModelIndices.add(index)
            }
        } else {
            // Single selection - clear others and select this one
            this.selectedModelIndices.clear()
            this.selectedModelIndices.add(index)
        }
        
        this.updateModelTreeSelection()
    }
    
    updateModelTreeSelection() {
        if (!this.elements.modelTreeContent) return
        
        // Update visual selection state for all items
        const items = this.elements.modelTreeContent.querySelectorAll('.model-tree-item')
        items.forEach(item => {
            const index = parseInt(item.getAttribute('data-index'))
            if (this.selectedModelIndices.has(index)) {
                item.classList.add('selected')
            } else {
                item.classList.remove('selected')
            }
        })
    }
    
    unselectAllModels() {
        if (this.selectedModelIndices.size === 0) return
        
        this.selectedModelIndices.clear()
        this.updateModelTreeSelection()
        console.log('All models unselected')
    }
    
    handleRemoveModel(index) {
        // Remove the model from the scene
        const removed = this.sceneManager.removeModel(index)
        
        if (removed) {
            // Update selection state - remove the deleted model and adjust indices
            const newSelectedIndices = new Set()
            for (const selectedIndex of this.selectedModelIndices) {
                if (selectedIndex < index) {
                    // Indices before the removed model stay the same
                    newSelectedIndices.add(selectedIndex)
                } else if (selectedIndex > index) {
                    // Indices after the removed model need to be decremented
                    newSelectedIndices.add(selectedIndex - 1)
                }
                // Skip the removed model (selectedIndex === index)
            }
            this.selectedModelIndices = newSelectedIndices
            
            // Update the model tree
            this.updateModelTree()
            
            // Update conversion section visibility
            const models = this.sceneManager.getModels()
            if (models.length === 0) {
                this.hideConversionSection()
                this.currentLoadedFileType = null
                this.currentModel = null
            }
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