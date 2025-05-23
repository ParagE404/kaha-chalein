import React from 'react'
import "./TopBar.css"

const TopBar = ({text = "Select your vibe for tonight", style}) => {
  return (
    <div className="top-bar" style={style}>
        <div className="text">
            {text}
        </div>
    </div>
  )
}

export default TopBar