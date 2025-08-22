import * as THREE from 'three'
import { TransformControls } from 'three/addons/controls/TransformControls.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { TransformCommand } from './commands/TransformCommand.js'

export class SceneManager {
    constructor(canvas) {
        console.log('SceneManager constructor called with canvas:', canvas)
        this.canvas = canvas
        this.models = []
        this.modelMetadata = [] // Store metadata for each model
        this.animationFrame = 0
        this.currentGizmo = null // Store the current origin gizmo
        this.transformControls = null // Store the transform controls for translation
        this.translationMode = false // Track if translation mode is active
        this.rotationMode = false // Track if rotation mode is active
        this.scalingMode = false // Track if scaling mode is active
        this.transformChangeCallback = null // Callback for transform changes
        this.selectedModelIndices = [] // Store indices of models being translated
        this.multiModelGroup = null // Group object for multi-model translation
        this.isTransformDragging = false // Track if transform controls are being dragged
        this.transformJustFinished = false // Track if transform just finished to prevent selection
        
        // History manager for undo/redo functionality
        this.historyManager = null
        
        // Transform state tracking for undo/redo
        this.transformStartValues = null // Store values at start of transform
        this.isTrackingTransform = false // Track if we're in the middle of a transform operation
        
        // Raycasting for 3D object selection
        this.raycaster = new THREE.Raycaster()
        this.mouse = new THREE.Vector2()
        this.onModelClickCallback = null // Callback for when a model is clicked
        
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
        
        // Add event listeners for camera changes to update gizmo immediately
        this.controls.addEventListener('change', () => {
            this.updateGizmoOnCameraChange()
        })
        
        // Initialize Transform Controls for translation and rotation
        this.transformControls = new TransformControls(this.camera, this.renderer.domElement)
        this.transformControls.setMode('translate') // Default to translate mode
        this.transformControls.setSpace('world')
        this.transformControls.visible = false
        this.scene.add(this.transformControls)
        
        // Transform controls event handlers
        this.transformControls.addEventListener('change', () => {
            this.updateGizmoOnCameraChange()
            
            // Handle multi-model translation
            this.updateMultiModelPositions()
            
            // Call coordinate update callback if set
            if (this.transformChangeCallback) {
                this.transformChangeCallback()
            }
        })
        
        this.transformControls.addEventListener('dragging-changed', (event) => {
            // Disable orbit controls when dragging transform controls
            this.controls.enabled = !event.value
            
            // Track dragging state
            this.isTransformDragging = event.value
            
            // Handle transform tracking for undo/redo
            if (event.value) {
                // Transform started - capture initial values
                this.startTransformTracking()
            } else {
                // Transform ended - create undo command
                this.endTransformTracking()
            }
            
            // When dragging ends, set a flag to prevent immediate selection
            if (!event.value && (this.translationMode || this.rotationMode || this.scalingMode)) {
                this.transformJustFinished = true
                // Clear the flag after a short delay
                setTimeout(() => {
                    this.transformJustFinished = false
                }, 100) // 100ms delay to prevent accidental selection
            }
        })
    }
    
    setupEventListeners() {
        window.addEventListener('resize', this.onWindowResize.bind(this), false)
        
        // Add mouse click event for 3D object selection
        this.canvas.addEventListener('click', this.onCanvasClick.bind(this), false)
    }
    
    /**
     * Handles canvas click events for 3D object selection
     * @param {MouseEvent} event - The mouse click event
     */
    onCanvasClick(event) {
        // Prevent default behavior
        event.preventDefault()
        
        // Skip selection if transform controls are being dragged or just finished
        if (this.isTransformDragging || this.transformJustFinished) {
            console.log('Skipping selection due to transform operation')
            return
        }
        
        // Calculate mouse position in normalized device coordinates (-1 to +1) for both components
        const rect = this.canvas.getBoundingClientRect()
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
        
        // Update the raycaster with the camera and mouse position
        this.raycaster.setFromCamera(this.mouse, this.camera)
        
        // Calculate objects intersecting the picking ray
        const intersects = this.raycaster.intersectObjects(this.models, true)
        
        if (intersects.length > 0) {
            // Find which model was clicked by traversing up the object hierarchy
            const clickedObject = intersects[0].object
            const modelIndex = this.findModelIndex(clickedObject)
            
            if (modelIndex !== -1) {
                // Call the callback if it's set (UIManager will handle the selection logic)
                if (this.onModelClickCallback) {
                    this.onModelClickCallback(modelIndex, {
                        ctrlKey: event.ctrlKey,
                        metaKey: event.metaKey,
                        shiftKey: event.shiftKey
                    })
                }
                console.log(`3D Model ${modelIndex} clicked`)
            }
        } else {
            // Clicked on empty space - only handle if not in transform mode or just finished
            if (!this.translationMode && !this.rotationMode && !this.scalingMode && this.onModelClickCallback) {
                // Call callback with -1 to indicate empty space click (for deselecting)
                this.onModelClickCallback(-1, {
                    ctrlKey: event.ctrlKey,
                    metaKey: event.metaKey,
                    shiftKey: event.shiftKey
                })
                console.log('Empty space clicked')
            }
        }
    }
    
    /**
     * Finds the model index for a clicked object by traversing up the hierarchy
     * @param {THREE.Object3D} clickedObject - The clicked Three.js object
     * @returns {number} - The model index, or -1 if not found
     */
    findModelIndex(clickedObject) {
        // Traverse up the object hierarchy to find the root model
        let current = clickedObject
        while (current && current.parent) {
            // Check if this object is one of our models
            const index = this.models.indexOf(current)
            if (index !== -1) {
                return index
            }
            current = current.parent
        }
        
        // Check if the clicked object itself is a model
        const directIndex = this.models.indexOf(clickedObject)
        return directIndex !== -1 ? directIndex : -1
    }
    
    /**
     * Sets the callback function to be called when a model is clicked
     * @param {Function} callback - Function to call with (modelIndex, eventInfo)
     */
    setModelClickCallback(callback) {
        this.onModelClickCallback = callback
    }
    
    /**
     * Updates the gizmo when camera changes occur (for immediate response to user interaction)
     */
    updateGizmoOnCameraChange() {
        if (this.currentGizmo && this.currentGizmo.userData.targetModel) {
            const targetModel = this.currentGizmo.userData.targetModel
            const modelIndex = this.models.indexOf(targetModel)
            if (modelIndex >= 0) {
                this.updateOriginGizmo(modelIndex)
            }
        }
    }
    
    addModel(model, fileMetadata = {}) {
        this.models.push(model)
        
        // Store original transformation values for reset functionality
        const originalTransforms = {
            position: model.position.clone(),
            rotation: model.rotation.clone(),
            scale: model.scale.clone()
        }
        
        // Enhance metadata with original transformation values
        const enhancedMetadata = {
            ...fileMetadata,
            originalTransforms: originalTransforms
        }
        
        this.modelMetadata.push(enhancedMetadata)
        
        // Store original materials for selection highlighting
        this.storeOriginalMaterials(model)
        
        this.scene.add(model)
    }
    
    /**
     * Stores the original materials of a model for later restoration
     * @param {THREE.Object3D} model - The model to store materials for
     */
    storeOriginalMaterials(model) {
        model.traverse((child) => {
            if (child.isMesh && child.material) {
                // Store original material(s)
                if (Array.isArray(child.material)) {
                    child.userData.originalMaterials = child.material.slice()
                } else {
                    child.userData.originalMaterial = child.material
                }
            }
        })
    }
    
    /**
     * Highlights selected models by changing their material properties
     * @param {Set<number>} selectedIndices - Set of selected model indices
     */
    highlightSelectedModels(selectedIndices) {
        this.models.forEach((model, index) => {
            if (selectedIndices.has(index)) {
                this.highlightModel(model)
            } else {
                this.unhighlightModel(model)
            }
        })
    }
    
    /**
     * Highlights a single model
     * @param {THREE.Object3D} model - The model to highlight
     */
    highlightModel(model) {
        model.traverse((child) => {
            if (child.isMesh && child.material) {
                if (Array.isArray(child.material)) {
                    // Handle array of materials
                    child.material = child.material.map(mat => this.createHighlightMaterial(mat))
                } else {
                    // Handle single material
                    child.material = this.createHighlightMaterial(child.material)
                }
            }
        })
    }
    
    /**
     * Removes highlight from a single model
     * @param {THREE.Object3D} model - The model to unhighlight
     */
    unhighlightModel(model) {
        model.traverse((child) => {
            if (child.isMesh && child.material) {
                // Restore original material(s)
                if (child.userData.originalMaterials) {
                    child.material = child.userData.originalMaterials
                } else if (child.userData.originalMaterial) {
                    child.material = child.userData.originalMaterial
                }
            }
        })
    }
    
    /**
     * Creates a highlighted version of a material
     * @param {THREE.Material} originalMaterial - The original material
     * @returns {THREE.Material} - The highlighted material
     */
    createHighlightMaterial(originalMaterial) {
        // Clone the original material to avoid modifying it
        const highlightMaterial = originalMaterial.clone()
        
        // Add highlight effect
        if (highlightMaterial.emissive) {
            // Add blue emissive glow
            highlightMaterial.emissive.setHex(0x0066cc)
            highlightMaterial.emissiveIntensity = 0.3
        } else {
            // For materials without emissive, adjust color
            if (highlightMaterial.color) {
                highlightMaterial.color.lerp(new THREE.Color(0x4499ff), 0.3)
            }
        }
        
        return highlightMaterial
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
        
        // Check if gizmo's target model still exists (cleanup check)
        if (this.currentGizmo && this.animationFrame % 60 === 0) { // Check every 60 frames (once per second at 60fps)
            try {
                const targetModel = this.currentGizmo.userData.targetModel
                if (targetModel) {
                    const modelIndex = this.models.indexOf(targetModel)
                    if (modelIndex < 0) {
                        // Model no longer exists, hide the gizmo
                        this.hideOriginGizmo()
                    }
                }
            } catch (error) {
                console.warn('Error checking gizmo validity:', error)
                // Hide gizmo on error to prevent further issues
                this.hideOriginGizmo()
            }
        }
        
        this.renderer.render(this.scene, this.camera)
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight
        this.camera.updateProjectionMatrix()
        this.renderer.setSize(window.innerWidth, window.innerHeight)
        
        // Update gizmo size after window resize since canvas dimensions affect screen-size calculation
        this.updateGizmoOnCameraChange()
    }
    
    getRendererElement() {
        return this.renderer.domElement
    }
    
    /**
     * Calculates the gizmo size to maintain constant screen size regardless of camera distance
     * @param {THREE.Object3D} model - The model to calculate gizmo size for
     * @returns {number} - The calculated gizmo size in world units
     */
    calculateGizmoScreenSize(model) {
        // Get model's world position (considering its local position and parent transforms)
        const modelWorldPosition = new THREE.Vector3()
        model.getWorldPosition(modelWorldPosition)
        
        // Calculate distance from camera to model's position
        const cameraDistance = this.camera.position.distanceTo(modelWorldPosition)
        
        // Target screen size for the gizmo in pixels (adjust this value to change apparent size)
        const targetScreenSizePixels = 27
        
        // Calculate the world size needed to achieve the target screen size
        // This uses the perspective projection formula to convert screen pixels to world units
        const fov = this.camera.fov * (Math.PI / 180) // Convert FOV to radians
        const canvasHeight = this.renderer.domElement.height
        
        // Formula: worldSize = (screenPixels / canvasHeight) * 2 * distance * tan(fov/2)
        const worldSize = (targetScreenSizePixels / canvasHeight) * 2 * cameraDistance * Math.tan(fov / 2)
        
        // Ensure minimum and maximum sizes for usability
        const minSize = 0.01
        const maxSize = 50
        
        return Math.max(minSize, Math.min(maxSize, worldSize))
    }
    
    /**
     * Creates a 3D gizmo to represent the local origin of a model
     * @param {THREE.Object3D} model - The model to create the gizmo for
     * @returns {THREE.Group} - The gizmo group
     */
    createOriginGizmo(model) {
        const gizmoGroup = new THREE.Group()
        gizmoGroup.name = 'OriginGizmo'
        
        // Calculate constant screen-size gizmo scaling
        const gizmoSize = this.calculateGizmoScreenSize(model)
        
        // High render order to ensure gizmo renders on top
        const GIZMO_RENDER_ORDER = 1000
        
        // Create materials with depth testing disabled for always-on-top rendering
        const xMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff0000, 
            depthTest: false,
            depthWrite: false,
            transparent: true,
            opacity: 0.9
        })
        const yMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x00ff00, 
            depthTest: false,
            depthWrite: false,
            transparent: true,
            opacity: 0.9
        })
        const zMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x0000ff, 
            depthTest: false,
            depthWrite: false,
            transparent: true,
            opacity: 0.9
        })
        
        // X axis (red)
        const xGeometry = new THREE.CylinderGeometry(gizmoSize * 0.02, gizmoSize * 0.02, gizmoSize, 8)
        const xAxis = new THREE.Mesh(xGeometry, xMaterial)
        xAxis.rotation.z = -Math.PI / 2
        xAxis.position.x = gizmoSize / 2
        xAxis.renderOrder = GIZMO_RENDER_ORDER
        
        // X axis arrow
        const xArrowGeometry = new THREE.ConeGeometry(gizmoSize * 0.05, gizmoSize * 0.2, 8)
        const xArrow = new THREE.Mesh(xArrowGeometry, xMaterial)
        xArrow.rotation.z = -Math.PI / 2
        xArrow.position.x = gizmoSize
        xArrow.renderOrder = GIZMO_RENDER_ORDER
        
        // Y axis (green)
        const yGeometry = new THREE.CylinderGeometry(gizmoSize * 0.02, gizmoSize * 0.02, gizmoSize, 8)
        const yAxis = new THREE.Mesh(yGeometry, yMaterial)
        yAxis.position.y = gizmoSize / 2
        yAxis.renderOrder = GIZMO_RENDER_ORDER
        
        // Y axis arrow
        const yArrowGeometry = new THREE.ConeGeometry(gizmoSize * 0.05, gizmoSize * 0.2, 8)
        const yArrow = new THREE.Mesh(yArrowGeometry, yMaterial)
        yArrow.position.y = gizmoSize
        yArrow.renderOrder = GIZMO_RENDER_ORDER
        
        // Z axis (blue)
        const zGeometry = new THREE.CylinderGeometry(gizmoSize * 0.02, gizmoSize * 0.02, gizmoSize, 8)
        const zAxis = new THREE.Mesh(zGeometry, zMaterial)
        zAxis.rotation.x = Math.PI / 2
        zAxis.position.z = gizmoSize / 2
        zAxis.renderOrder = GIZMO_RENDER_ORDER
        
        // Z axis arrow
        const zArrowGeometry = new THREE.ConeGeometry(gizmoSize * 0.05, gizmoSize * 0.2, 8)
        const zArrow = new THREE.Mesh(zArrowGeometry, zMaterial)
        zArrow.rotation.x = Math.PI / 2
        zArrow.position.z = gizmoSize
        zArrow.renderOrder = GIZMO_RENDER_ORDER
        
        // Add all components to the gizmo group
        gizmoGroup.add(xAxis, xArrow, yAxis, yArrow, zAxis, zArrow)
        
        // Set render order on the group as well
        gizmoGroup.renderOrder = GIZMO_RENDER_ORDER
        
        // Position the gizmo at the model's position
        gizmoGroup.position.copy(model.position)
        gizmoGroup.rotation.copy(model.rotation)
        // Don't copy the model's scale - gizmo should maintain constant visual size
        
        // Store reference to model for screen-size updates
        gizmoGroup.userData.targetModel = model
        
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
     * Updates the gizmo position and size if it exists (useful when model transforms change or camera moves)
     * @param {number} modelIndex - Index of the model to update gizmo for
     */
    updateOriginGizmo(modelIndex) {
        if (this.currentGizmo && modelIndex >= 0 && modelIndex < this.models.length) {
            const model = this.models[modelIndex]
            this.currentGizmo.position.copy(model.position)
            this.currentGizmo.rotation.copy(model.rotation)
            // Don't copy the model's scale - gizmo should maintain constant visual size
            
            // Update gizmo size to maintain constant screen size
            if (this.currentGizmo.userData.targetModel) {
                const newGizmoSize = this.calculateGizmoScreenSize(model)
                
                // Update each axis component size
                this.currentGizmo.children.forEach((child, index) => {
                    if (child.geometry) {
                        const isArrow = index % 2 === 1 // Every second child is an arrow
                        
                        if (isArrow) {
                            // Update arrow geometry
                            child.geometry.dispose()
                            child.geometry = new THREE.ConeGeometry(newGizmoSize * 0.05, newGizmoSize * 0.2, 8)
                            
                            // Update arrow position
                            if (index === 1) { // X arrow
                                child.position.x = newGizmoSize
                            } else if (index === 3) { // Y arrow
                                child.position.y = newGizmoSize
                            } else if (index === 5) { // Z arrow
                                child.position.z = newGizmoSize
                            }
                        } else {
                            // Update axis cylinder geometry
                            child.geometry.dispose()
                            child.geometry = new THREE.CylinderGeometry(newGizmoSize * 0.02, newGizmoSize * 0.02, newGizmoSize, 8)
                            
                            // Update axis position
                            if (index === 0) { // X axis
                                child.position.x = newGizmoSize / 2
                            } else if (index === 2) { // Y axis
                                child.position.y = newGizmoSize / 2
                            } else if (index === 4) { // Z axis
                                child.position.z = newGizmoSize / 2
                            }
                        }
                    }
                })
            }
        }
    }
    
    /**
     * Activates translation mode for the selected model
     * @param {number} modelIndex - Index of the model to attach transform controls to
     */
    activateTranslationMode(modelIndex) {
        this.activateTranslationModeForMultiple([modelIndex])
    }
    
    /**
     * Activates translation mode for multiple selected models
     * @param {number[]} modelIndices - Array of model indices to translate together
     */
    activateTranslationModeForMultiple(modelIndices) {
        if (modelIndices.length === 0) {
            console.warn('No model indices provided for translation mode')
            return
        }
        
        // Validate all indices
        const validIndices = modelIndices.filter(index => 
            index >= 0 && index < this.models.length
        )
        
        if (validIndices.length === 0) {
            console.warn('No valid model indices for translation mode')
            return
        }
        
        // Store selected model indices for translation
        this.selectedModelIndices = validIndices
        
        if (validIndices.length === 1) {
            // Single model: attach directly to the model
            const model = this.models[validIndices[0]]
            this.transformControls.attach(model)
        } else {
            // Multiple models: create a group at the center point
            this.createMultiModelTransformGroup(validIndices)
        }
        
        this.transformControls.visible = true
        this.translationMode = true
        
        // Hide the origin gizmo when transform controls are active
        if (this.currentGizmo) {
            this.currentGizmo.visible = false
        }
        
        console.log(`Translation mode activated for ${validIndices.length} model(s)`)
    }
    
    /**
     * Creates a group object positioned at the center of multiple models for transformation
     * @param {number[]} modelIndices - Array of model indices
     */
    createMultiModelTransformGroup(modelIndices) {
        // Clean up any existing multi-model group
        this.cleanupMultiModelGroup()
        
        // Calculate center position of all selected models
        const centerPosition = this.calculateCenterPosition(modelIndices)
        
        // Create an invisible group object at the center position
        this.multiModelGroup = new THREE.Group()
        this.multiModelGroup.position.copy(centerPosition)
        this.multiModelGroup.name = 'MultiModelTransformGroup'
        
        // Store initial positions and rotations of all models relative to the group
        this.multiModelGroup.userData.initialPositions = []
        this.multiModelGroup.userData.initialRotations = []
        modelIndices.forEach(index => {
            const model = this.models[index]
            const relativePosition = model.position.clone().sub(centerPosition)
            this.multiModelGroup.userData.initialPositions[index] = relativePosition
            this.multiModelGroup.userData.initialRotations[index] = model.rotation.clone()
        })
        
        // Add the group to the scene (invisible, just for transform controls)
        this.scene.add(this.multiModelGroup)
        
        // Attach transform controls to the group
        this.transformControls.attach(this.multiModelGroup)
        
        console.log(`Multi-model transform group created at center position:`, centerPosition)
    }
    
    /**
     * Calculates the center position of multiple models
     * @param {number[]} modelIndices - Array of model indices
     * @returns {THREE.Vector3} - Center position
     */
    calculateCenterPosition(modelIndices) {
        const centerPosition = new THREE.Vector3()
        
        modelIndices.forEach(index => {
            const model = this.models[index]
            centerPosition.add(model.position)
        })
        
        centerPosition.divideScalar(modelIndices.length)
        return centerPosition
    }
    
    /**
     * Cleans up the multi-model translation group
     */
    cleanupMultiModelGroup() {
        if (this.multiModelGroup) {
            this.scene.remove(this.multiModelGroup)
            this.multiModelGroup = null
        }
    }
    
    /**
     * Deactivates translation mode
     */
    deactivateTranslationMode() {
        this.transformControls.detach()
        this.transformControls.visible = false
        this.translationMode = false
        
        // Clean up multi-model group
        this.cleanupMultiModelGroup()
        this.selectedModelIndices = []
        
        // Reset transform state flags
        this.isTransformDragging = false
        this.transformJustFinished = false
        
        // Show the origin gizmo again if there was one
        if (this.currentGizmo) {
            this.currentGizmo.visible = true
        }
        
        console.log('Translation mode deactivated')
    }
    
    /**
     * Updates positions and rotations of multiple models during transformation
     */
    updateMultiModelPositions() {
        if (this.multiModelGroup && this.selectedModelIndices.length > 1) {
            const initialPositions = this.multiModelGroup.userData.initialPositions
            const initialRotations = this.multiModelGroup.userData.initialRotations
            
            if (this.translationMode) {
                // Handle translation: update positions relative to group
                const groupPosition = this.multiModelGroup.position
                this.selectedModelIndices.forEach(index => {
                    if (index < this.models.length && initialPositions[index]) {
                        const model = this.models[index]
                        const newPosition = groupPosition.clone().add(initialPositions[index])
                        model.position.copy(newPosition)
                    }
                })
            } else if (this.rotationMode) {
                // Handle rotation: apply group rotation to all models while maintaining relative positions
                const groupPosition = this.multiModelGroup.position
                const groupRotation = this.multiModelGroup.rotation
                
                this.selectedModelIndices.forEach(index => {
                    if (index < this.models.length && initialPositions[index] && initialRotations[index]) {
                        const model = this.models[index]
                        
                        // Apply group rotation to the relative position
                        const rotatedPosition = initialPositions[index].clone()
                        rotatedPosition.applyEuler(groupRotation)
                        
                        // Set final position (rotated around center)
                        model.position.copy(groupPosition).add(rotatedPosition)
                        
                        // Combine initial rotation with group rotation
                        model.rotation.copy(initialRotations[index])
                        model.rotation.x += groupRotation.x
                        model.rotation.y += groupRotation.y
                        model.rotation.z += groupRotation.z
                    }
                })
            } else if (this.scalingMode) {
                // Handle scaling: apply group scale to all models while maintaining relative positions
                const groupPosition = this.multiModelGroup.position
                const groupScale = this.multiModelGroup.scale
                
                this.selectedModelIndices.forEach(index => {
                    if (index < this.models.length && initialPositions[index]) {
                        const model = this.models[index]
                        
                        // Apply group scale to the relative position
                        const scaledPosition = initialPositions[index].clone()
                        scaledPosition.multiply(groupScale)
                        
                        // Set final position (scaled around center)
                        model.position.copy(groupPosition).add(scaledPosition)
                        
                        // Apply group scale to the model
                        model.scale.copy(groupScale)
                    }
                })
            }
        }
    }
    
    /**
     * Check if translation mode is currently active
     * @returns {boolean}
     */
    isTranslationModeActive() {
        return this.translationMode
    }
    
    /**
     * Activates rotation mode for the selected model
     * @param {number} modelIndex - Index of the model to attach transform controls to
     */
    activateRotationMode(modelIndex) {
        this.activateRotationModeForMultiple([modelIndex])
    }
    
    /**
     * Activates rotation mode for multiple selected models
     * @param {number[]} modelIndices - Array of model indices to rotate together
     */
    activateRotationModeForMultiple(modelIndices) {
        if (modelIndices.length === 0) {
            console.warn('No model indices provided for rotation mode')
            return
        }
        
        // Validate all indices
        const validIndices = modelIndices.filter(index => 
            index >= 0 && index < this.models.length
        )
        
        if (validIndices.length === 0) {
            console.warn('No valid model indices for rotation mode')
            return
        }
        
        // Store selected model indices for rotation
        this.selectedModelIndices = validIndices
        
        // Set transform controls to rotation mode
        this.transformControls.setMode('rotate')
        
        if (validIndices.length === 1) {
            // Single model: attach directly to the model
            const model = this.models[validIndices[0]]
            this.transformControls.attach(model)
        } else {
            // Multiple models: create a group at the center point
            this.createMultiModelTransformGroup(validIndices)
        }
        
        this.transformControls.visible = true
        this.rotationMode = true
        
        // Hide the origin gizmo when transform controls are active
        if (this.currentGizmo) {
            this.currentGizmo.visible = false
        }
        
        console.log(`Rotation mode activated for ${validIndices.length} model(s)`)
    }
    
    /**
     * Deactivates rotation mode
     */
    deactivateRotationMode() {
        this.transformControls.detach()
        this.transformControls.visible = false
        this.rotationMode = false
        
        // Reset transform controls back to translate mode as default
        this.transformControls.setMode('translate')
        
        // Clean up multi-model group
        this.cleanupMultiModelGroup()
        this.selectedModelIndices = []
        
        // Reset transform state flags
        this.isTransformDragging = false
        this.transformJustFinished = false
        
        // Show the origin gizmo again if there was one
        if (this.currentGizmo) {
            this.currentGizmo.visible = true
        }
        
        console.log('Rotation mode deactivated')
    }
    
    /**
     * Check if rotation mode is currently active
     * @returns {boolean}
     */
    isRotationModeActive() {
        return this.rotationMode
    }
    
    /**
     * Activates scaling mode for the selected model
     * @param {number} modelIndex - Index of the model to attach transform controls to
     */
    activateScalingMode(modelIndex) {
        this.activateScalingModeForMultiple([modelIndex])
    }
    
    /**
     * Activates scaling mode for multiple selected models
     * @param {number[]} modelIndices - Array of model indices to scale together
     */
    activateScalingModeForMultiple(modelIndices) {
        if (modelIndices.length === 0) {
            console.warn('No model indices provided for scaling mode')
            return
        }
        
        // Validate all indices
        const validIndices = modelIndices.filter(index => 
            index >= 0 && index < this.models.length
        )
        
        if (validIndices.length === 0) {
            console.warn('No valid model indices for scaling mode')
            return
        }
        
        // Store selected model indices for scaling
        this.selectedModelIndices = validIndices
        
        // Set transform controls to scale mode
        this.transformControls.setMode('scale')
        
        if (validIndices.length === 1) {
            // Single model: attach directly to the model
            const model = this.models[validIndices[0]]
            this.transformControls.attach(model)
        } else {
            // Multiple models: create a group at the center point
            this.createMultiModelTransformGroup(validIndices)
        }
        
        this.transformControls.visible = true
        this.scalingMode = true
        
        // Hide the origin gizmo when transform controls are active
        if (this.currentGizmo) {
            this.currentGizmo.visible = false
        }
        
        console.log(`Scaling mode activated for ${validIndices.length} model(s)`)
    }
    
    /**
     * Deactivates scaling mode
     */
    deactivateScalingMode() {
        this.transformControls.detach()
        this.transformControls.visible = false
        this.scalingMode = false
        
        // Reset transform controls back to translate mode as default
        this.transformControls.setMode('translate')
        
        // Clean up multi-model group
        this.cleanupMultiModelGroup()
        this.selectedModelIndices = []
        
        // Reset transform state flags
        this.isTransformDragging = false
        this.transformJustFinished = false
        
        // Show the origin gizmo again if there was one
        if (this.currentGizmo) {
            this.currentGizmo.visible = true
        }
        
        console.log('Scaling mode deactivated')
    }
    
    /**
     * Check if scaling mode is currently active
     * @returns {boolean}
     */
    isScalingModeActive() {
        return this.scalingMode
    }
    
    /**
     * Check if transform controls are currently being dragged
     * @returns {boolean}
     */
    isTransformControlsDragging() {
        return this.isTransformDragging
    }
    
    /**
     * Set callback for transform changes
     * @param {Function} callback - Function to call when transform changes
     */
    setTransformChangeCallback(callback) {
        this.transformChangeCallback = callback
    }
    
    /**
     * Sets the position of a model by index
     * @param {number} modelIndex - Index of the model
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate  
     * @param {number} z - Z coordinate
     */
    setModelPosition(modelIndex, x, y, z) {
        if (modelIndex >= 0 && modelIndex < this.models.length) {
            const model = this.models[modelIndex]
            model.position.set(x, y, z)
            
            // Update gizmo if this model is currently selected
            if (this.currentGizmo && this.currentGizmo.userData.targetModel === model) {
                this.updateOriginGizmo(modelIndex)
            }
            
            // Call transform change callback
            if (this.transformChangeCallback) {
                this.transformChangeCallback()
            }
            
            return true
        }
        return false
    }
    
    /**
     * Sets the rotation of a model by index (in degrees)
     * @param {number} modelIndex - Index of the model
     * @param {number} x - X rotation in degrees
     * @param {number} y - Y rotation in degrees
     * @param {number} z - Z rotation in degrees
     */
    setModelRotation(modelIndex, x, y, z) {
        if (modelIndex >= 0 && modelIndex < this.models.length) {
            const model = this.models[modelIndex]
            // Convert degrees to radians
            model.rotation.set(
                x * Math.PI / 180,
                y * Math.PI / 180, 
                z * Math.PI / 180
            )
            
            // Update gizmo if this model is currently selected
            if (this.currentGizmo && this.currentGizmo.userData.targetModel === model) {
                this.updateOriginGizmo(modelIndex)
            }
            
            // Call transform change callback
            if (this.transformChangeCallback) {
                this.transformChangeCallback()
            }
            
            return true
        }
        return false
    }
    
    /**
     * Sets the scale of a model by index
     * @param {number} modelIndex - Index of the model
     * @param {number} x - X scale factor
     * @param {number} y - Y scale factor
     * @param {number} z - Z scale factor
     */
    setModelScale(modelIndex, x, y, z) {
        if (modelIndex >= 0 && modelIndex < this.models.length) {
            const model = this.models[modelIndex]
            model.scale.set(x, y, z)
            
            // Update gizmo if this model is currently selected
            if (this.currentGizmo && this.currentGizmo.userData.targetModel === model) {
                this.updateOriginGizmo(modelIndex)
            }
            
            // Call transform change callback
            if (this.transformChangeCallback) {
                this.transformChangeCallback()
            }
            
            return true
        }
        return false
    }
    
    /**
     * Resets model transformations to original values
     * @param {number} modelIndex - Index of the model
     * @param {string} transformType - Type of transform to reset ('position', 'rotation', 'scale', or 'all')
     */
    resetModelTransform(modelIndex, transformType = 'all') {
        if (modelIndex >= 0 && modelIndex < this.models.length) {
            const model = this.models[modelIndex]
            const metadata = this.modelMetadata[modelIndex]
            
            if (metadata && metadata.originalTransforms) {
                const original = metadata.originalTransforms
                
                switch (transformType) {
                    case 'position':
                        model.position.copy(original.position)
                        break
                    case 'rotation':
                        model.rotation.copy(original.rotation)
                        break
                    case 'scale':
                        model.scale.copy(original.scale)
                        break
                    case 'all':
                        model.position.copy(original.position)
                        model.rotation.copy(original.rotation)
                        model.scale.copy(original.scale)
                        break
                    default:
                        console.warn('Invalid transform type:', transformType)
                        return false
                }
                
                // Update gizmo if this model is currently selected
                if (this.currentGizmo && this.currentGizmo.userData.targetModel === model) {
                    this.updateOriginGizmo(modelIndex)
                }
                
                // Call transform change callback
                if (this.transformChangeCallback) {
                    this.transformChangeCallback()
                }
                
                return true
            }
        }
        return false
    }
    
    /**
     * Starts tracking transform values for undo/redo
     * Called when transform controls start being dragged
     */
    startTransformTracking() {
        if (!this.historyManager || this.selectedModelIndices.length === 0) {
            return
        }
        
        // Determine transform type based on current mode
        let transformType = null
        if (this.translationMode) {
            transformType = 'position'
        } else if (this.rotationMode) {
            transformType = 'rotation'
        } else if (this.scalingMode) {
            transformType = 'scale'
        }
        
        if (!transformType) {
            return
        }
        
        // Capture current values for all selected models
        this.transformStartValues = {
            modelIndices: [...this.selectedModelIndices],
            transformType: transformType,
            values: TransformCommand.captureCurrentValues(this, this.selectedModelIndices, transformType)
        }
        
        this.isTrackingTransform = true
        
        console.log(`Started tracking ${transformType} transform for models [${this.selectedModelIndices.join(', ')}]`)
    }
    
    /**
     * Ends tracking transform values and creates undo command
     * Called when transform controls stop being dragged
     */
    endTransformTracking() {
        if (!this.historyManager || !this.isTrackingTransform || !this.transformStartValues) {
            return
        }
        
        try {
            // Capture final values for the same models and transform type
            const finalValues = TransformCommand.captureCurrentValues(
                this, 
                this.transformStartValues.modelIndices, 
                this.transformStartValues.transformType
            )
            
            // Create transform command
            const command = new TransformCommand(
                this,
                this.transformStartValues.modelIndices,
                this.transformStartValues.transformType,
                this.transformStartValues.values,
                finalValues,
                `Transform ${this.transformStartValues.transformType} via ${this.transformStartValues.transformType} tool`
            )
            
            // Only add to history if there's a significant change
            if (command.hasSignificantChange()) {
                // Don't execute the command since the transform already happened
                // Just add it to the undo stack directly
                this.historyManager.undoStack.push(command)
                this.historyManager.redoStack = [] // Clear redo stack
                this.historyManager.trimHistory()
                this.historyManager.notifyHistoryChanged()
                
                console.log(`Created transform command: ${command.name}`)
            } else {
                console.log('Transform change too small, not adding to history')
            }
            
        } catch (error) {
            console.error('Error creating transform command:', error)
        } finally {
            // Reset tracking state
            this.transformStartValues = null
            this.isTrackingTransform = false
        }
    }
    
    /**
     * Sets the history manager for undo/redo functionality
     * @param {HistoryManager} historyManager - The history manager instance
     */
    setHistoryManager(historyManager) {
        this.historyManager = historyManager
        console.log('HistoryManager set in SceneManager')
    }
}