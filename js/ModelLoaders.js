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
                            
                                        // Handle texture loading and material setup for FBX models
            this.handleFBXTextures(fbxModel)
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
     * Handles texture loading and validation for FBX models
     * @param {THREE.Object3D} model - The FBX model to process
     */
    handleFBXTextures(model) {
        console.log('Processing FBX textures for export compatibility...')
        
        model.traverse((child) => {
            if (child.isMesh && child.material) {
                const materials = Array.isArray(child.material) ? child.material : [child.material]
                
                materials.forEach((material, index) => {
                    this.validateAndFixTextures(material, child.name || 'unnamed')
                })
            }
        })
    }
    
    /**
     * Validates and fixes texture issues for a material
     * @param {THREE.Material} material - The material to validate
     * @param {string} meshName - Name of the mesh for logging
     */
    validateAndFixTextures(material, meshName) {
        const textureProperties = [
            'map', 'normalMap', 'bumpMap', 'displacementMap', 
            'emissiveMap', 'alphaMap', 'roughnessMap', 'metalnessMap'
        ]
        
        textureProperties.forEach(prop => {
            if (material[prop]) {
                const texture = material[prop]
                
                // Check if texture has valid image data
                if (!texture.image || texture.image.width === undefined || texture.image.height === undefined) {
                    console.warn(`Invalid texture ${prop} found on mesh "${meshName}". Removing for export compatibility.`)
                    material[prop] = null
                    return
                }
                
                // Check if texture failed to load
                if (texture.image instanceof HTMLImageElement && !texture.image.complete) {
                    console.warn(`Unloaded texture ${prop} found on mesh "${meshName}". Creating fallback.`)
                    this.createFallbackTexture(material, prop)
                    return
                }
                
                // Check for blob URLs that might cause export issues
                if (texture.image && texture.image.src && texture.image.src.startsWith('blob:')) {
                    console.log(`Found blob URL texture ${prop} on mesh "${meshName}". This should work for export.`)
                }
                
                // Ensure texture is ready for export
                if (texture.image && texture.needsUpdate !== false) {
                    texture.needsUpdate = true
                }
            }
        })
    }
    
    /**
     * Creates a fallback texture for failed texture loads
     * @param {THREE.Material} material - The material to add fallback to
     * @param {string} textureProperty - The texture property name
     */
    createFallbackTexture(material, textureProperty) {
        // Create a small colored texture as fallback
        const canvas = document.createElement('canvas')
        canvas.width = 64
        canvas.height = 64
        const ctx = canvas.getContext('2d')
        
        // Different colors for different texture types
        const colorMap = {
            'map': '#808080',           // Gray for diffuse
            'normalMap': '#8080FF',     // Blue for normal maps
            'roughnessMap': '#808080',  // Gray for roughness
            'metalnessMap': '#000000',  // Black for metalness
            'emissiveMap': '#000000',   // Black for emissive
            'alphaMap': '#FFFFFF',      // White for alpha
            'bumpMap': '#808080',       // Gray for bump
            'displacementMap': '#808080' // Gray for displacement
        }
        
        ctx.fillStyle = colorMap[textureProperty] || '#808080'
        ctx.fillRect(0, 0, 64, 64)
        
        // Create texture from canvas
        const fallbackTexture = new THREE.CanvasTexture(canvas)
        fallbackTexture.needsUpdate = true
        
        material[textureProperty] = fallbackTexture
        console.log(`Created fallback texture for ${textureProperty}`)
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
                        child.material = child.material.map(material => {
                            return this.configureFBXMaterial(material)
                        })
                    } else {
                        // Handle single material
                        child.material = this.configureFBXMaterial(child.material)
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
            standardMaterial.name = material.name || 'FBX_Material'
            standardMaterial.color.copy(material.color)
            standardMaterial.transparent = material.transparent
            standardMaterial.opacity = material.opacity
            standardMaterial.side = material.side
            standardMaterial.visible = material.visible
            
            // Copy texture maps
            if (material.map) standardMaterial.map = material.map
            if (material.normalMap) standardMaterial.normalMap = material.normalMap
            if (material.bumpMap) standardMaterial.bumpMap = material.bumpMap
            if (material.displacementMap) standardMaterial.displacementMap = material.displacementMap
            if (material.emissiveMap) standardMaterial.emissiveMap = material.emissiveMap
            if (material.alphaMap) standardMaterial.alphaMap = material.alphaMap
            
            // Convert emissive properties
            if (material.emissive) {
                standardMaterial.emissive.copy(material.emissive)
            }
            
            // Handle Phong-specific properties
            if (material.isMeshPhongMaterial) {
                // Convert shininess to roughness (inverse relationship)
                const roughness = Math.max(0.1, Math.min(1.0, 1.0 - (material.shininess / 100)))
                standardMaterial.roughness = roughness
                standardMaterial.metalness = 0.0 // Phong materials are typically non-metallic
                
                if (material.specular) {
                    // Use specular intensity to influence metalness
                    const specularIntensity = (material.specular.r + material.specular.g + material.specular.b) / 3
                    standardMaterial.metalness = Math.min(0.5, specularIntensity)
                }
            } else {
                // Lambert material - set reasonable PBR defaults
                standardMaterial.roughness = 0.8
                standardMaterial.metalness = 0.0
            }
            
            console.log(`Converted ${material.constructor.name} to MeshStandardMaterial:`, standardMaterial.name)
            return standardMaterial
        } else if (material.isMeshStandardMaterial) {
            // Material is already standard, just ensure proper settings
            material.needsUpdate = true
            return material
        } else if (material.isMeshBasicMaterial) {
            // Convert MeshBasicMaterial to MeshStandardMaterial for better GLTF compatibility
            const standardMaterial = new THREE.MeshStandardMaterial()
            
            standardMaterial.name = material.name || 'Basic_to_Standard'
            standardMaterial.color.copy(material.color)
            standardMaterial.transparent = material.transparent
            standardMaterial.opacity = material.opacity
            standardMaterial.side = material.side
            standardMaterial.visible = material.visible
            
            if (material.map) standardMaterial.map = material.map
            if (material.alphaMap) standardMaterial.alphaMap = material.alphaMap
            
            // Set reasonable defaults for PBR
            standardMaterial.roughness = 0.8
            standardMaterial.metalness = 0.0
            
            console.log('Converted MeshBasicMaterial to MeshStandardMaterial:', standardMaterial.name)
            return standardMaterial
        }
        
        // For any other material type, return as-is but log a warning
        console.warn('Unsupported material type for GLTF export:', material.constructor.name)
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
    
    /**
     * Creates an export-ready clone of a model, optimized for GLTF export
     * @param {THREE.Object3D} model - The model to prepare for export
     * @returns {THREE.Object3D} - A clone optimized for GLTF export
     */
    prepareModelForGLTFExport(model) {
        console.log('Preparing model for GLTF export:', model.name || 'unnamed')
        
        // Create a deep clone of the model
        const exportModel = model.clone(true)
        
        // Handle textures first to ensure they're valid for export
        console.log('Validating textures for GLTF export...')
        this.handleFBXTextures(exportModel)
        
        // Convert all materials to GLTF-compatible formats
        this.setupFBXMaterials(exportModel)
        
        // Additional texture validation after material conversion
        this.validateExportTextures(exportModel)
        
        // Handle special objects that might cause export issues
        exportModel.traverse((child) => {
            // Ensure all meshes have proper geometry
            if (child.isMesh && child.geometry) {
                // Ensure geometry attributes are up to date
                if (!child.geometry.attributes.position) {
                    console.warn('Mesh missing position attribute:', child.name || 'unnamed')
                    return
                }
                
                // Ensure normals exist for proper lighting
                if (!child.geometry.attributes.normal) {
                    child.geometry.computeVertexNormals()
                    console.log('Computed missing normals for mesh:', child.name || 'unnamed')
                }
                
                // Ensure UVs exist if the material has textures
                if (!child.geometry.attributes.uv && child.material && this.materialHasTextures(child.material)) {
                    console.warn('Mesh with textured material missing UV coordinates:', child.name || 'unnamed')
                    // Create basic UV mapping if missing
                    this.generateBasicUVs(child.geometry)
                }
            }
            
            // Handle SkinnedMesh objects
            if (child.isSkinnedMesh) {
                // Ensure skeleton is properly bound
                if (child.skeleton) {
                    child.skeleton.update()
                    console.log('Updated skeleton for SkinnedMesh:', child.name || 'unnamed')
                }
            }
            
            // Remove any objects that shouldn't be exported
            if (child.isHelper || child.isLight || child.isCamera) {
                console.log('Removing non-exportable object:', child.constructor.name, child.name || 'unnamed')
                if (child.parent) {
                    child.parent.remove(child)
                }
            }
        })
        
        console.log('Model prepared for GLTF export successfully')
        return exportModel
    }
    
    /**
     * Validates textures for export compatibility after material conversion
     * @param {THREE.Object3D} model - The model to validate
     */
    validateExportTextures(model) {
        console.log('Final texture validation for export...')
        
        model.traverse((child) => {
            if (child.isMesh && child.material) {
                const materials = Array.isArray(child.material) ? child.material : [child.material]
                
                materials.forEach(material => {
                    // Ensure all textures have proper properties for GLTF export
                    const textureProps = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'alphaMap']
                    
                    textureProps.forEach(prop => {
                        if (material[prop]) {
                            const texture = material[prop]
                            
                            // Ensure texture has proper wrapping modes (GLTF prefers repeat)
                            if (texture.wrapS === undefined) texture.wrapS = THREE.RepeatWrapping
                            if (texture.wrapT === undefined) texture.wrapT = THREE.RepeatWrapping
                            
                            // Ensure texture has proper filtering
                            if (texture.minFilter === undefined) texture.minFilter = THREE.LinearMipmapLinearFilter
                            if (texture.magFilter === undefined) texture.magFilter = THREE.LinearFilter
                            
                            // Force texture update
                            texture.needsUpdate = true
                        }
                    })
                })
            }
        })
    }
    
    /**
     * Generates basic UV coordinates for geometry missing UVs
     * @param {THREE.BufferGeometry} geometry - The geometry to add UVs to
     */
    generateBasicUVs(geometry) {
        if (!geometry.attributes.position) {
            console.warn('Cannot generate UVs: geometry missing position attribute')
            return
        }
        
        const positions = geometry.attributes.position.array
        const uvs = new Float32Array(positions.length / 3 * 2)
        
        // Simple planar UV mapping based on X,Z coordinates
        for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i]
            const z = positions[i + 2]
            
            // Normalize coordinates to 0-1 range (simple box projection)
            uvs[(i / 3) * 2] = (x + 1) * 0.5
            uvs[(i / 3) * 2 + 1] = (z + 1) * 0.5
        }
        
        geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
        console.log('Generated basic UV coordinates for geometry')
    }
    
    /**
     * Checks if a material has any textures
     * @param {THREE.Material|Array} material - The material to check
     * @returns {boolean} - True if the material has textures
     */
    materialHasTextures(material) {
        if (Array.isArray(material)) {
            return material.some(mat => this.materialHasTextures(mat))
        }
        
        return !!(material.map || material.normalMap || material.bumpMap || 
                 material.emissiveMap || material.roughnessMap || material.metalnessMap ||
                 material.alphaMap || material.displacementMap)
    }
}