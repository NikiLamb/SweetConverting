import * as THREE from 'three'

/**
 * NavigationGizmo - A 3D navigation helper that shows camera orientation
 * and allows clicking on axes to orient the camera to specific views
 */
export class NavigationGizmo extends THREE.Object3D {
    constructor(camera, domElement, controls) {
        super()
        
        this.isNavigationGizmo = true
        this.animating = false
        this.center = new THREE.Vector3()
        
        // Store references
        this.camera = camera
        this.domElement = domElement
        this.controls = controls
        
        // Gizmo configuration
        this.size = 150 // 150 pixels as requested
        this.gizmoPosition = { right: 10, top: 60 } // Under top menu bar
        
        // Colors for axes (same as Three.js ViewHelper)
        const color1 = new THREE.Color('#ff3653') // X - Red
        const color2 = new THREE.Color('#8adb00') // Y - Green  
        const color3 = new THREE.Color('#2c8fff') // Z - Blue
        
        // Interactive objects for raycasting
        this.interactiveObjects = []
        this.raycaster = new THREE.Raycaster()
        this.mouse = new THREE.Vector2()
        this.dummy = new THREE.Object3D()
        
        // Orthographic camera for rendering the gizmo
        this.orthoCamera = new THREE.OrthographicCamera(-2, 2, 2, -2, 0, 4)
        this.orthoCamera.position.set(0, 0, 2)
        
        // Track last clicked axis for double-click flip functionality
        this.lastClickedAxis = null
        this.lastClickTime = 0
        this.doubleClickThreshold = 300 // ms
        
        this.createGizmoGeometry(color1, color2, color3)
        this.createAxisLabels(color1, color2, color3)
        this.setupContainer()
    }
    
    /**
     * Creates the 3D geometry for the gizmo axes
     */
    createGizmoGeometry(color1, color2, color3) {
        const geometry = new THREE.BoxGeometry(0.8, 0.05, 0.05).translate(0.4, 0, 0)
        
        // Create axis lines
        const xAxis = new THREE.Mesh(geometry, this.getAxisMaterial(color1))
        const yAxis = new THREE.Mesh(geometry, this.getAxisMaterial(color2))
        const zAxis = new THREE.Mesh(geometry, this.getAxisMaterial(color3))
        
        yAxis.rotation.z = Math.PI / 2
        zAxis.rotation.y = -Math.PI / 2
        
        this.add(xAxis)
        this.add(yAxis)
        this.add(zAxis)
    }
    
    /**
     * Creates the axis labels (sprites with letters)
     */
    createAxisLabels(color1, color2, color3) {
        // Positive axis labels with letters
        const posXAxisHelper = new THREE.Sprite(this.getSpriteMaterial(color1, 'X'))
        posXAxisHelper.userData.type = 'posX'
        const posYAxisHelper = new THREE.Sprite(this.getSpriteMaterial(color2, 'Y'))
        posYAxisHelper.userData.type = 'posY'
        const posZAxisHelper = new THREE.Sprite(this.getSpriteMaterial(color3, 'Z'))
        posZAxisHelper.userData.type = 'posZ'
        
        // Negative axis labels (no letters, smaller)
        const negXAxisHelper = new THREE.Sprite(this.getSpriteMaterial(color1))
        negXAxisHelper.userData.type = 'negX'
        const negYAxisHelper = new THREE.Sprite(this.getSpriteMaterial(color2))
        negYAxisHelper.userData.type = 'negY'
        const negZAxisHelper = new THREE.Sprite(this.getSpriteMaterial(color3))
        negZAxisHelper.userData.type = 'negZ'
        
        // Position the sprites
        posXAxisHelper.position.x = 1
        posYAxisHelper.position.y = 1
        posZAxisHelper.position.z = 1
        negXAxisHelper.position.x = -1
        negXAxisHelper.scale.setScalar(0.8)
        negYAxisHelper.position.y = -1
        negYAxisHelper.scale.setScalar(0.8)
        negZAxisHelper.position.z = -1
        negZAxisHelper.scale.setScalar(0.8)
        
        // Add to scene
        this.add(posXAxisHelper)
        this.add(posYAxisHelper)
        this.add(posZAxisHelper)
        this.add(negXAxisHelper)
        this.add(negYAxisHelper)
        this.add(negZAxisHelper)
        
        // Add to interactive objects for clicking
        this.interactiveObjects.push(posXAxisHelper)
        this.interactiveObjects.push(posYAxisHelper)
        this.interactiveObjects.push(posZAxisHelper)
        this.interactiveObjects.push(negXAxisHelper)
        this.interactiveObjects.push(negYAxisHelper)
        this.interactiveObjects.push(negZAxisHelper)
    }
    
    /**
     * Sets up the DOM container for the gizmo
     */
    setupContainer() {
        this.container = document.createElement('div')
        this.container.id = 'navigation-gizmo'
        this.container.style.cssText = `
            position: absolute;
            top: ${this.gizmoPosition.top}px;
            right: ${this.gizmoPosition.right}px;
            width: ${this.size}px;
            height: ${this.size}px;
            z-index: 1000;
            pointer-events: auto;
            border-radius: 8px;
            background: transparent;
        `
        
        // Add event listeners
        this.container.addEventListener('pointerup', this.handleClick.bind(this))
        this.container.addEventListener('pointerdown', (event) => {
            event.stopPropagation()
        })
        
        // Add to DOM
        document.body.appendChild(this.container)
    }
    
    /**
     * Renders the navigation gizmo
     */
    render(renderer) {
        // Update gizmo orientation to match camera
        this.quaternion.copy(this.camera.quaternion).invert()
        this.updateMatrixWorld()
        
        // Update sprite opacity based on camera orientation
        this.updateSpriteVisibility()
        
        // Save current renderer state
        const viewport = new THREE.Vector4()
        renderer.getViewport(viewport)
        const autoClear = renderer.autoClear
        
        // Get the container's position relative to the canvas
        const containerRect = this.container.getBoundingClientRect()
        const canvasRect = this.domElement.getBoundingClientRect()
        
        // Calculate the position in WebGL coordinates (bottom-left origin)
        const x = containerRect.left - canvasRect.left
        const y = canvasRect.bottom - containerRect.bottom
        
        // Temporarily disable auto clear to avoid clearing the main scene
        renderer.autoClear = false
        
        // Set viewport for gizmo rendering to match the DOM container position
        renderer.setViewport(x, y, this.size, this.size)
        
        // Clear only depth for the gizmo area
        renderer.clearDepth()
        
        // Render the gizmo
        renderer.render(this, this.orthoCamera)
        
        // Restore renderer state
        renderer.autoClear = autoClear
        renderer.setViewport(viewport.x, viewport.y, viewport.z, viewport.w)
    }
    
    /**
     * Updates sprite visibility based on camera orientation
     */
    updateSpriteVisibility() {
        const point = new THREE.Vector3()
        point.set(0, 0, 1)
        point.applyQuaternion(this.camera.quaternion)
        
        // Update X axis visibility
        const posXHelper = this.children.find(child => child.userData?.type === 'posX')
        const negXHelper = this.children.find(child => child.userData?.type === 'negX')
        if (posXHelper && negXHelper) {
            if (point.x >= 0) {
                posXHelper.material.opacity = 1
                negXHelper.material.opacity = 0.5
            } else {
                posXHelper.material.opacity = 0.5
                negXHelper.material.opacity = 1
            }
        }
        
        // Update Y axis visibility
        const posYHelper = this.children.find(child => child.userData?.type === 'posY')
        const negYHelper = this.children.find(child => child.userData?.type === 'negY')
        if (posYHelper && negYHelper) {
            if (point.y >= 0) {
                posYHelper.material.opacity = 1
                negYHelper.material.opacity = 0.5
            } else {
                posYHelper.material.opacity = 0.5
                negYHelper.material.opacity = 1
            }
        }
        
        // Update Z axis visibility
        const posZHelper = this.children.find(child => child.userData?.type === 'posZ')
        const negZHelper = this.children.find(child => child.userData?.type === 'negZ')
        if (posZHelper && negZHelper) {
            if (point.z >= 0) {
                posZHelper.material.opacity = 1
                negZHelper.material.opacity = 0.5
            } else {
                posZHelper.material.opacity = 0.5
                negZHelper.material.opacity = 1
            }
        }
    }
    
    /**
     * Handles click events on the gizmo
     */
    handleClick(event) {
        if (this.animating) return false
        
        event.stopPropagation()
        
        // Calculate mouse position relative to gizmo
        const rect = this.container.getBoundingClientRect()
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
        
        // Raycast to find intersected objects
        this.raycaster.setFromCamera(this.mouse, this.orthoCamera)
        const intersects = this.raycaster.intersectObjects(this.interactiveObjects)
        
        if (intersects.length > 0) {
            const intersection = intersects[0]
            const object = intersection.object
            const axisType = object.userData.type
            
            // Check for double-click (flip to opposite side)
            const currentTime = Date.now()
            const isDoubleClick = this.lastClickedAxis === axisType && 
                                 (currentTime - this.lastClickTime) < this.doubleClickThreshold
            
            this.lastClickedAxis = axisType
            this.lastClickTime = currentTime
            
            // Prepare animation data
            this.prepareAnimationData(object, isDoubleClick)
            this.animating = true
            
            return true
        }
        
        return false
    }
    
    /**
     * Prepares animation data for camera movement
     */
    prepareAnimationData(object, isDoubleClick = false) {
        const targetPosition = new THREE.Vector3()
        const targetQuaternion = new THREE.Quaternion()
        let baseType = object.userData.type
        
        // If double-click, flip to opposite side
        if (isDoubleClick) {
            if (baseType.startsWith('pos')) {
                baseType = baseType.replace('pos', 'neg')
            } else if (baseType.startsWith('neg')) {
                baseType = baseType.replace('neg', 'pos')
            }
        }
        
        // Set target position and rotation based on axis
        switch (baseType) {
            case 'posX':
                targetPosition.set(1, 0, 0)
                targetQuaternion.setFromEuler(new THREE.Euler(0, Math.PI * 0.5, 0))
                break
            case 'posY':
                targetPosition.set(0, 1, 0)
                targetQuaternion.setFromEuler(new THREE.Euler(-Math.PI * 0.5, 0, 0))
                break
            case 'posZ':
                targetPosition.set(0, 0, 1)
                targetQuaternion.setFromEuler(new THREE.Euler())
                break
            case 'negX':
                targetPosition.set(-1, 0, 0)
                targetQuaternion.setFromEuler(new THREE.Euler(0, -Math.PI * 0.5, 0))
                break
            case 'negY':
                targetPosition.set(0, -1, 0)
                targetQuaternion.setFromEuler(new THREE.Euler(Math.PI * 0.5, 0, 0))
                break
            case 'negZ':
                targetPosition.set(0, 0, -1)
                targetQuaternion.setFromEuler(new THREE.Euler(0, Math.PI, 0))
                break
            default:
                console.error('NavigationGizmo: Invalid axis.')
                return
        }
        
        // Calculate current distance from camera to center and preserve it
        const currentDistance = this.camera.position.distanceTo(this.center)
        targetPosition.multiplyScalar(currentDistance).add(this.center)
        
        // Store animation data
        this.targetPosition = targetPosition
        this.targetQuaternion = targetQuaternion
        
        // Set up quaternion interpolation
        this.dummy.position.copy(this.center)
        this.dummy.lookAt(this.camera.position)
        this.q1 = this.dummy.quaternion.clone()
        
        this.dummy.lookAt(targetPosition)
        this.q2 = this.dummy.quaternion.clone()
    }
    
    /**
     * Updates the animation
     */
    update(delta) {
        if (!this.animating) return
        
        const turnRate = 2 * Math.PI // turn rate in angles per second
        const step = delta * turnRate
        
        // Preserve the original distance throughout the animation
        const originalDistance = this.targetPosition.distanceTo(this.center)
        
        // Animate position
        this.q1.rotateTowards(this.q2, step)
        this.camera.position.set(0, 0, 1)
            .applyQuaternion(this.q1)
            .multiplyScalar(originalDistance)
            .add(this.center)
        
        // Animate orientation
        this.camera.quaternion.rotateTowards(this.targetQuaternion, step)
        
        // Update controls
        if (this.controls) {
            this.controls.update()
        }
        
        // Check if animation is complete
        if (this.q1.angleTo(this.q2) < 0.01) {
            this.animating = false
        }
    }
    
    /**
     * Creates axis material
     */
    getAxisMaterial(color) {
        return new THREE.MeshBasicMaterial({ 
            color: color, 
            toneMapped: false 
        })
    }
    
    /**
     * Creates sprite material with optional text
     */
    getSpriteMaterial(color, text = null) {
        const canvas = document.createElement('canvas')
        canvas.width = 64
        canvas.height = 64
        
        const context = canvas.getContext('2d')
        
        // Draw circle
        context.beginPath()
        context.arc(32, 32, 16, 0, 2 * Math.PI)
        context.closePath()
        context.fillStyle = color.getStyle()
        context.fill()
        
        // Draw text in black as requested
        if (text !== null) {
            context.font = '24px Arial'
            context.textAlign = 'center'
            context.fillStyle = '#000000' // Black text as specified
            context.fillText(text, 32, 41)
        }
        
        const texture = new THREE.CanvasTexture(canvas)
        return new THREE.SpriteMaterial({ 
            map: texture, 
            toneMapped: false,
            transparent: true
        })
    }
    
    /**
     * Sets the center point for camera rotation
     */
    setCenter(center) {
        this.center.copy(center)
    }
    
    /**
     * Disposes of resources
     */
    dispose() {
        // Remove DOM element
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container)
        }
        
        // Dispose of geometries and materials
        this.traverse((child) => {
            if (child.geometry) {
                child.geometry.dispose()
            }
            if (child.material) {
                if (child.material.map) {
                    child.material.map.dispose()
                }
                child.material.dispose()
            }
        })
    }
}
