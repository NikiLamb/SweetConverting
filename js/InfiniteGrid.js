import * as THREE from 'three'

export class InfiniteGrid {
    constructor(color1 = 0x444444, color2 = 0x222222, size = 10) {
        this.color1 = new THREE.Color(color1)
        this.color2 = new THREE.Color(color2)
        this.size = size
        
        this.createGrid()
    }
    
    createGrid() {
        // Create a large plane geometry
        const geometry = new THREE.PlaneGeometry(1000, 1000, 1, 1)
        
        // Custom shader material for infinite grid
        const material = new THREE.ShaderMaterial({
            uniforms: {
                color1: { value: this.color1 },
                color2: { value: this.color2 },
                size: { value: this.size },
                cameraPosition: { value: new THREE.Vector3() }
            },
            vertexShader: `
                varying vec3 worldPosition;
                varying vec3 localPosition;
                
                void main() {
                    localPosition = position;
                    vec4 worldPos = modelMatrix * vec4(position, 1.0);
                    worldPosition = worldPos.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 color1;
                uniform vec3 color2;
                uniform float size;
                uniform vec3 cameraPosition;
                
                varying vec3 worldPosition;
                varying vec3 localPosition;
                
                float getGrid(vec2 coord, float gridSize) {
                    vec2 derivative = fwidth(coord / gridSize);
                    vec2 grid = abs(fract(coord / gridSize - 0.5) - 0.5) / derivative;
                    float line = min(grid.x, grid.y);
                    return 1.0 - min(line, 1.0);
                }
                
                void main() {
                    // Use world position for consistent grid across the infinite plane
                    vec2 coord = worldPosition.xz;
                    
                    // Create main grid
                    float grid1 = getGrid(coord, size);
                    
                    // Create finer grid
                    float grid2 = getGrid(coord, size / 10.0);
                    
                    // Simple distance-based fade
                    float dist = length(worldPosition - cameraPosition);
                    float fade = 1.0 - smoothstep(100.0, 300.0, dist);
                    
                    // Combine grids
                    vec3 finalColor = mix(color2, color1, grid1);
                    finalColor = mix(finalColor, color1 * 0.8, grid2 * 0.3);
                    
                    // Calculate alpha with minimum visibility
                    float alpha = max(grid1 * fade, 0.3);
                    alpha = max(alpha, grid2 * fade * 0.5);
                    
                    gl_FragColor = vec4(finalColor, alpha);
                }
            `,
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false,
            depthTest: true
        })
        
        // Create the mesh
        this.mesh = new THREE.Mesh(geometry, material)
        this.mesh.rotation.x = -Math.PI / 2 // Rotate to be horizontal
        this.mesh.position.y = 0
        
        // Make sure it renders behind other objects but is still visible
        this.mesh.renderOrder = -1
        this.mesh.material.blending = THREE.NormalBlending
        
        console.log('InfiniteGrid mesh created:', this.mesh)
        console.log('Grid position:', this.mesh.position)
        console.log('Grid rotation:', this.mesh.rotation)
    }
    
    updateCameraPosition(camera) {
        // Update the camera position uniform for distance-based fading
        this.mesh.material.uniforms.cameraPosition.value.copy(camera.position)
        
        // Move the grid to follow the camera (snapped to grid intervals)
        const snapSize = this.size * 10
        this.mesh.position.x = Math.floor(camera.position.x / snapSize) * snapSize
        this.mesh.position.z = Math.floor(camera.position.z / snapSize) * snapSize
    }
    
    setColors(color1, color2) {
        this.color1.set(color1)
        this.color2.set(color2)
        this.mesh.material.uniforms.color1.value.copy(this.color1)
        this.mesh.material.uniforms.color2.value.copy(this.color2)
    }
    
    setSize(size) {
        this.size = size
        this.mesh.material.uniforms.size.value = size
    }
    
    dispose() {
        this.mesh.geometry.dispose()
        this.mesh.material.dispose()
    }
    
    get object3d() {
        return this.mesh
    }
}