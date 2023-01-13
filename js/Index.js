const scene = new THREE.Scene ();
const camera = new THREE.PerspectiveCamera (75, window.innerWidth / window.innerHeight, .1, 1000);

const renderer = new THREE.WebGLRenderer ();
renderer.setSize (window.innerWidth, window.innerHeight);
document.body.appendChild (renderer.domElement);


const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshBasicMaterial( { color: 0x00ff00, wireframe: true } );
const cube = new THREE.Mesh( geometry, material );
scene.add( cube );

camera.position.z = 5;

function animate () {
requestAnimationFrame( animate );
cube.rotation.x += 0.01;
cube.rotation.y += 0.01;
renderer.render( scene, camera );
}

animate ();

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