/**
 * Base class for all undoable commands
 * Follows the Command Pattern for implementing undo/redo functionality
 */
export class Command {
    /**
     * Base command constructor
     * @param {string} type - The type/name of this command
     * @param {string} name - Human-readable description of the command
     */
    constructor(type, name) {
        this.type = type
        this.name = name
        this.id = this.generateId()
        this.timestamp = Date.now()
    }
    
    /**
     * Generates a unique ID for this command
     * @returns {string} - Unique identifier
     */
    generateId() {
        return `${this.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
    
    /**
     * Executes the command (also used for redo)
     * Must be implemented by subclasses
     */
    execute() {
        throw new Error('Command.execute() must be implemented by subclasses')
    }
    
    /**
     * Undoes the command
     * Must be implemented by subclasses
     */
    undo() {
        throw new Error('Command.undo() must be implemented by subclasses')
    }
    
    /**
     * Checks if this command can be merged with another command
     * Used for combining similar operations (e.g., continuous transformations)
     * @param {Command} otherCommand - The command to potentially merge with
     * @returns {boolean} - True if commands can be merged
     */
    canMergeWith(otherCommand) {
        return false // Default: no merging
    }
    
    /**
     * Merges this command with another command
     * Only called if canMergeWith returns true
     * @param {Command} otherCommand - The command to merge with
     */
    mergeWith(otherCommand) {
        throw new Error('Command.mergeWith() must be implemented if canMergeWith returns true')
    }
    
    /**
     * Serializes the command to JSON
     * @returns {object} - JSON representation of the command
     */
    toJSON() {
        return {
            type: this.type,
            name: this.name,
            id: this.id,
            timestamp: this.timestamp
        }
    }
    
    /**
     * Deserializes the command from JSON
     * @param {object} json - JSON representation to restore from
     */
    fromJSON(json) {
        this.type = json.type
        this.name = json.name
        this.id = json.id
        this.timestamp = json.timestamp
    }
    
    /**
     * Returns a string representation of the command
     * @returns {string} - String description
     */
    toString() {
        return `${this.type}: ${this.name} (${this.id})`
    }
}
