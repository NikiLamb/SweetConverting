import * as THREE from 'three'
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'
import {STLLoader} from 'three/addons/loaders/STLLoader.js'
import {OrbitControls} from 'three/addons/controls/OrbitControls.js'


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
            viewerContainer.appendChild(renderer.domElement)
            const glbModel = glb.scene
            models.push(glbModel)
            scene.add(glbModel)

            console.log("GLB Model added")
            animate()
        })
    }
  
    reader.readAsArrayBuffer(file)
  }

//Load a GLB file in the Viewer
const glbLoadButton = document.getElementById('glb-load-button')
glbLoadButton.addEventListener('click', function () {
    const glbFileInput = document.getElementById('glb-file-input')
    glbFileInput.click()
});

const glbFileInput = document.getElementById('glb-file-input')
glbFileInput.addEventListener('change', loadGLBFile)

//STL Loader
function loadSTLFile(event) {
    const file = event.target.files[0];
  
    const reader = new FileReader()
    reader.onload = function () {
        const data = reader.result
  
        const stlLoader = new STLLoader()
        stlLoader.load(data, function (geometry) {

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

            viewerContainer.appendChild(renderer.domElement)
            models.push(stlModel)
            scene.add(stlModel)

            console.log("STL Model added")
            animate()
        })
    }
  
    reader.readAsDataURL(file)
  }

//Load a STL file in the Viewer
const stlLoadButton = document.getElementById('stl-load-button')
stlLoadButton.addEventListener('click', function () {
    const stlFileInput = document.getElementById('stl-file-input')
    stlFileInput.click()
});

const stlFileInput = document.getElementById('stl-file-input')
stlFileInput.addEventListener('change', loadSTLFile)

//Clear Any kind of models in the Viewer
function clearModels(){
    while (viewerContainer.firstChild){
        viewerContainer.firstChild.remove()
    }

    for (let i = 0; i < models.length; i++) {
        scene.remove(models[i])
    }

    models.length = 0
    console.log("Model removed")
    console.log(models)
    animate()
}

const clearButton = document.getElementById('clear-models')
clearButton.addEventListener('click', clearModels)

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