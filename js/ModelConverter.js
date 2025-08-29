import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js'
import { PLYExporter } from 'three/addons/exporters/PLYExporter.js'
import { STLExporter } from 'three/addons/exporters/STLExporter.js'
import { USDZExporter } from 'three/addons/exporters/USDZExporter.js'
import { FileUtils } from './utils/FileUtils.js'

export class ModelConverter {
    constructor(modelLoaders = null) {
        this.exporters = {
            gltf: new GLTFExporter(),
            obj: new OBJExporter(),
            ply: new PLYExporter(),
            stl: new STLExporter(),
            usdz: new USDZExporter()
        }
        
        // Reference to model loaders for preprocessing
        this.modelLoaders = modelLoaders
        
        // Universal format list - all formats available regardless of source file type
        this.supportedFormats = [
            { value: 'glb', label: 'GLB (.glb)' },
            { value: 'gltf', label: 'GLTF (.gltf)' },
            { value: 'obj', label: 'OBJ (.obj)' },
            { value: 'ply', label: 'PLY (.ply)' },
            { value: 'stl', label: 'STL (.stl)' },
            { value: 'usdz', label: 'USDZ (.usdz)' }
        ]
    }
    
    /**
     * Set the model loaders reference for preprocessing functionality
     * @param {ModelLoaders} modelLoaders - The model loaders instance
     */
    setModelLoaders(modelLoaders) {
        this.modelLoaders = modelLoaders
    }
    
    getSupportedFormats(sourceFormat) {
        // Return all supported formats regardless of source file type
        return this.supportedFormats
    }
    
    async exportModel(model, format, progressCallback = null) {
        const exporter = this.exporters[format === 'glb' ? 'gltf' : format]
        if (!exporter) {
            throw new Error(`Exporter for ${format} not found`)
        }

        if (progressCallback) progressCallback('Initializing export...')

        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
        // Check if this is a group (multiple models) or single model
        const isMultipleModels = model.type === 'Group' && model.children.length > 1
        const prefix = isMultipleModels ? 'combined_models' : 'model'
        const filename = `${prefix}_${timestamp}.${format}`

        switch (format) {
            case 'glb':
            case 'gltf':
                return this.exportGLTF(exporter, model, format, filename, progressCallback)

            case 'obj':
                return this.exportOBJ(exporter, model, filename, progressCallback)

            case 'ply':
                return this.exportPLY(exporter, model, filename, progressCallback)

            case 'stl':
                return this.exportSTL(exporter, model, filename, progressCallback)

            case 'usdz':
                return this.exportUSDZ(exporter, model, filename, progressCallback)

            default:
                throw new Error(`Unsupported format: ${format}`)
        }
    }
    
    exportGLTF(exporter, model, format, filename, progressCallback = null) {
        return new Promise((resolve, reject) => {
            try {
                console.log(`Starting ${format.toUpperCase()} export for model:`, model.name || model.type)
                if (progressCallback) progressCallback(`Starting ${format.toUpperCase()} export...`)
                
                // Preprocess the model for GLTF export if ModelLoaders is available
                let exportModel = model
                if (this.modelLoaders && this.modelLoaders.prepareModelForGLTFExport) {
                    console.log('Preprocessing model for GLTF export...')
                    if (progressCallback) progressCallback('Preprocessing model for export...')
                    exportModel = this.modelLoaders.prepareModelForGLTFExport(model)
                    if (progressCallback) progressCallback('Validating textures and materials...')
                } else {
                    console.warn('ModelLoaders not available for preprocessing. Using original model.')
                    if (progressCallback) progressCallback('Validating model...')
                    // Basic material check without preprocessing
                    this.validateModelForGLTFExport(exportModel)
                }
                
                const options = format === 'glb' ? { binary: true } : { binary: false }
                
                // Add error detection and texture handling options
                options.onlyVisible = true // Only export visible objects
                options.truncateDrawRange = true // Handle draw ranges properly
                options.includeCustomExtensions = false // Avoid custom extensions that might cause issues
                options.forcePowerOfTwoTextures = false // Don't force power-of-two for embedded textures
                options.maxTextureSize = 2048 // Limit texture size to avoid memory issues
                
                console.log(`Parsing model with GLTFExporter...`)
                if (progressCallback) progressCallback(`Parsing model with ${format.toUpperCase()} exporter...`)
                
                exporter.parse(exportModel, (result) => {
                    try {
                        console.log(`${format.toUpperCase()} export parsing completed successfully`)
                        if (progressCallback) progressCallback('Generating download file...')
                        
                        if (format === 'glb') {
                            FileUtils.downloadFile(result, filename, 'application/octet-stream')
                        } else {
                            const output = JSON.stringify(result, null, 2)
                            FileUtils.downloadFile(output, filename, 'application/json')
                        }
                        
                        console.log(`${format.toUpperCase()} file "${filename}" downloaded successfully`)
                        resolve({ filename })
                    } catch (error) {
                        console.error(`Error during ${format.toUpperCase()} file generation:`, error)
                        reject(new Error(`Failed to generate ${format.toUpperCase()} file: ${error.message}`))
                    }
                }, (error) => {
                    console.error(`GLTFExporter parse error:`, error)
                    
                    // Provide more specific error messages based on error content
                    let errorMessage = `GLTF export failed: ${error.message || 'Unknown error'}`
                    let hint = ''
                    
                    const errorStr = error.message ? error.message.toLowerCase() : ''
                    
                    if (errorStr.includes('texture') || errorStr.includes('image')) {
                        hint = 'This appears to be a texture-related issue. FBX models may have textures that failed to load or are in unsupported formats. The export process has attempted to create fallback textures, but the original textures may be missing or corrupted.'
                    } else if (errorStr.includes('material')) {
                        hint = 'This may be due to incompatible materials. FBX models with Lambert/Phong materials should be automatically converted to StandardMaterial, but some material properties may not be compatible with GLTF format.'
                    } else if (errorStr.includes('geometry') || errorStr.includes('attribute')) {
                        hint = 'This may be due to invalid geometry data. Check for missing position attributes, corrupted mesh data, or incompatible geometry features.'
                    } else if (errorStr.includes('animation') || errorStr.includes('bone') || errorStr.includes('skeleton')) {
                        hint = 'This may be due to animation or skeleton data that is not compatible with GLTF format. Complex skeletal animations from FBX may need simplification.'
                    } else if (errorStr.includes('buffer') || errorStr.includes('memory')) {
                        hint = 'This may be due to memory limitations or buffer size issues. Try exporting a simpler model or reducing texture sizes.'
                    } else {
                        hint = 'This may be due to general compatibility issues between FBX and GLTF formats. Some FBX features may not be supported in GLTF.'
                    }
                    
                    if (hint) {
                        errorMessage += `\nHint: ${hint}`
                    }
                    
                    reject(new Error(errorMessage))
                }, options)
                
            } catch (error) {
                console.error(`Error preparing ${format.toUpperCase()} export:`, error)
                reject(new Error(`Failed to prepare ${format.toUpperCase()} export: ${error.message}`))
            }
        })
    }
    
    exportOBJ(exporter, model, filename, progressCallback = null) {
        try {
            if (progressCallback) progressCallback('Parsing model with OBJ exporter...')
            const objResult = exporter.parse(model)
            if (progressCallback) progressCallback('Generating download file...')
            FileUtils.downloadFile(objResult, filename, 'text/plain')
            return Promise.resolve({ filename })
        } catch (error) {
            return Promise.reject(error)
        }
    }
    
    exportPLY(exporter, model, filename, progressCallback = null) {
        return new Promise((resolve, reject) => {
            if (progressCallback) progressCallback('Parsing model with PLY exporter...')
            exporter.parse(model, (result) => {
                try {
                    if (progressCallback) progressCallback('Generating download file...')
                    FileUtils.downloadFile(result, filename, 'application/octet-stream')
                    resolve({ filename })
                } catch (error) {
                    reject(error)
                }
            }, { binary: true })
        })
    }
    
    exportSTL(exporter, model, filename, progressCallback = null) {
        try {
            if (progressCallback) progressCallback('Parsing model with STL exporter...')
            const stlResult = exporter.parse(model, { binary: true })
            if (progressCallback) progressCallback('Generating download file...')
            FileUtils.downloadFile(stlResult, filename, 'application/octet-stream')
            return Promise.resolve({ filename })
        } catch (error) {
            return Promise.reject(error)
        }
    }
    
    async exportUSDZ(exporter, model, filename, progressCallback = null) {
        try {
            if (progressCallback) progressCallback('Parsing model with USDZ exporter...')
            const usdzResult = await exporter.parse(model)
            if (progressCallback) progressCallback('Generating download file...')
            FileUtils.downloadFile(usdzResult, filename, 'application/octet-stream')
            return Promise.resolve({ filename })
        } catch (error) {
            return Promise.reject(error)
        }
    }
    
    /**
     * Validates a model for GLTF export compatibility
     * @param {THREE.Object3D} model - The model to validate
     */
    validateModelForGLTFExport(model) {
        const issues = []
        
        model.traverse((child) => {
            if (child.isMesh) {
                // Check for problematic materials
                if (child.material) {
                    const materials = Array.isArray(child.material) ? child.material : [child.material]
                    materials.forEach((material, index) => {
                        if (material.isMeshLambertMaterial || material.isMeshPhongMaterial) {
                            issues.push(`Mesh "${child.name || 'unnamed'}" uses ${material.constructor.name} which may cause export issues. Consider converting to MeshStandardMaterial.`)
                        } else if (material.isShaderMaterial) {
                            issues.push(`Mesh "${child.name || 'unnamed'}" uses ShaderMaterial which is not supported by GLTFExporter.`)
                        }
                    })
                }
                
                // Check geometry
                if (child.geometry && !child.geometry.attributes.position) {
                    issues.push(`Mesh "${child.name || 'unnamed'}" is missing position attributes.`)
                }
            }
        })
        
        if (issues.length > 0) {
            console.warn('GLTF Export validation found potential issues:')
            issues.forEach(issue => console.warn(`- ${issue}`))
        } else {
            console.log('Model validation passed for GLTF export')
        }
        
        return issues
    }
}