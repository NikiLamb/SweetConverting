import { USDZLoader as ThreeUSDZLoader } from 'three/addons/loaders/USDZLoader.js'
import { BaseLoader } from './BaseLoader.js'

/**
 * USDZ file loader
 */
export class USDZLoader extends BaseLoader {
    constructor(sceneManager) {
        super(sceneManager)
        this.usdzLoader = new ThreeUSDZLoader()
    }

    /**
     * Gets the file extensions supported by this loader
     * @returns {Array<string>} - Array of supported file extensions
     */
    getSupportedExtensions() {
        return ['.usdz']
    }

    /**
     * Loads a USDZ file
     * @param {File} file - The USDZ file to load
     * @param {Function} resolve - Promise resolve function
     * @param {Function} reject - Promise reject function
     */
    loadFile(file, resolve, reject) {
        const reader = new FileReader()
        
        reader.onload = () => {
            try {
                const data = reader.result
                const usdzModel = this.usdzLoader.parse(data)
                
                // Position model at origin (0,0,0)
                usdzModel.position.set(0, 0, 0)
                
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
}

