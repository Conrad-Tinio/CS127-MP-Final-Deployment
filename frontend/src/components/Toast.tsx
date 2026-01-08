import { useEffect } from 'react'
import { CheckCircle2, X, AlertCircle, Info } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info'

interface ToastProps {
  message: string
  type?: ToastType
  onClose: () => void
  duration?: number
}

export default function Toast({ message, type = 'success', onClose, duration = 4000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-accent-400" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-rose-400" />
      case 'info':
        return <Info className="w-5 h-5 text-primary-400" />
    }
  }

  const getBgColor = () => {
    switch (type) {
      case 'success':
        return 'bg-accent-500/20 border-accent-500/30'
      case 'error':
        return 'bg-rose-500/20 border-rose-500/30'
      case 'info':
        return 'bg-primary-500/20 border-primary-500/30'
    }
  }

  return (
    <div className="fixed top-4 right-4 z-[100] animate-slide-down">
      <div className={`glass-card p-4 pr-12 border ${getBgColor()} shadow-lg min-w-[300px] max-w-[500px]`}>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            {getIcon()}
          </div>
          <p className="text-dark-100 flex-1 whitespace-pre-wrap">{message}</p>
          <button
            onClick={onClose}
            className="absolute top-2 right-2 p-1 hover:bg-dark-800 rounded transition-colors"
          >
            <X className="w-4 h-4 text-dark-400" />
          </button>
        </div>
      </div>
    </div>
  )
}

