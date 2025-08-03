import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { InfiniteGrid } from './InfiniteGrid.js'

export class SceneManager {
    constructor(canvas) {
        console.log('SceneManager constructor called with canvas:', canvas)
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
        
        console.log('Starting animation loop...')
        this.animate()
    }
    
    initScene() {
        this.scene = new THREE.Scene()
        // Use dark gray instead of pure black to help with visibility
        this.scene.background = new THREE.Color(0x111111)
        console.log('Scene initialized with background color:', this.scene.background.getHex())
    }
    
    initCamera() {
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.01,
            1000
        )
        // Set camera position to look down at the grid from a good angle
        this.camera.position.set(5, 5, 5)
        this.camera.lookAt(0, 0, 0)
        this.scene.add(this.camera)
        console.log('Camera initialized at position:', this.camera.position)
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
        // Fix deprecated property
        this.renderer.outputColorSpace = THREE.SRGBColorSpace
        
        console.log('Renderer initialized:', this.renderer)
        console.log('Canvas element:', this.canvas)
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
        // Use brighter colors for better visibility against black background
        this.infiniteGrid = new InfiniteGrid(0xcccccc, 0x666666, 2)
        const gridObject = this.infiniteGrid.object3d
        this.scene.add(gridObject)
        console.log('Grid initialized and added to scene')
        console.log('Grid object3d:', gridObject)
        console.log('Grid object3d type:', gridObject.type)
        console.log('Grid object3d children:', gridObject.children ? gridObject.children.length : 'no children')
        console.log('Scene children count after grid:', this.scene.children.length)
        console.log('Scene children:', this.scene.children.map(child => `${child.type}(${child.name || 'unnamed'})`))
        
        // Add a simple grid helper as backup for debugging
        const gridHelper = new THREE.GridHelper(20, 20, 0x888888, 0x444444)
        gridHelper.name = 'GridHelper'
        this.scene.add(gridHelper)
        console.log('Added GridHelper as backup')
        
        // Add a simple test plane to verify rendering
        const testGeometry = new THREE.PlaneGeometry(10, 10)
        const testMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff0000, 
            transparent: true, 
            opacity: 0.5,
            side: THREE.DoubleSide
        })
        const testPlane = new THREE.Mesh(testGeometry, testMaterial)
        testPlane.rotation.x = -Math.PI / 2
        testPlane.position.y = 0.01
        testPlane.name = 'TestPlane'
        this.scene.add(testPlane)
        console.log('Added red test plane for debugging')
        
        console.log('Final scene children count:', this.scene.children.length)
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
                console.log('Grid mesh visible:', this.infiniteGrid.object3d.visible)
                console.log('Grid mesh material:', this.infiniteGrid.object3d.material.visible)
                console.log('Grid position:', this.infiniteGrid.object3d.position)
                console.log('Grid in scene:', this.scene.children.includes(this.infiniteGrid.object3d))
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