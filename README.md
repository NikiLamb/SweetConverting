# Sweet Converting

A web-based 3D model viewer and converter that supports loading, viewing, editing, and converting between multiple 3D file formats. Features an intuitive interface with advanced transformation tools, undo/redo functionality, and multi-model support.

## Features

### Core Functionality
- **Multi-Model Loading**: Support for GLB, STL, USDZ, FBX, and IFC file formats with simultaneous loading
- **Interactive 3D Viewer**: Full 3D navigation with orbit controls, camera positioning, and navigation gizmo
- **Format Conversion**: Convert models to GLB, GLTF, OBJ, STL, USDZ, and PLY formats

### Advanced Tools
- **Transform Tools**: Translate, rotate, and scale models with visual gizmos
- **Undo/Redo System**: Full command history with Ctrl+Z/Ctrl+Y keyboard shortcuts (up to 25 operations)
- **Multi-Model Management**: Load and organize multiple models in a scene tree view
- **Model Selection**: Click to select individual models, with multi-selection support
- **Scene Composition**: Visual tree view showing all loaded models with expand/collapse functionality

### User Experience
- **Drag & Drop**: Direct file dropping onto the viewer
- **Real-time Feedback**: Loading progress and status updates
- **Error Handling**: Comprehensive error messages and graceful degradation
- **Responsive Interface**: Clean, modern UI that adapts to different screen sizes

## Architecture

The application follows a modular architecture with clear separation of concerns and implements the Command pattern for undo/redo functionality:

### Core Modules

#### `js/App.js`
- Main application entry point and orchestrator
- Initializes all modules with proper dependency injection
- Provides public API for programmatic access
- Handles application-level error management and status reporting

#### `js/SceneManager.js`
- Manages Three.js scene, camera, renderer, and lighting
- Handles model addition/removal with transform controls
- Provides transform tools (translate, rotate, scale) with visual gizmos
- Manages multi-model selection and transformation
- Integrates with HistoryManager for operation tracking

#### `js/loaders/LoaderManager.js`
- Centralized manager for all 3D file format loading (GLB, STL, USDZ, FBX, IFC)
- Coordinates individual loader modules with unified interface
- Supports multi-file loading with progress tracking and error handling
- Integrates with command system for undoable load operations
- Manages loader lifecycle and resource cleanup

#### `js/ModelConverter.js`
- Manages model format conversion and export
- Supports exporting to GLB, GLTF, OBJ, STL, USDZ and PLY formats
- Handles multi-model export with automatic file naming
- Provides format-specific export options and optimizations

#### `js/UIManager.js`
- Manages all DOM interactions and event handling
- Provides model tree view with selection and expansion states
- Handles transform tool UI and conversion interface
- Coordinates between user actions and other modules
- Manages keyboard shortcuts and user feedback

#### `js/HistoryManager.js`
- Implements command pattern for undo/redo functionality
- Maintains operation history with configurable size limit (25 operations)
- Provides keyboard shortcuts (Ctrl+Z/Ctrl+Y) for undo/redo
- Supports command merging for similar consecutive operations

#### `js/ModalManager.js`
- Manages modal dialogs for export progress and error handling
- Provides visual feedback during long-running operations
- Handles export progress tracking with real-time updates
- Displays user-friendly error messages with actionable hints

#### `js/NavigationGizmo.js`
- Provides 3D navigation controls and orientation indicator
- Interactive gizmo for quick camera positioning and rotation
- Visual feedback for current camera orientation
- Enhances user experience with intuitive 3D navigation

### Command System

#### `js/commands/Command.js`
- Base class for all undoable operations
- Defines standard interface for execute/undo operations
- Provides command metadata and validation

#### `js/commands/LoadModelCommand.js`
- Handles undoable model loading operations
- Manages model metadata and scene integration

#### `js/commands/RemoveModelCommand.js`
- Handles undoable model removal operations
- Preserves model state for restoration

#### `js/commands/TransformCommand.js`
- Handles undoable transform operations (translate, rotate, scale)
- Supports multi-model transformation with state preservation

### Loader System

#### `js/loaders/BaseLoader.js`
- Abstract base class for all model loaders
- Provides common loading interface and error handling
- Standardizes loader lifecycle and resource management

#### `js/loaders/GLBLoader.js`
- Specialized loader for GLB/GLTF binary files
- Handles materials, textures, and animations
- Optimized for glTF 2.0 specification compliance

#### `js/loaders/STLLoader.js`
- Handles STL stereolithography files
- Automatic scaling and rotation for optimal viewing
- Binary and ASCII STL format support

#### `js/loaders/USDZLoader.js`
- Universal Scene Description file loader
- AR-ready content support with material preservation
- Apple USDZ format compatibility

#### `js/loaders/FBXLoader.js`
- Autodesk FBX file format support
- Complex scene hierarchy and animation handling
- Material and texture preservation

#### `js/loaders/IFCLoader.js`
- Industry Foundation Classes (IFC) building information modeling
- Construction and architecture file format support
- Geometric and semantic building data processing

#### `js/utils/FileUtils.js`
- Utility functions for file operations and downloads
- File type validation and size formatting
- Cross-browser compatibility helpers

## File Structure

```
├── index.html              # Main HTML file with UI layout
├── index.js                # Application entry point
├── main.css                # Application styles
├── License.md              # Project license information
├── CNAME                   # Domain configuration for GitHub Pages
├── js/
│   ├── App.js              # Main application orchestrator
│   ├── SceneManager.js     # Three.js scene and transform management
│   ├── ModelConverter.js   # Model export and conversion
│   ├── UIManager.js        # UI management and event handling
│   ├── HistoryManager.js   # Undo/redo command management
│   ├── ModalManager.js     # Export progress and error modal management
│   ├── NavigationGizmo.js  # 3D navigation controls and orientation gizmo
│   ├── commands/           # Command pattern implementation
│   │   ├── Command.js      # Base command class
│   │   ├── LoadModelCommand.js     # Undoable model loading
│   │   ├── RemoveModelCommand.js   # Undoable model removal
│   │   └── TransformCommand.js     # Undoable transformations
│   ├── loaders/            # Modular file format loading system
│   │   ├── LoaderManager.js        # Centralized loader coordination
│   │   ├── BaseLoader.js           # Abstract base loader class
│   │   ├── GLBLoader.js            # GLB/GLTF binary file loader
│   │   ├── STLLoader.js            # STL stereolithography loader
│   │   ├── USDZLoader.js           # USDZ universal scene loader
│   │   ├── FBXLoader.js            # FBX Autodesk file loader
│   │   └── IFCLoader.js            # IFC building information loader
│   └── utils/
│       └── FileUtils.js    # File operations and utilities
├── three.js-master/        # Three.js library and examples
└── README.md               # Project documentation
```

## Usage

### Basic Usage
1. Open `index.html` in a web browser
2. Click "Load models" to select 3D files (supports GLB, STL, USDZ, FBX, and IFC formats with multiple selection)
3. Use mouse controls to navigate the 3D view:
   - **Left click + drag**: Rotate camera around the model
   - **Right click + drag**: Pan the camera
   - **Mouse wheel**: Zoom in/out
4. Click on models to select them (hold Ctrl for multi-selection)
5. Use the scene composition tree to manage loaded models

### Transform Tools
- **Translate**: Click the "Translate" button to move selected models
- **Rotate**: Click the "Rotate" button to rotate selected models
- **Scale**: Click the "Scale" button to resize selected models
- **Visual Gizmos**: Interactive handles appear for precise transformations
- **Escape Key**: Exit any active transform mode

### Undo/Redo System
- **Ctrl+Z**: Undo the last operation (up to 25 operations)
- **Ctrl+Y** or **Ctrl+Shift+Z**: Redo previously undone operations
- **Supported Operations**: Model loading, removal, and all transformations

### Model Management
- **Scene Tree**: View all loaded models in an expandable tree structure
- **Model Selection**: Click models in the tree or 3D view to select them
- **Multi-Selection**: Hold Ctrl while clicking to select multiple models
- **Clear Models**: Remove all models from the scene

### Export and Conversion
1. Load one or more models
2. Select an export format from the dropdown (GLB, GLTF, OBJ, STL, USDZ, or PLY)
3. Click "Create" to download the converted file
4. Multi-model scenes are exported as combined models with timestamped filenames

### Programmatic Usage
The application exposes a global `app` object for programmatic access:

```javascript
// Load a model programmatically
const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.accept = '.glb,.stl,.usdz,.fbx,.ifc';
fileInput.onchange = async (e) => {
    try {
        const result = await app.loadModel(e.target.files[0]);
        console.log('Model loaded:', result);
    } catch (error) {
        console.error('Failed to load model:', error);
    }
};

// Export all models to a specific format
try {
    await app.exportModel('glb');
    console.log('Models exported successfully');
} catch (error) {
    console.error('Export failed:', error);
}

// Clear all models from the scene
app.clearModels();

// Get application status and information
const status = app.getStatus();
console.log('App status:', status);
// Returns: { initialized: boolean, hasModel: boolean, currentFileType: string, modelsCount: number }

// Access individual modules
const sceneManager = app.getSceneManager();
const loaderManager = app.getLoaderManager();
const modelConverter = app.getModelConverter();
const historyManager = app.getHistoryManager();
const uiManager = app.getUIManager();

// Undo/Redo operations programmatically
historyManager.undo();
historyManager.redo();
console.log('Can undo:', historyManager.canUndo());
console.log('Can redo:', historyManager.canRedo());
```

## Supported Formats

### Input Formats
- **GLB**: Binary glTF files with full material and animation support
- **STL**: Stereolithography files (with automatic scaling and rotation for optimal viewing)
- **USDZ**: Universal Scene Description files for AR/3D content
- **FBX**: Autodesk FBX files with complex scene hierarchies and animations
- **IFC**: Industry Foundation Classes files for building information modeling (BIM)

### Export Formats
- **GLB**: Binary glTF (recommended for most use cases)
- **GLTF**: Text-based glTF with separate asset files
- **OBJ**: Wavefront OBJ format (geometry only, no materials)
- **STL**: Stereolithography format for 3D printing
- **USDZ**: Universal Scene Description for AR applications
- **PLY**: Polygon File Format for research and academic use

*Note: Some export formats may have limitations depending on the complexity of the input model and available materials/textures.*

### Import/export support matrix
| Import/Export | GLB     | GLTF    | STL | USDZ | PLY | OBJ |
|---------------|---------|---------|-----|------|-----|-----|
| GLB           | Yes     | Yes     | Yes | Yes  | Yes | Yes |
| STL           | Yes     | Yes     | Yes | Yes  | Yes | Yes |
| USDZ          | Yes     | Yes     | Yes | Yes  | Yes | Yes |
| FBX           | Partial | Partial | Yes | Yes  | Yes | Yes |
| IFC           | Yes     | Yes     | Yes | Yes  | Yes | Yes |

## Dependencies

### Core Libraries
- **[Three.js v0.158.0](https://threejs.org/)** - 3D graphics library loaded via CDN
- **[Three.js Examples/JSM](https://unpkg.com/three@0.158.0/examples/jsm/)** - Additional Three.js modules and loaders
- **[Three Mesh BVH v0.5.23](https://unpkg.com/three-mesh-bvh@0.5.23/)** - Spatial acceleration for ray casting
- **[Web-IFC v0.0.36](https://unpkg.com/web-ifc@0.0.36/)** - IFC file format parsing
- **[Web-IFC-Three v0.0.125](https://unpkg.com/web-ifc-three@0.0.125/)** - Three.js integration for IFC files

### Browser Requirements
- **Modern web browser** with ES6 module support and WebGL capabilities
- **Import maps support** for module resolution
- **No build process required** - runs directly in the browser

## Browser Compatibility

- **Chrome 61+** (recommended)
- **Firefox 60+**
- **Safari 10.1+**
- **Edge 16+**

*Requires WebGL support and ES6 module capability*

## Development & Extension

The modular architecture with command pattern makes it easy to:

### Adding New Features
- **New file formats**: Create new loader classes extending `BaseLoader.js` in the `loaders/` directory
- **Export formats**: Add new exporters to `ModelConverter.js`
- **Transform tools**: Implement new transformation types in `SceneManager.js`
- **Undoable operations**: Create new command classes in the `commands/` directory
- **UI enhancements**: Extend `ModalManager.js` for new dialog types or `NavigationGizmo.js` for navigation features

### Architecture Benefits
- **Clear separation of concerns** between modules
- **Command pattern** for robust undo/redo functionality
- **Dependency injection** for easy testing and modification
- **Event-driven communication** between UI and core logic
- **Modular design** allows individual component replacement

### Code Quality Features
- **Comprehensive error handling** with user-friendly messages
- **JSDoc comments** for API documentation
- **Consistent code style** following ES6+ standards
- **Memory management** with proper disposal of Three.js resources

## Live Demo

The application is hosted on GitHub Pages at: [Sweet Converting](https://sweetconverting.com) (if configured)

## Contributing

The project follows modern JavaScript practices and is designed for easy contribution:
1. Fork the repository
2. Create a feature branch
3. Follow the existing code style and architecture patterns
4. Test your changes thoroughly
5. Submit a pull request

Each module is well-documented and independent, making it straightforward to understand and modify specific functionality.
