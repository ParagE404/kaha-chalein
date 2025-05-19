'use client';

import { useRouter } from 'next/navigation';
import styles from './styles/welcome.css';

export default function Welcome() {
  const router = useRouter();

  return (
    <div className="welcome-container">
      <h1>Kaha Chalein?</h1>
      <p>Let's decide where to eat together!</p>
      <button 
        className="get-started-btn"
        onClick={() => router.push('/user-input')}
      >
        Get Started
      </button>
    </div>
  );
}
