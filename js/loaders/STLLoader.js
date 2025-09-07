import * as THREE from 'three'
import { STLLoader as ThreeSTLLoader } from 'three/addons/loaders/STLLoader.js'
import { BaseLoader } from './BaseLoader.js'

/**
 * STL file loader
 */
export class STLLoader extends BaseLoader {
    constructor(sceneManager) {
        super(sceneManager)
        this.stlLoader = new ThreeSTLLoader()
    }

    /**
     * Gets the file extensions supported by this loader
     * @returns {Array<string>} - Array of supported file extensions
     */
    getSupportedExtensions() {
        return ['.stl']
    }

    /**
     * Loads an STL file
     * @param {File} file - The STL file to load
     * @param {Function} resolve - Promise resolve function
     * @param {Function} reject - Promise reject function
     */
    loadFile(file, resolve, reject) {
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
}

