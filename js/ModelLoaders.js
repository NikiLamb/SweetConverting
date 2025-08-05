import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { STLLoader } from 'three/addons/loaders/STLLoader.js'
import { USDZLoader } from 'three/addons/loaders/USDZLoader.js'

export class ModelLoaders {
    constructor(sceneManager) {
        this.sceneManager = sceneManager
        this.glbLoader = new GLTFLoader()
        this.stlLoader = new STLLoader()
        this.usdzLoader = new USDZLoader()
    }
    
    async loadModelFile(file, statusCallback = null) {
        return new Promise((resolve, reject) => {
            if (!file) {
                reject(new Error('No file selected'))
                return
            }
            
            console.log('File selected:', file.name, 'Size:', file.size, 'Type:', file.type)
            const fileName = file.name.toLowerCase()
            
            if (fileName.endsWith('.glb')) {
                console.log('Loading GLB file')
                if (statusCallback) statusCallback('Parsing GLB model...')
                this.loadGLBFile(file, resolve, reject, statusCallback)
            } else if (fileName.endsWith('.stl')) {
                console.log('Loading STL file')
                if (statusCallback) statusCallback('Parsing STL model...')
                this.loadSTLFile(file, resolve, reject, statusCallback)
            } else if (fileName.endsWith('.usdz')) {
                console.log('Loading USDZ file')
                if (statusCallback) statusCallback('Parsing USDZ model...')
                this.loadUSDZFile(file, resolve, reject, statusCallback)
            } else {
                const error = 'Unsupported file type. Please select a GLB, STL, or USDZ file.'
                console.error(error)
                reject(new Error(error))
            }
        })
    }
    
    loadGLBFile(file, resolve, reject, statusCallback = null) {
        const reader = new FileReader()
        
        reader.onload = () => {
            const data = reader.result
            
            this.glbLoader.parse(data, '', (glb) => {
                try {
                    const glbModel = glb.scene
                    if (statusCallback) statusCallback('Adding model to scene...')
                    this.sceneManager.addModel(glbModel)
                    this.sceneManager.recenterCameraOnModel(glbModel)
                    console.log('GLB model loaded and added to scene')
                    resolve({ model: glbModel, fileType: 'glb' })
                } catch (error) {
                    console.error('Error processing GLB:', error)
                    reject(error)
                }
            }, (xhr) => {
                // Progress callback
                if (xhr.lengthComputable) {
                    const percentComplete = (xhr.loaded / xhr.total) * 100
                    console.log(`Loading: ${percentComplete.toFixed(2)}%`)
                }
            }, (error) => {
                console.error('Error loading GLB:', error)
                reject(error)
            })
        }
        
        reader.onerror = () => {
            const error = 'Error reading file'
            console.error(error)
            reject(new Error(error))
        }
        
        reader.readAsArrayBuffer(file)
    }
    
    loadSTLFile(file, resolve, reject, statusCallback = null) {
        const reader = new FileReader()
        
        reader.onload = () => {
            try {
                const data = reader.result
                const geometry = this.stlLoader.parse(data)
                
                // Create material for STL
                const material = new THREE.MeshPhongMaterial({ 
                    color: 0xAAAAAA,
                    specular: 0x111111,
                    shininess: 200
                })
                
                const stlModel = new THREE.Mesh(geometry, material)
                
                // Center the geometry
                geometry.computeBoundingBox()
                geometry.center()
                
                // Scale down by 10 the model
                stlModel.scale.set(0.1, 0.1, 0.1)
                
                // Pivot 90 degrees around the X axis
                stlModel.rotateX(-Math.PI / 2)
                
                if (statusCallback) statusCallback('Adding model to scene...')
                this.sceneManager.addModel(stlModel)
                this.sceneManager.recenterCameraOnModel(stlModel)
                console.log('STL model loaded and added to scene')
                resolve({ model: stlModel, fileType: 'stl' })
            } catch (error) {
                console.error('Error processing STL:', error)
                reject(error)
            }
        }
        
        reader.onerror = () => {
            const error = 'Error reading file'
            console.error(error)
            reject(new Error(error))
        }
        
        reader.readAsArrayBuffer(file)
    }
    
    loadUSDZFile(file, resolve, reject, statusCallback = null) {
        const reader = new FileReader()
        
        reader.onload = () => {
            const data = reader.result
            
            this.usdzLoader.parse(data, (usdzModel) => {
                try {
                    if (statusCallback) statusCallback('Adding model to scene...')
                    this.sceneManager.addModel(usdzModel)
                    this.sceneManager.recenterCameraOnModel(usdzModel)
                    console.log('USDZ model loaded and added to scene')
                    resolve({ model: usdzModel, fileType: 'usdz' })
                } catch (error) {
                    console.error('Error processing USDZ:', error)
                    reject(error)
                }
            }, (error) => {
                console.error('Error loading USDZ:', error)
                reject(error)
            })
        }
        
        reader.onerror = () => {
            const error = 'Error reading file'
            console.error(error)
            reject(new Error(error))
        }
        
        reader.readAsArrayBuffer(file)
    }
    
    getSupportedFormats() {
        return ['.glb', '.stl', '.usdz']
    }
}