# IFC Support Implementation Guide

## Overview
Sweet Converting now supports IFC (Industry Foundation Classes) files, enabling the loading and visualization of BIM (Building Information Modeling) data in the 3D viewer.

## Implementation Details

### Dependencies Added
- `web-ifc@0.0.57` - Core IFC parsing library with WebAssembly support
- `web-ifc-three@0.0.125` - Three.js integration for IFC geometry rendering

### Files Modified
1. **index.html**
   - Added IFC libraries to import map
   - Updated file input to accept `.ifc` files
   - Updated UI label to include IFC format

2. **js/ModelLoaders.js**
   - Added IFC loader imports
   - Implemented IFC loader initialization with WASM configuration
   - Added `loadIFCFile()` method following existing patterns
   - Added IFC-specific material handling
   - Updated supported formats to include `.ifc`

### Features Supported
- ✅ Load IFC files from file input
- ✅ Display IFC geometry in 3D scene
- ✅ Automatic material conversion for proper rendering
- ✅ Integration with existing undo/redo system
- ✅ Model positioning and camera centering
- ✅ Error handling with user-friendly messages
- ✅ Performance optimizations (fast booleans, coordinate origin)
- ✅ Support for multiple models in scene

### Configuration Options
The IFC loader is configured with:
- **WASM Path**: `https://unpkg.com/web-ifc@0.0.57/`
- **Fast Booleans**: Enabled for better performance
- **Coordinate to Origin**: Enabled for consistent positioning
- **Profile Optimization**: Enabled for faster loading
- **Space Elements**: Hidden by default (IFCSPACE = false)

### Error Handling
The implementation includes comprehensive error handling:
- WASM initialization failures
- Corrupted or invalid IFC files
- Files with no displayable geometry
- Network issues when loading dependencies

### Material Handling
IFC models are processed to ensure proper rendering:
- Legacy materials converted to MeshStandardMaterial
- PBR properties applied for realistic lighting
- Default materials created for meshes without materials
- Texture maps preserved when available

## Usage

### Loading IFC Files
1. Click "Load models" button
2. Select one or more `.ifc` files
3. Files will be parsed and displayed in the 3D scene
4. Models can be manipulated like other formats (translate, rotate, scale)

### Testing
A sample IFC file is available at:
`three.js-master/three.js-master/examples/models/ifc/rac_advanced_sample_project.ifc`

### Browser Compatibility
- Requires modern browsers with WebAssembly support
- ES6 module support required
- WebGL support required for 3D rendering

## Future Enhancements
- BIM property extraction and display
- IFC spatial hierarchy visualization  
- Element selection and highlighting
- Property panels for selected elements
- IFC-specific export options
- Advanced filtering by IFC categories

## Troubleshooting

### Common Issues
1. **"IFC loader not properly initialized"**
   - Refresh the page to reinitialize WASM
   - Check network connectivity for CDN resources

2. **"Invalid or corrupted IFC file"**
   - Verify the IFC file is valid
   - Try with a different IFC file

3. **"IFC file contains no displayable geometry"**
   - The IFC file may contain only metadata
   - Check if the file has 3D geometric elements

### Performance Tips
- Large IFC files may take time to load
- Consider breaking large models into smaller files
- Use browser developer tools to monitor loading progress
