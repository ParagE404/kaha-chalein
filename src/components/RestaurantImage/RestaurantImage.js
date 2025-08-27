"use client";

import { useState, useEffect } from "react";
import styles from "./RestaurantImage.module.css";

const RestaurantImage = ({ src, alt, restaurantName }) => {
  const [imageState, setImageState] = useState("loading");
  const [imageSrc, setImageSrc] = useState(src);
  const [retryCount, setRetryCount] = useState(0);

  const maxRetries = 2;
  const retryDelay = 1000; // 1 second

  useEffect(() => {
    if (!src) {
      setImageState("fallback");
      return;
    }

    setImageSrc(src);
    setImageState("loading");
    setRetryCount(0);
  }, [src]);

  const handleImageLoad = () => {
    setImageState("loaded");
  };

  const handleImageError = () => {
    console.log(
      `Image failed to load: ${imageSrc}, retry count: ${retryCount}`
    );

    if (retryCount < maxRetries) {
      // Retry loading the image after a delay
      setTimeout(() => {
        setRetryCount((prev) => prev + 1);
        // Add a timestamp to bypass cache on retry
        const separator = src.includes("?") ? "&" : "?";
        setImageSrc(
          `${src}${separator}retry=${retryCount + 1}&t=${Date.now()}`
        );
      }, retryDelay * (retryCount + 1)); // Exponential backoff
    } else {
      // Max retries reached, show fallback
      console.log(`Max retries reached for image: ${src}, showing fallback`);
      setImageState("fallback");
    }
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
