'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeCanvas } from 'qrcode.react';
import { io } from 'socket.io-client';
import styles from '../styles/qr-code.module.css';

export default function QRCodePage() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState('');
  const [socket, setSocket] = useState(null);
  const [joinLink, setJoinLink] = useState('');

  useEffect(() => {
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);

    newSocket.on('sessionCreated', ({ sessionId }) => {
      setSessionId(sessionId);
      setJoinLink(`http://localhost:3000/join?session=${sessionId}`);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const handleCreateSession = () => {
    if (socket) {
      socket.emit('createSession', {
        name: 'Host',
        location: 'Mumbai'
      });
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(joinLink);
    alert('Link copied to clipboard!');
  };

  return (
    <div className={styles.container}>
      <h1>Share QR Code</h1>
      {!sessionId ? (
        <button onClick={handleCreateSession} className={styles.createButton}>
          Create Session
        </button>
      ) : (
        <div className={styles.qrContainer}>
          <QRCodeCanvas
            value={joinLink}
            size={256}
            level="H"
            includeMargin={true}
          />
          <p>Scan this QR code to join the session</p>
          <div className={styles.linkContainer}>
            <p className={styles.linkLabel}>Or share this link:</p>
            <div className={styles.linkWrapper}>
              <input
                type="text"
                value={joinLink}
                readOnly
                className={styles.linkInput}
              />
              <button onClick={copyToClipboard} className={styles.copyButton}>
                Copy
              </button>
            </div>
          </div>
          <button
            onClick={() => router.push(`/cards?session=${sessionId}`)}
            className={styles.startButton}
          >
            Start Voting
          </button>
        </div>
      )}
    </div>
  );
} 