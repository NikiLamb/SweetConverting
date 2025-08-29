import { TransformCommand } from './commands/TransformCommand.js'
import { RemoveModelCommand } from './commands/RemoveModelCommand.js'
import { ModalManager } from './ModalManager.js'

export class UIManager {
    constructor(sceneManager, modelLoaders, modelConverter, historyManager) {
        this.sceneManager = sceneManager
        this.modelLoaders = modelLoaders
        this.modelConverter = modelConverter
        this.historyManager = historyManager
        
        // Initialize modal manager
        this.modalManager = new ModalManager()
        
        // Current state
        this.currentLoadedFileType = null
        this.currentModel = null
        
        // Selection state
        this.selectedModels = new Set()
        this.lastSelectedIndex = null // Track the last selected index for range selection
        
        // Expansion state for model tree items
        this.expandedModels = new Set()
        
        // Translation mode state
        this.translationModeActive = false
        this.escapeKeyPressed = false
        
        // Rotation mode state
        this.rotationModeActive = false
        
        // Scale mode state
        this.scalingModeActive = false
        
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
        
        // Set up 3D scene selection callback
        this.sceneManager.setModelClickCallback(this.handle3DModelClick.bind(this))
    }
    
    setupUI() {
        this.findUIElements()
        this.setupEventListeners()
        this.setupViewerContainer()
        this.initializeConversionSection()
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
        
        // Toolbar UI elements
        this.elements.toolbarContainer = document.getElementById('toolbar-container')
        this.elements.translateButton = document.getElementById('translate-button')
        this.elements.rotateButton = document.getElementById('rotate-button')
        this.elements.scaleButton = document.getElementById('scale-button')
        
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
        
        // Toolbar event listeners
        this.setupToolbarEventListeners()
        
        // Set up transform change callback
        this.sceneManager.setTransformChangeCallback(() => {
            this.updateCoordinateDisplay()
        })
        
        // Initialize translate, rotate, and scale button states
        this.updateTranslateButtonState()
        this.updateRotateButtonState()
        this.updateScaleButtonState()
        
        console.log('Event listeners set up successfully')
    }
    
    setupSelectionEventListeners() {
        // Enhanced ESC key handling for translation mode and model selection
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.handleEscapeKey()
            }
        })
    }
    
    setupToolbarEventListeners() {
        // Translate button event listener
        if (this.elements.translateButton) {
            this.elements.translateButton.addEventListener('click', () => {
                this.toggleTranslationMode()
            })
        }
        
        // Rotate button event listener
        if (this.elements.rotateButton) {
            this.elements.rotateButton.addEventListener('click', () => {
                this.toggleRotationMode()
            })
        }
        
        // Scale button event listener
        if (this.elements.scaleButton) {
            this.elements.scaleButton.addEventListener('click', () => {
                this.toggleScalingMode()
            })
        }
    }
    
    setupViewerContainer() {
        if (this.elements.viewerContainer && this.sceneManager) {
            const rendererElement = this.sceneManager.getRendererElement()
            if (!this.elements.viewerContainer.contains(rendererElement)) {
                this.elements.viewerContainer.appendChild(rendererElement)
            }
        }
    }
    
    initializeConversionSection() {
        // Make conversion section always visible and initialize with default formats
        if (this.elements.conversionSection) {
            this.elements.conversionSection.style.display = 'flex'
            
            // Initialize with all possible export formats
            this.populateFormatSelector()
        }
    }
    
    populateFormatSelector() {
        if (!this.elements.formatSelector) return
        
        // Clear existing options
        this.elements.formatSelector.innerHTML = '<option value="">Select format...</option>'
        
        // Add all supported formats regardless of loaded model type
        const allFormats = [
            { value: 'glb', label: 'GLB (Binary glTF)' },
            { value: 'gltf', label: 'GLTF (Text glTF)' },
            { value: 'obj', label: 'OBJ (Wavefront)' }
        ]
        
        allFormats.forEach(format => {
            const option = document.createElement('option')
            option.value = format.value
            option.textContent = format.label
            this.elements.formatSelector.appendChild(option)
        })
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
                
                // Update translate, rotate, and scale button states
                this.updateTranslateButtonState()
                this.updateRotateButtonState()
                this.updateScaleButtonState()
                
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
        
        // Update translate, rotate, and scale button states
        this.updateTranslateButtonState()
        this.updateRotateButtonState()
        this.updateScaleButtonState()
        
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
        
        // Clear expansion state
        this.expandedModels.clear()
        
        // Hide gizmo
        this.sceneManager.hideOriginGizmo()
        
        // Export controls remain always visible
        // Update the model tree (will hide it since no models)
        this.updateModelTree()
        
        // Update translate, rotate, and scale button states
        this.updateTranslateButtonState()
        this.updateRotateButtonState()
        this.updateScaleButtonState()
        
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
            this.modalManager.showErrorToast('Export Error', 'No models loaded to export')
            return
        }
        
        // Disable convert button during export
        this.elements.convertButton.disabled = true
        
        // Show export modal
        this.modalManager.showExportModal(selectedFormat)
        
        try {
            // Create progress callback for the modal
            const progressCallback = (message) => {
                this.modalManager.updateProgress(message)
            }
            
            // Start export with progress tracking
            const result = await this.modelConverter.exportModel(allModels, selectedFormat, progressCallback)
            
            // Show success notification and hide modal
            this.modalManager.showExportSuccess(selectedFormat, result.filename)
            
        } catch (error) {
            console.error('Export error:', error)
            
            // Parse error message for user-friendly display
            const errorMessage = error.message || 'Unknown export error'
            const errorParts = errorMessage.split('\nHint:')
            const mainError = errorParts[0]
            const hint = errorParts[1] ? `Hint: ${errorParts[1]}` : ''
            
            // Show error in modal
            this.modalManager.showExportError(mainError, hint)
            
        } finally {
            // Re-enable convert button
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
            this.elements.conversionSection.style.display = 'flex'
        }
    }
    
    hideConversionSection() {
        // Export controls should always be visible - do nothing
        // Keeping this method for backward compatibility
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
    
    toggleModelExpansion(index) {
        if (this.expandedModels.has(index)) {
            this.expandedModels.delete(index)
        } else {
            this.expandedModels.add(index)
        }
        this.updateModelTree()
    }
    
    createExpandedContent(index) {
        const models = this.sceneManager.getModels()
        const model = models[index]
        
        if (!model) {
            return null
        }
        
        const expandedDiv = document.createElement('div')
        expandedDiv.className = 'model-tree-expanded-content'
        expandedDiv.setAttribute('data-model-index', index)
        
        // Get model position (coordinates)
        const position = model.position
        const x = position.x.toFixed(2)
        const y = position.y.toFixed(2)
        const z = position.z.toFixed(2)
        
        // Get model rotation (convert from radians to degrees)
        const rotation = model.rotation
        const rotX = (rotation.x * 180 / Math.PI).toFixed(2)
        const rotY = (rotation.y * 180 / Math.PI).toFixed(2)
        const rotZ = (rotation.z * 180 / Math.PI).toFixed(2)
        
        // Get model scaling
        const scale = model.scale
        const scaleX = scale.x.toFixed(2)
        const scaleY = scale.y.toFixed(2)
        const scaleZ = scale.z.toFixed(2)
        
        // Create coordinates section
        const coordsSection = this.createTransformSection('Coordinates', 'coord', index, {
            x: x,
            y: y,
            z: z
        })
        
        // Create rotation section  
        const rotationSection = this.createTransformSection('Rotation', 'rotation', index, {
            x: rotX,
            y: rotY,
            z: rotZ
        })
        
        // Create scale section
        const scaleSection = this.createTransformSection('Scale', 'scaling', index, {
            x: scaleX,
            y: scaleY,
            z: scaleZ
        })
        
        expandedDiv.appendChild(coordsSection)
        expandedDiv.appendChild(rotationSection)
        expandedDiv.appendChild(scaleSection)
        
        return expandedDiv
    }
    
    /**
     * Creates a transformation section with label, input fields, and reset button
     * @param {string} title - Section title
     * @param {string} type - Transform type (coord, rotation, scaling)
     * @param {number} modelIndex - Model index
     * @param {object} values - Current values {x, y, z}
     * @returns {HTMLElement} - The section element
     */
    createTransformSection(title, type, modelIndex, values) {
        const sectionDiv = document.createElement('div')
        sectionDiv.className = 'transform-section'
        
        // Create section header with label and reset button
        const headerDiv = document.createElement('div')
        headerDiv.className = 'transform-section-header'
        
        const label = document.createElement('div')
        label.className = 'model-section-label'
        label.textContent = title
        
        const resetButton = document.createElement('button')
        resetButton.className = 'reset-button'
        resetButton.title = `Reset ${title.toLowerCase()} to original values`
        resetButton.innerHTML = '↺'
        resetButton.addEventListener('click', () => {
            this.handleTransformReset(modelIndex, type)
        })
        
        headerDiv.appendChild(label)
        headerDiv.appendChild(resetButton)
        
        // Create input fields container
        const inputsDiv = document.createElement('div')
        inputsDiv.className = `model-${type === 'coord' ? 'coordinates' : type === 'rotation' ? 'rotation' : 'scaling'}`
        
        // Create X input
        const xContainer = document.createElement('div')
        xContainer.className = 'coordinate-item'
        const xSymbol = document.createElement('div')
        xSymbol.className = 'coordinate-symbol x-coord'
        xSymbol.textContent = 'X'
        const xInput = this.createTransformInput('x', type, values.x, modelIndex)
        xContainer.appendChild(xSymbol)
        xContainer.appendChild(xInput)
        
        // Create Y input
        const yContainer = document.createElement('div')
        yContainer.className = 'coordinate-item'
        const ySymbol = document.createElement('div')
        ySymbol.className = 'coordinate-symbol y-coord'
        ySymbol.textContent = 'Y'
        const yInput = this.createTransformInput('y', type, values.y, modelIndex)
        yContainer.appendChild(ySymbol)
        yContainer.appendChild(yInput)
        
        // Create Z input
        const zContainer = document.createElement('div')
        zContainer.className = 'coordinate-item'
        const zSymbol = document.createElement('div')
        zSymbol.className = 'coordinate-symbol z-coord'
        zSymbol.textContent = 'Z'
        const zInput = this.createTransformInput('z', type, values.z, modelIndex)
        zContainer.appendChild(zSymbol)
        zContainer.appendChild(zInput)
        
        inputsDiv.appendChild(xContainer)
        inputsDiv.appendChild(yContainer)
        inputsDiv.appendChild(zContainer)
        
        sectionDiv.appendChild(headerDiv)
        sectionDiv.appendChild(inputsDiv)
        
        return sectionDiv
    }
    
    /**
     * Handles reset button clicks for transformations
     * @param {number} modelIndex - Index of the model
     * @param {string} type - Type of transformation to reset
     */
    handleTransformReset(modelIndex, type) {
        // Map UI types to SceneManager types
        const typeMap = {
            'coord': 'position',
            'rotation': 'rotation', 
            'scaling': 'scale'
        }
        
        const success = this.sceneManager.resetModelTransform(modelIndex, typeMap[type])
        
        if (success) {
            // Update the input fields with reset values
            this.updateTransformInputs(modelIndex, type)
        } else {
            this.showErrorToast('Failed to reset transformation')
        }
    }
    
    /**
     * Updates input fields with current model values
     * @param {number} modelIndex - Index of the model
     * @param {string} type - Type of transformation
     */
    updateTransformInputs(modelIndex, type) {
        const models = this.sceneManager.getModels()
        const model = models[modelIndex]
        
        if (!model) return
        
        let values = {}
        
        switch (type) {
            case 'coord':
                values = {
                    x: model.position.x.toFixed(2),
                    y: model.position.y.toFixed(2),
                    z: model.position.z.toFixed(2)
                }
                break
            case 'rotation':
                values = {
                    x: (model.rotation.x * 180 / Math.PI).toFixed(2),
                    y: (model.rotation.y * 180 / Math.PI).toFixed(2),
                    z: (model.rotation.z * 180 / Math.PI).toFixed(2)
                }
                break
            case 'scaling':
                values = {
                    x: model.scale.x.toFixed(2),
                    y: model.scale.y.toFixed(2),
                    z: model.scale.z.toFixed(2)
                }
                break
        }
        
        // Update input fields
        const inputs = document.querySelectorAll(`[data-model-index="${modelIndex}"][data-type="${type}"]`)
        inputs.forEach(input => {
            const axis = input.dataset.axis
            if (values[axis] !== undefined) {
                input.value = values[axis]
                input.dataset.lastValid = values[axis]
            }
        })
    }
    
    /**
     * Updates coordinate, rotation, and scaling display for expanded models
     * Should be called when model positions, rotations, or scaling change
     */
    updateCoordinateDisplay() {
        const models = this.sceneManager.getModels()
        const expandedContents = document.querySelectorAll('.model-tree-expanded-content')
        
        expandedContents.forEach(content => {
            const modelIndex = parseInt(content.getAttribute('data-model-index'))
            if (modelIndex >= 0 && modelIndex < models.length) {
                // Update all transform input fields for this model
                this.updateTransformInputs(modelIndex, 'coord')
                this.updateTransformInputs(modelIndex, 'rotation')
                this.updateTransformInputs(modelIndex, 'scaling')
            }
        })
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
            const container = document.createElement('div')
            container.className = 'model-tree-container-item'
            
            const item = document.createElement('div')
            item.className = 'model-tree-item'
            item.setAttribute('data-index', index)
            
            // Check if this model is selected
            const isSelected = this.selectedModels.has(index)
            if (isSelected) {
                item.classList.add('selected')
            }
            
            // Check if this model is expanded
            const isExpanded = this.expandedModels.has(index)
            
            // Create expand/collapse caret
            const caret = document.createElement('div')
            caret.className = 'model-tree-caret'
            caret.innerHTML = isExpanded ? '▼' : '▶'
            caret.addEventListener('click', (e) => {
                e.stopPropagation()
                this.toggleModelExpansion(index)
            })
            
            // Add click event listener for selection
            item.addEventListener('click', (e) => {
                // Don't trigger selection if clicking on delete button or caret
                if (e.target.closest('.delete-button') || e.target.closest('.model-tree-caret')) {
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
            
            item.appendChild(caret)
            item.appendChild(nameElement)
            item.appendChild(deleteButton)
            item.appendChild(tagElement)
            
            container.appendChild(item)
            
            // Create expanded content area
            if (isExpanded) {
                const expandedContent = this.createExpandedContent(index)
                container.appendChild(expandedContent)
            }
            
            this.elements.modelTreeContent.appendChild(container)
        })
    }
    
    handleRemoveModel(index) {
        // Get model and metadata before removing
        const models = this.sceneManager.getModels()
        const metadata = this.sceneManager.getModelMetadata()
        
        if (index < 0 || index >= models.length) {
            console.error('Invalid model index for removal:', index)
            return
        }
        
        const modelToRemove = models[index]
        const modelMetadata = metadata[index]
        
        // Create remove command for undo tracking if history manager is available
        if (this.historyManager) {
            try {
                const command = new RemoveModelCommand(this.sceneManager, this, index, modelToRemove, modelMetadata)
                
                // Execute the command through history manager
                this.historyManager.execute(command)
                
                console.log(`Created remove command for model: ${modelMetadata.filename}`)
            } catch (error) {
                console.error('Error creating remove command:', error)
                // Fall back to direct removal if command creation fails
                this.performModelRemoval(index)
            }
        } else {
            // No history manager, perform direct removal
            this.performModelRemoval(index)
        }
    }
    
    /**
     * Performs the actual model removal and UI updates
     * Used both by direct removal and by remove commands
     * @param {number} index - Index of model to remove
     */
    performModelRemoval(index) {
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
            // Update gizmo display after model removal
            this.updateGizmoDisplay()
            
            // Update the model tree
            this.updateModelTree()
            
            // Update translate, rotate, and scale button states
            this.updateTranslateButtonState()
            this.updateRotateButtonState()
            this.updateScaleButtonState()
            
            // Update conversion section visibility
            const models = this.sceneManager.getModels()
            if (models.length === 0) {
                this.hideConversionSection()
                this.currentLoadedFileType = null
                this.currentModel = null
            }
        }
    }
    
    /**
     * Handles clicks on 3D models in the scene
     * @param {number} modelIndex - Index of the clicked model (-1 for empty space)
     * @param {Object} eventInfo - Information about the click event (ctrl, shift keys)
     */
    handle3DModelClick(modelIndex, eventInfo) {
        // Handle empty space click (keep selection - don't deselect models)
        if (modelIndex === -1) {
            // Do nothing - preserve current selection when clicking empty space
            return
        }
        
        if (eventInfo.shiftKey) {
            // Range selection with Shift+click
            this.handleRangeSelection(modelIndex)
        } else if (eventInfo.ctrlKey || eventInfo.metaKey) {
            // Multi-select with Ctrl/Cmd+click
            this.handleModelSelection(modelIndex, true)
            this.lastSelectedIndex = modelIndex
        } else {
            // Single selection
            this.handleModelSelection(modelIndex, false)
            this.lastSelectedIndex = modelIndex
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
        
        // Update visual feedback and UI
        this.updateSelectionDisplay()
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
        
        // Update visual feedback and UI
        this.updateSelectionDisplay()
    }
    
    /**
     * Updates all selection-related visual feedback and UI elements
     */
    updateSelectionDisplay() {
        // Update gizmo display based on selection
        this.updateGizmoDisplay()
        
        // Update model tree highlighting
        this.updateModelTree()
        
        // Update 3D scene highlighting
        this.sceneManager.highlightSelectedModels(this.selectedModels)
        
        // Update translate, rotate, and scale button states based on selection
        this.updateTranslateButtonState()
        this.updateRotateButtonState()
        this.updateScaleButtonState()
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
            this.updateSelectionDisplay()
        }
    }
    
    /**
     * Updates the gizmo display based on current selection and transform modes
     * Shows origin gizmo for single selection, manages both gizmos during transform operations
     */
    updateGizmoDisplay() {
        if (this.selectedModels.size === 1) {
            // Show origin gizmo for single selected model
            const selectedIndex = Array.from(this.selectedModels)[0]
            this.sceneManager.showOriginGizmo(selectedIndex)
            
            // If translation mode is active, activate it for the new selection
            if (this.translationModeActive) {
                this.sceneManager.activateTranslationModeForMultiple([selectedIndex])
            }
            // If rotation mode is active, activate it for the new selection
            else if (this.rotationModeActive) {
                this.sceneManager.activateRotationModeForMultiple([selectedIndex])
            }
            // If scaling mode is active, activate it for the new selection
            else if (this.scalingModeActive) {
                this.sceneManager.activateScalingModeForMultiple([selectedIndex])
            }
        } else if (this.selectedModels.size > 1) {
            // Hide origin gizmo for multiple selection (will show transform gizmo at center if active)
            this.sceneManager.hideOriginGizmo()
            
            // If translation mode is active, update it for multiple selection
            if (this.translationModeActive) {
                const selectedIndices = Array.from(this.selectedModels)
                this.sceneManager.activateTranslationModeForMultiple(selectedIndices)
            }
            // If rotation mode is active, update it for multiple selection
            else if (this.rotationModeActive) {
                const selectedIndices = Array.from(this.selectedModels)
                this.sceneManager.activateRotationModeForMultiple(selectedIndices)
            }
            // If scaling mode is active, update it for multiple selection
            else if (this.scalingModeActive) {
                const selectedIndices = Array.from(this.selectedModels)
                this.sceneManager.activateScalingModeForMultiple(selectedIndices)
            }
        } else {
            // Hide gizmo for no selection
            this.sceneManager.hideOriginGizmo()
            
            // Deactivate transform modes if no models are selected
            if (this.translationModeActive) {
                this.deactivateTranslationMode()
            }
            if (this.rotationModeActive) {
                this.deactivateRotationMode()
            }
            if (this.scalingModeActive) {
                this.deactivateScalingMode()
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
    
    /**
     * Shows a toast notification at the bottom left corner of the window
     * @param {string} message - The message to display
     * @param {string} type - The type of toast ('error', 'success', 'info')
     * @param {number} duration - Duration in milliseconds (default: 3000)
     */
    showToast(message, type = 'info', duration = 3000) {
        // Create toast container if it doesn't exist
        let toastContainer = document.getElementById('toast-container')
        if (!toastContainer) {
            toastContainer = document.createElement('div')
            toastContainer.id = 'toast-container'
            toastContainer.className = 'toast-container'
            document.body.appendChild(toastContainer)
        }
        
        // Create toast element
        const toast = document.createElement('div')
        toast.className = `toast toast-${type}`
        toast.textContent = message
        
        // Add toast to container
        toastContainer.appendChild(toast)
        
        // Trigger animation
        setTimeout(() => {
            toast.classList.add('toast-show')
        }, 10)
        
        // Remove toast after duration
        setTimeout(() => {
            toast.classList.remove('toast-show')
            toast.classList.add('toast-hide')
            
            // Remove from DOM after animation
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast)
                }
            }, 300)
        }, duration)
    }
    
    /**
     * Shows an error toast notification
     * @param {string} message - The error message to display
     */
    showErrorToast(message) {
        this.showToast(message, 'error', 4000)
    }
    
    /**
     * Validates and formats a numeric input value
     * @param {string} value - The input value to validate
     * @param {string} lastValidValue - The last valid value to fall back to
     * @returns {object} - {isValid: boolean, value: string, numericValue: number}
     */
    validateNumericInput(value, lastValidValue = '0.00') {
        // Allow empty string temporarily (during typing)
        if (value === '') {
            return { isValid: true, value: '', numericValue: 0 }
        }
        
        // Allow only numbers, decimal point, and minus sign
        const allowedPattern = /^-?\d*\.?\d*$/
        if (!allowedPattern.test(value)) {
            return { isValid: false, value: lastValidValue, numericValue: parseFloat(lastValidValue) }
        }
        
        // Check for valid number format
        const numericValue = parseFloat(value)
        if (isNaN(numericValue)) {
            // If it's not a valid number but matches pattern (e.g., ".", "-", "-."), allow it temporarily
            if (value === '.' || value === '-' || value === '-.') {
                return { isValid: true, value: value, numericValue: 0 }
            }
            return { isValid: false, value: lastValidValue, numericValue: parseFloat(lastValidValue) }
        }
        
        return { isValid: true, value: value, numericValue: numericValue }
    }
    
    /**
     * Formats a numeric value to two decimal places
     * @param {number} value - The numeric value to format
     * @returns {string} - Formatted value string
     */
    formatToTwoDecimals(value) {
        return parseFloat(value).toFixed(2)
    }
    
    /**
     * Creates an input field for transformation values
     * @param {string} axis - The axis (x, y, z)
     * @param {string} type - The transformation type (coord, rotation, scaling)
     * @param {string} initialValue - The initial value
     * @param {number} modelIndex - The model index
     * @returns {HTMLElement} - The input field element
     */
    createTransformInput(axis, type, initialValue, modelIndex) {
        const input = document.createElement('input')
        input.type = 'text'
        input.className = 'transform-input'
        input.value = initialValue
        input.dataset.axis = axis
        input.dataset.type = type
        input.dataset.modelIndex = modelIndex
        input.dataset.lastValid = initialValue
        
        // Input event - real-time validation
        input.addEventListener('input', (e) => {
            const validation = this.validateNumericInput(e.target.value, e.target.dataset.lastValid)
            
            if (!validation.isValid) {
                // Show error toast and revert to last valid value
                this.showErrorToast('Invalid input. Only numbers and "-" are allowed.')
                e.target.value = validation.value
            } else {
                e.target.dataset.lastValid = validation.value
            }
        })
        
        // Keydown event - handle Enter key to trigger blur
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault()
                e.target.blur() // This will trigger the blur event
            }
        })
        
        // Blur event - format and apply changes
        input.addEventListener('blur', (e) => {
            const value = e.target.value
            
            // Handle empty value
            if (value === '' || value === '.' || value === '-' || value === '-.') {
                e.target.value = '0.00'
                e.target.dataset.lastValid = '0.00'
            } else {
                // Format to two decimal places
                const numericValue = parseFloat(value)
                const formattedValue = this.formatToTwoDecimals(numericValue)
                e.target.value = formattedValue
                e.target.dataset.lastValid = formattedValue
            }
            
            // Apply transformation to the model
            this.applyTransformFromInput(
                parseInt(e.target.dataset.modelIndex),
                e.target.dataset.type,
                e.target.dataset.axis,
                parseFloat(e.target.value)
            )
        })
        
        return input
    }
    
    /**
     * Applies transformation changes from input to the 3D model
     * Creates an undo command for the transformation
     * @param {number} modelIndex - Index of the model
     * @param {string} type - Type of transformation (coord, rotation, scaling)
     * @param {string} axis - The axis (x, y, z)
     * @param {number} value - The new value
     */
    applyTransformFromInput(modelIndex, type, axis, value) {
        if (!this.historyManager) {
            console.warn('No history manager available for undo tracking')
            return
        }
        
        // Map UI types to command types
        const transformTypeMap = {
            'coord': 'position',
            'rotation': 'rotation',
            'scaling': 'scale'
        }
        
        const transformType = transformTypeMap[type]
        if (!transformType) {
            console.error('Invalid transform type:', type)
            return
        }
        
        // Capture current values before change
        const oldValues = TransformCommand.captureCurrentValues(this.sceneManager, [modelIndex], transformType)
        
        // Get all current values for this transform type (including the new value)
        const inputs = document.querySelectorAll(`[data-model-index="${modelIndex}"][data-type="${type}"]`)
        const values = { x: 0, y: 0, z: 0 }
        
        inputs.forEach(input => {
            values[input.dataset.axis] = parseFloat(input.value) || 0
        })
        
        // Apply to the scene
        let success = false
        switch (type) {
            case 'coord':
                success = this.sceneManager.setModelPosition(modelIndex, values.x, values.y, values.z)
                break
            case 'rotation':
                success = this.sceneManager.setModelRotation(modelIndex, values.x, values.y, values.z)
                break
            case 'scaling':
                success = this.sceneManager.setModelScale(modelIndex, values.x, values.y, values.z)
                break
        }
        
        if (success) {
            // Capture new values after change
            const newValues = TransformCommand.captureCurrentValues(this.sceneManager, [modelIndex], transformType)
            
            // Create transform command
            try {
                const command = new TransformCommand(
                    this.sceneManager,
                    [modelIndex],
                    transformType,
                    oldValues,
                    newValues,
                    `Manual ${transformType} change`
                )
                
                // Only add to history if there's a significant change
                if (command.hasSignificantChange()) {
                    // Don't execute the command since the transform already happened
                    // Just add it to the undo stack directly
                    this.historyManager.undoStack.push(command)
                    this.historyManager.redoStack = [] // Clear redo stack
                    this.historyManager.trimHistory()
                    this.historyManager.notifyHistoryChanged()
                    
                    console.log(`Created manual transform command: ${command.name}`)
                } else {
                    console.log('Transform change too small, not adding to history')
                }
                
            } catch (error) {
                console.error('Error creating transform command from manual input:', error)
            }
        } else {
            console.error('Failed to apply transformation to model')
        }
    }
    
    // Getter methods for accessing current state
    getCurrentModel() {
        return this.currentModel
    }
    
    getCurrentFileType() {
        return this.currentLoadedFileType
    }
    
    /**
     * Handles escape key press with enhanced logic for transform modes and model deselection
     * Note: Escape key is now the primary way to deselect models (clicking empty space preserves selection)
     */
    handleEscapeKey() {
        if (this.translationModeActive) {
            // First escape: deactivate translation mode only
            this.deactivateTranslationMode()
            this.escapeKeyPressed = true
            // Set a timeout to reset the escape key state
            setTimeout(() => {
                this.escapeKeyPressed = false
            }, 300) // 300ms window for second escape
        } else if (this.rotationModeActive) {
            // First escape: deactivate rotation mode only
            this.deactivateRotationMode()
            this.escapeKeyPressed = true
            // Set a timeout to reset the escape key state
            setTimeout(() => {
                this.escapeKeyPressed = false
            }, 300) // 300ms window for second escape
        } else if (this.scalingModeActive) {
            // First escape: deactivate scaling mode only
            this.deactivateScalingMode()
            this.escapeKeyPressed = true
            // Set a timeout to reset the escape key state
            setTimeout(() => {
                this.escapeKeyPressed = false
            }, 300) // 300ms window for second escape
        } else if (this.escapeKeyPressed) {
            // Second escape within timeout: clear model selection
            this.unselectAllModels()
            this.escapeKeyPressed = false
        } else if (this.selectedModels.size > 0) {
            // If models are selected but no transform mode is active, clear selection
            this.unselectAllModels()
        }
    }
    
    /**
     * Toggles translation mode on/off with mutual exclusivity
     */
    toggleTranslationMode() {
        if (this.translationModeActive) {
            this.deactivateTranslationMode()
        } else {
            // Deactivate other modes if they're active (mutual exclusivity)
            if (this.rotationModeActive) {
                this.deactivateRotationMode()
            }
            if (this.scalingModeActive) {
                this.deactivateScalingMode()
            }
            this.activateTranslationMode()
        }
    }
    
    /**
     * Activates translation mode for selected models
     */
    activateTranslationMode() {
        const models = this.sceneManager.getModels()
        
        if (models.length === 0) {
            console.warn('Translation mode cannot be activated: no models loaded')
            return
        }
        
        if (this.selectedModels.size > 0) {
            const selectedIndices = Array.from(this.selectedModels)
            this.sceneManager.activateTranslationModeForMultiple(selectedIndices)
            this.translationModeActive = true
            
            // Update button appearance
            if (this.elements.translateButton) {
                this.elements.translateButton.classList.add('active')
            }
            
            console.log(`Translation mode activated for ${selectedIndices.length} model(s)`)
        } else {
            console.warn('Translation mode requires at least one selected model')
        }
    }
    
    /**
     * Deactivates translation mode
     */
    deactivateTranslationMode() {
        this.sceneManager.deactivateTranslationMode()
        this.translationModeActive = false
        
        // Update button appearance
        if (this.elements.translateButton) {
            this.elements.translateButton.classList.remove('active')
        }
        
        console.log('Translation mode deactivated')
    }
    
    /**
     * Updates the translate button enabled/disabled state based on model selection
     */
    updateTranslateButtonState() {
        if (this.elements.translateButton) {
            const models = this.sceneManager.getModels()
            const hasModels = models.length > 0
            const hasSelection = this.selectedModels.size > 0
            
            // Button is enabled when there are models AND at least one is selected
            this.elements.translateButton.disabled = !hasModels || !hasSelection
            
            // If no models or no selection and translation mode is active, deactivate it
            if ((!hasModels || !hasSelection) && this.translationModeActive) {
                this.deactivateTranslationMode()
            }
        }
    }
    
    /**
     * Toggles rotation mode on/off with mutual exclusivity
     */
    toggleRotationMode() {
        if (this.rotationModeActive) {
            this.deactivateRotationMode()
        } else {
            // Deactivate other modes if they're active (mutual exclusivity)
            if (this.translationModeActive) {
                this.deactivateTranslationMode()
            }
            if (this.scalingModeActive) {
                this.deactivateScalingMode()
            }
            this.activateRotationMode()
        }
    }
    
    /**
     * Activates rotation mode for selected models
     */
    activateRotationMode() {
        const models = this.sceneManager.getModels()
        
        if (models.length === 0) {
            console.warn('Rotation mode cannot be activated: no models loaded')
            return
        }
        
        if (this.selectedModels.size > 0) {
            const selectedIndices = Array.from(this.selectedModels)
            this.sceneManager.activateRotationModeForMultiple(selectedIndices)
            this.rotationModeActive = true
            
            // Update button appearance
            if (this.elements.rotateButton) {
                this.elements.rotateButton.classList.add('active')
            }
            
            console.log(`Rotation mode activated for ${selectedIndices.length} model(s)`)
        } else {
            console.warn('Rotation mode requires at least one selected model')
        }
    }
    
    /**
     * Deactivates rotation mode
     */
    deactivateRotationMode() {
        this.sceneManager.deactivateRotationMode()
        this.rotationModeActive = false
        
        // Update button appearance
        if (this.elements.rotateButton) {
            this.elements.rotateButton.classList.remove('active')
        }
        
        console.log('Rotation mode deactivated')
    }
    
    /**
     * Updates the rotate button enabled/disabled state based on model selection
     */
    updateRotateButtonState() {
        if (this.elements.rotateButton) {
            const models = this.sceneManager.getModels()
            const hasModels = models.length > 0
            const hasSelection = this.selectedModels.size > 0
            
            // Button is enabled when there are models AND at least one is selected
            this.elements.rotateButton.disabled = !hasModels || !hasSelection
            
            // If no models or no selection and rotation mode is active, deactivate it
            if ((!hasModels || !hasSelection) && this.rotationModeActive) {
                this.deactivateRotationMode()
            }
        }
    }
    
    /**
     * Toggles scaling mode on/off with mutual exclusivity
     */
    toggleScalingMode() {
        if (this.scalingModeActive) {
            this.deactivateScalingMode()
        } else {
            // Deactivate other modes if they're active (mutual exclusivity)
            if (this.translationModeActive) {
                this.deactivateTranslationMode()
            }
            if (this.rotationModeActive) {
                this.deactivateRotationMode()
            }
            this.activateScalingMode()
        }
    }
    
    /**
     * Activates scaling mode for selected models
     */
    activateScalingMode() {
        const models = this.sceneManager.getModels()
        
        if (models.length === 0) {
            console.warn('Scaling mode cannot be activated: no models loaded')
            return
        }
        
        if (this.selectedModels.size > 0) {
            const selectedIndices = Array.from(this.selectedModels)
            this.sceneManager.activateScalingModeForMultiple(selectedIndices)
            this.scalingModeActive = true
            
            // Update button appearance
            if (this.elements.scaleButton) {
                this.elements.scaleButton.classList.add('active')
            }
            
            console.log(`Scaling mode activated for ${selectedIndices.length} model(s)`)
        } else {
            console.warn('Scaling mode requires at least one selected model')
        }
    }
    
    /**
     * Deactivates scaling mode
     */
    deactivateScalingMode() {
        this.sceneManager.deactivateScalingMode()
        this.scalingModeActive = false
        
        // Update button appearance
        if (this.elements.scaleButton) {
            this.elements.scaleButton.classList.remove('active')
        }
        
        console.log('Scaling mode deactivated')
    }
    
    /**
     * Updates the scale button enabled/disabled state based on model selection
     */
    updateScaleButtonState() {
        if (this.elements.scaleButton) {
            const models = this.sceneManager.getModels()
            const hasModels = models.length > 0
            const hasSelection = this.selectedModels.size > 0
            
            // Button is enabled when there are models AND at least one is selected
            this.elements.scaleButton.disabled = !hasModels || !hasSelection
            
            // If no models or no selection and scaling mode is active, deactivate it
            if ((!hasModels || !hasSelection) && this.scalingModeActive) {
                this.deactivateScalingMode()
            }
        }
    }
}