import { useEffect, useRef, useState } from 'react';

export const useScrollAnimation = (options = { threshold: 0.1, triggerOnce: false }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [element, setElement] = useState(null);

  useEffect(() => {
    if (!element) return;
    
    const observer = new IntersectionObserver(([entry]) => {
      // Khi phần tử lọt vào khung nhìn (viewport), isIntersecting = true
      // Gán isVisible = true. Nếu triggerOnce = false, khi cuộn ra khỏi viewport, isVisible = false (ẩn đi).
      if (entry.isIntersecting) {
        setIsVisible(true);
      } else {
        if (!options.triggerOnce) {
          setIsVisible(false);
        }
      }
    }, options);

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [element, options.threshold, options.triggerOnce]);

  return [setElement, isVisible];
};
