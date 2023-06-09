import * as THREE from './three.js-master/three.js-master/build/three.module.js'
import {GLTFLoader} from './three.js-master/three.js-master/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from './three.js-master/three.js-master/examples/jsm/controls/OrbitControls.js'



const canvas = document.querySelector('canvas.webgl')
const scene = new THREE.Scene()
const loader = new GLTFLoader()
const light = new THREE.DirectionalLight(0xffffff, 1)
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}
const camera = new THREE.PerspectiveCamera(75, sizes.width/sizes.height, 0.1, 100)
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
})
const controls = new OrbitControls( camera, renderer.domElement );

loader.load('./assets/poe_x_wing.glb', function(glb){
    console.log(glb)
    scene.add(glb.scene)
}, function(xhr){
    console.log((xhr.loaded/xhr.total * 100) + "% Loaded")
}, function(error){
    console.log('An error occured')
})

light.position.set(2,2,5)
scene.add(light)
light.lookAt(0,0,0)

camera.position.set(.25,.25,.25)
camera.lookAt(0,0,0)
scene.add(camera)

renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.shadowMap.enabled = true
renderer.gammaOutput = true

// controls.addEventListener( 'change', render ); // use if there is no animation loop
controls.minDistance = .1;
controls.maxDistance = 5;
controls.target.set( 0, 0, - 0.2 );
controls.update();

function animate(){
    requestAnimationFrame(animate)
    renderer.render( scene, camera )
}

animate()