import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { STLLoader } from 'three/addons/loaders/STLLoader.js'
import { USDZLoader } from 'three/addons/loaders/USDZLoader.js'
import { LoadModelCommand } from './commands/LoadModelCommand.js'

export class ModelLoaders {
    constructor(sceneManager) {
        this.sceneManager = sceneManager
        this.glbLoader = new GLTFLoader()
        this.stlLoader = new STLLoader()
        this.usdzLoader = new USDZLoader()
        this.loadedModelsCount = 0  // Track number of models loaded in current session
        this.historyManager = null  // Reference to history manager for undo/redo
        this.uiManager = null       // Reference to UI manager for UI updates
    }
    
    // Reset the loaded models counter (call when clearing models)
    resetLoadedModelsCount() {
        this.loadedModelsCount = 0
    }
    
    async loadModelFile(file) {
        return new Promise((resolve, reject) => {
            if (!file) {
                reject(new Error('No file selected'))
                return
            }
            
            console.log('File selected:', file.name, 'Size:', file.size, 'Type:', file.type)
            const fileName = file.name.toLowerCase()
            
            if (fileName.endsWith('.glb')) {
                console.log('Loading GLB file')
                this.loadGLBFile(file, resolve, reject)
            } else if (fileName.endsWith('.stl')) {
                console.log('Loading STL file')
                this.loadSTLFile(file, resolve, reject)
            } else if (fileName.endsWith('.usdz')) {
                console.log('Loading USDZ file')
                this.loadUSDZFile(file, resolve, reject)
            } else {
                const error = 'Unsupported file type. Please select a GLB, STL, or USDZ file.'
                console.error(error)
                reject(new Error(error))
            }
        })
    }
    
    loadGLBFile(file, resolve, reject) {
        const reader = new FileReader()
        
        reader.onload = () => {
            const data = reader.result
            
            this.glbLoader.parse(data, '', (glb) => {
                try {
                    const glbModel = glb.scene
                    
                    // Position model at origin (0,0,0)
                    glbModel.position.set(0, 0, 0)
                    this.loadedModelsCount++
                    
                    // Add model to scene with metadata
                    const metadata = {
                        filename: file.name,
                        fileType: 'GLB',
                        originalFile: file
                    }
                    this.addModelWithUndo(glbModel, metadata)
                    this.sceneManager.recenterCameraOnAllModels()
                    
                    console.log('GLB model loaded successfully')
                    resolve({ model: glbModel, fileType: 'glb' })
                } catch (error) {
                    console.error('Error processing GLB:', error)
                    reject(error)
                }
            }, reject)
        }
        
        reader.onerror = () => reject(new Error('Failed to read file'))
        reader.readAsArrayBuffer(file)
    }
    
    loadSTLFile(file, resolve, reject) {
        const reader = new FileReader()
        
        reader.onload = () => {
            try {
                const data = reader.result
                const geometry = this.stlLoader.parse(data)
                
                let stlMaterial
                if (geometry.hasColors) {
                    geometry.computeVertexNormals()
                    stlMaterial = new THREE.MeshPhongMaterial({ 
                        opacity: geometry.alpha, 
                        vertexColors: true 
                    })
                } else {
                    stlMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 })
                }
                
                const stlModel = new THREE.Mesh(geometry, stlMaterial)
                
                // Scale down by 10 the model
                stlModel.scale.set(0.1, 0.1, 0.1)
                
                // Pivot 90 degrees around the X axis
                stlModel.rotateX(-Math.PI / 2)
                
                // Position model at origin (0,0,0)
                stlModel.position.set(0, 0, 0)
                this.loadedModelsCount++
                
                // Add model to scene with metadata
                const metadata = {
                    filename: file.name,
                    fileType: 'STL',
                    originalFile: file
                }
                this.addModelWithUndo(stlModel, metadata)
                this.sceneManager.recenterCameraOnAllModels()
                
                console.log('STL model loaded successfully')
                resolve({ model: stlModel, fileType: 'stl' })
            } catch (error) {
                reject(error)
            }
        }
        
        reader.onerror = () => reject(new Error('Failed to read STL file'))
        reader.readAsArrayBuffer(file)
    }
    
    loadUSDZFile(file, resolve, reject) {
        const reader = new FileReader()
        
        reader.onload = () => {
            try {
                const data = reader.result
                const usdzModel = this.usdzLoader.parse(data)
                
                // Position model at origin (0,0,0)
                usdzModel.position.set(0, 0, 0)
                this.loadedModelsCount++
                
                // Add model to scene with metadata
                const metadata = {
                    filename: file.name,
                    fileType: 'USDZ',
                    originalFile: file
                }
                this.addModelWithUndo(usdzModel, metadata)
                this.sceneManager.recenterCameraOnAllModels()
                
                console.log('USDZ model loaded successfully')
                resolve({ model: usdzModel, fileType: 'usdz' })
            } catch (error) {
                console.error("Error loading USDZ file:", error)
                reject(error)
            }
        }
        
        reader.onerror = () => reject(new Error('Failed to read USDZ file'))
        reader.readAsArrayBuffer(file)
    }
    
    getSupportedFormats() {
        return ['.glb', '.stl', '.usdz']
    }
    
    /**
     * Adds a model to the scene with undo tracking
     * @param {THREE.Object3D} model - The model to add
     * @param {object} metadata - Model metadata
     * @returns {number} - Index of the added model
     */
    addModelWithUndo(model, metadata) {
        // Add model to scene first
        this.sceneManager.addModel(model, metadata)
        
        // Find the index of the added model
        const models = this.sceneManager.getModels()
        const modelIndex = models.indexOf(model)
        
        // Create load command for undo tracking if history manager is available
        if (this.historyManager && modelIndex !== -1) {
            try {
                const command = new LoadModelCommand(this.sceneManager, this.uiManager, model, metadata, modelIndex)
                
                // Don't execute the command since the model is already added
                // Just add it to the undo stack directly
                this.historyManager.undoStack.push(command)
                this.historyManager.redoStack = [] // Clear redo stack
                this.historyManager.trimHistory()
                this.historyManager.notifyHistoryChanged()
                
                console.log(`Created load command for model: ${metadata.filename}`)
            } catch (error) {
                console.error('Error creating load command:', error)
            }
        }
        
        return modelIndex
    }
    
    /**
     * Sets the history manager for undo/redo functionality
     * @param {HistoryManager} historyManager - The history manager instance
     */
    setHistoryManager(historyManager) {
        this.historyManager = historyManager
        console.log('HistoryManager set in ModelLoaders')
    }
    
    /**
     * Sets the UI manager for UI updates
     * @param {UIManager} uiManager - The UI manager instance
     */
    setUIManager(uiManager) {
        this.uiManager = uiManager
        console.log('UIManager set in ModelLoaders')
    }
}