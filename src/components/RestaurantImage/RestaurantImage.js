"use client";

import { useState, useEffect } from "react";
import styles from "./RestaurantImage.module.css";

// Smart rate limiting - track Google API failures to avoid spam
let googleImageFailures = 0;
let lastGoogleFailure = 0;
const GOOGLE_FAILURE_THRESHOLD = 3;
const GOOGLE_FAILURE_RESET_TIME = 60000; // 60 seconds

const RestaurantImage = ({ src, alt, restaurantName }) => {
  const [imageState, setImageState] = useState("loading");
  const [imageSrc, setImageSrc] = useState(src);
  const [retryCount, setRetryCount] = useState(0);

  const maxRetries = 0; // No retries to avoid console spam
  const imageTimeout = 4000; // 4 second timeout

  useEffect(() => {
    if (!src || !src.includes("http")) {
      setImageState("fallback");
      return;
    }

    // Check if we should skip Google images due to recent failures
    const now = Date.now();
    const isGoogleImage =
      src.includes("googleapis.com") || src.includes("googleusercontent.com");

    if (isGoogleImage) {
      // Reset failure count after timeout
      if (now - lastGoogleFailure > GOOGLE_FAILURE_RESET_TIME) {
        googleImageFailures = 0;
      }

      // Skip if too many recent failures
      if (googleImageFailures >= GOOGLE_FAILURE_THRESHOLD) {
        setImageState("fallback");
        return;
      }
    }

    setImageSrc(src);
    setImageState("loading");
    setRetryCount(0);

    // Set timeout to fallback if image takes too long
    const timeout = setTimeout(() => {
      setImageState("fallback");
    }, imageTimeout);

    return () => clearTimeout(timeout);
  }, [src]);

  const handleImageLoad = () => {
    // Reset Google failure count on successful load
    const isGoogleImage =
      src &&
      (src.includes("googleapis.com") || src.includes("googleusercontent.com"));
    if (isGoogleImage) {
      googleImageFailures = Math.max(0, googleImageFailures - 1);
    }
    setImageState("loaded");
  };

  const handleImageError = () => {
    // Track Google API failures silently (no console logs)
    const isGoogleImage =
      src &&
      (src.includes("googleapis.com") || src.includes("googleusercontent.com"));
    if (isGoogleImage) {
      googleImageFailures++;
      lastGoogleFailure = Date.now();
    }

    // Show fallback immediately - no retries to avoid console spam
    setImageState("fallback");
  };

  const getFallbackGradient = (name) => {
    // Generate a consistent gradient based on restaurant name
    const hash = name.split("").reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);

    const gradients = [
      "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
      "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
      "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
      "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
      "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
      "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)",
      "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)",
    ];

    return gradients[Math.abs(hash) % gradients.length];
  };

  const getRestaurantEmoji = (name) => {
    const emojis = ["🍽️", "🍕", "🍜", "🍱", "🥘", "🍛", "🥗", "🍳"];
    const hash = name.split("").reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);
    return emojis[Math.abs(hash) % emojis.length];
  };

  if (imageState === "fallback" || !src) {
    return (
      <div
        className={styles.fallbackImage}
        style={{
          background: getFallbackGradient(restaurantName || "Restaurant"),
        }}
      >
        <div className={styles.fallbackContent}>
          <span className={styles.fallbackEmoji}>
            {getRestaurantEmoji(restaurantName || "Restaurant")}
          </span>
          <span className={styles.fallbackText}>
            {restaurantName || "Restaurant"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.imageContainer}>
      {imageState === "loading" && (
        <div className={styles.loadingPlaceholder}>
          <div className={styles.loadingSpinner}></div>
        </div>
      )}
      <img
        src={imageSrc}
        alt={alt}
        className={`${styles.restaurantImage} ${
          imageState === "loaded" ? styles.loaded : ""
        }`}
        onLoad={handleImageLoad}
        onError={handleImageError}
        loading="lazy"
      />
    </div>
  );
};

export default RestaurantImage;
