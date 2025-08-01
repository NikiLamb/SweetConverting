export class FileUtils {
    /**
     * Downloads a file by creating a temporary download link
     * @param {*} data - The data to download (string, ArrayBuffer, etc.)
     * @param {string} filename - The name of the file to download
     * @param {string} mimeType - The MIME type of the file
     */
    static downloadFile(data, filename, mimeType) {
        const blob = new Blob([data], { type: mimeType })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }
    
    /**
     * Gets the file extension from a filename
     * @param {string} filename - The filename to parse
     * @returns {string} The file extension (including the dot)
     */
    static getFileExtension(filename) {
        const lastDotIndex = filename.lastIndexOf('.')
        return lastDotIndex !== -1 ? filename.slice(lastDotIndex) : ''
    }
    
    /**
     * Validates if a file has a supported extension
     * @param {string} filename - The filename to validate
     * @param {string[]} supportedExtensions - Array of supported extensions
     * @returns {boolean} True if the file extension is supported
     */
    static isFileTypeSupported(filename, supportedExtensions) {
        const extension = this.getFileExtension(filename.toLowerCase())
        return supportedExtensions.includes(extension)
    }
    
    /**
     * Formats file size in human-readable format
     * @param {number} bytes - File size in bytes
     * @returns {string} Formatted file size
     */
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes'
        
        const k = 1024
        const sizes = ['Bytes', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }
    
    /**
     * Reads a file as ArrayBuffer
     * @param {File} file - The file to read
     * @returns {Promise<ArrayBuffer>} Promise that resolves with the file data
     */
    static readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result)
            reader.onerror = () => reject(new Error('Failed to read file'))
            reader.readAsArrayBuffer(file)
        })
    }
    
    /**
     * Reads a file as text
     * @param {File} file - The file to read
     * @returns {Promise<string>} Promise that resolves with the file content as text
     */
    static readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result)
            reader.onerror = () => reject(new Error('Failed to read file'))
            reader.readAsText(file)
        })
    }
}