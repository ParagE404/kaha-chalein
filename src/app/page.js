'use client';

import './styles/welcome.css';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header/Header';
import Image from 'next/image';
import image1 from '../assets/welcome/welcome-1.png';
import image2 from '../assets/welcome/welcome-2.png';
import Footer from '@/components/Footer/Footer';
import Button from '@/components/Buttons/Button';

export default function Welcome() {
  const router = useRouter();

  return (
    <div className="Welcome container">
      <Header/>
      <div className="text-1">No more “I’m fine with anything” lies..</div>
      <div className="images-container">
        <Image className="image-1" width={178} height={267} src={image1} alt="image1" />
        <Image className="image-2" width={178} height={267} src={image2} alt="image2" />
      </div>
      <div className="text-2">There’s no limit- swipe right on as many as you like!</div>

      <Button className="get-started-btn" type="primary"  onClick={() => router.push('/user-input')}>Get Started</Button>

      <Footer/>
    </div>
  );
}
