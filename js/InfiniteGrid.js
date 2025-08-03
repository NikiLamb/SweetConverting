import * as THREE from 'three'

export class InfiniteGrid {
    constructor(color1 = 0x888888, color2 = 0x444444, size = 10) {
        this.color1 = new THREE.Color(color1)
        this.color2 = new THREE.Color(color2)
        this.size = size
        
        this.createGrid()
    }
    
    createGrid() {
        // Create multiple plane geometries of different sizes
        const geometry1 = new THREE.PlaneGeometry(20, 20, 10, 10)
        const geometry2 = new THREE.PlaneGeometry(100, 100, 20, 20)
        
        // Use a very bright wireframe material
        const material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            wireframe: true,
            transparent: false,
            opacity: 1.0
        })
        
        // Create the main mesh (smaller grid)
        this.mesh = new THREE.Mesh(geometry1, material)
        this.mesh.rotation.x = -Math.PI / 2
        this.mesh.position.y = 0
        this.mesh.visible = true
        this.mesh.renderOrder = -1
        
        // Create a group to hold multiple grids
        this.group = new THREE.Group()
        this.group.add(this.mesh)
        
        // Add a larger grid
        const mesh2 = new THREE.Mesh(geometry2, material.clone())
        mesh2.material.color.setHex(0x888888)
        mesh2.rotation.x = -Math.PI / 2
        mesh2.position.y = -0.01
        mesh2.visible = true
        this.group.add(mesh2)
        
        console.log('Multiple grids created')
        console.log('Small grid:', this.mesh)
        console.log('Large grid:', mesh2)
        console.log('Group:', this.group)
    }
    
    updateCameraPosition(camera) {
        // Move the grid to follow the camera (snapped to grid intervals)
        const snapSize = this.size * 10
        const targetObject = this.group || this.mesh
        targetObject.position.x = Math.floor(camera.position.x / snapSize) * snapSize
        targetObject.position.z = Math.floor(camera.position.z / snapSize) * snapSize
    }
    
    setColors(color1, color2) {
        this.color1.set(color1)
        this.color2.set(color2)
        this.mesh.material.color.copy(this.color1)
    }
    
    setSize(size) {
        this.size = size
    }
    
    dispose() {
        this.mesh.geometry.dispose()
        this.mesh.material.dispose()
    }
    
    get object3d() {
        return this.group || this.mesh
    }
}