import * as THREE from 'three'
import { LoadModelCommand } from '../commands/LoadModelCommand.js'

/**
 * Base class for all model loaders with common functionality
 */
export class BaseLoader {
    constructor(sceneManager) {
        this.sceneManager = sceneManager
        this.historyManager = null
        this.uiManager = null
    }

    /**
     * Sets the history manager for undo/redo functionality
     * @param {HistoryManager} historyManager - The history manager instance
     */
    setHistoryManager(historyManager) {
        this.historyManager = historyManager
    }

    /**
     * Sets the UI manager for UI updates
     * @param {UIManager} uiManager - The UI manager instance
     */
    setUIManager(uiManager) {
        this.uiManager = uiManager
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

    /**
     * Abstract method to be implemented by subclasses
     * @param {File} file - The file to load
     * @param {Function} resolve - Promise resolve function
     * @param {Function} reject - Promise reject function
     */
    loadFile(file, resolve, reject) {
        throw new Error('loadFile method must be implemented by subclasses')
    }

    /**
     * Gets the file extension(s) supported by this loader
     * @returns {Array<string>} - Array of supported file extensions
     */
    getSupportedExtensions() {
        throw new Error('getSupportedExtensions method must be implemented by subclasses')
    }
}

