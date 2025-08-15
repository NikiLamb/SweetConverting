export class UIManager {
    constructor(sceneManager, modelLoaders, modelConverter) {
        this.sceneManager = sceneManager
        this.modelLoaders = modelLoaders
        this.modelConverter = modelConverter
        
        // Current state
        this.currentLoadedFileType = null
        this.currentModel = null
        
        // Selection state
        this.selectedModels = new Set()
        this.lastSelectedIndex = null // Track the last selected index for range selection
        
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
        
        // Model tree UI elements
        this.elements.modelTreeContainer = document.getElementById('model-tree-container')
        this.elements.modelTreeContent = document.getElementById('model-tree-content')
        
        this.validateUIElements()
    }
    
    validateUIElements() {
        const mainElements = ['modelLoadButton', 'modelFileInput', 'clearButton', 'viewerContainer']
        const conversionElements = ['conversionSection', 'formatSelector', 'convertButton']
        
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
        
        // Selection event listeners
        this.setupSelectionEventListeners()
        
        console.log('Event listeners set up successfully')
    }
    
    setupSelectionEventListeners() {
        // Click outside to unselect all models
        document.addEventListener('click', (e) => {
            const modelTreeContainer = this.elements.modelTreeContainer
            if (modelTreeContainer && !modelTreeContainer.contains(e.target)) {
                this.unselectAllModels()
            }
        })
        
        // ESC key to unselect all models
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
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
                    
                    // Show model tree and update title immediately after first successful load
                    if (results.successful === 1) {
                        const models = this.sceneManager.getModels()
                        if (models.length > 0) {
                            this.elements.modelTreeContainer.style.display = 'block'
                            this.updateModelTreeTitle(models.length)
                        }
                    }
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
        
        // Clear selection state
        this.selectedModels.clear()
        this.lastSelectedIndex = null
        
        // Hide conversion section
        this.elements.conversionSection.style.display = 'none'
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
            return
        }
        
        this.elements.convertButton.disabled = true
        const modelCount = this.sceneManager.getModels().length
        
        try {
            await this.modelConverter.exportModel(allModels, selectedFormat)
        } catch (error) {
            console.error('Export error:', error)
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
        
        // Note: modelCount tracking removed along with status display
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
    
    updateModelTreeTitle(modelCount) {
        const titleElement = document.getElementById('model-tree-title')
        if (titleElement) {
            if (modelCount === 1) {
                titleElement.textContent = '1 model loaded'
            } else {
                titleElement.textContent = `${modelCount} models loaded`
            }
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
            return
        }
        
        this.elements.modelTreeContainer.style.display = 'block'
        
        // Update the model tree title with model count
        this.updateModelTreeTitle(models.length)
        
        // Clear existing content
        this.elements.modelTreeContent.innerHTML = ''
        
        // Add each model to the tree
        metadata.forEach((meta, index) => {
            const item = document.createElement('div')
            item.className = 'model-tree-item'
            item.setAttribute('data-index', index)
            
            // Check if this model is selected
            const isSelected = this.selectedModels.has(index)
            if (isSelected) {
                item.classList.add('selected')
            }
            
            // Add click event listener for selection
            item.addEventListener('click', (e) => {
                // Don't trigger selection if clicking on delete button
                if (e.target.closest('.delete-button')) {
                    return
                }
                
                e.stopPropagation()
                
                if (e.shiftKey) {
                    // Range selection with Shift+click
                    this.handleRangeSelection(index)
                } else if (e.ctrlKey || e.metaKey) {
                    // Multi-select with Ctrl/Cmd+click
                    this.handleModelSelection(index, true)
                    this.lastSelectedIndex = index
                } else {
                    // Single selection
                    this.handleModelSelection(index, false)
                    this.lastSelectedIndex = index
                }
            })
            
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
            deleteButton.addEventListener('click', (e) => {
                e.stopPropagation()
                this.handleRemoveModel(index)
            })
            
            // Create file type tag
            const tagElement = document.createElement('div')
            tagElement.className = `file-type-tag ${meta.fileType.toLowerCase()}`
            tagElement.textContent = meta.fileType
            
            item.appendChild(nameElement)
            item.appendChild(deleteButton)
            item.appendChild(tagElement)
            
            this.elements.modelTreeContent.appendChild(item)
        })
    }
    
    handleRemoveModel(index) {
        // Remove the model from selection if it was selected
        this.selectedModels.delete(index)
        
        // Update lastSelectedIndex if needed
        if (this.lastSelectedIndex === index) {
            this.lastSelectedIndex = null
        } else if (this.lastSelectedIndex !== null && this.lastSelectedIndex > index) {
            this.lastSelectedIndex -= 1
        }
        
        // Update selection indices for models that come after the removed one
        const newSelectedModels = new Set()
        for (const selectedIndex of this.selectedModels) {
            if (selectedIndex > index) {
                newSelectedModels.add(selectedIndex - 1)
            } else {
                newSelectedModels.add(selectedIndex)
            }
        }
        this.selectedModels = newSelectedModels
        
        // Remove the model from the scene
        const removed = this.sceneManager.removeModel(index)
        
        if (removed) {
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
    
    handleModelSelection(index, isMultiSelect) {
        if (isMultiSelect) {
            // Multi-select mode: add/remove from selection
            if (this.selectedModels.has(index)) {
                this.selectedModels.delete(index)
                console.log(`Model ${index} unselected. Selected models:`, Array.from(this.selectedModels))
            } else {
                this.selectedModels.add(index)
                console.log(`Model ${index} selected. Selected models:`, Array.from(this.selectedModels))
            }
        } else {
            // Single select mode: toggle selection or select only this model
            if (this.selectedModels.has(index) && this.selectedModels.size === 1) {
                // If only this model is selected, unselect it
                this.selectedModels.clear()
                console.log(`Model ${index} unselected. Selected models:`, Array.from(this.selectedModels))
            } else {
                // Select only this model
                this.selectedModels.clear()
                this.selectedModels.add(index)
                console.log(`Model ${index} selected. Selected models:`, Array.from(this.selectedModels))
            }
        }
        this.updateModelTree()
    }

    handleRangeSelection(endIndex) {
        // Range selection using Shift+click
        if (this.lastSelectedIndex === null) {
            // If no previous selection, treat as single selection
            this.selectedModels.clear()
            this.selectedModels.add(endIndex)
            this.lastSelectedIndex = endIndex
        } else {
            // Select range from lastSelectedIndex to endIndex
            const startIndex = Math.min(this.lastSelectedIndex, endIndex)
            const endIndexActual = Math.max(this.lastSelectedIndex, endIndex)
            
            // Clear current selection and select the range
            this.selectedModels.clear()
            for (let i = startIndex; i <= endIndexActual; i++) {
                this.selectedModels.add(i)
            }
            
            console.log(`Range selected from ${startIndex} to ${endIndexActual}. Selected models:`, Array.from(this.selectedModels))
        }
        this.updateModelTree()
    }
    
    toggleModelSelection(index) {
        // Keep this method for backward compatibility, but use the new handler
        this.handleModelSelection(index, false)
    }
    
    unselectAllModels() {
        if (this.selectedModels.size > 0) {
            console.log('Unselecting all models. Previously selected:', Array.from(this.selectedModels))
            this.selectedModels.clear()
            this.lastSelectedIndex = null
            this.updateModelTree()
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