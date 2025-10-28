import * as React from "react"

interface Toast {
  id: string
  title?: string
  description?: string
  variant?: "default" | "destructive"
}

interface ToastContextType {
  toasts: Toast[]
  toast: (toast: Omit<Toast, "id">) => void
  dismiss: (id: string) => void
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined)

export function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    // Fallback implementation
    return {
      toast: (toast: Omit<Toast, "id">) => {
        console.log("Toast:", toast)
        // In a real implementation, this would show a toast notification
      },
      dismiss: (id: string) => {
        console.log("Dismiss toast:", id)
      },
      toasts: []
    }
  }
  return context
}

export { ToastContext }