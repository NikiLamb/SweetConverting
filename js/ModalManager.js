/**
 * ModalManager handles the export progress modal and toast notifications
 */
export class ModalManager {
    constructor() {
        this.modal = null
        this.modalTitle = null
        this.modalCloseBtn = null
        this.progressSection = null
        this.progressText = null
        this.errorSection = null
        this.errorMessage = null
        this.errorDetails = null
        this.toastContainer = null
        
        this.isExporting = false
        this.setupElements()
        this.setupEventListeners()
    }
    
    setupElements() {
        this.modal = document.getElementById('export-modal')
        this.modalTitle = document.getElementById('modal-title')
        this.modalCloseBtn = document.getElementById('modal-close-btn')
        this.progressSection = document.getElementById('export-progress')
        this.progressText = document.getElementById('progress-text')
        this.errorSection = document.getElementById('export-error')
        this.errorMessage = document.getElementById('error-message')
        this.errorDetails = document.getElementById('error-details')
        this.toastContainer = document.getElementById('toast-container')
        
        if (!this.modal || !this.toastContainer) {
            console.error('Modal or toast container elements not found')
        }
    }
    
    setupEventListeners() {
        // Close button click
        if (this.modalCloseBtn) {
            this.modalCloseBtn.addEventListener('click', () => {
                if (!this.isExporting) {
                    this.hideModal()
                }
            })
        }
        
        // Click outside modal to close (only when not exporting)
        if (this.modal) {
            this.modal.addEventListener('click', (event) => {
                if (event.target === this.modal && !this.isExporting) {
                    this.hideModal()
                }
            })
        }
        
        // Escape key to close modal
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.modal.style.display !== 'none' && !this.isExporting) {
                this.hideModal()
            }
        })
    }
    
    /**
     * Shows the export modal with progress indicator
     * @param {string} format - The export format being processed
     */
    showExportModal(format) {
        this.isExporting = true
        
        if (this.modalTitle) {
            this.modalTitle.textContent = `Exporting to ${format.toUpperCase()}`
        }
        
        if (this.progressText) {
            this.progressText.textContent = 'Preparing export...'
        }
        
        // Show progress section, hide error section
        if (this.progressSection) {
            this.progressSection.style.display = 'flex'
        }
        if (this.errorSection) {
            this.errorSection.style.display = 'none'
        }
        
        // Disable close button during export
        if (this.modalCloseBtn) {
            this.modalCloseBtn.disabled = true
        }
        
        // Show modal
        if (this.modal) {
            this.modal.style.display = 'flex'
        }
        
        console.log(`Export modal shown for ${format} format`)
    }
    
    /**
     * Updates the progress text in the modal
     * @param {string} text - The progress message to display
     */
    updateProgress(text) {
        if (this.progressText) {
            this.progressText.textContent = text
        }
        console.log(`Export progress: ${text}`)
    }
    
    /**
     * Shows export success and hides the modal
     * @param {string} format - The format that was exported
     * @param {string} filename - The filename that was exported (optional)
     */
    showExportSuccess(format, filename = '') {
        this.isExporting = false
        
        // Hide modal
        this.hideModal()
        
        // Show success toast
        const message = filename 
            ? `Successfully exported to ${format.toUpperCase()}: ${filename}`
            : `Successfully exported to ${format.toUpperCase()}`
        
        this.showToast('success', 'Export Complete', message)
        
        console.log(`Export success: ${format}`, filename)
    }
    
    /**
     * Shows export error in the modal
     * @param {string} message - The main error message
     * @param {string} details - Detailed error information (optional)
     */
    showExportError(message, details = '') {
        this.isExporting = false
        
        if (this.modalTitle) {
            this.modalTitle.textContent = 'Export Failed'
        }
        
        if (this.errorMessage) {
            this.errorMessage.textContent = message
        }
        
        if (this.errorDetails) {
            this.errorDetails.textContent = details
        }
        
        // Hide progress section, show error section
        if (this.progressSection) {
            this.progressSection.style.display = 'none'
        }
        if (this.errorSection) {
            this.errorSection.style.display = 'flex'
        }
        
        // Enable close button
        if (this.modalCloseBtn) {
            this.modalCloseBtn.disabled = false
        }
        
        console.error('Export error shown in modal:', message, details)
    }
    
    /**
     * Hides the export modal
     */
    hideModal() {
        if (this.modal) {
            this.modal.style.display = 'none'
        }
        this.isExporting = false
        console.log('Export modal hidden')
    }
    
    /**
     * Shows a toast notification
     * @param {string} type - The type of toast ('success', 'error', 'info')
     * @param {string} title - The toast title
     * @param {string} message - The toast message
     * @param {number} duration - How long to show the toast in milliseconds (default: 5000)
     */
    showToast(type, title, message, duration = 5000) {
        if (!this.toastContainer) {
            console.warn('Toast container not found')
            return
        }
        
        // Create toast element
        const toast = document.createElement('div')
        toast.className = `toast toast-${type}`
        
        const toastHeader = document.createElement('div')
        toastHeader.className = 'toast-header'
        toastHeader.textContent = title
        
        const toastBody = document.createElement('div')
        toastBody.className = 'toast-body'
        toastBody.textContent = message
        
        toast.appendChild(toastHeader)
        toast.appendChild(toastBody)
        
        // Add to container
        this.toastContainer.appendChild(toast)
        
        // Trigger animation
        setTimeout(() => {
            toast.classList.add('toast-show')
        }, 10)
        
        // Auto-remove after duration
        setTimeout(() => {
            this.removeToast(toast)
        }, duration)
        
        console.log(`Toast shown: ${type} - ${title}: ${message}`)
    }
    
    /**
     * Removes a toast notification
     * @param {HTMLElement} toast - The toast element to remove
     */
    removeToast(toast) {
        if (!toast || !toast.parentNode) return
        
        toast.classList.add('toast-hide')
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast)
            }
        }, 300) // Match CSS transition duration
    }
    
    /**
     * Shows an info toast
     * @param {string} title - The toast title
     * @param {string} message - The toast message
     */
    showInfoToast(title, message) {
        this.showToast('info', title, message)
    }
    
    /**
     * Shows an error toast
     * @param {string} title - The toast title
     * @param {string} message - The toast message
     */
    showErrorToast(title, message) {
        this.showToast('error', title, message, 7000) // Longer duration for errors
    }
    
    /**
     * Shows a success toast
     * @param {string} title - The toast title
     * @param {string} message - The toast message
     */
    showSuccessToast(title, message) {
        this.showToast('success', title, message)
    }
}
