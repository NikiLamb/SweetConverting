import { Command } from './commands/Command.js'

/**
 * Manages command history for undo/redo functionality
 * Maintains separate stacks for undo and redo operations
 * Supports up to 25 operations in memory
 */
export class HistoryManager {
    constructor() {
        this.undoStack = []
        this.redoStack = []
        this.maxHistorySize = 25
        this.historyChangeCallbacks = []
        this.mergeTimeWindow = 1000 // 1 second window for merging similar commands
        
        // Set up keyboard shortcuts
        this.setupKeyboardShortcuts()
        
        console.log('HistoryManager initialized with max history size:', this.maxHistorySize)
    }
    
    /**
     * Sets up keyboard shortcuts for undo/redo
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // Check for Ctrl+Z (undo) or Cmd+Z on Mac
            if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
                event.preventDefault()
                this.undo()
                return
            }
            
            // Check for Ctrl+Y (redo) or Ctrl+Shift+Z or Cmd+Shift+Z on Mac
            if (((event.ctrlKey || event.metaKey) && event.key === 'y') ||
                ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'Z')) {
                event.preventDefault()
                this.redo()
                return
            }
        })
        
        console.log('Keyboard shortcuts registered: Ctrl+Z (undo), Ctrl+Y/Ctrl+Shift+Z (redo)')
    }
    
    /**
     * Executes a command and adds it to the undo stack
     * @param {Command} command - The command to execute
     * @param {boolean} mergeable - Whether this command can be merged with previous similar commands
     */
    execute(command, mergeable = false) {
        if (!(command instanceof Command)) {
            console.error('HistoryManager.execute: Invalid command object', command)
            return false
        }
        
        try {
            // Try to merge with the last command if mergeable and within time window
            if (mergeable && this.undoStack.length > 0) {
                const lastCommand = this.undoStack[this.undoStack.length - 1]
                const timeDiff = command.timestamp - lastCommand.timestamp
                
                if (timeDiff <= this.mergeTimeWindow && lastCommand.canMergeWith(command)) {
                    console.log('Merging command with previous:', command.type)
                    lastCommand.mergeWith(command)
                    this.notifyHistoryChanged()
                    return true
                }
            }
            
            // Execute the command
            command.execute()
            
            // Add to undo stack
            this.undoStack.push(command)
            
            // Clear redo stack (new action invalidates redo history)
            this.redoStack = []
            
            // Maintain max history size
            this.trimHistory()
            
            // Notify listeners
            this.notifyHistoryChanged()
            
            console.log(`Executed command: ${command.toString()}. Undo stack size: ${this.undoStack.length}`)
            return true
            
        } catch (error) {
            console.error('Error executing command:', error)
            console.error('Command details:', command)
            return false
        }
    }
    
    /**
     * Undoes the last command
     * @returns {boolean} - True if undo was successful
     */
    undo() {
        if (this.undoStack.length === 0) {
            console.log('No commands to undo')
            return false
        }
        
        try {
            const command = this.undoStack.pop()
            
            // Execute undo
            command.undo()
            
            // Add to redo stack
            this.redoStack.push(command)
            
            // Maintain max history size for redo stack too
            if (this.redoStack.length > this.maxHistorySize) {
                this.redoStack.shift()
            }
            
            // Notify listeners
            this.notifyHistoryChanged()
            
            console.log(`Undid command: ${command.toString()}. Undo stack size: ${this.undoStack.length}`)
            return true
            
        } catch (error) {
            console.error('Error during undo:', error)
            return false
        }
    }
    
    /**
     * Redoes the last undone command
     * @returns {boolean} - True if redo was successful
     */
    redo() {
        if (this.redoStack.length === 0) {
            console.log('No commands to redo')
            return false
        }
        
        try {
            const command = this.redoStack.pop()
            
            // Execute the command again
            command.execute()
            
            // Add back to undo stack
            this.undoStack.push(command)
            
            // Maintain max history size
            this.trimHistory()
            
            // Notify listeners
            this.notifyHistoryChanged()
            
            console.log(`Redid command: ${command.toString()}. Undo stack size: ${this.undoStack.length}`)
            return true
            
        } catch (error) {
            console.error('Error during redo:', error)
            return false
        }
    }
    
    /**
     * Clears all command history
     */
    clear() {
        this.undoStack = []
        this.redoStack = []
        this.notifyHistoryChanged()
        console.log('Command history cleared')
    }
    
    /**
     * Trims the undo stack to maintain max history size
     */
    trimHistory() {
        while (this.undoStack.length > this.maxHistorySize) {
            const removedCommand = this.undoStack.shift()
            console.log(`Removed old command from history: ${removedCommand.toString()}`)
        }
    }
    
    /**
     * Adds a callback to be notified when history changes
     * @param {Function} callback - Function to call when history changes
     */
    addHistoryChangeListener(callback) {
        if (typeof callback === 'function') {
            this.historyChangeCallbacks.push(callback)
        }
    }
    
    /**
     * Removes a history change callback
     * @param {Function} callback - Function to remove
     */
    removeHistoryChangeListener(callback) {
        const index = this.historyChangeCallbacks.indexOf(callback)
        if (index !== -1) {
            this.historyChangeCallbacks.splice(index, 1)
        }
    }
    
    /**
     * Notifies all listeners that history has changed
     */
    notifyHistoryChanged() {
        this.historyChangeCallbacks.forEach(callback => {
            try {
                callback({
                    canUndo: this.canUndo(),
                    canRedo: this.canRedo(),
                    undoCount: this.undoStack.length,
                    redoCount: this.redoStack.length,
                    lastCommand: this.getLastCommand()
                })
            } catch (error) {
                console.error('Error in history change callback:', error)
            }
        })
    }
    
    /**
     * Returns whether undo is available
     * @returns {boolean} - True if undo is possible
     */
    canUndo() {
        return this.undoStack.length > 0
    }
    
    /**
     * Returns whether redo is available
     * @returns {boolean} - True if redo is possible
     */
    canRedo() {
        return this.redoStack.length > 0
    }
    
    /**
     * Gets the last executed command
     * @returns {Command|null} - The last command or null if no commands
     */
    getLastCommand() {
        return this.undoStack.length > 0 ? this.undoStack[this.undoStack.length - 1] : null
    }
    
    /**
     * Gets the current state summary
     * @returns {object} - Current history state
     */
    getState() {
        return {
            undoCount: this.undoStack.length,
            redoCount: this.redoStack.length,
            canUndo: this.canUndo(),
            canRedo: this.canRedo(),
            maxHistorySize: this.maxHistorySize,
            lastCommand: this.getLastCommand()?.toString() || null
        }
    }
    
    /**
     * Gets a summary of recent commands for debugging
     * @param {number} count - Number of recent commands to include
     * @returns {Array} - Array of command summaries
     */
    getRecentCommands(count = 5) {
        const recent = this.undoStack.slice(-count)
        return recent.map(cmd => ({
            type: cmd.type,
            name: cmd.name,
            timestamp: new Date(cmd.timestamp).toLocaleTimeString()
        }))
    }
}
