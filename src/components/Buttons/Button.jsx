import React from 'react'
import './Button.css'

function Button({ 
  children, 
  onClick, 
  type = 'primary', 
  disabled = false,
  fullWidth = false,
  className = ''
}) {
  return (
    <button 
      className={`custom-button ${type} ${fullWidth ? 'full-width' : ''} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

export default Button