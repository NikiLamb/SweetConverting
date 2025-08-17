import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

export class SceneManager {
    constructor(canvas) {
        console.log('SceneManager constructor called with canvas:', canvas)
        this.canvas = canvas
        this.models = []
        this.modelMetadata = [] // Store metadata for each model
        this.animationFrame = 0
        this.currentGizmo = null // Store the current origin gizmo
        
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
        // Add a simple grid helper that stays fixed at the origin
        const gridHelper = new THREE.GridHelper(10000, 10000, 0x888888, 0x444444)
        gridHelper.name = 'GridHelper'
        this.scene.add(gridHelper)
        console.log('Added GridHelper')
        
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
    
    addModel(model, fileMetadata = {}) {
        this.models.push(model)
        this.modelMetadata.push(fileMetadata)
        this.scene.add(model)
    }
    
    clearModels() {
        for (let i = 0; i < this.models.length; i++) {
            this.scene.remove(this.models[i])
        }
        this.models.length = 0
        this.modelMetadata.length = 0
    }
    
    removeModel(index) {
        if (index >= 0 && index < this.models.length) {
            // Remove model from scene
            this.scene.remove(this.models[index])
            
            // Remove from arrays
            this.models.splice(index, 1)
            this.modelMetadata.splice(index, 1)
            
            console.log(`Model at index ${index} removed from scene`)
            return true
        }
        return false
    }
    
    dispose() {
        // No special disposal needed for GridHelper since it uses standard Three.js objects
    }
    
    getModels() {
        return this.models
    }
    
    getModelMetadata() {
        return this.modelMetadata
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
        
        // Position camera to look at the model from a good angle
        this.camera.position.set(center.x + cameraZ, center.y + cameraZ, center.z + cameraZ)
        this.camera.lookAt(center)
        
        // Update controls target
        this.controls.target.copy(center)
        this.controls.update()
    }
    
    recenterCameraOnAllModels() {
        if (this.models.length === 0) return
        
        // Create a bounding box that encompasses all models
        const box = new THREE.Box3()
        
        this.models.forEach(model => {
            const modelBox = new THREE.Box3().setFromObject(model)
            box.union(modelBox)
        })
        
        const center = box.getCenter(new THREE.Vector3())
        const size = box.getSize(new THREE.Vector3())
        
        // Get the max side of the bounding box to determine camera distance
        const maxDim = Math.max(size.x, size.y, size.z)
        const fov = this.camera.fov * (Math.PI / 180)
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2))
        
        // Offset the camera position to ensure all models are visible
        cameraZ *= 1.8 // Add more padding for multiple models
        
        // Position camera to look at all models from a good angle
        this.camera.position.set(center.x + cameraZ, center.y + cameraZ, center.z + cameraZ)
        this.camera.lookAt(center)
        
        // Update controls target
        this.controls.target.copy(center)
        this.controls.update()
    }
    
    animate() {
        requestAnimationFrame(this.animate.bind(this))
        
        this.animationFrame++
        
        // No need to update any grid - the GridHelper stays fixed at the origin
        
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
    
    /**
     * Creates a 3D gizmo to represent the local origin of a model
     * @param {THREE.Object3D} model - The model to create the gizmo for
     * @returns {THREE.Group} - The gizmo group
     */
    createOriginGizmo(model) {
        const gizmoGroup = new THREE.Group()
        gizmoGroup.name = 'OriginGizmo'
        
        // Calculate appropriate gizmo size based on model bounding box
        const box = new THREE.Box3().setFromObject(model)
        const size = box.getSize(new THREE.Vector3())
        const maxDim = Math.max(size.x, size.y, size.z)
        const gizmoSize = Math.max(0.1, maxDim * 0.1) // 10% of model size, minimum 0.1
        
        // X axis (red)
        const xGeometry = new THREE.CylinderGeometry(gizmoSize * 0.02, gizmoSize * 0.02, gizmoSize, 8)
        const xMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 })
        const xAxis = new THREE.Mesh(xGeometry, xMaterial)
        xAxis.rotation.z = -Math.PI / 2
        xAxis.position.x = gizmoSize / 2
        
        // X axis arrow
        const xArrowGeometry = new THREE.ConeGeometry(gizmoSize * 0.05, gizmoSize * 0.2, 8)
        const xArrow = new THREE.Mesh(xArrowGeometry, xMaterial)
        xArrow.rotation.z = -Math.PI / 2
        xArrow.position.x = gizmoSize
        
        // Y axis (green)
        const yGeometry = new THREE.CylinderGeometry(gizmoSize * 0.02, gizmoSize * 0.02, gizmoSize, 8)
        const yMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 })
        const yAxis = new THREE.Mesh(yGeometry, yMaterial)
        yAxis.position.y = gizmoSize / 2
        
        // Y axis arrow
        const yArrowGeometry = new THREE.ConeGeometry(gizmoSize * 0.05, gizmoSize * 0.2, 8)
        const yArrow = new THREE.Mesh(yArrowGeometry, yMaterial)
        yArrow.position.y = gizmoSize
        
        // Z axis (blue)
        const zGeometry = new THREE.CylinderGeometry(gizmoSize * 0.02, gizmoSize * 0.02, gizmoSize, 8)
        const zMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff })
        const zAxis = new THREE.Mesh(zGeometry, zMaterial)
        zAxis.rotation.x = Math.PI / 2
        zAxis.position.z = gizmoSize / 2
        
        // Z axis arrow
        const zArrowGeometry = new THREE.ConeGeometry(gizmoSize * 0.05, gizmoSize * 0.2, 8)
        const zArrow = new THREE.Mesh(zArrowGeometry, zMaterial)
        zArrow.rotation.x = Math.PI / 2
        zArrow.position.z = gizmoSize
        
        // Add all components to the gizmo group
        gizmoGroup.add(xAxis, xArrow, yAxis, yArrow, zAxis, zArrow)
        
        // Position the gizmo at the model's position
        gizmoGroup.position.copy(model.position)
        gizmoGroup.rotation.copy(model.rotation)
        gizmoGroup.scale.copy(model.scale)
        
        return gizmoGroup
    }
    
    /**
     * Shows the origin gizmo for the specified model
     * @param {number} modelIndex - Index of the model to show gizmo for
     */
    showOriginGizmo(modelIndex) {
        this.hideOriginGizmo() // Remove any existing gizmo first
        
        if (modelIndex >= 0 && modelIndex < this.models.length) {
            const model = this.models[modelIndex]
            this.currentGizmo = this.createOriginGizmo(model)
            this.scene.add(this.currentGizmo)
            console.log(`Origin gizmo shown for model at index ${modelIndex}`)
        }
    }
    
    /**
     * Hides the current origin gizmo
     */
    hideOriginGizmo() {
        if (this.currentGizmo) {
            this.scene.remove(this.currentGizmo)
            
            // Dispose of geometries and materials to prevent memory leaks
            this.currentGizmo.traverse((child) => {
                if (child.geometry) {
                    child.geometry.dispose()
                }
                if (child.material) {
                    child.material.dispose()
                }
            })
            
            this.currentGizmo = null
            console.log('Origin gizmo hidden')
        }
    }
    
    /**
     * Updates the gizmo position if it exists (useful when model transforms change)
     * @param {number} modelIndex - Index of the model to update gizmo for
     */
    updateOriginGizmo(modelIndex) {
        if (this.currentGizmo && modelIndex >= 0 && modelIndex < this.models.length) {
            const model = this.models[modelIndex]
            this.currentGizmo.position.copy(model.position)
            this.currentGizmo.rotation.copy(model.rotation)
            this.currentGizmo.scale.copy(model.scale)
        }
    }
}