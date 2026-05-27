export class HistoryManager {
  constructor(scene) {
    this.scene = scene;
    this.undoStack = [];
    this.redoStack = [];
  }

  get canUndo() {
    return this.undoStack.length > 0;
  }

  get canRedo() {
    return this.redoStack.length > 0;
  }

  execute(command) {
    command.execute(this.scene);
    this.undoStack.push(command);
    this.redoStack = [];
  }

  /** Record a command whose effect is already applied (e.g. finished drag). */
  record(command) {
    this.undoStack.push(command);
    this.redoStack = [];
  }

  undo() {
    if (!this.canUndo) return false;
    const command = this.undoStack.pop();
    command.undo(this.scene);
    this.redoStack.push(command);
    return true;
  }

  redo() {
    if (!this.canRedo) return false;
    const command = this.redoStack.pop();
    command.execute(this.scene);
    this.undoStack.push(command);
    return true;
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
  }
}
