import * as THREE from './three.js-master/three.js-master/build/three.module.js'
import {GLTFLoader} from './three.js-master/three.js-master/examples/jsm/loaders/GLTFLoader.js'

const canvas = document.querySelector('canvas.webgl')
const scene = new THREE.Scene()

const loader = new GLTFLoader()
loader.load('./assets/poe_x_wing.glb', function(glb){
    console.log(glb)
    scene.add(glb.scene)
}, function(xhr){
    console.log((xhr.loaded/xhr.total * 100) + "% Loaded")
}, function(error){
    console.log('An error occured')
})

const light = new THREE.DirectionalLight(0xffffff, 1)
light.position.set(2,2,5)
scene.add(light)
light.lookAt(0,0,0)

//Boiler plate Code
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

const camera = new THREE.PerspectiveCamera(75, sizes.width/sizes.height, 0.1, 100)
camera.position.set(.25,.25,.25)
camera.lookAt(0,0,0)
scene.add(camera)

const renderer = new THREE.WebGLRenderer({
    canvas: canvas
})

renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.shadowMap.enabled = true
renderer.gammaOutput = true

function animate(){
    requestAnimationFrame(animate)
    renderer.render(scene, camera)
}

animate()