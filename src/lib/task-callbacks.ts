type TaskCallbacks = {
  onExpandTasks: () => void;
  onCancelTask: (id: string) => void;
  onClosePanel: (() => void) | null;
  closeDropdown: (() => void) | null;
};

let registered: TaskCallbacks = {
  onExpandTasks: () => {},
  onCancelTask: () => {},
  onClosePanel: null,
  closeDropdown: null,
};

export function registerTaskCallbacks(callbacks: TaskCallbacks) {
  registered = callbacks;
}

export function getTaskCallbacks(): TaskCallbacks {
  return registered;
}
