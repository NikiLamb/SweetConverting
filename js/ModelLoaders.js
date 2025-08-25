import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { STLLoader } from 'three/addons/loaders/STLLoader.js'
import { USDZLoader } from 'three/addons/loaders/USDZLoader.js'
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'
import { LoadModelCommand } from './commands/LoadModelCommand.js'

export class ModelLoaders {
    constructor(sceneManager) {
        this.sceneManager = sceneManager
        this.glbLoader = new GLTFLoader()
        this.stlLoader = new STLLoader()
        this.usdzLoader = new USDZLoader()
        this.fbxLoader = new FBXLoader()
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
            } else if (fileName.endsWith('.fbx')) {
                console.log('Loading FBX file')
                this.loadFBXFile(file, resolve, reject)
            } else {
                const error = 'Unsupported file type. Please select a GLB, STL, USDZ, or FBX file.'
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
                    
                    // Handle skeletal meshes for proper hit detection
                    this.setupSkeletalMeshes(glbModel)
                    
                    // Add model to scene with metadata
                    const metadata = {
                        filename: file.name,
                        fileType: 'GLB',
                        originalFile: file,
                        hasSkeletalMeshes: this.hasSkeletalMeshes(glbModel),
                        animations: glb.animations || []
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
    
    loadFBXFile(file, resolve, reject) {
        const reader = new FileReader()
        
        reader.onload = () => {
            try {
                const data = reader.result
                
                this.fbxLoader.load(
                    // Create a blob URL for the FBX data
                    URL.createObjectURL(new Blob([data])),
                    (fbxModel) => {
                        try {
                            // Position model at origin (0,0,0)
                            fbxModel.position.set(0, 0, 0)
                            this.loadedModelsCount++
                            
                            // FBX models may need scaling adjustment
                            // Auto-scale if the model is extremely large or small
                            const box = new THREE.Box3().setFromObject(fbxModel)
                            const size = box.getSize(new THREE.Vector3())
                            const maxDimension = Math.max(size.x, size.y, size.z)
                            
                            // If model is too large (>100 units) or too small (<0.1 units), scale it
                            if (maxDimension > 100) {
                                const scale = 10 / maxDimension
                                fbxModel.scale.setScalar(scale)
                                console.log(`FBX model scaled down by factor: ${scale}`)
                            } else if (maxDimension < 0.1) {
                                const scale = 1 / maxDimension
                                fbxModel.scale.setScalar(scale)
                                console.log(`FBX model scaled up by factor: ${scale}`)
                            }
                            
                            // Ensure proper materials for FBX models
                            this.setupFBXMaterials(fbxModel)
                            
                            // Add model to scene with metadata
                            const metadata = {
                                filename: file.name,
                                fileType: 'FBX',
                                originalFile: file,
                                hasMaterials: this.hasMaterials(fbxModel)
                            }
                            this.addModelWithUndo(fbxModel, metadata)
                            this.sceneManager.recenterCameraOnAllModels()
                            
                            console.log('FBX model loaded successfully')
                            resolve({ model: fbxModel, fileType: 'fbx' })
                        } catch (error) {
                            console.error('Error processing FBX model:', error)
                            reject(error)
                        }
                    },
                    (progress) => {
                        // Optional: Handle loading progress
                        if (progress.lengthComputable) {
                            const percentComplete = (progress.loaded / progress.total) * 100
                            console.log(`FBX loading progress: ${percentComplete.toFixed(2)}%`)
                        }
                    },
                    (error) => {
                        console.error('Error loading FBX file:', error)
                        reject(new Error(`Failed to load FBX file: ${error.message || 'Unknown error'}`))
                    }
                )
            } catch (error) {
                console.error('Error reading FBX file:', error)
                reject(error)
            }
        }
        
        reader.onerror = () => reject(new Error('Failed to read FBX file'))
        reader.readAsArrayBuffer(file)
    }
    
    getSupportedFormats() {
        return ['.glb', '.stl', '.usdz', '.fbx']
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
    
    /**
     * Checks if a model contains SkinnedMesh objects
     * @param {THREE.Object3D} model - The model to check
     * @returns {boolean} - True if the model contains skeletal meshes
     */
    hasSkeletalMeshes(model) {
        let hasSkinnedMesh = false
        
        model.traverse((child) => {
            if (child.isSkinnedMesh) {
                hasSkinnedMesh = true
            }
        })
        
        return hasSkinnedMesh
    }
    
    /**
     * Sets up skeletal meshes for proper hit detection
     * @param {THREE.Object3D} model - The model to process
     */
    setupSkeletalMeshes(model) {
        const skinnedMeshes = []
        
        // Find all SkinnedMesh objects in the model
        model.traverse((child) => {
            if (child.isSkinnedMesh) {
                // Compute initial bounding box for skeletal meshes
                child.computeBoundingBox()
                child.computeBoundingSphere()
                
                // Store reference for future updates
                skinnedMeshes.push(child)
                
                console.log('Found SkinnedMesh:', child.name || 'unnamed', 'with skeleton:', !!child.skeleton)
            }
        })
        
        // Store skeletal meshes reference on the model for later use
        if (skinnedMeshes.length > 0) {
            model.userData.skinnedMeshes = skinnedMeshes
            console.log(`Model contains ${skinnedMeshes.length} skeletal mesh(es)`)
        }
    }
    
    /**
     * Sets up materials for FBX models to ensure proper rendering
     * @param {THREE.Object3D} model - The FBX model to process
     */
    setupFBXMaterials(model) {
        model.traverse((child) => {
            if (child.isMesh) {
                // Ensure materials are properly configured for FBX models
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        // Handle multiple materials
                        child.material.forEach(material => {
                            this.configureFBXMaterial(material)
                        })
                    } else {
                        // Handle single material
                        this.configureFBXMaterial(child.material)
                    }
                } else {
                    // Create default material if none exists
                    child.material = new THREE.MeshStandardMaterial({ color: 0x808080 })
                    console.log('Applied default material to mesh:', child.name || 'unnamed')
                }
            }
        })
    }
    
    /**
     * Configures a single material for optimal FBX rendering
     * @param {THREE.Material} material - The material to configure
     */
    configureFBXMaterial(material) {
        // Ensure proper material properties for FBX models
        if (material.isMeshLambertMaterial || material.isMeshPhongMaterial) {
            // Convert legacy materials to StandardMaterial for better PBR support
            const standardMaterial = new THREE.MeshStandardMaterial()
            
            // Copy basic properties
            standardMaterial.color.copy(material.color)
            standardMaterial.map = material.map
            standardMaterial.transparent = material.transparent
            standardMaterial.opacity = material.opacity
            standardMaterial.side = material.side
            
            return standardMaterial
        } else if (material.isMeshStandardMaterial) {
            // Material is already standard, just ensure proper settings
            material.needsUpdate = true
        }
        
        return material
    }
    
    /**
     * Checks if a model has materials
     * @param {THREE.Object3D} model - The model to check
     * @returns {boolean} - True if the model contains materials
     */
    hasMaterials(model) {
        let hasMats = false
        
        model.traverse((child) => {
            if (child.isMesh && child.material) {
                hasMats = true
            }
        })
        
        return hasMats
    }
}