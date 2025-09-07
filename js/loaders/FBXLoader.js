import * as THREE from 'three'
import { FBXLoader as ThreeFBXLoader } from 'three/addons/loaders/FBXLoader.js'
import { BaseLoader } from './BaseLoader.js'

/**
 * FBX file loader
 */
export class FBXLoader extends BaseLoader {
    constructor(sceneManager) {
        super(sceneManager)
        this.fbxLoader = new ThreeFBXLoader()
    }

    /**
     * Gets the file extensions supported by this loader
     * @returns {Array<string>} - Array of supported file extensions
     */
    getSupportedExtensions() {
        return ['.fbx']
    }

    /**
     * Loads an FBX file
     * @param {File} file - The FBX file to load
     * @param {Function} resolve - Promise resolve function
     * @param {Function} reject - Promise reject function
     */
    loadFile(file, resolve, reject) {
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
}

