import { GLBLoader } from './GLBLoader.js'
import { STLLoader } from './STLLoader.js'
import { USDZLoader } from './USDZLoader.js'
import { FBXLoader } from './FBXLoader.js'
import { IFCLoader } from './IFCLoader.js'

/**
 * LoaderManager - Orchestrates all model loaders and maintains the same public API as the original ModelLoaders
 */
export class LoaderManager {
    constructor(sceneManager) {
        this.sceneManager = sceneManager
        this.loadedModelsCount = 0  // Track number of models loaded in current session
        this.historyManager = null  // Reference to history manager for undo/redo
        this.uiManager = null       // Reference to UI manager for UI updates
        
        // Initialize all loaders
        this.loaders = new Map()
        this.initializeLoaders()
    }

    /**
     * Initialize all individual loaders
     */
    initializeLoaders() {
        const glbLoader = new GLBLoader(this.sceneManager)
        const stlLoader = new STLLoader(this.sceneManager)
        const usdzLoader = new USDZLoader(this.sceneManager)
        const fbxLoader = new FBXLoader(this.sceneManager)
        const ifcLoader = new IFCLoader(this.sceneManager)

        // Map file extensions to their respective loaders
        glbLoader.getSupportedExtensions().forEach(ext => {
            this.loaders.set(ext, glbLoader)
        })
        
        stlLoader.getSupportedExtensions().forEach(ext => {
            this.loaders.set(ext, stlLoader)
        })
        
        usdzLoader.getSupportedExtensions().forEach(ext => {
            this.loaders.set(ext, usdzLoader)
        })
        
        fbxLoader.getSupportedExtensions().forEach(ext => {
            this.loaders.set(ext, fbxLoader)
        })
        
        ifcLoader.getSupportedExtensions().forEach(ext => {
            this.loaders.set(ext, ifcLoader)
        })

        console.log('All loaders initialized:', Array.from(this.loaders.keys()))
    }

    /**
     * Sets the history manager for undo/redo functionality
     * @param {HistoryManager} historyManager - The history manager instance
     */
    setHistoryManager(historyManager) {
        this.historyManager = historyManager
        
        // Pass the history manager to all loaders
        for (const loader of this.loaders.values()) {
            if (loader.setHistoryManager) {
                loader.setHistoryManager(historyManager)
            }
        }
        console.log('HistoryManager set in LoaderManager and all loaders')
    }

    /**
     * Sets the UI manager for UI updates
     * @param {UIManager} uiManager - The UI manager instance
     */
    setUIManager(uiManager) {
        this.uiManager = uiManager
        
        // Pass the UI manager to all loaders
        for (const loader of this.loaders.values()) {
            if (loader.setUIManager) {
                loader.setUIManager(uiManager)
            }
        }
        console.log('UIManager set in LoaderManager and all loaders')
    }

    /**
     * Reset the loaded models counter (call when clearing models)
     */
    resetLoadedModelsCount() {
        this.loadedModelsCount = 0
    }

    /**
     * Main method to load a model file - maintains same API as original ModelLoaders
     * @param {File} file - The file to load
     * @returns {Promise} - Promise resolving to model data
     */
    async loadModelFile(file) {
        return new Promise((resolve, reject) => {
            if (!file) {
                reject(new Error('No file selected'))
                return
            }
            
            console.log('File selected:', file.name, 'Size:', file.size, 'Type:', file.type)
            const fileName = file.name.toLowerCase()
            
            // Find the appropriate loader based on file extension
            let selectedLoader = null
            let fileExtension = null
            
            for (const [extension, loader] of this.loaders.entries()) {
                if (fileName.endsWith(extension)) {
                    selectedLoader = loader
                    fileExtension = extension
                    break
                }
            }
            
            if (!selectedLoader) {
                const supportedFormats = Array.from(this.loaders.keys()).join(', ')
                const error = `Unsupported file type. Please select a file with one of these extensions: ${supportedFormats}.`
                console.error(error)
                reject(new Error(error))
                return
            }
            
            console.log(`Loading ${fileExtension.toUpperCase()} file using ${selectedLoader.constructor.name}`)
            
            // Use the appropriate loader to load the file
            selectedLoader.loadFile(file, (result) => {
                this.loadedModelsCount++
                resolve(result)
            }, reject)
        })
    }

    /**
     * Gets supported file formats - maintains same API as original ModelLoaders
     * @returns {Array<string>} - Array of supported file extensions
     */
    getSupportedFormats() {
        return Array.from(this.loaders.keys())
    }

    /**
     * Prepares a model for GLTF export - delegates to FBX loader if available
     * This method is used by ModelConverter for preprocessing
     * @param {THREE.Object3D} model - The model to prepare for export
     * @returns {THREE.Object3D} - A clone optimized for GLTF export
     */
    prepareModelForGLTFExport(model) {
        // Find the FBX loader which has the most comprehensive export preparation logic
        const fbxLoader = Array.from(this.loaders.values()).find(loader => 
            loader.constructor.name === 'FBXLoader'
        )
        
        if (fbxLoader && fbxLoader.prepareModelForGLTFExport) {
            return fbxLoader.prepareModelForGLTFExport(model)
        } else {
            console.warn('FBX loader not available for model export preparation. Using original model.')
            return model.clone(true)
        }
    }

    /**
     * Gets a specific loader by file extension (for advanced usage)
     * @param {string} extension - The file extension (e.g., '.glb')
     * @returns {BaseLoader|null} - The loader for the extension or null if not found
     */
    getLoaderByExtension(extension) {
        return this.loaders.get(extension.toLowerCase()) || null
    }

    /**
     * Gets all available loaders (for advanced usage)
     * @returns {Map<string, BaseLoader>} - Map of extension to loader
     */
    getAllLoaders() {
        return new Map(this.loaders)
    }
}

