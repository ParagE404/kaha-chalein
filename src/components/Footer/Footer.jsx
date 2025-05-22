import React from 'react'
import './Footer.css'   
import Image from 'next/image'
import footer_bg from '../../assets/footer/footer-bg.png'
const Footer = () => {
  return (
    <div className='Footer'>
       <Image className='footer-bg' src={footer_bg} alt='footer-bg' width={392} height={61} />
    </div>
  )
}

export default Footer