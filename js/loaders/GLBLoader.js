import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { BaseLoader } from './BaseLoader.js'

/**
 * GLB/GLTF file loader
 */
export class GLBLoader extends BaseLoader {
    constructor(sceneManager) {
        super(sceneManager)
        this.glbLoader = new GLTFLoader()
    }

    /**
     * Gets the file extensions supported by this loader
     * @returns {Array<string>} - Array of supported file extensions
     */
    getSupportedExtensions() {
        return ['.glb']
    }

    /**
     * Loads a GLB file
     * @param {File} file - The GLB file to load
     * @param {Function} resolve - Promise resolve function
     * @param {Function} reject - Promise reject function
     */
    loadFile(file, resolve, reject) {
        const reader = new FileReader()
        
        reader.onload = () => {
            const data = reader.result
            
            this.glbLoader.parse(data, '', (glb) => {
                try {
                    const glbModel = glb.scene
                    
                    // Position model at origin (0,0,0)
                    glbModel.position.set(0, 0, 0)
                    
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
}

