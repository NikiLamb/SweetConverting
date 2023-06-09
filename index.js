import * as THREE from './three.js-master/three.js-master/build/three.module.js'
import {GLTFLoader} from './three.js-master/three.js-master/examples/jsm/loaders/GLTFLoader.js'

const canvas = document.querySelector('canvas.webgl')
const scene = new THREE.Scene()

const loader = new GLTFLoader()
loader.load('assets/Poe X-Wing.glb', function(glb){
    console.log(glb)
}, function(xhr){
    console.log((xhr.loaded/xhr.total * 100) + "% Loaded")
}, function(error){
    console.log('An error occured')
})

const light = new THREE.DirectionalLight(0xffffff, 1)
light.position.set(2,2,5)
scene.add(light)
light.lookAt(0,0,0)

const geometry = new THREE.BoxGeometry (1,1,1)
const material = new THREE.MeshBasicMaterial({
    color: 'red'
})
const boxMesh = new THREE.Mesh(geometry,material)
scene.add(boxMesh)

//Boiler plate Code
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

const camera = new THREE.PerspectiveCamera(75, sizes.width/sizes.height, 0.1, 100)
camera.position.set(3,3,3)
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



//Start cube example

//const scene = new THREE.Scene ();
//const camera = new THREE.PerspectiveCamera (75, window.innerWidth / window.innerHeight, .1, 1000);

//const renderer = new THREE.WebGLRenderer ();
//renderer.setSize (window.innerWidth, window.innerHeight);
//document.body.appendChild (renderer.domElement);


//const geometry = new THREE.BoxGeometry();
//const material = new THREE.MeshBasicMaterial( { color: 0x00ff00, wireframe: true } );
//const cube = new THREE.Mesh( geometry, material );
//scene.add( cube );

//camera.position.z = 5;

//function animate () {
//requestAnimationFrame( animate );
//cube.rotation.x += 0.01;
//cube.rotation.y += 0.01;
//renderer.render( scene, camera );
//}

//animate ();

//End cube example

// //Geometries
// var geometry = new THREE.BoxGeometry (1, 1, 1);

// //Materials
// var material = new THREE.MeshBasicMaterial ({color:0xFFFFFF, wireframe: false});

// //Meshes
// var cube = new THREE.Mesh (geometry, material);

// //Adding Meshes to scene
// scene.add (cube);

// //Initial camera position
// camera.position.z = 3;

// // Logic
// var update = function( ){

// };

// //Draw Scene
// var render = function( ){
//     renderer.render( scene, camera );
// };

// //Run Game Loop (update, render, repeat)
// var GameLoop = function( ){
//     requestAnimationFrame( GameLoop );

//     update( );
//     render( );
// };

// GameLoop;