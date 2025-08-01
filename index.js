import * as THREE from 'three'
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'
import {STLLoader} from 'three/addons/loaders/STLLoader.js'
import {USDZLoader} from 'three/addons/loaders/USDZLoader.js'
import {OrbitControls} from 'three/addons/controls/OrbitControls.js'
// Import exporters
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js'
import {OBJExporter} from 'three/addons/exporters/OBJExporter.js'
import {PLYExporter} from 'three/addons/exporters/PLYExporter.js'
import {STLExporter} from 'three/addons/exporters/STLExporter.js'
import {USDZExporter} from 'three/addons/exporters/USDZExporter.js'


const canvas = document.querySelector('canvas.webgl')
const scene = new THREE.Scene()

const camera = new THREE.PerspectiveCamera(75,
    window.innerWidth/window.innerHeight,
    0.01,
    100
)
camera.position.set(.25,.25,.25)
camera.lookAt(0,0,0)
scene.add(camera)

const renderer = new THREE.WebGLRenderer({
    canvas: canvas
})
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.shadowMap.enabled = true
renderer.gammaOutput = true

const viewerContainer = document.getElementById('viewer-container')
const models = []

//GLB Loader
function loadGLBFile(event) {
    const file = event.target.files[0];
  
    const reader = new FileReader()
    reader.onload = function () {
        const data = reader.result
  
        const glbLoader = new GLTFLoader()
        glbLoader.parse(data, '', function (glb) {
            // Only append renderer if it's not already in the container
            if (!viewerContainer.contains(renderer.domElement)) {
                viewerContainer.appendChild(renderer.domElement)
            }
            const glbModel = glb.scene
            models.push(glbModel)
            scene.add(glbModel)

            // Update conversion state
            updateConversionState('glb', glbModel)

            console.log("GLB Model added")
            animate()
        })
    }
  
    reader.readAsArrayBuffer(file)
  }

//STL Loader
function loadSTLFile(event) {
    const file = event.target.files[0];
  
    const reader = new FileReader()
    reader.onload = function () {
        const data = reader.result
  
        const stlLoader = new STLLoader()
        const geometry = stlLoader.parse(data)

        let stlMaterial
        if (geometry.hasColors) {
            geometry.computeVertexNormals()
            stlMaterial = new THREE.MeshPhongMaterial({ opacity: geometry.alpha, vertexColors: true });
        } else {
            stlMaterial = new THREE.MeshStandardMaterial({color: 0x808080})
        }
        const stlModel = new THREE.Mesh(geometry, stlMaterial)

        //scale down by 10 the model
        stlModel.scale.set(0.1, 0.1, 0.1)

        //Pivot 90 degrees around the Y axis
        stlModel.rotateX(- Math.PI / 2)

        // Only append renderer if it's not already in the container
        if (!viewerContainer.contains(renderer.domElement)) {
            viewerContainer.appendChild(renderer.domElement)
        }
        models.push(stlModel)
        scene.add(stlModel)

        // Update conversion state
        updateConversionState('stl', stlModel)

        console.log("STL Model added")
        animate()
    }
  
    reader.readAsArrayBuffer(file)
  }

//USDZ Loader
function loadUSDZFile(event) {
    const file = event.target.files[0];
  
    const reader = new FileReader()
    reader.onload = function () {
        const data = reader.result
  
        const usdzLoader = new USDZLoader()
        usdzLoader.parse(data, function (usdzModel) {
            // Only append renderer if it's not already in the container
            if (!viewerContainer.contains(renderer.domElement)) {
                viewerContainer.appendChild(renderer.domElement)
            }
            
            models.push(usdzModel)
            scene.add(usdzModel)

            // Update conversion state
            updateConversionState('usdz', usdzModel)

            console.log("USDZ Model added")
            animate()
        })
    }
  
    reader.readAsArrayBuffer(file)
  }

//Unified model loader - detects file type and calls appropriate loader
function loadModelFile(event) {
    console.log('loadModelFile called', event)
    const file = event.target.files[0];
    if (!file) {
        console.log('No file selected')
        return;
    }
    
    console.log('File selected:', file.name, 'Size:', file.size, 'Type:', file.type)
    const fileName = file.name.toLowerCase();
    
    if (fileName.endsWith('.glb')) {
        console.log('Loading GLB file')
        loadGLBFile(event);
    } else if (fileName.endsWith('.stl')) {
        console.log('Loading STL file')
        loadSTLFile(event);
    } else if (fileName.endsWith('.usdz')) {
        console.log('Loading USDZ file')
        loadUSDZFile(event);
    } else {
        console.error('Unsupported file type. Please select a GLB, STL, or USDZ file.');
        alert('Unsupported file type. Please select a GLB, STL, or USDZ file.');
    }
}

//Load a model file in the Viewer
// Moved to initializeMainUI function for proper DOM ready handling

//Clear Any kind of models in the Viewer
function clearModels(){
    // Remove models from the scene but keep the renderer's DOM element
    for (let i = 0; i < models.length; i++) {
        scene.remove(models[i])
    }

    models.length = 0
    
    // Hide conversion section when models are cleared
    if (conversionSection) {
        conversionSection.style.display = 'none'
    }
    currentModel = null
    currentLoadedFileType = null
    
    console.log("Model removed")
    console.log(models)
    animate()
}

const light1 = new THREE.DirectionalLight(0xffffff, 1)
scene.add(light1)
light1.position.set(2,2,10)
light1.lookAt(0,0,0)

const light2 = new THREE.DirectionalLight(0xffffff, 1)
scene.add(light2)
light2.position.set(-2,2,10)
light2.lookAt(0,0,0)

const light3 = new THREE.DirectionalLight(0xffffff, 1)
scene.add(light3)
light3.position.set(0,-2,10)
light3.lookAt(0,0,0)

const lightUnder = new THREE.DirectionalLight(0xffffff, 1)
scene.add(lightUnder)
lightUnder.position.set(0,0,-5)
lightUnder.lookAt(0,0,0)

const controls = new OrbitControls( camera, renderer.domElement )
// controls.addEventListener( 'change', render ); // use if there is no animation loop
controls.minDistance = .1
controls.maxDistance = 50
controls.target.set( 0, 0, - 0.2 )
controls.update()

function animate(){
    requestAnimationFrame(animate)
    renderer.render( scene, camera )
}

function onWindowResize() {
    camera.aspect = window.innerWidth/window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
}

window.addEventListener('resize', onWindowResize, false)

animate()

// Conversion System
let currentLoadedFileType = null
let currentModel = null

// Format mapping based on loaded file type
const formatMappings = {
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

// Initialize exporters
const exporters = {
    gltf: new GLTFExporter(),
    obj: new OBJExporter(),
    ply: new PLYExporter(),
    stl: new STLExporter(),
    usdz: new USDZExporter()
}

// UI Elements - wrapped in DOM ready check
let conversionSection, formatSelector, convertButton, conversionStatus
let modelLoadButton, modelFileInput, clearButton

// Alternative fallback for module scripts that might load after DOMContentLoaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeUI)
} else {
    initializeUI()
}

function initializeUI() {
    // Initialize main UI elements
    modelLoadButton = document.getElementById('model-load-button')
    modelFileInput = document.getElementById('model-file-input')
    clearButton = document.getElementById('clear-models')
    
    // Initialize conversion UI elements
    conversionSection = document.getElementById('conversion-section')
    formatSelector = document.getElementById('format-selector')
    convertButton = document.getElementById('convert-button')
    conversionStatus = document.getElementById('conversion-status')
    
    // Check if main UI elements are found
    if (modelLoadButton && modelFileInput && clearButton) {
        setupMainEventListeners()
        console.log('Main UI elements initialized successfully')
    } else {
        console.error('Failed to find main UI elements:', {
            modelLoadButton: !!modelLoadButton,
            modelFileInput: !!modelFileInput,
            clearButton: !!clearButton
        })
    }
    
    // Check if conversion UI elements are found
    if (conversionSection && formatSelector && convertButton && conversionStatus) {
        setupConversionEventListeners()
        console.log('Conversion UI elements initialized successfully')
    } else {
        console.error('Failed to find conversion UI elements:', {
            conversionSection: !!conversionSection,
            formatSelector: !!formatSelector,
            convertButton: !!convertButton,
            conversionStatus: !!conversionStatus
        })
    }
}

function setupMainEventListeners() {
    // Model load button event listener
    modelLoadButton.addEventListener('click', function () {
        console.log('Load model button clicked!')
        modelFileInput.click()
    });
    
    // Model file input change listener
    modelFileInput.addEventListener('change', loadModelFile)
    
    // Clear button event listener
    clearButton.addEventListener('click', clearModels)
    
    console.log('Main event listeners set up successfully')
}

function setupConversionEventListeners() {
    // Format selector change handler
    formatSelector.addEventListener('change', function() {
        convertButton.disabled = !formatSelector.value
    })

    // Convert button handler
    convertButton.addEventListener('click', async function() {
        const selectedFormat = formatSelector.value
        if (!selectedFormat || !currentModel) return

        convertButton.disabled = true
        conversionStatus.textContent = 'Converting...'

        try {
            await exportModel(currentModel, selectedFormat)
            conversionStatus.textContent = 'Conversion completed!'
            setTimeout(() => {
                conversionStatus.textContent = ''
            }, 3000)
        } catch (error) {
            conversionStatus.textContent = 'Conversion failed!'
            console.error('Export error:', error)
            setTimeout(() => {
                conversionStatus.textContent = ''
            }, 3000)
        } finally {
            convertButton.disabled = false
        }
    })
}

// Update format selector based on loaded file type
function updateFormatSelector(fileType) {
    if (!formatSelector || !conversionSection) {
        console.error('UI elements not initialized yet')
        return
    }
    
    formatSelector.innerHTML = '<option value="">Select format...</option>'
    
    if (formatMappings[fileType]) {
        formatMappings[fileType].forEach(format => {
            const option = document.createElement('option')
            option.value = format.value
            option.textContent = format.label
            formatSelector.appendChild(option)
        })
        conversionSection.style.display = 'block'
    } else {
        conversionSection.style.display = 'none'
    }
}

// Show/hide conversion section and update current model
function updateConversionState(fileType, model) {
    currentLoadedFileType = fileType
    currentModel = model
    updateFormatSelector(fileType)
    
    if (convertButton && formatSelector && conversionStatus) {
        convertButton.disabled = true
        formatSelector.value = ''
        conversionStatus.textContent = ''
    }
}



// Export function
async function exportModel(model, format) {
    const exporter = exporters[format === 'glb' ? 'gltf' : format]
    if (!exporter) {
        throw new Error(`Exporter for ${format} not found`)
    }

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
    const filename = `model_${timestamp}.${format}`

    switch (format) {
        case 'glb':
        case 'gltf':
            return new Promise((resolve, reject) => {
                const options = format === 'glb' ? { binary: true } : { binary: false }
                exporter.parse(model, (result) => {
                    if (format === 'glb') {
                        downloadFile(result, filename, 'application/octet-stream')
                    } else {
                        const output = JSON.stringify(result, null, 2)
                        downloadFile(output, filename, 'application/json')
                    }
                    resolve()
                }, reject, options)
            })

        case 'obj':
            const objResult = exporter.parse(model)
            downloadFile(objResult, filename, 'text/plain')
            break

        case 'ply':
            return new Promise((resolve, reject) => {
                exporter.parse(model, (result) => {
                    downloadFile(result, filename, 'application/octet-stream')
                    resolve()
                }, { binary: true })
            })

        case 'stl':
            const stlResult = exporter.parse(model, { binary: true })
            downloadFile(stlResult, filename, 'application/octet-stream')
            break

        case 'usdz':
            const usdzResult = await exporter.parse(model)
            downloadFile(usdzResult, filename, 'application/octet-stream')
            break

        default:
            throw new Error(`Unsupported format: ${format}`)
    }
}

// File download utility
function downloadFile(data, filename, mimeType) {
    const blob = new Blob([data], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}