import * as THREE from 'three'
import { IFCLoader as WebIFCLoader } from 'web-ifc-three'
import { IFCSPACE } from 'web-ifc'
import { BaseLoader } from './BaseLoader.js'

/**
 * IFC file loader
 */
export class IFCLoader extends BaseLoader {
    constructor(sceneManager) {
        super(sceneManager)
        this.ifcLoader = new WebIFCLoader()
        this.isInitialized = false
        
        // Initialize IFC loader
        this.initializeIFCLoader()
    }

    /**
     * Gets the file extensions supported by this loader
     * @returns {Array<string>} - Array of supported file extensions
     */
    getSupportedExtensions() {
        return ['.ifc']
    }

    /**
     * Initialize and configure the IFC loader
     */
    async initializeIFCLoader() {
        try {
            console.log('Initializing IFC loader...')
            
            // Set WASM path for web-ifc
            await this.ifcLoader.ifcManager.setWasmPath('https://unpkg.com/web-ifc@0.0.36/')
            
            // Configure optional categories (e.g., hide spaces by default)
            await this.ifcLoader.ifcManager.parser.setupOptionalCategories({
                [IFCSPACE]: false,
            })
            
            // Apply performance optimizations
            await this.ifcLoader.ifcManager.applyWebIfcConfig({
                USE_FAST_BOOLS: true,
                COORDINATE_TO_ORIGIN: true,
                OPTIMIZE_PROFILES: true
            })
            
            this.isInitialized = true
            console.log('IFC loader initialized successfully')
        } catch (error) {
            console.error('Failed to initialize IFC loader:', error)
            // Don't throw - allow app to continue without IFC support
            this.isInitialized = false
        }
    }

    /**
     * Loads an IFC file
     * @param {File} file - The IFC file to load
     * @param {Function} resolve - Promise resolve function
     * @param {Function} reject - Promise reject function
     */
    loadFile(file, resolve, reject) {
        if (!this.isInitialized) {
            reject(new Error('IFC loader not properly initialized. Please refresh the page.'))
            return
        }

        const reader = new FileReader()
        
        reader.onload = async () => {
            try {
                const data = reader.result
                
                console.log('Parsing IFC file...')
                
                // Parse the IFC file using the loader
                const ifcModel = await this.ifcLoader.parse(data)
                
                if (!ifcModel || !ifcModel.mesh) {
                    throw new Error('Failed to parse IFC file - no geometry found')
                }
                
                // Position model at origin (0,0,0)
                ifcModel.mesh.position.set(0, 0, 0)
                
                // Set up basic material if needed
                this.setupIFCMaterials(ifcModel.mesh)
                
                // Add model to scene with metadata
                const metadata = {
                    filename: file.name,
                    fileType: 'IFC',
                    originalFile: file,
                    ifcModelId: ifcModel.modelID || null
                }
                this.addModelWithUndo(ifcModel.mesh, metadata)
                this.sceneManager.recenterCameraOnAllModels()
                
                console.log('IFC model loaded successfully')
                resolve({ model: ifcModel.mesh, fileType: 'ifc' })
            } catch (error) {
                console.error('Error parsing IFC file:', error)
                
                // Provide user-friendly error messages
                let userMessage = 'Failed to load IFC file'
                if (error.message.includes('WASM')) {
                    userMessage = 'IFC loader not properly initialized. Please refresh the page.'
                } else if (error.message.includes('parse')) {
                    userMessage = 'Invalid or corrupted IFC file'
                } else if (error.message.includes('geometry')) {
                    userMessage = 'IFC file contains no displayable geometry'
                }
                
                reject(new Error(`${userMessage}: ${error.message}`))
            }
        }
        
        reader.onerror = () => reject(new Error('Failed to read IFC file'))
        reader.readAsArrayBuffer(file)
    }

    /**
     * Set up materials for IFC models to ensure proper rendering
     * @param {THREE.Object3D} model - The IFC model to process
     */
    setupIFCMaterials(model) {
        model.traverse((child) => {
            if (child.isMesh) {
                // Ensure materials are properly configured for IFC models
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        // Handle multiple materials
                        child.material = child.material.map(material => {
                            return this.configureIFCMaterial(material)
                        })
                    } else {
                        // Handle single material
                        child.material = this.configureIFCMaterial(child.material)
                    }
                } else {
                    // Create default material if none exists
                    child.material = new THREE.MeshStandardMaterial({ color: 0x808080 })
                    console.log('Applied default material to IFC mesh:', child.name || 'unnamed')
                }
            }
        })
    }

    /**
     * Configures a single material for optimal IFC rendering
     * @param {THREE.Material} material - The material to configure
     */
    configureIFCMaterial(material) {
        // Ensure proper material properties for IFC models
        if (material.isMeshLambertMaterial || material.isMeshPhongMaterial) {
            // Convert legacy materials to StandardMaterial for better PBR support
            const standardMaterial = new THREE.MeshStandardMaterial()
            
            // Copy basic properties
            standardMaterial.name = material.name || 'IFC_Material'
            standardMaterial.color.copy(material.color)
            standardMaterial.transparent = material.transparent
            standardMaterial.opacity = material.opacity
            standardMaterial.side = material.side
            standardMaterial.visible = material.visible
            
            // Copy texture maps if they exist
            if (material.map) standardMaterial.map = material.map
            if (material.normalMap) standardMaterial.normalMap = material.normalMap
            if (material.emissiveMap) standardMaterial.emissiveMap = material.emissiveMap
            
            // Set reasonable PBR defaults
            standardMaterial.roughness = 0.7
            standardMaterial.metalness = 0.1
            
            console.log(`Converted ${material.constructor.name} to MeshStandardMaterial:`, standardMaterial.name)
            return standardMaterial
        } else if (material.isMeshStandardMaterial) {
            // Material is already standard, just ensure proper settings
            material.needsUpdate = true
            return material
        } else if (material.isMeshBasicMaterial) {
            // Convert MeshBasicMaterial to MeshStandardMaterial for better lighting
            const standardMaterial = new THREE.MeshStandardMaterial()
            
            standardMaterial.name = material.name || 'IFC_Basic_to_Standard'
            standardMaterial.color.copy(material.color)
            standardMaterial.transparent = material.transparent
            standardMaterial.opacity = material.opacity
            standardMaterial.side = material.side
            standardMaterial.visible = material.visible
            
            if (material.map) standardMaterial.map = material.map
            
            // Set reasonable defaults for PBR
            standardMaterial.roughness = 0.8
            standardMaterial.metalness = 0.0
            
            console.log('Converted MeshBasicMaterial to MeshStandardMaterial for IFC:', standardMaterial.name)
            return standardMaterial
        }
        
        // For any other material type, return as-is but log a note
        console.log('Using existing material type for IFC:', material.constructor.name)
        return material
    }
}

