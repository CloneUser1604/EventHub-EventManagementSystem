import { useEffect, useRef, useState } from 'react';

export const useScrollAnimation = (options = { threshold: 0.1, triggerOnce: false }) => {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef(null);

  useEffect(() => {
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

    const element = elementRef.current;
    if (element) {
      observer.observe(element);
    }

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [options.threshold, options.triggerOnce]);

  return [elementRef, isVisible];
};
