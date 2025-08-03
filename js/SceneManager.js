import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { InfiniteGrid } from './InfiniteGrid.js'

export class SceneManager {
    constructor(canvas) {
        this.canvas = canvas
        this.models = []
        this.animationFrame = 0
        
        this.initScene()
        this.initCamera()
        this.initRenderer()
        this.initLighting()
        this.initGrid()
        this.initControls()
        this.setupEventListeners()
        
        this.animate()
    }
    
    initScene() {
        this.scene = new THREE.Scene()
        this.scene.background = new THREE.Color(0x000000)
    }
    
    initCamera() {
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.01,
            1000
        )
        this.camera.position.set(2, 2, 2)
        this.camera.lookAt(0, 0, 0)
        this.scene.add(this.camera)
    }
    
    initRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            alpha: true,
            premultipliedAlpha: false
        })
        this.renderer.setSize(window.innerWidth, window.innerHeight)
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        this.renderer.shadowMap.enabled = true
        this.renderer.gammaOutput = true
    }
    
    initLighting() {
        // Front right light
        const light1 = new THREE.DirectionalLight(0xffffff, 1)
        light1.position.set(2, 2, 10)
        light1.lookAt(0, 0, 0)
        this.scene.add(light1)
        
        // Front left light
        const light2 = new THREE.DirectionalLight(0xffffff, 1)
        light2.position.set(-2, 2, 10)
        light2.lookAt(0, 0, 0)
        this.scene.add(light2)
        
        // Bottom light
        const light3 = new THREE.DirectionalLight(0xffffff, 1)
        light3.position.set(0, -2, 10)
        light3.lookAt(0, 0, 0)
        this.scene.add(light3)
        
        // Back light
        const lightUnder = new THREE.DirectionalLight(0xffffff, 1)
        lightUnder.position.set(0, 0, -5)
        lightUnder.lookAt(0, 0, 0)
        this.scene.add(lightUnder)
    }
    
    initGrid() {
        // Create an infinite grid that extends in all directions
        this.infiniteGrid = new InfiniteGrid(0xffffff, 0x666666, 2)
        this.scene.add(this.infiniteGrid.object3d)
        console.log('Grid initialized and added to scene')
    }
    
    initControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement)
        this.controls.minDistance = 0.1
        this.controls.maxDistance = 200
        this.controls.target.set(0, 0, 0)
        this.controls.update()
    }
    
    setupEventListeners() {
        window.addEventListener('resize', this.onWindowResize.bind(this), false)
    }
    
    addModel(model) {
        this.models.push(model)
        this.scene.add(model)
    }
    
    clearModels() {
        for (let i = 0; i < this.models.length; i++) {
            this.scene.remove(this.models[i])
        }
        this.models.length = 0
    }
    
    dispose() {
        if (this.infiniteGrid) {
            this.scene.remove(this.infiniteGrid.object3d)
            this.infiniteGrid.dispose()
            this.infiniteGrid = null
        }
    }
    
        getModels() {
        return this.models
    }

    getCurrentModel() {
        return this.models.length > 0 ? this.models[this.models.length - 1] : null
    }

    // Get all models as a combined group for export
    getAllModelsAsGroup() {
        if (this.models.length === 0) {
            return null
        }
        
        if (this.models.length === 1) {
            return this.models[0]
        }
        
        // Create a group containing all models
        const group = new THREE.Group()
        this.models.forEach(model => {
            // Clone the model to avoid removing it from the scene
            const modelClone = model.clone()
            group.add(modelClone)
        })
        
        return group
    }
    
    recenterCameraOnModel(model) {
        // Calculate bounding box of the model
        const box = new THREE.Box3().setFromObject(model)
        const center = box.getCenter(new THREE.Vector3())
        const size = box.getSize(new THREE.Vector3())
        
        // Get the max side of the bounding box to determine camera distance
        const maxDim = Math.max(size.x, size.y, size.z)
        const fov = this.camera.fov * (Math.PI / 180)
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2))
        
        // Offset the camera position to ensure the model is fully visible
        cameraZ *= 1.5 // Add some padding
        
        // Set camera position to look at the model from a good angle
        this.camera.position.set(
            center.x + cameraZ * 0.5,
            center.y + cameraZ * 0.5,
            center.z + cameraZ
        )
        this.camera.lookAt(center)
        
        // Update controls target to the center of the model
        this.controls.target.copy(center)
        this.controls.update()
        
        console.log('Camera recentered on model:', { center, size, cameraZ })
    }
    
    animate() {
        requestAnimationFrame(this.animate.bind(this))
        
        this.animationFrame++
        
        // Update infinite grid with camera position for proper rendering
        if (this.infiniteGrid) {
            this.infiniteGrid.updateCameraPosition(this.camera)
            
            // Log periodically to verify grid is updating
            if (this.animationFrame % 120 === 0) {
                console.log('Grid updated, camera position:', this.camera.position)
            }
        }
        
        this.renderer.render(this.scene, this.camera)
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight
        this.camera.updateProjectionMatrix()
        this.renderer.setSize(window.innerWidth, window.innerHeight)
    }
    
    getRendererElement() {
        return this.renderer.domElement
    }
}