import React, { useState } from 'react';
import { Modal, Button } from 'antd';
import { PlayCircleFilled } from '@ant-design/icons';

const BACKEND_BASE = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

const buildImgUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('/')) {
    return `${BACKEND_BASE}${url}`;
  }
  return `${BACKEND_BASE}/${url.replace(/\\/g, '/')}`;
};

const isVideoUrl = (url) => {
  if (!url) return false;
  const ext = url.split('?')[0].split('.').pop().toLowerCase();
  return ['mp4', 'mov', 'webm', 'avi', 'mkv'].includes(ext);
};

const parseImages = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return arr;
  } catch (e) {}
  return [raw];
};

export const ImageGrid = ({ imageUrl, maxVisible = 3, onExpand }) => {
  const [lightbox, setLightbox] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const images = parseImages(imageUrl);
  
  if (images.length === 0) return null;

  const visibleImgs = showAll ? images : images.slice(0, maxVisible);
  const hiddenCount = images.length - maxVisible;

  let gridTemplateColumns = 'repeat(3, 1fr)';
  if (visibleImgs.length === 1) gridTemplateColumns = '1fr';
  else if (visibleImgs.length === 2) gridTemplateColumns = 'repeat(2, 1fr)';
  else if (visibleImgs.length === 4) gridTemplateColumns = 'repeat(2, 1fr)'; // 2x2 for 4 images looks better

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns,
    gap: 8,
    marginTop: 8,
  };

  const itemStyle = {
    position: 'relative',
    width: visibleImgs.length === 1 ? 250 : '100%',
    height: visibleImgs.length === 1 ? 250 : 'auto',
    aspectRatio: visibleImgs.length === 1 ? 'auto' : '1/1',
    overflow: 'hidden',
    borderRadius: 8,
    cursor: 'pointer',
    backgroundColor: '#111',
  };

  return (
    <>
      <div style={gridStyle}>
        {visibleImgs.map((url, i) => {
          const isLast = !showAll && i === maxVisible - 1 && hiddenCount > 0;
          return (
            <div key={i} style={itemStyle}>
              {isVideoUrl(url) ? (
                <>
                  <video
                    src={buildImgUrl(url)}
                    onClick={() => setLightbox(i)}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }}
                  />
                  <div
                    onClick={(e) => { e.stopPropagation(); setLightbox(i); }}
                    style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 8, cursor: 'pointer' }}
                  >
                    <PlayCircleFilled style={{ fontSize: 40, color: '#fff', opacity: 0.9 }} />
                  </div>
                </>
              ) : (
                <img
                  src={buildImgUrl(url)}
                  alt={`img-${i}`}
                  onClick={() => setLightbox(i)}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }}
                />
              )}
              {isLast && (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onExpand) {
                      onExpand();
                    } else {
                      setShowAll(true);
                    }
                  }}
                  style={{
                    position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: 8, cursor: 'pointer', color: '#fff', fontSize: 22, fontWeight: 700
                  }}
                >
                  +{hiddenCount}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {showAll && images.length > maxVisible && (
        <Button type="text" size="small" onClick={() => setShowAll(false)} style={{ padding: '2px 12px', marginTop: 8, fontWeight: 600, color: '#3b82f6', backgroundColor: '#eff6ff', borderRadius: 12 }}>Thu gọn</Button>
      )}
      <Modal
        open={lightbox !== null}
        footer={null}
        onCancel={() => {
          const v = document.getElementById('lightbox-video');
          if (v) v.pause();
          setLightbox(null);
        }}
        width="auto"
        centered
        bodyStyle={{ padding: 0, background: 'transparent' }}
        style={{ maxWidth: '95vw' }}
      >
        {lightbox !== null && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            {isVideoUrl(images[lightbox]) ? (
              <video
                id="lightbox-video"
                src={buildImgUrl(images[lightbox])}
                controls
                autoPlay
                style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: 8 }}
              />
            ) : (
              <img
                src={buildImgUrl(images[lightbox])}
                alt="full"
                style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: 8 }}
              />
            )}
            {images.length > 1 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                {images.map((url, i) => (
                  isVideoUrl(url) ? (
                    <video
                      key={i}
                      src={buildImgUrl(url)}
                      onClick={() => setLightbox(i)}
                      style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6, cursor: 'pointer', border: i === lightbox ? '2px solid #6366f1' : '2px solid transparent', opacity: i === lightbox ? 1 : 0.7 }}
                    />
                  ) : (
                    <img
                      key={i}
                      src={buildImgUrl(url)}
                      alt={`thumb-${i}`}
                      onClick={() => setLightbox(i)}
                      style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6, cursor: 'pointer', border: i === lightbox ? '2px solid #6366f1' : '2px solid transparent', opacity: i === lightbox ? 1 : 0.7 }}
                    />
                  )
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
};

export default ImageGrid;
