import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js'
import { PLYExporter } from 'three/addons/exporters/PLYExporter.js'
import { STLExporter } from 'three/addons/exporters/STLExporter.js'
import { USDZExporter } from 'three/addons/exporters/USDZExporter.js'
import { FileUtils } from './utils/FileUtils.js'

export class ModelConverter {
    constructor() {
        this.exporters = {
            gltf: new GLTFExporter(),
            obj: new OBJExporter(),
            ply: new PLYExporter(),
            stl: new STLExporter(),
            usdz: new USDZExporter()
        }
        
        this.formatMappings = {
            'glb': [
                { value: 'obj', label: 'OBJ (.obj)' },
                { value: 'ply', label: 'PLY (.ply)' },
                { value: 'stl', label: 'STL (.stl)' },
                { value: 'usdz', label: 'USDZ (.usdz)' },
                { value: 'gltf', label: 'GLTF (.gltf)' }
            ],
            'stl': [
                { value: 'obj', label: 'OBJ (.obj)' },
                { value: 'ply', label: 'PLY (.ply)' },
                { value: 'glb', label: 'GLB (.glb)' },
                { value: 'usdz', label: 'USDZ (.usdz)' }
            ],
            'usdz': [
                { value: 'glb', label: 'GLB (.glb)' },
                { value: 'gltf', label: 'GLTF (.gltf)' },
                { value: 'obj', label: 'OBJ (.obj)' },
                { value: 'ply', label: 'PLY (.ply)' },
                { value: 'stl', label: 'STL (.stl)' }
            ]
        }
    }
    
    getSupportedFormats(sourceFormat) {
        return this.formatMappings[sourceFormat] || []
    }
    
    async exportModel(model, format) {
        const exporter = this.exporters[format === 'glb' ? 'gltf' : format]
        if (!exporter) {
            throw new Error(`Exporter for ${format} not found`)
        }

        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
        const filename = `model_${timestamp}.${format}`

        switch (format) {
            case 'glb':
            case 'gltf':
                return this.exportGLTF(exporter, model, format, filename)

            case 'obj':
                return this.exportOBJ(exporter, model, filename)

            case 'ply':
                return this.exportPLY(exporter, model, filename)

            case 'stl':
                return this.exportSTL(exporter, model, filename)

            case 'usdz':
                return this.exportUSDZ(exporter, model, filename)

            default:
                throw new Error(`Unsupported format: ${format}`)
        }
    }
    
    exportGLTF(exporter, model, format, filename) {
        return new Promise((resolve, reject) => {
            const options = format === 'glb' ? { binary: true } : { binary: false }
            exporter.parse(model, (result) => {
                try {
                    if (format === 'glb') {
                        FileUtils.downloadFile(result, filename, 'application/octet-stream')
                    } else {
                        const output = JSON.stringify(result, null, 2)
                        FileUtils.downloadFile(output, filename, 'application/json')
                    }
                    resolve()
                } catch (error) {
                    reject(error)
                }
            }, reject, options)
        })
    }
    
    exportOBJ(exporter, model, filename) {
        try {
            const objResult = exporter.parse(model)
            FileUtils.downloadFile(objResult, filename, 'text/plain')
            return Promise.resolve()
        } catch (error) {
            return Promise.reject(error)
        }
    }
    
    exportPLY(exporter, model, filename) {
        return new Promise((resolve, reject) => {
            exporter.parse(model, (result) => {
                try {
                    FileUtils.downloadFile(result, filename, 'application/octet-stream')
                    resolve()
                } catch (error) {
                    reject(error)
                }
            }, { binary: true })
        })
    }
    
    exportSTL(exporter, model, filename) {
        try {
            const stlResult = exporter.parse(model, { binary: true })
            FileUtils.downloadFile(stlResult, filename, 'application/octet-stream')
            return Promise.resolve()
        } catch (error) {
            return Promise.reject(error)
        }
    }
    
    async exportUSDZ(exporter, model, filename) {
        try {
            const usdzResult = await exporter.parse(model)
            FileUtils.downloadFile(usdzResult, filename, 'application/octet-stream')
            return Promise.resolve()
        } catch (error) {
            return Promise.reject(error)
        }
    }
}