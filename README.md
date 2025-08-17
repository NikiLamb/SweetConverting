# 3D Model Viewer

A web-based 3D model viewer that supports loading and converting between multiple 3D file formats including GLB, STL, and USDZ.

## Features

- **Load Models**: Support for GLB, STL, and USDZ file formats
- **Model Viewing**: Interactive 3D viewer with orbit controls
- **Format Conversion**: Convert between different 3D model formats
- **Export Models**: Download converted models in various formats

## Architecture

The application has been refactored into a modular architecture with clear separation of concerns:

### Core Modules

#### `js/App.js`
- Main application entry point
- Orchestrates all modules
- Provides public API for programmatic access

#### `js/SceneManager.js`
- Manages Three.js scene, camera, renderer, and lighting
- Handles model addition/removal from the scene
- Manages camera controls and window resizing
- Provides camera recentering functionality

#### `js/ModelLoaders.js`
- Handles loading of different 3D file formats
- Supports GLB, STL, and USDZ formats
- Each format has specific loading configurations
- Returns standardized loading results

#### `js/ModelConverter.js`
- Manages model format conversion and export
- Supports exporting to GLB, GLTF, OBJ, PLY, STL, and USDZ
- Handles format-specific export options
- Integrates with FileUtils for downloads

#### `js/UIManager.js`
- Manages all DOM interactions and event handling
- Handles file input, conversion UI, and user feedback
- Coordinates between user actions and other modules
- Manages UI state and validation

#### `js/utils/FileUtils.js`
- Utility functions for file operations
- File download functionality
- File type validation
- File size formatting

## File Structure

```
├── index.html              # Main HTML file
├── index.js                # Application entry point
├── main.css                # Styles
├── js/
│   ├── App.js              # Main application class
│   ├── SceneManager.js     # Three.js scene management
│   ├── ModelLoaders.js     # Model loading functionality
│   ├── ModelConverter.js   # Model conversion and export
│   ├── UIManager.js        # User interface management
│   └── utils/
│       └── FileUtils.js    # File utility functions
└── README.md               # This file
```

## Usage

### Basic Usage
1. Open `index.html` in a web browser
2. Click "Load model" to select a 3D file
3. Use mouse controls to navigate the 3D view
4. Select an export format from the dropdown to convert the model

### Programmatic Usage
The application exposes a global `app` object for programmatic access:

```javascript
// Load a model programmatically
const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.accept = 'model/gltf-binary,model/stl,model/vnd.usdz+zip,.glb,.stl,.usdz';
fileInput.onchange = async (e) => {
    try {
        const result = await app.loadModel(e.target.files[0]);
        console.log('Model loaded:', result);
    } catch (error) {
        console.error('Failed to load model:', error);
    }
};

// Export current model
try {
    await app.exportModel('obj');
    console.log('Model exported successfully');
} catch (error) {
    console.error('Export failed:', error);
}

// Clear all models
app.clearModels();

// Get application status
const status = app.getStatus();
console.log('App status:', status);
```

## Supported Formats

### Input Formats
- **GLB**: Binary glTF files
- **STL**: Stereolithography files (with automatic scaling and rotation)
- **USDZ**: Universal Scene Description files

### Export Formats
- **GLB**: Binary glTF
- **GLTF**: Text-based glTF
- **OBJ**: Wavefront OBJ
- **PLY**: Polygon File Format
- **STL**: Stereolithography
- **USDZ**: Universal Scene Description

## Dependencies

- [Three.js](https://threejs.org/) - 3D graphics library
- Modern web browser with ES6 module support

## Browser Compatibility

- Chrome 61+
- Firefox 60+
- Safari 10.1+
- Edge 16+

## Development

The modular architecture makes it easy to:
- Add new file format support
- Extend conversion capabilities
- Customize the user interface
- Add new features without affecting existing code

Each module has clear responsibilities and well-defined interfaces, making the codebase maintainable and testable.