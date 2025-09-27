import React, { useRef, useState } from 'react';

// Simulated card edge detection (replace with OpenCV.js or SDK for production)
const detectCardEdges = (canvas, img) => {
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  // Simulate card as centered rectangle; replace this logic with actual detection
  return { x: 20, y: 40, width: img.width - 40, height: img.height - 80 };
};

function cropToCard(canvas, box) {
  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = box.width;
  cropCanvas.height = box.height;
  cropCanvas
    .getContext('2d')
    .drawImage(
      canvas,
      box.x,
      box.y,
      box.width,
      box.height,
      0,
      0,
      box.width,
      box.height
    );
  return cropCanvas.toDataURL('image/png');
}

export default function AutoFrameCardCapture() {
  const [croppedUri, setCroppedUri] = useState('');
  const [bulkUris, setBulkUris] = useState([]);
  const canvasRef = useRef(null);

  // Single image handler (camera/file input)
  const handlePhoto = (e) => {
    const file = e.target.files;
    if (!file) return;
    const img = new window.Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = canvasRef.current;
      canvas.width = img.width;
      canvas.height = img.height;
      const box = detectCardEdges(canvas, img);
      setCroppedUri(cropToCard(canvas, box));
    };
  };

  // Bulk image handler
  const handleBulk = async (e) => {
    const files = Array.from(e.target.files);
    const croppedList = [];
    for (let file of files) {
      const img = new window.Image();
      img.src = URL.createObjectURL(file);
      await new Promise(resolve => {
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const box = detectCardEdges(canvas, img);
          croppedList.push(cropToCard(canvas, box));
          resolve();
        };
      });
    }
    setBulkUris(croppedList);
  };

  return (
    <div>
      <h2>Single Card Capture</h2>
      <input type="file" accept="image/*" capture="environment" onChange={handlePhoto} />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      {croppedUri && <img src={croppedUri} alt="Cropped Card" style={{ maxWidth: 300, border: '1px solid #ccc', marginTop: 8 }} />}

      <hr />

      <h2>Bulk Card Capture</h2>
      <input type="file" multiple accept="image/*" onChange={handleBulk} />
      <div style={{display: 'flex', flexWrap: 'wrap'}}>
        {bulkUris.map((uri, i) => (
          <img key={i} src={uri} alt={`Card ${i+1}`} style={{ maxWidth: 140, margin: 4, border: '1px solid #ccc' }} />
        ))}
      </div>
    </div>
  );
}
