// import React, { useState, useRef, useEffect, useCallback } from "react";
// // import { GoogleGenerativeAI } from "@google/generative-ai";
// import type { FirebaseApp } from "firebase/app";
// import { initializeApp } from "firebase/app";
// // import AutoFrameCardCapture from './components/AutoFrameCardCapture';

// import type {
//   Firestore,
//   CollectionReference,
//   DocumentData
// } from "firebase/firestore";
// import {
//   getFirestore,
//   collection,
//   getDocs,
//   addDoc,
//   deleteDoc,
//   doc,
//   updateDoc,
//   serverTimestamp,
//   query,
//   orderBy
// } from "firebase/firestore";

// // --- Asset Placeholder ---
// const logo = 'https://placehold.co/100x100/4F46E5/ffffff?text=CS';

// // --- Firebase Configuration ---
// const firebaseConfig = {
//   apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
//   authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
//   projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
//   storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
//   messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
//   appId: import.meta.env.VITE_FIREBASE_APP_ID,
// };

// // --- Google AI Configuration ---
// const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

// // --- Configuration Checks ---
// const isFirebaseConfigured = firebaseConfig?.projectId;
// const isAiConfigured = !!API_KEY;

// // --- Predefined Group Options ---
// const groupOptions = [
//   "Architect", "Ashrams", "Builders", "Building Materials", "Car Detailing", 
//   "Client", "Club", "Cold Storage", "Consumer", "Dairy", "Dealership/Partnership", 
//   "Developer", "Export", "Export Partner", "Factory", "Family", "Friend", 
//   "Govt Contractor", "Govt Deptt", "Green building", "Hardware", "Heat Insulation", 
//   "Home", "Hospitals", "Hotels", "Interior Designer", "Office", "Paint Contractors", 
//   "Paint Dealers", "Paint shop", "Partner", "Pre Fabrication", "Purchase", 
//   "Raw Material", "School", "Society", "Solar panel", "Vendor", "Others"
// ].sort();


// // --- Type Definitions ---
// interface ContactData {
//   id: string;
//   name: string;
//   designation: string;
//   company: string;
//   phoneNumbers: string[];
//   emails: string[];
//   websites: string[];
//   address: string;
//   imageBase64: string;
//   notes: string;
//   group: string;
//   whatsapp: string;
// }

// // Initialize Firebase
// let db: Firestore | undefined;
// let contactsCollectionRef: CollectionReference<DocumentData> | undefined;
// if (isFirebaseConfigured) {
//   try {
//     const app: FirebaseApp = initializeApp(firebaseConfig);
//     db = getFirestore(app);
//     contactsCollectionRef = collection(db, "visiting_cards");
//   } catch (e) {
//     console.error("Firebase initialization error:", (e as Error).message);
//   }
// }

// // --- App-specific Type Definitions ---
// type AppMode = 'single' | 'bulk' | 'chat';
// type BulkItemStatus = 'pending' | 'processing' | 'success' | 'error';
// type ChatRole = 'user' | 'model';

// interface BulkFileItem {
//   id: string;
//   file: File;
//   base64: string;
//   status: BulkItemStatus;
//   extractedData?: Partial<ContactData>;
//   error?: string;
// }

// interface ChatMessage {
//     role: ChatRole;
//     text: string;
// }

// type Part = { text: string } | { inlineData: { mimeType: string; data: string; } };

// interface BeforeInstallPromptEvent extends Event {
//   prompt: () => Promise<void>;
//   userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
// }

// // --- Standalone UI Components (Memoized for performance) ---

// const ActionPanel = React.memo(({
//     extractedData,
//     ...props
// }) => {
//     if (extractedData) return <VerificationForm extractedData={extractedData} {...props} />;
    
//     return (
//        <div className="card">
//           <div className="tabs">
//             <button className={`tab ${props.mode === 'single' ? 'active' : ''}`} onClick={() => props.setMode('single')}>Single Card</button>
//             <button className={`tab ${props.mode === 'bulk' ? 'active' : ''}`} onClick={() => props.setMode('bulk')}>Bulk Upload</button>
//             <button className={`tab ${props.mode === 'chat' ? 'active' : ''}`} onClick={() => props.setMode('chat')}>AI Assistant</button>
//           </div>
//           <input type="file" ref={props.fileInputRef} onChange={props.handleFileChange} accept="image/*" multiple={props.mode === 'bulk'} style={{display: 'none'}}/>
          
//           {props.mode === 'single' && <SingleCardUI {...props} />}
//           {props.mode === 'bulk' && <BulkUploadUI {...props} />}
//           {props.mode === 'chat' && <ChatUI {...props} />}
//       </div>
//     );
// });

// const VerificationForm = React.memo(({ extractedData, ...props }) => (
//     <div className="card">
//       <h2 className="card-title">{'id' in extractedData ? 'Edit Contact' : 'Verify & Save Contact'}</h2>
//       <div className="form-grid">
//         {renderField("Name", "name", extractedData, props.handleDataChange)}
//         {renderField("Designation", "designation", extractedData, props.handleDataChange)}
//         {renderField("Company", "company", extractedData, props.handleDataChange)}
//         {renderGroupDropdown("Group", "group", extractedData, props.handleDataChange)}
//         {renderField("WhatsApp Number", "whatsapp", extractedData, props.handleDataChange)}
//         {renderArrayField("Phone Numbers", "phoneNumbers", extractedData, props.handleDataChange, props.handleArrayDataChange)}
//         {renderArrayField("Emails", "emails", extractedData, props.handleDataChange, props.handleArrayDataChange)}
//         {renderArrayField("Websites", "websites", extractedData, props.handleDataChange, props.handleArrayDataChange)}
//         {renderField("Address", "address", extractedData, props.handleDataChange, true)}
//         {renderField("Notes", "notes", extractedData, props.handleDataChange, true)}
//       </div>
//       <div className="actions-row">
//         <button onClick={props.handleSave} disabled={props.isLoading} className="btn-primary">Save Contact</button>
//         <button onClick={props.resetState} className="btn-cancel">Cancel</button>
//       </div>
//     </div>
// ));

// const SingleCardUI = React.memo((props) => {
//     const isCameraSupported = window.isSecureContext;
//     return (
//     <>
//       {!props.frontImageBase64 ? (
//         <div onClick={() => props.fileInputRef.current?.click()} className="upload-box">
//           <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15l4-4c.928-.893 2.072-.893 3 0l4 4"/><path d="M14 14l1-1c.928-.893 2.072-.893 3 0l2 2"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"/></svg>
//           <p><span>Upload Card Image</span> or use camera</p>
//           <p className="upload-box-subtitle">PNG, JPG, GIF up to 10MB</p>
//         </div>
//       ) : (
//         <div className="image-previews">
//           <div className="preview-container">
//             <img src={`data:image/jpeg;base64,${props.frontImageBase64}`} alt="Front Preview" />
//             <p>Front / Profile</p>
//           </div>
//           <div className="preview-container">
//             {props.backImageBase64 ? <img src={`data:image/jpeg;base64,${props.backImageBase64}`} alt="Back Preview"/> :
//             ( <div onClick={() => props.fileInputRef.current?.click()} className="upload-box-small">
//                 <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
//                 <p>Add back side</p>
//               </div>
//             )}
//           </div>
//         </div>
//       )}
//       <div className="actions-row">
//         <button onClick={() => props.frontImageBase64 && props.processCardImages(props.frontImageBase64, props.backImageBase64)} disabled={props.isLoading || !props.frontImageBase64} className="btn-primary">Process Card</button>
//         <button 
//             onClick={() => props.openCamera(props.frontImageBase64 ? 'back' : 'front')} 
//             disabled={props.isLoading || (!!props.frontImageBase64 && !!props.backImageBase64) || !isCameraSupported} 
//             className="btn-secondary"
//             title={!isCameraSupported ? "Camera requires a secure (HTTPS) connection" : "Use your device's camera"}
//         >
//             Use Camera
//         </button>
//       </div>
//     </>
// )});

// const BulkUploadUI = React.memo((props) => (
//     <>
//         <div className="actions-row">
//             <button onClick={() => props.fileInputRef.current?.click()} disabled={props.isLoading} className="btn-primary">Upload Multiple Cards</button>
//             <button onClick={() => props.openCamera('bulk')} disabled={props.isLoading} className="btn-secondary">Use Camera</button>
//         </div>
//         {props.bulkItems.length > 0 && (
//             <div className="bulk-list">
//                 <ul>
//                     {props.bulkItems.map(item => (
//                         <li key={item.id} className="bulk-item">
//                             <span className="bulk-item-name">{item.file.name}</span>
//                             <span className={`status-badge status-${item.status}`}>{item.status}</span>
//                         </li>
//                     ))}
//                 </ul>
//                 <div className="actions-row">
//                    <button onClick={props.saveAllBulk} disabled={props.isLoading || props.bulkItems.every(i => i.status !== 'success')} className="btn-primary">Save All Successful</button>
//                 </div>
//             </div>
//         )}
//     </>
// ));
  
// const ChatUI = React.memo(({ chatHistory, isChatLoading, chatInput, setChatInput, handleCommandSubmit, chatDisplayRef }) => (
//     <div className="chat-container">
//        <div className="chat-display" ref={chatDisplayRef}>
//            {chatHistory.length === 0 ? (
//              <div className="chat-placeholder">
//                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
//                  <p>Ask anything about your contacts!</p>
//                  <p className="chat-placeholder-subtitle">e.g., "Who works at Google?"</p>
//              </div>
//            ) : chatHistory.map((msg, index) => (
//                <div key={index} className={`chat-message ${msg.role === 'user' ? 'user' : 'model'}`}>
//                     <p>{msg.text}</p>
//                </div>
//            ))}
//            {isChatLoading && chatHistory[chatHistory.length - 1]?.role === 'model' && <div className="chat-message model"><span className="typing-indicator"></span></div>}
//        </div>
//        <form onSubmit={(e) => { e.preventDefault(); handleCommandSubmit(); }} className="chat-form">
//            <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Ask the AI assistant..." disabled={isChatLoading} />
//            <button type="submit" disabled={isChatLoading || !chatInput.trim()}>
//              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
//            </button>
//        </form>
//    </div>
// ));
  
// const renderField = (label, field, extractedData, handleDataChange, isTextArea = false) => {
//      const commonProps = {
//         id: field,
//         value: (extractedData?.[field] || ''),
//         onChange: (e) => handleDataChange(field, e.target.value),
//      };
//      return (
//      <div className={`form-group ${isTextArea ? 'full-width' : ''}`}>
//       <label htmlFor={field}>{label}</label>
//       {isTextArea ? <textarea {...commonProps} rows={3} /> : <input type="text" {...commonProps} />}
//     </div>
//   )};

// const renderGroupDropdown = (label, field, extractedData, handleDataChange) => (
//     <div className="form-group">
//         <label htmlFor={field}>{label}</label>
//         <select
//             id={field}
//             value={extractedData?.[field] || ''}
//             onChange={(e) => handleDataChange(field, e.target.value)}
//         >
//             <option value="" disabled>Select a group</option>
//             {groupOptions.map(option => (
//                 <option key={option} value={option}>{option}</option>
//             ))}
//         </select>
//     </div>
// );

// const renderArrayField = (label, field, extractedData, handleDataChange, handleArrayDataChange) => (
//     <div className="form-group full-width">
//       <label>{label}</label>
//       {(extractedData?.[field] || []).map((item, index) => (
//          <input key={index} type="text" value={item} onChange={(e) => handleArrayDataChange(field, index, e.target.value)} />
//       ))}
//        <button onClick={() => handleDataChange(field, [...(extractedData?.[field] || []), ''])} className="btn-add-field">+ Add {label.slice(0,-1)}</button>
//     </div>
// );

// // --- Main App Component ---
// const App = () => {
//   // --- State Management ---
//   const [mode, setMode] = useState<AppMode>('single');
//   const [savedContacts, setSavedContacts] = useState<ContactData[]>([]);
//   const [isLoading, setIsLoading] = useState(false);
//   const [isExporting, setIsExporting] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [frontImageBase64, setFrontImageBase64] = useState<string | null>(null);
//   const [backImageBase64, setBackImageBase64] = useState<string | null>(null);
//   const [extractedData, setExtractedData] = useState<Partial<ContactData> | null>(null);
//   const [isCameraOpen, setIsCameraOpen] = useState(false);
//   const [cameraFor, setCameraFor] = useState<'front' | 'back' | 'bulk'>('front');
//   const [isCameraReady, setIsCameraReady] = useState(false);
//   const [bulkItems, setBulkItems] = useState<BulkFileItem[]>([]);
//   const [chatInput, setChatInput] = useState('');
//   const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
//   const [isChatLoading, setIsChatLoading] = useState(false);
//   const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
//   const [focusBox, setFocusBox] = useState<{ width: number; height: number }>({ width: 0, height: 0 });


//   // --- Refs ---
//   const fileInputRef = useRef<HTMLInputElement>(null);
//   const videoRef = useRef<HTMLVideoElement>(null);
//   const chatDisplayRef = useRef<HTMLDivElement>(null);
//   const focusBoxRef = useRef<HTMLDivElement>(null); // <--- ADD THIS
//   // --- Effects ---
//   useEffect(() => {
//     const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
//       e.preventDefault();
//       setDeferredPrompt(e);
//     };
//     window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
//     return () => {
//       window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
//     };
//   }, []);

//   useEffect(() => {
//     if (chatDisplayRef.current) {
//         chatDisplayRef.current.scrollTop = chatDisplayRef.current.scrollHeight;
//     }
//   }, [chatHistory]);

//   const fetchContacts = useCallback(async () => {
//     if (!contactsCollectionRef) return;
//     setIsLoading(true);
//     try {
//       const q = query(contactsCollectionRef, orderBy("createdAt", "desc"));
//       const data = await getDocs(q);
//       const contacts = data.docs.map(doc => ({ id: doc.id, ...doc.data() } as ContactData));
//       setSavedContacts(contacts);
//     } catch (e) {
//        const err = e as Error;
//        console.error("Failed to load contacts:", err.message);
//        setError("Could not load saved contacts.");
//     }
//     setIsLoading(false);
//   }, []);

//   useEffect(() => {
//     if(isFirebaseConfigured) {
//         fetchContacts();
//     }
//   }, [fetchContacts]);

//   // --- Camera Lifecycle Effect ---
//   useEffect(() => {
//     let stream: MediaStream | null = null;
//     const videoNode = videoRef.current;

//     const setupCamera = async () => {
//         if (!isCameraOpen || !videoNode) return;

//         setIsCameraReady(false);
//         if (!window.isSecureContext) {
//             setError("Camera access requires a secure connection (HTTPS).");
//             setIsCameraOpen(false);
//             return;
//         }

//         try {
//             stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
//             videoNode.srcObject = stream;
//         } catch (err) {
//             if (err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "PermissionDeniedError")) {
//                 setError("Camera permission was denied. Please enable it in your browser settings.");
//             } else {
//                 setError("Could not access the camera. It might be in use by another app.");
//             }
//             console.error("Camera access error:", err);
//             setIsCameraOpen(false);
//         }
//     };

//     setupCamera();

//     // Cleanup function
//     return () => {
//         if (stream) {
//             stream.getTracks().forEach(track => track.stop());
//         }
//     };
//   }, [isCameraOpen]);

//   const updateFocusBox = () => {
//     if (!videoRef.current) return;
//     const CARD_RATIO = 1.586; // standard business card aspect ratio
//     const vw = videoRef.current.videoWidth;
//     const vh = videoRef.current.videoHeight;
//     let width = vw * 0.8;
//     let height = width / CARD_RATIO;
//     if (height > vh * 0.8) {
//       height = vh * 0.8;
//       width = height * CARD_RATIO;
//     }
//     setFocusBox({ width, height });
//   };

//   useEffect(() => {
//     if (!isCameraOpen) return;
//     const handleResize = () => updateFocusBox();
//     window.addEventListener('resize', handleResize);
//     updateFocusBox();
//     return () => window.removeEventListener('resize', handleResize);
//   }, [isCameraOpen]);

//   const handleCanPlay = () => {
//     if(videoRef.current) {
//         videoRef.current.play().then(() => {
//             setIsCameraReady(true);
//             updateFocusBox();
//         }).catch(err => {
//             console.error("Video play failed:", err);
//             setError("Could not start camera stream.");
//             setIsCameraOpen(false);
//         });
//     }
//   };

//   // --- Helper Functions ---
//   const handleInstallClick = async () => {
//     if (deferredPrompt) {
//       deferredPrompt.prompt();
//       const { outcome } = await deferredPrompt.userChoice;
//       if (outcome === 'accepted') {
//         console.log('User accepted the install prompt');
//       }
//       setDeferredPrompt(null);
//     }
//   };

//   const resetState = () => {
//     setFrontImageBase64(null);
//     setBackImageBase64(null);
//     setExtractedData(null);
//     setBulkItems([]);
//     setError(null);
//     setIsLoading(false);
//     setMode('single');
//   };

//   const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
//     const files = event.target.files;
//     if (!files || files.length === 0) return;
    
//     const processFile = (file: File, isBulk: boolean) => {
//         const reader = new FileReader();
//         reader.onloadend = () => {
//             const base64String = (reader.result as string).split(",")[1];
//             if (isBulk) {
//                 const newItem: BulkFileItem = { id: `${file.name}-${Date.now()}`, file, base64: base64String, status: 'pending' };
//                 setBulkItems(prev => [...prev, newItem]);
//                 processCardImages(base64String, null, newItem.id);
//             } else {
//                  if (!frontImageBase64) setFrontImageBase64(base64String);
//                  else setBackImageBase64(base64String);
//             }
//         };
//         reader.readAsDataURL(file);
//     };

//     if (mode === 'bulk') {
//         Array.from(files).forEach(file => processFile(file, true));
//     } else {
//         processFile(files[0], false);
//     }
//     if(fileInputRef.current) fileInputRef.current.value = '';
//   };
  
//   const openCamera = (forSide: 'front' | 'back' | 'bulk') => {
//     setCameraFor(forSide);
//     setIsCameraOpen(true);
//   };

//   const closeCamera = () => {
//     setIsCameraOpen(false);
//   };
  



//   // const takeSnapshot = () => {
//   //   if (!videoRef.current || !isCameraReady || videoRef.current.videoWidth === 0) {
//   //       setError("Camera is not ready yet.");
//   //       return;
//   //   }

//   //   const video = videoRef.current;
//   //   const canvas = document.createElement("canvas");
//   //   // canvas.width = video.videoWidth;
//   //   // canvas.height = video.videoHeight;
//   //   canvas.width = cropWidth;
//   //   canvas.height = cropHeight;
//   //   const ctx = canvas.getContext('2d');

//   //   const base64ToFile = (b64: string, filename: string): File => {
//   //       const byteString = atob(b64);
//   //       const ab = new ArrayBuffer(byteString.length);
//   //       const ia = new Uint8Array(ab);
//   //       for (let i = 0; i < byteString.length; i++) {
//   //           ia[i] = byteString.charCodeAt(i);
//   //       }
//   //       return new File([ia], filename, { type: 'image/jpeg' });
//   //   };

//   //   if (ctx) {
//   //       ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
//   //       const base64String = canvas.toDataURL('image/jpeg').split(',')[1];
//   //       if(cameraFor === 'bulk') {
//   //           const filename = `camera-${Date.now()}.jpg`;
//   //           const file = base64ToFile(base64String, filename);
//   //           const newItem: BulkFileItem = { id: `${filename}-${Date.now()}`, file, base64: base64String, status: 'pending' };
//   //           setBulkItems(prev => [...prev, newItem]);
//   //           processCardImages(base64String, null, newItem.id);
//   //       } else if(cameraFor === 'front') {
//   //           setFrontImageBase64(base64String);
//   //       } else {
//   //           setBackImageBase64(base64String);
//   //       }
//   //       closeCamera();
//   //   } else {
//   //       setError("Could not process image from camera.");
//   //   }
//   // };


// // const takeSnapshot = () => {
// //     // 1. Safety Checks
// //     if (!videoRef.current || !isCameraReady || videoRef.current.videoWidth === 0) {
// //         setError("Camera is not ready yet.");
// //         return;
// //     }

// //     const video = videoRef.current;

// //     // 2. Determine Crop Size
// //     // We use the focusBox dimensions because that's what the user sees.
// //     const cropWidth = focusBox.width > 0 ? focusBox.width : video.videoWidth;
// //     const cropHeight = focusBox.height > 0 ? focusBox.height : video.videoHeight;

// //     // 3. Create a canvas that is ONLY the size of the card (not the full screen)
// //     const canvas = document.createElement("canvas");
// //     canvas.width = cropWidth;
// //     canvas.height = cropHeight;
// //     const ctx = canvas.getContext('2d');

// //     // 4. Calculate the center position
// //     // This finds the top-left corner (sx, sy) of the box within the video video
// //     const sx = (video.videoWidth - cropWidth) / 2;
// //     const sy = (video.videoHeight - cropHeight) / 2;

// //     const base64ToFile = (b64: string, filename: string): File => {
// //         const byteString = atob(b64);
// //         const ab = new ArrayBuffer(byteString.length);
// //         const ia = new Uint8Array(ab);
// //         for (let i = 0; i < byteString.length; i++) {
// //             ia[i] = byteString.charCodeAt(i);
// //         }
// //         return new File([ia], filename, { type: 'image/jpeg' });
// //     };

// //     if (ctx) {
// //         // 5. Draw CROPPED image
// //         // drawImage params: image, sourceX, sourceY, sourceWidth, sourceHeight, destX, destY, destWidth, destHeight
// //         ctx.drawImage(video, sx, sy, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
        
// //         // 6. Save the clean, cropped image
// //         const base64String = canvas.toDataURL('image/jpeg').split(',')[1];
        
// //         if(cameraFor === 'bulk') {
// //             const filename = `camera-${Date.now()}.jpg`;
// //             const file = base64ToFile(base64String, filename);
// //             const newItem: BulkFileItem = { id: `${filename}-${Date.now()}`, file, base64: base64String, status: 'pending' };
// //             setBulkItems(prev => [...prev, newItem]);
// //             processCardImages(base64String, null, newItem.id);
// //         } else if(cameraFor === 'front') {
// //             setFrontImageBase64(base64String);
// //         } else {
// //             setBackImageBase64(base64String);
// //         }
// //         closeCamera();
// //     } else {
// //         setError("Could not process image from camera.");
// //     }
// //   };


// const takeSnapshot = () => {
//     if (!videoRef.current || !isCameraReady || videoRef.current.videoWidth === 0) {
//         setError("Camera is not ready yet.");
//         return;
//     }

//     const video = videoRef.current;
    
//     // 1. Get exact screen positions
//     // We need to know where the video is on screen, and where the box is on screen.
//     const videoRect = video.getBoundingClientRect();
//     const boxRect = focusBoxRef.current?.getBoundingClientRect();

//     if (!boxRect) return;

//     // 2. Calculate the Scale Factor
//     // (How many camera pixels equal one screen pixel?)
//     const scaleX = video.videoWidth / videoRect.width;
//     const scaleY = video.videoHeight / videoRect.height;

//     // 3. Calculate Crop Coordinates
//     // relative to the video source
//     const cropX = (boxRect.left - videoRect.left) * scaleX;
//     const cropY = (boxRect.top - videoRect.top) * scaleY;
//     const cropWidth = boxRect.width * scaleX;
//     const cropHeight = boxRect.height * scaleY;

//     // 4. Create Canvas & Draw
//     const canvas = document.createElement("canvas");
//     canvas.width = cropWidth;
//     canvas.height = cropHeight;
//     const ctx = canvas.getContext('2d');

//     if (ctx) {
//         // Draw only the area inside the box
//         ctx.drawImage(
//             video, 
//             cropX, cropY, cropWidth, cropHeight, // Source (Camera)
//             0, 0, cropWidth, cropHeight          // Destination (Canvas)
//         );
        
//         // 5. Save & Download
//         const dataUrl = canvas.toDataURL('image/jpeg');
//         const base64String = dataUrl.split(',')[1];
        
//         // Auto-download to confirm it worked
//         const downloadLink = document.createElement('a');
//         downloadLink.href = dataUrl;
//         downloadLink.download = `cropped_card_${Date.now()}.jpg`;
//         document.body.appendChild(downloadLink);
//         downloadLink.click();
//         document.body.removeChild(downloadLink);

//         const base64ToFile = (b64: string, filename: string): File => {
//              const byteString = atob(b64);
//              const ab = new ArrayBuffer(byteString.length);
//              const ia = new Uint8Array(ab);
//              for (let i = 0; i < byteString.length; i++) {
//                  ia[i] = byteString.charCodeAt(i);
//              }
//              return new File([ia], filename, { type: 'image/jpeg' });
//          };

//         if(cameraFor === 'bulk') {
//             const filename = `camera-${Date.now()}.jpg`;
//             const file = base64ToFile(base64String, filename);
//             const newItem: BulkFileItem = { id: `${filename}-${Date.now()}`, file, base64: base64String, status: 'pending' };
//             setBulkItems(prev => [...prev, newItem]);
//             processCardImages(base64String, null, newItem.id);
//         } else if(cameraFor === 'front') {
//             setFrontImageBase64(base64String);
//         } else {
//             setBackImageBase64(base64String);
//         }
//         closeCamera();
//     }
//   };

//   const processCardImages = async (frontB64: string, backB64?: string | null, bulkItemId?: string) => {
//     if (!isAiConfigured || !API_KEY) {
//         setError("AI API Key is not configured.");
//         return;
//     }

//     if (bulkItemId) {
//         setBulkItems(prev => prev.map(item => item.id === bulkItemId ? { ...item, status: 'processing' } : item));
//     } else {
//         setIsLoading(true);
//         setExtractedData(null);
//     }
//     setError(null);

//     try {
//         const { GoogleGenerativeAI } = await import("@google/generative-ai");
//         const genAI = new GoogleGenerativeAI(API_KEY);
//         const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
//         const parts: Part[] = [{ inlineData: { mimeType: 'image/jpeg', data: frontB64 } }];
//         if (backB64) parts.push({ inlineData: { mimeType: 'image/jpeg', data: backB64 } });
        
//         const promptText = `Analyze the business card image(s) and extract contact details. Return a single JSON object with keys: "name", "designation", "company", "phoneNumbers", "emails", "websites", "address", "whatsapp", "group", "notes". For the "group" field, categorize the contact based on their profession or company into one of the following options: ${groupOptions.join(', ')}. If no category fits, use "Others". If info is not found, use empty strings or arrays.`;
//         parts.push({ text: promptText });

//         const result = await model.generateContent({
//             contents: [{ role: "user", parts }],
//             generationConfig: { responseMimeType: "application/json" },
//         });
        
//         const parsedData = JSON.parse(result.response.text());

//         if (bulkItemId) {
//             setBulkItems(prev => prev.map(item => item.id === bulkItemId ? { ...item, status: 'success', extractedData: parsedData } : item));
//         } else {
//             setExtractedData(parsedData);
//         }
//     } catch (e) {
//         const err = e as Error;
//         console.error("Error processing card:", err.message);
//         const errorMsg = `Failed to process image. ${err.message || 'An unknown error occurred.'}`;
//         if (bulkItemId) {
//             setBulkItems(prev => prev.map(item => item.id === bulkItemId ? { ...item, status: 'error', error: errorMsg } : item));
//         } else {
//             setError(errorMsg);
//         }
//     } finally {
//         if (!bulkItemId) setIsLoading(false);
//     }
//   };

//   const handleDataChange = (field: keyof Omit<ContactData, 'id' | 'imageBase64'>, value: string | string[]) => {
//     setExtractedData(prev => prev ? ({ ...prev, [field]: value }) : null);
//   };

//   const handleArrayDataChange = (field: keyof Omit<ContactData, 'id' | 'imageBase64'>, index: number, value: string) => {
//     setExtractedData(prev => {
//         if (!prev) return null;
//         const currentArray = (prev[field] as string[]) || [];
//         const newArray = [...currentArray];
//         newArray[index] = value;
//         return { ...prev, [field]: newArray };
//     });
//   };
  
//   const saveContactToFirebase = async () => {
//     if (!db || !contactsCollectionRef || !extractedData || !frontImageBase64) {
//         setError("Cannot save contact. Check configuration and data.");
//         return;
//     }
//     setIsLoading(true);
//     const contactPayload = {
//       name: extractedData.name || "",
//       designation: extractedData.designation || "",
//       company: extractedData.company || "",
//       phoneNumbers: extractedData.phoneNumbers || [],
//       emails: extractedData.emails || [],
//       websites: extractedData.websites || [],
//       address: extractedData.address || "",
//       imageBase64: frontImageBase64,
//       notes: extractedData.notes || "",
//       group: extractedData.group || "",
//       whatsapp: extractedData.whatsapp || "",
//       createdAt: serverTimestamp(),
//     };

//       try {
//         if ('id' in extractedData && extractedData.id) {
//             await updateDoc(doc(db, "visiting_cards", extractedData.id), contactPayload);
//         } else {
//             await addDoc(contactsCollectionRef, contactPayload);
//         }
//         resetState();
//         fetchContacts();
//       } catch {
//         setError("Failed to save contact.");
//         setIsLoading(false);
//       }
//   };

//   // const downloadVcf = (data: Partial<ContactData>) => {
//   //   const { name, designation, company, phoneNumbers, emails, websites, address, whatsapp } = data;
//   //   let vCard = "BEGIN:VCARD\nVERSION:3.0\n";
//   //   if (name) {
//   //       const nameParts = name.split(' ');
//   //       const lastName = nameParts.pop() || '';
//   //       const firstName = nameParts.join(' ');
//   //       vCard += `FN:${name}\n`;
//   //       vCard += `N:${lastName};${firstName};;;\n`;
//   //   }
//   //   if (company) vCard += `ORG:${company}\n`;
//   //   if (designation) vCard += `TITLE:${designation}\n`;
//   //   if (phoneNumbers) phoneNumbers.forEach((p, i) => { vCard += `TEL;TYPE=WORK,VOICE${i === 0 ? ',PREF' : ''}:${p}\n`; });
//   //   if (whatsapp) vCard += `TEL;TYPE=CELL,WHATSAPP:${whatsapp}\n`;
//   //   if (emails) emails.forEach(e => { vCard += `EMAIL:${e}\n`; });
//   //   if (websites) websites.forEach(w => { vCard += `URL:${w}\n`; });
//   //   if (address) vCard += `ADR;TYPE=WORK:;;${address.replace(/\n/g, '\\n')};;;;\n`;
//   //   vCard += "END:VCARD";

//   //   const blob = new Blob([vCard], { type: "text/vcard;charset=utf-8" });
//   //   const url = URL.createObjectURL(blob);
//   //   const a = document.createElement("a");
//   //   a.href = url;
//   //   a.download = (name?.replace(/\s/g, '_') || 'contact') + '.vcf';
//   //   document.body.appendChild(a);
//   //   a.click();
//   //   document.body.removeChild(a);
//   //   URL.revokeObjectURL(url);
//   // };

// // Update the function signature to accept 'imageBase64'
// // Change the function signature to accept 'currentImage'
//   const downloadVcf = (data: Partial<ContactData>, currentImage?: string | null) => {
//     const { name, designation, company, phoneNumbers, emails, websites, address, whatsapp } = data;
    
//     let vCard = "BEGIN:VCARD\nVERSION:3.0\n";
    
//     // Name
//     if (name) {
//         const nameParts = name.split(' ');
//         const lastName = nameParts.pop() || '';
//         const firstName = nameParts.join(' ');
//         vCard += `FN:${name}\n`;
//         vCard += `N:${lastName};${firstName};;;\n`;
//     }
    
//     // Standard Details
//     if (company) vCard += `ORG:${company}\n`;
//     if (designation) vCard += `TITLE:${designation}\n`;
//     if (phoneNumbers) phoneNumbers.forEach((p, i) => { vCard += `TEL;TYPE=WORK,VOICE${i === 0 ? ',PREF' : ''}:${p}\n`; });
//     if (whatsapp) vCard += `TEL;TYPE=CELL,WHATSAPP:${whatsapp}\n`;
//     if (emails) emails.forEach(e => { vCard += `EMAIL:${e}\n`; });
//     if (websites) websites.forEach(w => { vCard += `URL:${w}\n`; });
//     if (address) vCard += `ADR;TYPE=WORK:;;${address.replace(/\n/g, '\\n')};;;;\n`;

//     // --- KEY CHANGE: Add the Cropped Photo ---
//     if (currentImage) {
//         // We remove any potential whitespace to ensure valid format
//         vCard += `PHOTO;ENCODING=b;TYPE=JPEG:${currentImage.replace(/\s/g, '')}\n`;
//     }
//     // -----------------------------------------

//     vCard += "END:VCARD";

//     // Trigger Download
//     const blob = new Blob([vCard], { type: "text/vcard;charset=utf-8" });
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement("a");
//     a.href = url;
//     a.download = (name?.replace(/\s/g, '_') || 'contact') + '.vcf';
//     document.body.appendChild(a);
//     a.click();
//     document.body.removeChild(a);
//     URL.revokeObjectURL(url);
//   };
//   // const handleSave = () => {
//   //     if (extractedData) {
//   //         downloadVcf(extractedData);
//   //         saveContactToFirebase();
//   //     }
//   // };
// const handleSave = () => {
//       if (extractedData) {
//           // Pass 'frontImageBase64' as the second argument
//           downloadVcf(extractedData, frontImageBase64); 
//           saveContactToFirebase();
//       }
//   };

//   const downloadContactsAsExcel = async () => {
//     if (savedContacts.length === 0) {
//         setError("No contacts available to export yet.");
//         return;
//     }

//     setError(null);
//     setIsExporting(true);
//     try {
//         const { Workbook } = await import('exceljs');
//         const workbook = new Workbook();
//         const worksheet = workbook.addWorksheet('Contacts');

//         worksheet.columns = [
//             { header: 'Photo', key: 'photo', width: 18 },
//             { header: 'Name', key: 'name', width: 25 },
//             { header: 'Designation', key: 'designation', width: 22 },
//             { header: 'Company', key: 'company', width: 25 },
//             { header: 'Phone Numbers', key: 'phones', width: 24 },
//             { header: 'WhatsApp', key: 'whatsapp', width: 18 },
//             { header: 'Emails', key: 'emails', width: 28 },
//             { header: 'Websites', key: 'websites', width: 28 },
//             { header: 'Group', key: 'group', width: 18 },
//             { header: 'Address', key: 'address', width: 36 },
//             { header: 'Notes', key: 'notes', width: 36 },
//         ];
//         worksheet.getRow(1).font = { bold: true };

//         savedContacts.forEach((contact) => {
//             const row = worksheet.addRow({
//                 photo: '',
//                 name: contact.name || '',
//                 designation: contact.designation || '',
//                 company: contact.company || '',
//                 phones: (contact.phoneNumbers || []).join(', '),
//                 whatsapp: contact.whatsapp || '',
//                 emails: (contact.emails || []).join(', '),
//                 websites: (contact.websites || []).join(', '),
//                 group: contact.group || '',
//                 address: contact.address || '',
//                 notes: contact.notes || '',
//             });
//             row.alignment = { vertical: 'top', wrapText: true };
//             if (contact.imageBase64) {
//                 const imageId = workbook.addImage({
//                     base64: contact.imageBase64,
//                     extension: 'jpeg',
//                 });
//                 const rowIndex = row.number;
//                 worksheet.getRow(rowIndex).height = 90;
//                 worksheet.addImage(imageId, `A${rowIndex}:A${rowIndex}`);
//             }
//         });

//         const buffer = await workbook.xlsx.writeBuffer();
//         const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
//         const url = URL.createObjectURL(blob);
//         const link = document.createElement('a');
//         link.href = url;
//         link.download = `contacts-${new Date().toISOString().split('T')[0]}.xlsx`;
//         document.body.appendChild(link);
//         link.click();
//         document.body.removeChild(link);
//         URL.revokeObjectURL(url);
//     } catch (err) {
//         console.error('Failed to export contacts:', err);
//         setError("Could not export contacts. Please try again.");
//     } finally {
//         setIsExporting(false);
//     }
//   };

//   const saveAllBulk = async () => {
//     if (!db || !contactsCollectionRef) return;
//     const successfulItems = bulkItems.filter(item => item.status === 'success' && item.extractedData);
//     if(successfulItems.length === 0) return;

//     setIsLoading(true);
//     let successCount = 0;
//     for (const item of successfulItems) {
//         if(item.extractedData){
//             try {
//                 const payload = { ...item.extractedData, imageBase64: item.base64, createdAt: serverTimestamp() };
//                 await addDoc(contactsCollectionRef, payload);
//                 successCount++;
//            } catch (e) { console.error(`Failed to save ${item.file.name}:`, (e as Error).message); }
//         }
//     }
//     alert(`${successCount} of ${successfulItems.length} contacts saved.`);
//     resetState();
//     fetchContacts();
//   }

//   const deleteContact = async (id: string) => {
//     if (!db) return;
//       if (window.confirm("Are you sure you want to delete this contact?")) {
//           try {
//               await deleteDoc(doc(db, "visiting_cards", id));
//               if(extractedData && (extractedData as ContactData).id === id) resetState();
//               fetchContacts();
//           } catch {
//               setError("Failed to delete contact.");
//           }
//       }
//   };

//   const editContact = (contact: ContactData) => {
//     setExtractedData(contact);
//     setFrontImageBase64(contact.imageBase64);
//     setBackImageBase64(null);
//     setMode('single');
//     window.scrollTo({ top: 0, behavior: 'smooth' });
//   };

//   const handleCommandSubmit = async () => {
//     if (!chatInput.trim() || isChatLoading || !isAiConfigured || !API_KEY) return;
//     const userMessage: ChatMessage = { role: 'user', text: chatInput.trim() };
//     setChatHistory(prev => [...prev, userMessage, { role: 'model', text: '' }]);
//     setChatInput("");
//     setIsChatLoading(true);
    
//     try {
//         const { GoogleGenerativeAI } = await import("@google/generative-ai");
//         const genAI = new GoogleGenerativeAI(API_KEY);
//         const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
//         const contactsJson = JSON.stringify(savedContacts.map(c => ({ name: c.name, designation: c.designation, company: c.company, phoneNumbers: c.phoneNumbers, emails: c.emails, group: c.group })));
//         const prompt = `You are an AI assistant for a business card app. Answer questions about the user's saved contacts based STRICTLY on this JSON data. If info isn't present, say so. Keep answers concise. Contact data: ${contactsJson}\n\nUser question: ${userMessage.text}`;
//         const result = await model.generateContent(prompt);
//         const fullResponse = result.response.text();
//         setChatHistory(prev => {
//             const newHistory = [...prev];
//             newHistory[newHistory.length - 1] = { role: 'model', text: fullResponse };
//             return newHistory;
//         });
//     } catch (err) {
//         const errorMsg = `Sorry, an error occurred: ${(err as Error).message}`;
//         setChatHistory(prev => {
//             const newHistory = [...prev];
//             newHistory[newHistory.length - 1] = { role: 'model', text: errorMsg };
//             return newHistory;
//         });
//     } finally {
//         setIsChatLoading(false);
//     }
//   };

//   if (!isFirebaseConfigured || !isAiConfigured) {
//       return (
//         <div className="config-error-container">
//             <div className="config-error-box">
//               <h2>Configuration Error</h2>
//               <p>Please make sure your Firebase and Google AI API keys are correctly set up in your environment variables.</p>
//               {!isFirebaseConfigured && <p className="error-highlight">Firebase configuration is INCOMPLETE.</p>}
//               {!isAiConfigured && <p className="error-highlight">Google AI API Key is MISSING.</p>}
//             </div>
//         </div>
//       )
//   }

//   const componentProps = {
//       mode, setMode,
//       isLoading,
//       extractedData,
//       frontImageBase64,
//       backImageBase64,
//       fileInputRef,
//       handleFileChange,
//       processCardImages,
//       openCamera,
//       bulkItems,
//       saveAllBulk,
//       chatHistory,
//       isChatLoading,
//       chatInput,
//       setChatInput,
//       handleCommandSubmit,
//       chatDisplayRef,
//       handleDataChange,
//       handleArrayDataChange,
//       handleSave,
//       resetState,
//   };

//   return (
//     <>
//     <style>{`
//       /* --- Global Styles & Resets --- */
//       :root {
//         --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
//         --c-bg: #f8fafc; --c-text: #1e293b; --c-border: #e2e8f0;
//         --c-primary: #4f46e5; --c-primary-hover: #4338ca; --c-primary-text: #ffffff;
//         --c-secondary: #334155; --c-secondary-hover: #1e293b; --c-secondary-text: #ffffff;
//         --c-card-bg: #ffffff; --c-card-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1);
//         --radius: 0.75rem;
//       }
//       * { box-sizing: border-box; margin: 0; padding: 0; }
//       html { font-family: var(--font-sans); background-color: var(--c-bg); color: var(--c-text); line-height: 1.5; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
//       body { max-width: 100%; overflow-x: hidden; }
//       input, button, textarea, select { font-family: inherit; font-size: 1rem; border: 1px solid var(--c-border); border-radius: 0.5rem; padding: 0.75rem 1rem; transition: all 0.2s; }
//       button { cursor: pointer; }
      
//       /* --- Main Layout --- */
//       .app-container { 
//         min-height: 100vh; /* changed from 0vh */
//         display: flex; 
//         flex-direction: column; 
//         width: 100%; /* Ensure it fits screen */
//         overflow-x: hidden; /* Prevent horizontal scroll */
//       }
//       // .app-container { min-height: 0vh; display: flex; flex-direction: column; }
//       // .app-header { background: rgba(255,255,255,0.8); backdrop-filter: blur(8px); padding: 1rem; border-bottom: 1px solid var(--c-border); display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; position: sticky; top: 0; z-index: 10; }
//       .app-header { 
//         background: rgba(255,255,255,0.95); 
//         backdrop-filter: blur(8px); 
//         padding: 1rem; 
//         border-bottom: 1px solid var(--c-border); 
//         display: flex; 
//         align-items: center; 
//         justify-content: space-between; 
//         gap: 0.75rem; 
//         position: sticky; 
//         top: 0; 
//         z-index: 40; 
//         width: 100%;
//       }

//       .header-title { display: flex; align-items: center; gap: 0.75rem; }
//       .app-header img { height: 40px; width: 40px; border-radius: 9999px; }
//       .app-header h1 { font-size: 1.25rem; font-weight: 700; }
//       .dashboard { 
//         display: grid; 
//         grid-template-columns: 1fr; /* Default to single column (mobile) */
//         gap: 1.5rem; 
//         padding: 1rem; /* Added padding so it doesn't touch edges */
//         max-width: 1280px; 
//         margin: 0 auto; 
//         width: 100%; 
//       }
//       // .dashboard { display: grid; grid-template-columns: 1fr; gap: 1.5rem; padding: 0rem; max-w: 1280px; margin: 0 auto; width: 100%; }
//       @media (min-width: 1024px) { .dashboard { grid-template-columns: 3fr 2fr; padding: 0rem; gap: 2rem; } .app-header { padding: 2rem 2rem; } }
//       // .app-footer { background-color: var(--c-secondary); width: 180vw;  color: #cbd5e1; text-align: center; padding: 1.5rem; margin-top: auto; font-size: 0.875rem; }
//       .app-footer { 
//         background-color: var(--c-secondary); 
//         width: 100%; 
//         color: #cbd5e1; 
//         text-align: center; 
//         padding: 1.5rem; 
//         margin-top: auto; 
//         font-size: 0.875rem; 
//       }
//       /* --- Card & Panel Styles --- */
//       .card { background-color: var(--c-card-bg); border-radius: var(--radius); box-shadow: var(--c-card-shadow); padding: 1.25rem; border: 1px solid var(--c-border); }
//       .card-title { font-size: 1.25rem; font-weight: 700; margin-bottom: 1.25rem; }
//       .card-header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; }
//       .contact-list-panel .card-title { margin-bottom: 1rem; }
//       .contact-list-panel .card-header .card-title { margin-bottom: 0; }
//       .download-btn { min-width: 160px; }
//       .contact-list { max-height: 60vh; overflow-y: auto; padding-right: 0.5rem; display: flex; flex-direction: column; gap: 0.75rem; }
//       // @media (min-width: 1024px) { .contact-list { max-height: 75vh; } }
//       @media (min-width: 1024px) { 
//         .dashboard { 
//             grid-template-columns: 3fr 2fr; 
//             padding: 2rem; 
//             gap: 2rem; 
//         } 
//       }
//       .contact-list-item { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background-color: var(--c-bg); border-radius: var(--radius); border: 1px solid var(--c-border); transition: all 0.2s; cursor: pointer; }
//       .contact-list-item:hover { border-color: var(--c-primary); background-color: #eef2ff; transform: translateY(-2px); box-shadow: var(--c-card-shadow); }
//       .contact-info { display: flex; align-items: center; gap: 1rem; overflow: hidden; }
//       .contact-info img { height: 48px; width: 48px; border-radius: 9999px; object-fit: cover; flex-shrink: 0; border: 2px solid white; }
//       .contact-info-text { overflow: hidden; }
//       .contact-info-text h3 { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 1rem; }
//       .contact-info-text p { color: #64748b; font-size: 0.875rem; }
//       .contact-actions { display: flex; gap: 0.5rem; }
//       .contact-actions button { background: none; border: none; padding: 0.25rem; color: #94a3b8; }
//       .contact-actions button:hover { color: var(--c-text); }
//       .contact-actions .delete-btn:hover { color: #ef4444; }
      
//       /* --- Buttons --- */
//       .btn-primary { background-color: var(--c-primary); color: var(--c-primary-text); font-weight: 600; }
//       .btn-primary:hover { background-color: var(--c-primary-hover); }
//       .btn-primary:disabled, .btn-secondary:disabled, .btn-cancel:disabled { background-color: #9ca3af; cursor: not-allowed; opacity: 0.7; }
//       .btn-secondary { background-color: var(--c-secondary); color: var(--c-secondary-text); font-weight: 600; }
//       .btn-secondary:hover { background-color: var(--c-secondary-hover); }
//       .btn-cancel { background-color: #d1d5db; color: var(--c-text); font-weight: 600; }
//       .btn-cancel:hover { background-color: #9ca3af; }
//       .btn-add-field { background: none; border: none; padding: 0.25rem 0; color: var(--c-primary); font-weight: 600; font-size: 0.875rem; }
//       .btn-install { background-color: var(--c-primary); color: var(--c-primary-text); font-weight: 600; padding: 0.5rem 1rem; font-size: 0.875rem; }
      
//       /* --- Forms & Inputs --- */
//       .form-grid { display: grid; grid-template-columns: 1fr; gap: 1rem; }
//       @media (min-width: 768px) { .form-grid { grid-template-columns: 1fr 1fr; } }
//       .form-group.full-width { grid-column: 1 / -1; }
//       .form-group label { display: block; font-weight: 500; margin-bottom: 0.5rem; font-size: 0.875rem; }
//       .form-group input, .form-group textarea, .form-group select { width: 100%; background-color: #f8fafc; }
//       .form-group input:focus, .form-group textarea:focus, .form-group select:focus { outline: 2px solid var(--c-primary); border-color: var(--c-primary); }
//       .actions-row { display: flex; flex-wrap: wrap; gap: 1rem; margin-top: 1.5rem; }
      
//       /* --- Tabs --- */
//       .tabs { display: flex; border-bottom: 1px solid var(--c-border); margin-bottom: 1.5rem; }
//       .tab { background: none; border: none; padding: 0.75rem 0.5rem; font-size: 0.875rem; font-weight: 600; color: #64748b; border-bottom: 2px solid transparent; margin-bottom: -1px; }
//       @media (min-width: 640px) { .tab { padding: 0.75rem 1rem; font-size: 1rem; } }
//       .tab.active { color: var(--c-primary); border-bottom-color: var(--c-primary); }
      
//       /* --- Upload Box --- */
//       .upload-box, .upload-box-small { display: flex; flex-direction: column; align-items: center; justify-content: center; border: 2px dashed var(--c-border); border-radius: var(--radius); text-align: center; transition: all 0.2s; padding: 2.5rem 1.5rem; }
//       .upload-box-small { padding: 1.5rem 1rem; height: 100%; }
//       .upload-box:hover, .upload-box-small:hover { border-color: var(--c-primary); background-color: #eef2ff; cursor: pointer; }
//       .upload-box p span { font-weight: 600; color: var(--c-primary); }
//       .upload-box-subtitle { font-size: 0.75rem; color: #64748b; margin-top: 0.25rem; }
      
//       /* --- Image Previews --- */
//       .image-previews { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem; }
//       .preview-container img { width: 100%; border-radius: var(--radius); box-shadow: var(--c-card-shadow); }
//       .preview-container p { text-align: center; font-weight: 500; margin-top: 0.5rem; font-size: 0.875rem; }
      
//       /* --- Bulk Upload List --- */
//       .bulk-list { margin-top: 1.5rem; display: flex; flex-direction: column; gap: 0.75rem; }
//       .bulk-item { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background-color: var(--c-bg); border-radius: 0.5rem; }
//       .bulk-item img {
//          max-width: 100%;
//          height: auto;
//       }
//       .bulk-item-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding-right: 1rem; }
//       .status-badge { padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; }
//       .status-pending { background-color: #e2e8f0; color: #475569; }
//       .status-processing { background-color: #fef3c7; color: #b45309; }
//       .status-success { background-color: #dcfce7; color: #166534; }
//       .status-error { background-color: #fee2e2; color: #991b1b; }

//       /* --- Chat UI --- */
//       .chat-container { display: flex; flex-direction: column; }
//       .chat-display { height: 20rem; overflow-y: auto; border: 1px solid var(--c-border); border-radius: var(--radius); padding: 1rem; margin-bottom: 1rem; background-color: var(--c-bg); }
//       .chat-placeholder { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; text-align: center; color: #64748b; }
//       .chat-placeholder svg { margin-bottom: 0.5rem; }
//       .chat-placeholder p { font-weight: 600; }
//       .chat-placeholder-subtitle { font-size: 0.875rem; font-weight: 400; }
//       .chat-message { max-width: 80%; margin-bottom: 1rem; display: flex; }
//       .chat-message p { padding: 0.75rem 1rem; border-radius: 1rem; line-break: anywhere; }
//       .chat-message.user { justify-content: flex-end; margin-left: auto; }
//       .chat-message.user p { background-color: var(--c-primary); color: var(--c-primary-text); border-bottom-right-radius: 0.25rem; }
//       .chat-message.model { justify-content: flex-start; }
//       .chat-message.model p { background-color: #e2e8f0; color: var(--c-text); border-bottom-left-radius: 0.25rem; }
//       .chat-form { display: flex; gap: 0.75rem; }
//       .chat-form input { flex-grow: 1; }
//       .chat-form button { padding: 0.75rem; background-color: var(--c-primary); color: var(--c-primary-text); }
//       .typing-indicator { height: 24px; display: flex; align-items: center; gap: 4px; }
//       .typing-indicator span { width: 8px; height: 8px; background-color: #94a3b8; border-radius: 50%; animation: bounce 1.2s infinite ease-in-out; }
//       .typing-indicator span:nth-of-type(2) { animation-delay: -1.0s; }
//       .typing-indicator span:nth-of-type(3) { animation-delay: -0.8s; }
//       @keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1.0); } }
      
//       /* --- Modals & Overlays --- */
//       // .video-container { position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 50; }
//       .video-container { 
//         position: fixed; 
//         inset: 0; 
//         background: #000; 
//         display: flex; 
//         flex-direction: column; 
//         z-index: 50; 
//         width: 100vw;
//         height: 100vh;
//       }
//       .video-wrapper { position: relative; width: 100%;height: 100%;display: flex;align-items: center;justify-content: center; flex: 1; }
//       .video-container video { width: 100%; height: 100%; object-fit: contain; border-radius: var(--radius); display: block; }
//       .focus-box { 
//         position: absolute; 
//         top: 50%; 
//         left: 50%; 
//         transform: translate(-50%, -50%); 
//         border: 2px solid #ffffff; 
//         border-radius: var(--radius); 
//         box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.7); /* Dark overlay around the box */
//         pointer-events: none; 
//         z-index: 55;
//       }      
//         @media (max-width: 640px) { .actions-row { flex-direction: column; } }

//       .video-controls { position: absolute; /* Floating buttons */
//         bottom: 2rem;       /* Distance from bottom */
//         left: 0;
//         width: 100%;
//         display: flex; 
//         justify-content: center;
//         gap: 1.5rem; 
//         z-index: 60;        /* Ensure buttons are ON TOP of everything */
//         padding: 0 1rem;}
//       .video-controls button { padding: 1rem 2rem; font-size: 1.125rem; border-radius: 9999px; }
//       .loading-overlay { position: fixed; inset: 0; background: rgba(255,255,255,0.8); backdrop-filter: blur(4px); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 50; }
//       .camera-loading-spinner { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); }
//       .spinner { width: 4rem; height: 4rem; border-radius: 50%; border: 4px solid #e5e7eb; border-top-color: var(--c-primary); animation: spin 1s linear infinite; }
//       @keyframes spin { to { transform: rotate(360deg); } }
//       .config-error-container { min-height: 100vh; display: flex; align-items: center; justify-content: center; background-color: #111827; padding: 1rem; }
//       .config-error-box { background-color: #ef4444; color: #ffffff; padding: 2rem; border-radius: var(--radius); text-align: center; max-width: 450px; }
//       .config-error-box h2 { font-size: 1.875rem; font-weight: 700; margin-bottom: 1rem; }
//       .config-error-box .error-highlight { font-weight: 600; background: rgba(0,0,0,0.2); padding: 0.25rem 0.5rem; border-radius: 0.25rem; margin-top: 0.5rem; display: inline-block; }
//       .notification { position: fixed; bottom: 1rem; left: 1rem; right: 1rem; background-color: var(--c-secondary); color: white; padding: 1rem; border-radius: var(--radius); box-shadow: var(--c-card-shadow); z-index: 100; text-align: center; animation: slide-up 0.5s ease-out; }
//       @keyframes slide-up { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
//       @media (min-width: 640px) { .notification { left: auto; right: 1rem; max-width: 400px; } }
//     `}</style>
//     <div className="app-container">
//       <header className="app-header">
//         <div className="header-title">
//             <img src={logo} alt="App Logo" />
//             <h1>AI Card Scanner</h1>
//         </div>
//         {deferredPrompt && (
//             <button className="btn-install" onClick={handleInstallClick}>Install App</button>
//         )}
//       </header>
//       <>
//     <style>{/* ...styles... */}</style>
//     <div className="app-container">
//       <header className="app-header">
//         {/* ...existing header code... */}
//       </header>

  

//       <main className="dashboard">
//         {/* ...your dashboard, contacts, etc... */}
//       </main>
//       {/* ...modals and footer... */}
//     </div>
//   </>
//       <main className="dashboard">
//         <div className="action-panel">
//           <ActionPanel extractedData={extractedData} {...componentProps} />
//         </div>
//         <div className="contact-list-panel">
//           <div className="card">
//             <div className="card-header">
//               <h2 className="card-title">Saved Contacts</h2>
//               <button
//                 onClick={downloadContactsAsExcel}
//                 disabled={isExporting || isLoading || savedContacts.length === 0}
//                 className="btn-secondary download-btn"
//               >
//                 {isExporting ? 'Preparing...' : 'Download Excel'}
//               </button>
//             </div>
//             <div className="contact-list">
//               {savedContacts.map(contact => (
//                 <div key={contact.id} onClick={() => editContact(contact)} className="contact-list-item">
//                   <div className="contact-info">
//                     <img src={contact.imageBase64 ? `data:image/jpeg;base64,${contact.imageBase64}` : `https://placehold.co/100x100/e2e8f0/64748b?text=${contact.name.charAt(0)}`} alt={contact.name} />
//                     <div className="contact-info-text">
//                         <h3>{contact.name || 'No Name'}</h3>
//                         <p>{contact.company || 'No Company'}</p>
//                     </div>
//                   </div>
//                   <div className="contact-actions">
//                     <button onClick={(e) => { e.stopPropagation(); deleteContact(contact.id)}} title="Delete" className="delete-btn">
//                       <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
//                     </button>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </div>
//         </div>
//       </main>
      
//       {isCameraOpen && (
//           <div className="video-container">
//               <div className="video-wrapper">
//                 <video ref={videoRef} autoPlay playsInline muted className="camera-view" onCanPlay={handleCanPlay} onClick={() => isCameraReady && takeSnapshot()}></video>
//                 <div ref={focusBoxRef} className="focus-box" style={{ width: `${focusBox.width}px`, height: `${focusBox.height}px` }}></div>
//                 <div className="focus-box" style={{ width: `${focusBox.width}px`, height: `${focusBox.height}px` }}></div>

//                 {!isCameraReady && <div className="camera-loading-spinner"><div className="spinner"></div></div>}
//               </div>
//               <div className="video-controls">
//                  <button className="btn-primary" onClick={takeSnapshot} disabled={!isCameraReady}>Capture</button>
//                  <button className="btn-secondary" onClick={closeCamera}>Cancel</button>
//               </div>
//           </div>
//       )}
//       {isLoading && !extractedData && (
//           <div className="loading-overlay">
//               <div className="spinner"></div>
//               <p style={{marginTop: '1rem', fontWeight: 600}}>Scanning your card...</p>
//           </div>
//       )}
//       {error && (
//         <div className="notification">
//             {error}
//             <button onClick={() => setError(null)} style={{ marginLeft: '1rem', background: 'none', border: 'none', color: 'white', fontWeight: 'bold' }}>X</button>
//         </div>
//       )}

//       <footer className="app-footer">
//         <p>© {new Date().getFullYear()} AI Card Scanner. All rights reserved.</p>
//       </footer>
//     </div>
//     </>
//   );
// };

// export default App;




// import React, { useState, useRef, useEffect, useCallback } from "react";
// // REMOVED: import { GoogleGenerativeAI } from "@google/generative-ai"; <-- This was slowing down the app!

// import type { FirebaseApp } from "firebase/app";
// import { initializeApp } from "firebase/app";

// import type {
//   Firestore,
//   CollectionReference,
//   DocumentData
// } from "firebase/firestore";
// import {
//   getFirestore,
//   collection,
//   getDocs,
//   addDoc,
//   deleteDoc,
//   doc,
//   updateDoc,
//   serverTimestamp,
//   query,
//   orderBy
// } from "firebase/firestore";

// // --- Asset Placeholder ---
// const logo = 'https://placehold.co/100x100/4F46E5/ffffff?text=CS';

// // --- Firebase Configuration ---
// const firebaseConfig = {
//   apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
//   authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
//   projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
//   storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
//   messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
//   appId: import.meta.env.VITE_FIREBASE_APP_ID,
// };

// // --- Google AI Configuration ---
// const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

// // --- Configuration Checks ---
// const isFirebaseConfigured = firebaseConfig?.projectId;
// const isAiConfigured = !!API_KEY;

// // --- Predefined Group Options ---
// const groupOptions = [
//   "Architect", "Ashrams", "Builders", "Building Materials", "Car Detailing", 
//   "Client", "Club", "Cold Storage", "Consumer", "Dairy", "Dealership/Partnership", 
//   "Developer", "Export", "Export Partner", "Factory", "Family", "Friend", 
//   "Govt Contractor", "Govt Deptt", "Green building", "Hardware", "Heat Insulation", 
//   "Home", "Hospitals", "Hotels", "Interior Designer", "Office", "Paint Contractors", 
//   "Paint Dealers", "Paint shop", "Partner", "Pre Fabrication", "Purchase", 
//   "Raw Material", "School", "Society", "Solar panel", "Vendor", "Others"
// ].sort();


// // --- Type Definitions ---
// interface ContactData {
//   id: string;
//   name: string;
//   designation: string;
//   company: string;
//   phoneNumbers: string[];
//   emails: string[];
//   websites: string[];
//   address: string;
//   imageBase64: string;
//   notes: string;
//   group: string;
//   whatsapp: string;
// }

// // Initialize Firebase
// let db: Firestore | undefined;
// let contactsCollectionRef: CollectionReference<DocumentData> | undefined;
// if (isFirebaseConfigured) {
//   try {
//     const app: FirebaseApp = initializeApp(firebaseConfig);
//     db = getFirestore(app);
//     contactsCollectionRef = collection(db, "visiting_cards");
//   } catch (e) {
//     console.error("Firebase initialization error:", (e as Error).message);
//   }
// }

// // --- App-specific Type Definitions ---
// type AppMode = 'single' | 'bulk' | 'chat';
// type BulkItemStatus = 'pending' | 'processing' | 'success' | 'error';
// type ChatRole = 'user' | 'model';

// interface BulkFileItem {
//   id: string;
//   file: File;
//   base64: string;
//   status: BulkItemStatus;
//   extractedData?: Partial<ContactData>;
//   error?: string;
// }

// interface ChatMessage {
//     role: ChatRole;
//     text: string;
// }

// type Part = { text: string } | { inlineData: { mimeType: string; data: string; } };

// interface BeforeInstallPromptEvent extends Event {
//   prompt: () => Promise<void>;
//   userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
// }

// // --- Standalone UI Components (Memoized for performance) ---

// const ActionPanel = React.memo(({
//     extractedData,
//     ...props
// }: any) => {
//     if (extractedData) return <VerificationForm extractedData={extractedData} {...props} />;
    
//     return (
//        <div className="card">
//           <div className="tabs">
//             <button className={`tab ${props.mode === 'single' ? 'active' : ''}`} onClick={() => props.setMode('single')}>Single Card</button>
//             <button className={`tab ${props.mode === 'bulk' ? 'active' : ''}`} onClick={() => props.setMode('bulk')}>Bulk Upload</button>
//             <button className={`tab ${props.mode === 'chat' ? 'active' : ''}`} onClick={() => props.setMode('chat')}>AI Assistant</button>
//           </div>
//           <input type="file" ref={props.fileInputRef} onChange={props.handleFileChange} accept="image/*" multiple={props.mode === 'bulk'} style={{display: 'none'}}/>
          
//           {props.mode === 'single' && <SingleCardUI {...props} />}
//           {props.mode === 'bulk' && <BulkUploadUI {...props} />}
//           {props.mode === 'chat' && <ChatUI {...props} />}
//       </div>
//     );
// });

// const VerificationForm = React.memo(({ extractedData, ...props }: any) => (
//     <div className="card">
//       <h2 className="card-title">{'id' in extractedData ? 'Edit Contact' : 'Verify & Save Contact'}</h2>
//       <div className="form-grid">
//         {renderField("Name", "name", extractedData, props.handleDataChange)}
//         {renderField("Designation", "designation", extractedData, props.handleDataChange)}
//         {renderField("Company", "company", extractedData, props.handleDataChange)}
//         {renderGroupDropdown("Group", "group", extractedData, props.handleDataChange)}
//         {renderField("WhatsApp Number", "whatsapp", extractedData, props.handleDataChange)}
//         {renderArrayField("Phone Numbers", "phoneNumbers", extractedData, props.handleDataChange, props.handleArrayDataChange)}
//         {renderArrayField("Emails", "emails", extractedData, props.handleDataChange, props.handleArrayDataChange)}
//         {renderArrayField("Websites", "websites", extractedData, props.handleDataChange, props.handleArrayDataChange)}
//         {renderField("Address", "address", extractedData, props.handleDataChange, true)}
//         {renderField("Notes", "notes", extractedData, props.handleDataChange, true)}
//       </div>
//       <div className="actions-row">
//         <button onClick={props.handleSave} disabled={props.isLoading} className="btn-primary">Save Contact</button>
//         <button onClick={props.resetState} className="btn-cancel">Cancel</button>
//       </div>
//     </div>
// ));

// const SingleCardUI = React.memo((props: any) => {
//     const isCameraSupported = window.isSecureContext;
//     return (
//     <>
//       {!props.frontImageBase64 ? (
//         <div onClick={() => props.fileInputRef.current?.click()} className="upload-box">
//           <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15l4-4c.928-.893 2.072-.893 3 0l4 4"/><path d="M14 14l1-1c.928-.893 2.072-.893 3 0l2 2"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"/></svg>
//           <p><span>Upload Card Image</span> or use camera</p>
//           <p className="upload-box-subtitle">PNG, JPG, GIF up to 10MB</p>
//         </div>
//       ) : (
//         <div className="image-previews">
//           <div className="preview-container">
//             <img src={`data:image/jpeg;base64,${props.frontImageBase64}`} alt="Front Preview" />
//             <p>Front / Profile</p>
//           </div>
//           <div className="preview-container">
//             {props.backImageBase64 ? <img src={`data:image/jpeg;base64,${props.backImageBase64}`} alt="Back Preview"/> :
//             ( <div onClick={() => props.fileInputRef.current?.click()} className="upload-box-small">
//                 <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
//                 <p>Add back side</p>
//               </div>
//             )}
//           </div>
//         </div>
//       )}
//       <div className="actions-row">
//         <button onClick={() => props.frontImageBase64 && props.processCardImages(props.frontImageBase64, props.backImageBase64)} disabled={props.isLoading || !props.frontImageBase64} className="btn-primary">Process Card</button>
//         <button 
//             onClick={() => props.openCamera(props.frontImageBase64 ? 'back' : 'front')} 
//             disabled={props.isLoading || (!!props.frontImageBase64 && !!props.backImageBase64) || !isCameraSupported} 
//             className="btn-secondary"
//             title={!isCameraSupported ? "Camera requires a secure (HTTPS) connection" : "Use your device's camera"}
//         >
//             Use Camera
//         </button>
//       </div>
//     </>
// )});

// const BulkUploadUI = React.memo((props: any) => (
//     <>
//         <div className="actions-row">
//             <button onClick={() => props.fileInputRef.current?.click()} disabled={props.isLoading} className="btn-primary">Upload Multiple Cards</button>
//             <button onClick={() => props.openCamera('bulk')} disabled={props.isLoading} className="btn-secondary">Use Camera</button>
//         </div>
//         {props.bulkItems.length > 0 && (
//             <div className="bulk-list">
//                 <ul>
//                     {props.bulkItems.map((item: any) => (
//                         <li key={item.id} className="bulk-item">
//                             <span className="bulk-item-name">{item.file.name}</span>
//                             <span className={`status-badge status-${item.status}`}>{item.status}</span>
//                         </li>
//                     ))}
//                 </ul>
//                 <div className="actions-row">
//                    <button onClick={props.saveAllBulk} disabled={props.isLoading || props.bulkItems.every((i: any) => i.status !== 'success')} className="btn-primary">Save All Successful</button>
//                 </div>
//             </div>
//         )}
//     </>
// ));
  
// const ChatUI = React.memo(({ chatHistory, isChatLoading, chatInput, setChatInput, handleCommandSubmit, chatDisplayRef }: any) => (
//     <div className="chat-container">
//        <div className="chat-display" ref={chatDisplayRef}>
//            {chatHistory.length === 0 ? (
//              <div className="chat-placeholder">
//                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
//                  <p>Ask anything about your contacts!</p>
//                  <p className="chat-placeholder-subtitle">e.g., "Who works at Google?"</p>
//              </div>
//            ) : chatHistory.map((msg: any, index: number) => (
//                <div key={index} className={`chat-message ${msg.role === 'user' ? 'user' : 'model'}`}>
//                     <p>{msg.text}</p>
//                </div>
//            ))}
//            {isChatLoading && chatHistory[chatHistory.length - 1]?.role === 'model' && <div className="chat-message model"><span className="typing-indicator"></span></div>}
//        </div>
//        <form onSubmit={(e) => { e.preventDefault(); handleCommandSubmit(); }} className="chat-form">
//            <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Ask the AI assistant..." disabled={isChatLoading} />
//            <button type="submit" disabled={isChatLoading || !chatInput.trim()}>
//              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
//            </button>
//        </form>
//    </div>
// ));
  
// const renderField = (label: string, field: string, extractedData: any, handleDataChange: any, isTextArea = false) => {
//      const commonProps = {
//         id: field,
//         value: (extractedData?.[field] || ''),
//         onChange: (e: any) => handleDataChange(field, e.target.value),
//      };
//      return (
//      <div className={`form-group ${isTextArea ? 'full-width' : ''}`}>
//       <label htmlFor={field}>{label}</label>
//       {isTextArea ? <textarea {...commonProps} rows={3} /> : <input type="text" {...commonProps} />}
//     </div>
//   )};

// const renderGroupDropdown = (label: string, field: string, extractedData: any, handleDataChange: any) => (
//     <div className="form-group">
//         <label htmlFor={field}>{label}</label>
//         <select
//             id={field}
//             value={extractedData?.[field] || ''}
//             onChange={(e) => handleDataChange(field, e.target.value)}
//         >
//             <option value="" disabled>Select a group</option>
//             {groupOptions.map(option => (
//                 <option key={option} value={option}>{option}</option>
//             ))}
//         </select>
//     </div>
// );

// const renderArrayField = (label: string, field: string, extractedData: any, handleDataChange: any, handleArrayDataChange: any) => (
//     <div className="form-group full-width">
//       <label>{label}</label>
//       {(extractedData?.[field] || []).map((item: string, index: number) => (
//          <input key={index} type="text" value={item} onChange={(e) => handleArrayDataChange(field, index, e.target.value)} />
//       ))}
//        <button onClick={() => handleDataChange(field, [...(extractedData?.[field] || []), ''])} className="btn-add-field">+ Add {label.slice(0,-1)}</button>
//     </div>
// );

// // --- Main App Component ---
// const App = () => {
//   // --- State Management ---
//   const [mode, setMode] = useState<AppMode>('single');
//   const [savedContacts, setSavedContacts] = useState<ContactData[]>([]);
//   const [isLoading, setIsLoading] = useState(false);
//   const [isExporting, setIsExporting] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [frontImageBase64, setFrontImageBase64] = useState<string | null>(null);
//   const [backImageBase64, setBackImageBase64] = useState<string | null>(null);
//   const [extractedData, setExtractedData] = useState<Partial<ContactData> | null>(null);
//   const [isCameraOpen, setIsCameraOpen] = useState(false);
//   const [cameraFor, setCameraFor] = useState<'front' | 'back' | 'bulk'>('front');
//   const [isCameraReady, setIsCameraReady] = useState(false);
//   const [bulkItems, setBulkItems] = useState<BulkFileItem[]>([]);
//   const [chatInput, setChatInput] = useState('');
//   const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
//   const [isChatLoading, setIsChatLoading] = useState(false);
//   const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
//   const [focusBox, setFocusBox] = useState<{ width: number; height: number }>({ width: 0, height: 0 });


//   // --- Refs ---
//   const fileInputRef = useRef<HTMLInputElement>(null);
//   const videoRef = useRef<HTMLVideoElement>(null);
//   const chatDisplayRef = useRef<HTMLDivElement>(null);
//   const focusBoxRef = useRef<HTMLDivElement>(null);

//   // --- Effects ---
//   useEffect(() => {
//     const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
//       e.preventDefault();
//       setDeferredPrompt(e);
//     };
//     window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
//     return () => {
//       window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
//     };
//   }, []);

//   useEffect(() => {
//     if (chatDisplayRef.current) {
//         chatDisplayRef.current.scrollTop = chatDisplayRef.current.scrollHeight;
//     }
//   }, [chatHistory]);

//   const fetchContacts = useCallback(async () => {
//     if (!contactsCollectionRef) return;
//     setIsLoading(true);
//     try {
//       const q = query(contactsCollectionRef, orderBy("createdAt", "desc"));
//       const data = await getDocs(q);
//       const contacts = data.docs.map(doc => ({ id: doc.id, ...doc.data() } as ContactData));
//       setSavedContacts(contacts);
//     } catch (e) {
//        const err = e as Error;
//        console.error("Failed to load contacts:", err.message);
//        setError("Could not load saved contacts.");
//     }
//     setIsLoading(false);
//   }, []);

//   useEffect(() => {
//     if(isFirebaseConfigured) {
//         fetchContacts();
//     }
//   }, [fetchContacts]);

//   // --- Camera Lifecycle Effect ---
//   useEffect(() => {
//     let stream: MediaStream | null = null;
//     const videoNode = videoRef.current;

//     const setupCamera = async () => {
//         if (!isCameraOpen || !videoNode) return;

//         setIsCameraReady(false);
//         if (!window.isSecureContext) {
//             setError("Camera access requires a secure connection (HTTPS).");
//             setIsCameraOpen(false);
//             return;
//         }

//         try {
//             stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
//             videoNode.srcObject = stream;
//         } catch (err) {
//             if (err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "PermissionDeniedError")) {
//                 setError("Camera permission was denied. Please enable it in your browser settings.");
//             } else {
//                 setError("Could not access the camera. It might be in use by another app.");
//             }
//             console.error("Camera access error:", err);
//             setIsCameraOpen(false);
//         }
//     };

//     setupCamera();

//     // Cleanup function
//     return () => {
//         if (stream) {
//             stream.getTracks().forEach(track => track.stop());
//         }
//     };
//   }, [isCameraOpen]);

//   const updateFocusBox = () => {
//     if (!videoRef.current) return;
//     const CARD_RATIO = 1.586; // standard business card aspect ratio
//     const vw = videoRef.current.videoWidth;
//     const vh = videoRef.current.videoHeight;
//     let width = vw * 0.8;
//     let height = width / CARD_RATIO;
//     if (height > vh * 0.8) {
//       height = vh * 0.8;
//       width = height * CARD_RATIO;
//     }
//     setFocusBox({ width, height });
//   };

//   useEffect(() => {
//     if (!isCameraOpen) return;
//     const handleResize = () => updateFocusBox();
//     window.addEventListener('resize', handleResize);
//     updateFocusBox();
//     return () => window.removeEventListener('resize', handleResize);
//   }, [isCameraOpen]);

//   const handleCanPlay = () => {
//     if(videoRef.current) {
//         videoRef.current.play().then(() => {
//             setIsCameraReady(true);
//             updateFocusBox();
//         }).catch(err => {
//             console.error("Video play failed:", err);
//             setError("Could not start camera stream.");
//             setIsCameraOpen(false);
//         });
//     }
//   };

//   // --- Helper Functions ---
//   const handleInstallClick = async () => {
//     if (deferredPrompt) {
//       deferredPrompt.prompt();
//       const { outcome } = await deferredPrompt.userChoice;
//       if (outcome === 'accepted') {
//         console.log('User accepted the install prompt');
//       }
//       setDeferredPrompt(null);
//     }
//   };

//   const resetState = () => {
//     setFrontImageBase64(null);
//     setBackImageBase64(null);
//     setExtractedData(null);
//     setBulkItems([]);
//     setError(null);
//     setIsLoading(false);
//     setMode('single');
//   };

//   const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
//     const files = event.target.files;
//     if (!files || files.length === 0) return;
    
//     const processFile = (file: File, isBulk: boolean) => {
//         const reader = new FileReader();
//         reader.onloadend = () => {
//             const base64String = (reader.result as string).split(",")[1];
//             if (isBulk) {
//                 const newItem: BulkFileItem = { id: `${file.name}-${Date.now()}`, file, base64: base64String, status: 'pending' };
//                 setBulkItems(prev => [...prev, newItem]);
//                 processCardImages(base64String, null, newItem.id);
//             } else {
//                  if (!frontImageBase64) setFrontImageBase64(base64String);
//                  else setBackImageBase64(base64String);
//             }
//         };
//         reader.readAsDataURL(file);
//     };

//     if (mode === 'bulk') {
//         Array.from(files).forEach(file => processFile(file, true));
//     } else {
//         processFile(files[0], false);
//     }
//     if(fileInputRef.current) fileInputRef.current.value = '';
//   };
  
//   const openCamera = (forSide: 'front' | 'back' | 'bulk') => {
//     setCameraFor(forSide);
//     setIsCameraOpen(true);
//   };

//   const closeCamera = () => {
//     setIsCameraOpen(false);
//   };
  
//   // --- OPTIMIZED SNAPSHOT FUNCTION (Fixes Sizing + Cropping) ---
//   const takeSnapshot = () => {
//     if (!videoRef.current || !isCameraReady || videoRef.current.videoWidth === 0) {
//         setError("Camera is not ready yet.");
//         return;
//     }

//     const video = videoRef.current;
    
//     const videoRect = video.getBoundingClientRect();
//     const boxRect = focusBoxRef.current?.getBoundingClientRect();

//     if (!boxRect) return;

//     // Scale Logic
//     const scaleX = video.videoWidth / videoRect.width;
//     const scaleY = video.videoHeight / videoRect.height;

//     // Calculate Crop
//     const cropX = (boxRect.left - videoRect.left) * scaleX;
//     const cropY = (boxRect.top - videoRect.top) * scaleY;
//     const cropWidth = boxRect.width * scaleX;
//     const cropHeight = boxRect.height * scaleY;

//     const canvas = document.createElement("canvas");
//     canvas.width = cropWidth;
//     canvas.height = cropHeight;
//     const ctx = canvas.getContext('2d');

//     const base64ToFile = (b64: string, filename: string): File => {
//         const byteString = atob(b64);
//         const ab = new ArrayBuffer(byteString.length);
//         const ia = new Uint8Array(ab);
//         for (let i = 0; i < byteString.length; i++) {
//             ia[i] = byteString.charCodeAt(i);
//         }
//         return new File([ia], filename, { type: 'image/jpeg' });
//     };

//     if (ctx) {
//         ctx.drawImage(
//             video, 
//             cropX, cropY, cropWidth, cropHeight, 
//             0, 0, cropWidth, cropHeight          
//         );
        
//         const dataUrl = canvas.toDataURL('image/jpeg');
//         const base64String = dataUrl.split(',')[1];
        
//         // Auto Download Cropped Image
//         const downloadLink = document.createElement('a');
//         downloadLink.href = dataUrl;
//         downloadLink.download = `cropped_card_${Date.now()}.jpg`;
//         document.body.appendChild(downloadLink);
//         downloadLink.click();
//         document.body.removeChild(downloadLink);

//         if(cameraFor === 'bulk') {
//             const filename = `camera-${Date.now()}.jpg`;
//             const file = base64ToFile(base64String, filename);
//             const newItem: BulkFileItem = { id: `${filename}-${Date.now()}`, file, base64: base64String, status: 'pending' };
//             setBulkItems(prev => [...prev, newItem]);
//             processCardImages(base64String, null, newItem.id);
//         } else if(cameraFor === 'front') {
//             setFrontImageBase64(base64String);
//         } else {
//             setBackImageBase64(base64String);
//         }
//         closeCamera();
//     } else {
//         setError("Could not process image from camera.");
//     }
//   };

//   const processCardImages = async (frontB64: string, backB64?: string | null, bulkItemId?: string) => {
//     if (!isAiConfigured || !API_KEY) {
//         setError("AI API Key is not configured.");
//         return;
//     }

//     if (bulkItemId) {
//         setBulkItems(prev => prev.map(item => item.id === bulkItemId ? { ...item, status: 'processing' } : item));
//     } else {
//         setIsLoading(true);
//         setExtractedData(null);
//     }
//     setError(null);

//     try {
//         // --- PERFORMANCE FIX: Dynamic Import (Lazy Loading) ---
//         // This ensures the heavy AI library is ONLY loaded when you click process.
//         const { GoogleGenerativeAI } = await import("@google/generative-ai");
//         // -----------------------------------------------------

//         const genAI = new GoogleGenerativeAI(API_KEY);
//         const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
//         const parts: Part[] = [{ inlineData: { mimeType: 'image/jpeg', data: frontB64 } }];
//         if (backB64) parts.push({ inlineData: { mimeType: 'image/jpeg', data: backB64 } });
        
//         const promptText = `Analyze the business card image(s) and extract contact details. Return a single JSON object with keys: "name", "designation", "company", "phoneNumbers", "emails", "websites", "address", "whatsapp", "group", "notes". For the "group" field, categorize the contact based on their profession or company into one of the following options: ${groupOptions.join(', ')}. If no category fits, use "Others". If info is not found, use empty strings or arrays.`;
//         parts.push({ text: promptText });

//         const result = await model.generateContent({
//             contents: [{ role: "user", parts }],
//             generationConfig: { responseMimeType: "application/json" },
//         });
        
//         const parsedData = JSON.parse(result.response.text());

//         if (bulkItemId) {
//             setBulkItems(prev => prev.map(item => item.id === bulkItemId ? { ...item, status: 'success', extractedData: parsedData } : item));
//         } else {
//             setExtractedData(parsedData);
//         }
//     } catch (e) {
//         const err = e as Error;
//         console.error("Error processing card:", err.message);
//         const errorMsg = `Failed to process image. ${err.message || 'An unknown error occurred.'}`;
//         if (bulkItemId) {
//             setBulkItems(prev => prev.map(item => item.id === bulkItemId ? { ...item, status: 'error', error: errorMsg } : item));
//         } else {
//             setError(errorMsg);
//         }
//     } finally {
//         if (!bulkItemId) setIsLoading(false);
//     }
//   };

//   const handleDataChange = (field: keyof Omit<ContactData, 'id' | 'imageBase64'>, value: string | string[]) => {
//     setExtractedData(prev => prev ? ({ ...prev, [field]: value }) : null);
//   };

//   const handleArrayDataChange = (field: keyof Omit<ContactData, 'id' | 'imageBase64'>, index: number, value: string) => {
//     setExtractedData(prev => {
//         if (!prev) return null;
//         const currentArray = (prev[field] as string[]) || [];
//         const newArray = [...currentArray];
//         newArray[index] = value;
//         return { ...prev, [field]: newArray };
//     });
//   };
  
//   const saveContactToFirebase = async () => {
//     if (!db || !contactsCollectionRef || !extractedData || !frontImageBase64) {
//         setError("Cannot save contact. Check configuration and data.");
//         return;
//     }
//     setIsLoading(true);
//     const contactPayload = {
//       name: extractedData.name || "",
//       designation: extractedData.designation || "",
//       company: extractedData.company || "",
//       phoneNumbers: extractedData.phoneNumbers || [],
//       emails: extractedData.emails || [],
//       websites: extractedData.websites || [],
//       address: extractedData.address || "",
//       imageBase64: frontImageBase64,
//       notes: extractedData.notes || "",
//       group: extractedData.group || "",
//       whatsapp: extractedData.whatsapp || "",
//       createdAt: serverTimestamp(),
//     };

//       try {
//         if ('id' in extractedData && extractedData.id) {
//             await updateDoc(doc(db, "visiting_cards", extractedData.id), contactPayload);
//         } else {
//             await addDoc(contactsCollectionRef, contactPayload);
//         }
//         resetState();
//         fetchContacts();
//       } catch {
//         setError("Failed to save contact.");
//         setIsLoading(false);
//       }
//   };

//   const downloadVcf = (data: Partial<ContactData>, currentImage?: string | null) => {
//     const { name, designation, company, phoneNumbers, emails, websites, address, whatsapp } = data;
//     let vCard = "BEGIN:VCARD\nVERSION:3.0\n";
//     if (name) {
//         const nameParts = name.split(' ');
//         const lastName = nameParts.pop() || '';
//         const firstName = nameParts.join(' ');
//         vCard += `FN:${name}\n`;
//         vCard += `N:${lastName};${firstName};;;\n`;
//     }
//     if (company) vCard += `ORG:${company}\n`;
//     if (designation) vCard += `TITLE:${designation}\n`;
//     if (phoneNumbers) phoneNumbers.forEach((p, i) => { vCard += `TEL;TYPE=WORK,VOICE${i === 0 ? ',PREF' : ''}:${p}\n`; });
//     if (whatsapp) vCard += `TEL;TYPE=CELL,WHATSAPP:${whatsapp}\n`;
//     if (emails) emails.forEach(e => { vCard += `EMAIL:${e}\n`; });
//     if (websites) websites.forEach(w => { vCard += `URL:${w}\n`; });
//     if (address) vCard += `ADR;TYPE=WORK:;;${address.replace(/\n/g, '\\n')};;;;\n`;
//     if (currentImage) {
//         vCard += `PHOTO;ENCODING=b;TYPE=JPEG:${currentImage.replace(/\s/g, '')}\n`;
//     }
//     vCard += "END:VCARD";

//     const blob = new Blob([vCard], { type: "text/vcard;charset=utf-8" });
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement("a");
//     a.href = url;
//     a.download = (name?.replace(/\s/g, '_') || 'contact') + '.vcf';
//     document.body.appendChild(a);
//     a.click();
//     document.body.removeChild(a);
//     URL.revokeObjectURL(url);
//   };
  
//   const handleSave = () => {
//       if (extractedData) {
//           downloadVcf(extractedData, frontImageBase64);
//           saveContactToFirebase();
//       }
//   };

//   const downloadContactsAsExcel = async () => {
//     if (savedContacts.length === 0) {
//         setError("No contacts available to export yet.");
//         return;
//     }

//     setError(null);
//     setIsExporting(true);
//     try {
//         // Dynamic import for exceljs (already good)
//         const { Workbook } = await import('exceljs');
//         const workbook = new Workbook();
//         const worksheet = workbook.addWorksheet('Contacts');

//         worksheet.columns = [
//             { header: 'Photo', key: 'photo', width: 18 },
//             { header: 'Name', key: 'name', width: 25 },
//             { header: 'Designation', key: 'designation', width: 22 },
//             { header: 'Company', key: 'company', width: 25 },
//             { header: 'Phone Numbers', key: 'phones', width: 24 },
//             { header: 'WhatsApp', key: 'whatsapp', width: 18 },
//             { header: 'Emails', key: 'emails', width: 28 },
//             { header: 'Websites', key: 'websites', width: 28 },
//             { header: 'Group', key: 'group', width: 18 },
//             { header: 'Address', key: 'address', width: 36 },
//             { header: 'Notes', key: 'notes', width: 36 },
//         ];
//         worksheet.getRow(1).font = { bold: true };

//         savedContacts.forEach((contact) => {
//             const row = worksheet.addRow({
//                 photo: '',
//                 name: contact.name || '',
//                 designation: contact.designation || '',
//                 company: contact.company || '',
//                 phones: (contact.phoneNumbers || []).join(', '),
//                 whatsapp: contact.whatsapp || '',
//                 emails: (contact.emails || []).join(', '),
//                 websites: (contact.websites || []).join(', '),
//                 group: contact.group || '',
//                 address: contact.address || '',
//                 notes: contact.notes || '',
//             });
//             row.alignment = { vertical: 'top', wrapText: true };
//             if (contact.imageBase64) {
//                 const imageId = workbook.addImage({
//                     base64: contact.imageBase64,
//                     extension: 'jpeg',
//                 });
//                 const rowIndex = row.number;
//                 worksheet.getRow(rowIndex).height = 90;
//                 worksheet.addImage(imageId, `A${rowIndex}:A${rowIndex}`);
//             }
//         });

//         const buffer = await workbook.xlsx.writeBuffer();
//         const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
//         const url = URL.createObjectURL(blob);
//         const link = document.createElement('a');
//         link.href = url;
//         link.download = `contacts-${new Date().toISOString().split('T')[0]}.xlsx`;
//         document.body.appendChild(link);
//         link.click();
//         document.body.removeChild(link);
//         URL.revokeObjectURL(url);
//     } catch (err) {
//         console.error('Failed to export contacts:', err);
//         setError("Could not export contacts. Please try again.");
//     } finally {
//         setIsExporting(false);
//     }
//   };

//   const saveAllBulk = async () => {
//     if (!db || !contactsCollectionRef) return;
//     const successfulItems = bulkItems.filter(item => item.status === 'success' && item.extractedData);
//     if(successfulItems.length === 0) return;

//     setIsLoading(true);
//     let successCount = 0;
//     for (const item of successfulItems) {
//         if(item.extractedData){
//             try {
//                 const payload = { ...item.extractedData, imageBase64: item.base64, createdAt: serverTimestamp() };
//                 await addDoc(contactsCollectionRef, payload);
//                 successCount++;
//            } catch (e) { console.error(`Failed to save ${item.file.name}:`, (e as Error).message); }
//         }
//     }
//     alert(`${successCount} of ${successfulItems.length} contacts saved.`);
//     resetState();
//     fetchContacts();
//   }

//   const deleteContact = async (id: string) => {
//     if (!db) return;
//       if (window.confirm("Are you sure you want to delete this contact?")) {
//           try {
//               await deleteDoc(doc(db, "visiting_cards", id));
//               if(extractedData && (extractedData as ContactData).id === id) resetState();
//               fetchContacts();
//           } catch {
//               setError("Failed to delete contact.");
//           }
//       }
//   };

//   const editContact = (contact: ContactData) => {
//     setExtractedData(contact);
//     setFrontImageBase64(contact.imageBase64);
//     setBackImageBase64(null);
//     setMode('single');
//     window.scrollTo({ top: 0, behavior: 'smooth' });
//   };

//   const handleCommandSubmit = async () => {
//     if (!chatInput.trim() || isChatLoading || !isAiConfigured || !API_KEY) return;
//     const userMessage: ChatMessage = { role: 'user', text: chatInput.trim() };
//     setChatHistory(prev => [...prev, userMessage, { role: 'model', text: '' }]);
//     setChatInput("");
//     setIsChatLoading(true);
    
//     try {
//         // --- PERFORMANCE FIX: Dynamic Import ---
//         const { GoogleGenerativeAI } = await import("@google/generative-ai");
//         // ---------------------------------------
        
//         const genAI = new GoogleGenerativeAI(API_KEY);
//         const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
//         const contactsJson = JSON.stringify(savedContacts.map(c => ({ name: c.name, designation: c.designation, company: c.company, phoneNumbers: c.phoneNumbers, emails: c.emails, group: c.group })));
//         const prompt = `You are an AI assistant for a business card app. Answer questions about the user's saved contacts based STRICTLY on this JSON data. If info isn't present, say so. Keep answers concise. Contact data: ${contactsJson}\n\nUser question: ${userMessage.text}`;
//         const result = await model.generateContent(prompt);
//         const fullResponse = result.response.text();
//         setChatHistory(prev => {
//             const newHistory = [...prev];
//             newHistory[newHistory.length - 1] = { role: 'model', text: fullResponse };
//             return newHistory;
//         });
//     } catch (err) {
//         const errorMsg = `Sorry, an error occurred: ${(err as Error).message}`;
//         setChatHistory(prev => {
//             const newHistory = [...prev];
//             newHistory[newHistory.length - 1] = { role: 'model', text: errorMsg };
//             return newHistory;
//         });
//     } finally {
//         setIsChatLoading(false);
//     }
//   };

//   if (!isFirebaseConfigured || !isAiConfigured) {
//       return (
//         <div className="config-error-container">
//             <div className="config-error-box">
//               <h2>Configuration Error</h2>
//               <p>Please make sure your Firebase and Google AI API keys are correctly set up in your environment variables.</p>
//               {!isFirebaseConfigured && <p className="error-highlight">Firebase configuration is INCOMPLETE.</p>}
//               {!isAiConfigured && <p className="error-highlight">Google AI API Key is MISSING.</p>}
//             </div>
//         </div>
//       )
//   }

//   const componentProps = {
//       mode, setMode,
//       isLoading,
//       extractedData,
//       frontImageBase64,
//       backImageBase64,
//       fileInputRef,
//       handleFileChange,
//       processCardImages,
//       openCamera,
//       bulkItems,
//       saveAllBulk,
//       chatHistory,
//       isChatLoading,
//       chatInput,
//       setChatInput,
//       handleCommandSubmit,
//       chatDisplayRef,
//       handleDataChange,
//       handleArrayDataChange,
//       handleSave,
//       resetState,
//   };

//   return (
//     <>
//     <style>{`/* --- MODERN UI THEME --- */
//       :root {
//         --font-main: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
//         --c-bg: #f0f2f5;
//         --c-surface: #ffffff;
//         --c-primary: #6366f1; /* Indigo-500 */
//         --c-primary-dark: #4f46e5;
//         --c-text-main: #1f2937;
//         --c-text-sec: #6b7280;
//         --c-border: #e5e7eb;
//         --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
//         --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
//         --radius: 12px; /* Softer, rounder corners */
//       }

//       * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
      
//       body {
//         background-color: var(--c-bg);
//         color: var(--c-text-main);
//         font-family: var(--font-main);
//         -webkit-font-smoothing: antialiased;
//         width: 100%;
//         overflow-x: hidden;
//       }

//       /* --- LAYOUT CONTAINER --- */
//       .app-container {
//         display: flex;
//         flex-direction: column;
//         min-height: 100vh;
//         max-width: 100%;
//         overflow-x: hidden;
//       }

//       /* --- HEADER (Glassmorphism) --- */
//       .app-header {
//         position: sticky;
//         top: 0;
//         z-index: 50;
//         background: rgba(255, 255, 255, 0.9);
//         backdrop-filter: blur(10px);
//         border-bottom: 1px solid rgba(0,0,0,0.05);
//         padding: 0.8rem 1.2rem;
//         display: flex;
//         align-items: center;
//         justify-content: space-between;
//         box-shadow: var(--shadow-sm);
//       }

//       .header-title { display: flex; align-items: center; gap: 0.75rem; }
//       .header-title img { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; }
//       .header-title h1 { font-size: 1.15rem; font-weight: 700; color: var(--c-text-main); letter-spacing: -0.025em; }

//       /* --- DASHBOARD --- */
//       .dashboard {
//         flex: 1;
//         width: 100%;
//         max-width: 600px; /* Limit width for better aesthetic on desktop */
//         margin: 0 auto;
//         padding: 1.5rem 1rem;
//         display: flex;
//         flex-direction: column;
//         gap: 1.5rem;
//       }

//       /* --- CARDS --- */
//       .card {
//         background: var(--c-surface);
//         border-radius: var(--radius);
//         box-shadow: var(--shadow-md);
//         padding: 1.5rem;
//         border: 1px solid var(--c-border);
//         transition: transform 0.2s;
//       }

//       .card-title {
//         font-size: 1.1rem;
//         font-weight: 700;
//         color: var(--c-text-main);
//         margin-bottom: 1rem;
//         display: flex;
//         align-items: center;
//         justify-content: space-between;
//       }

//       /* --- TABS --- */
//       .tabs {
//         display: flex;
//         background: #f3f4f6;
//         padding: 0.25rem;
//         border-radius: 10px;
//         margin-bottom: 1.5rem;
//       }
//       .tab {
//         flex: 1;
//         text-align: center;
//         padding: 0.5rem;
//         font-size: 0.9rem;
//         font-weight: 600;
//         color: var(--c-text-sec);
//         border-radius: 8px;
//         border: none;
//         background: transparent;
//         cursor: pointer;
//         transition: all 0.2s ease;
//       }
//       .tab.active {
//         background: white;
//         color: var(--c-primary);
//         box-shadow: var(--shadow-sm);
//       }

//       /* --- UPLOAD BOX --- */
//       .upload-box {
//         border: 2px dashed #d1d5db;
//         border-radius: var(--radius);
//         padding: 2.5rem 1rem;
//         text-align: center;
//         cursor: pointer;
//         transition: all 0.2s;
//         background: #f9fafb;
//       }
//       .upload-box:active { transform: scale(0.98); background: #f3f4f6; }
//       .upload-box svg { color: var(--c-text-sec); margin-bottom: 0.5rem; }
//       .upload-box p span { color: var(--c-primary); font-weight: 600; }

//       /* --- INPUTS --- */
//       .form-group label {
//         display: block;
//         font-size: 0.85rem;
//         font-weight: 600;
//         color: var(--c-text-sec);
//         margin-bottom: 0.4rem;
//         margin-top: 0.8rem;
//       }
//       input, select, textarea {
//         width: 100%;
//         padding: 0.75rem;
//         border: 1px solid var(--c-border);
//         border-radius: 8px;
//         font-size: 1rem;
//         background: #fff;
//         transition: border-color 0.2s, box-shadow 0.2s;
//       }
//       input:focus, select:focus, textarea:focus {
//         outline: none;
//         border-color: var(--c-primary);
//         box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
//       }

//       /* --- BUTTONS --- */
//       button {
//         display: inline-flex;
//         align-items: center;
//         justify-content: center;
//         padding: 0.75rem 1.25rem;
//         font-size: 0.95rem;
//         font-weight: 600;
//         border-radius: 10px;
//         border: none;
//         cursor: pointer;
//         transition: transform 0.1s, opacity 0.2s;
//         gap: 0.5rem;
//       }
//       button:active { transform: scale(0.97); }
      
//       .btn-primary {
//         background: linear-gradient(135deg, var(--c-primary) 0%, var(--c-primary-dark) 100%);
//         color: white;
//         box-shadow: 0 4px 6px rgba(79, 70, 229, 0.3);
//         width: 100%;
//       }
//       .btn-secondary {
//         background: white;
//         color: var(--c-text-main);
//         border: 1px solid var(--c-border);
//         width: 100%;
//       }
//       .actions-row { display: flex; flex-direction: column; gap: 0.8rem; margin-top: 1.5rem; }
//       @media (min-width: 640px) { .actions-row { flex-direction: row; } }

//       /* --- CONTACT LIST --- */
//       .contact-list { display: flex; flex-direction: column; gap: 0.8rem; }
//       .contact-list-item {
//         display: flex;
//         align-items: center;
//         justify-content: space-between;
//         padding: 0.8rem;
//         background: white;
//         border-radius: 10px;
//         border: 1px solid var(--c-border);
//         box-shadow: var(--shadow-sm);
//       }
//       .contact-info { display: flex; align-items: center; gap: 1rem; min-width: 0; flex: 1; }
//       .contact-info img {
//         width: 42px; height: 42px;
//         border-radius: 50%;
//         object-fit: cover;
//         border: 2px solid white;
//         box-shadow: 0 2px 4px rgba(0,0,0,0.1);
//       }
//       .contact-info-text h3 { font-size: 0.95rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
//       .contact-info-text p { font-size: 0.8rem; color: var(--c-text-sec); }
//       .delete-btn { color: #ef4444; padding: 0.5rem; background: transparent; width: auto; }

//       /* --- CAMERA OVERLAY (Native App Feel) --- */
//       .video-container {
//         position: fixed; top: 0; left: 0; width: 100%; height: 100%;
//         background: black; z-index: 100;
//         display: flex; flex-direction: column;
//       }
//       .video-wrapper { flex: 1; position: relative; overflow: hidden; }
//       .video-container video { width: 100%; height: 100%; object-fit: cover; }
      
//       .focus-box {
//         position: absolute; top: 50%; left: 50%;
//         transform: translate(-50%, -50%);
//         border: 2px solid white;
//         border-radius: 12px;
//         box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.6); /* Darkens everything else */
//         z-index: 10;
//       }
//       .focus-box::after {
//         content: "Align card here";
//         position: absolute; bottom: -30px; left: 0; width: 100%;
//         text-align: center; color: white; font-weight: 600; font-size: 0.9rem;
//         text-shadow: 0 2px 4px rgba(0,0,0,0.5);
//       }

//       .video-controls {
//         position: absolute; bottom: 0; left: 0; width: 100%;
//         padding: 2rem;
//         background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
//         display: flex; justify-content: center; gap: 2rem;
//         z-index: 20;
//       }
//       .video-controls button {
//         border-radius: 50px;
//         padding: 0.8rem 2rem;
//         font-size: 1rem;
//         text-transform: uppercase;
//         letter-spacing: 0.05em;
//         width: auto;
//       }
//       .btn-capture { background: white; color: black; font-weight: 800; }
//       .btn-close-cam { background: rgba(255,255,255,0.2); color: white; backdrop-filter: blur(4px); }

//       /* --- FOOTER --- */
//       .app-footer { text-align: center; padding: 2rem; color: #9ca3af; font-size: 0.8rem; }
      
//       /* --- UTILITIES --- */
//       .loading-overlay { 
//         position: fixed; inset: 0; background: rgba(255,255,255,0.8); backdrop-filter: blur(5px);
//         z-index: 99; display: flex; flex-direction: column; align-items: center; justify-content: center; 
//       }
//       .spinner { 
//         width: 3rem; height: 3rem; 
//         border: 4px solid #e5e7eb; border-top-color: var(--c-primary); 
//         border-radius: 50%; animation: spin 0.8s linear infinite; 
//       }
//       @keyframes spin { to { transform: rotate(360deg); } }`}</style>
//     <div className="app-container">
//       <header className="app-header">
//         <div className="header-title">
//             <img src={logo} alt="App Logo" />
//             <h1>AI Card Scanner</h1>
//         </div>
//         {deferredPrompt && (
//             <button className="btn-install" onClick={handleInstallClick}>Install App</button>
//         )}
//       </header>
//       <main className="dashboard">
//         <div className="action-panel">
//           <ActionPanel extractedData={extractedData} {...componentProps} />
//         </div>
//         <div className="contact-list-panel">
//           <div className="card">
//             <div className="card-header">
//               <h2 className="card-title">Saved Contacts</h2>
//               <button
//                 onClick={downloadContactsAsExcel}
//                 disabled={isExporting || isLoading || savedContacts.length === 0}
//                 className="btn-secondary download-btn"
//               >
//                 {isExporting ? 'Preparing...' : 'Download Excel'}
//               </button>
//             </div>
//             <div className="contact-list">
//               {savedContacts.map(contact => (
//                 <div key={contact.id} onClick={() => editContact(contact)} className="contact-list-item">
//                   <div className="contact-info">
//                     <img src={contact.imageBase64 ? `data:image/jpeg;base64,${contact.imageBase64}` : `https://placehold.co/100x100/e2e8f0/64748b?text=${contact.name.charAt(0)}`} alt={contact.name} />
//                     <div className="contact-info-text">
//                         <h3>{contact.name || 'No Name'}</h3>
//                         <p>{contact.company || 'No Company'}</p>
//                     </div>
//                   </div>
//                   <div className="contact-actions">
//                     <button onClick={(e) => { e.stopPropagation(); deleteContact(contact.id)}} title="Delete" className="delete-btn">
//                       <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
//                     </button>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </div>
//         </div>
//       </main>
      
//       {isCameraOpen && (
//           <div className="video-container">
//               <div className="video-wrapper">
//                 <video ref={videoRef} autoPlay playsInline muted className="camera-view" onCanPlay={handleCanPlay} onClick={() => isCameraReady && takeSnapshot()}></video>
//                 <div ref={focusBoxRef} className="focus-box" style={{ width: `${focusBox.width}px`, height: `${focusBox.height}px` }}></div>

//                 {!isCameraReady && <div className="camera-loading-spinner"><div className="spinner"></div></div>}
//               </div>
//               <div className="video-controls">
//                  <button className="btn-primary" onClick={takeSnapshot} disabled={!isCameraReady}>Capture</button>
//                  <button className="btn-secondary" onClick={closeCamera}>Cancel</button>
//               </div>
//           </div>
//       )}
//       {isLoading && !extractedData && (
//           <div className="loading-overlay">
//               <div className="spinner"></div>
//               <p style={{marginTop: '1rem', fontWeight: 600}}>Scanning your card...</p>
//           </div>
//       )}
//       {error && (
//         <div className="notification">
//             {error}
//             <button onClick={() => setError(null)} style={{ marginLeft: '1rem', background: 'none', border: 'none', color: 'white', fontWeight: 'bold' }}>X</button>
//         </div>
//       )}

//       <footer className="app-footer">
//         <p>© {new Date().getFullYear()} AI Card Scanner. All rights reserved.</p>
//       </footer>
//     </div>
//     </>
//   );
// };

// export default App;






// import React, { useState, useRef, useEffect, useCallback } from "react";
// // Dynamic import used for optimization
// // import { GoogleGenerativeAI } from "@google/generative-ai";

// import type { FirebaseApp } from "firebase/app";
// import { initializeApp } from "firebase/app";

// import type {
//   Firestore,
//   CollectionReference,
//   DocumentData
// } from "firebase/firestore";
// import {
//   getFirestore,
//   collection,
//   getDocs,
//   addDoc,
//   deleteDoc,
//   doc,
//   updateDoc,
//   serverTimestamp,
//   query,
//   orderBy
// } from "firebase/firestore";

// // --- Asset Placeholder ---
// const logo = 'https://placehold.co/100x100/4F46E5/ffffff?text=CS';

// // --- Firebase Configuration ---
// const firebaseConfig = {
//   apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
//   authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
//   projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
//   storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
//   messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
//   appId: import.meta.env.VITE_FIREBASE_APP_ID,
// };

// // --- Google AI Configuration ---
// const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

// // --- Configuration Checks ---
// const isFirebaseConfigured = firebaseConfig?.projectId;
// const isAiConfigured = !!API_KEY;

// // --- Predefined Group Options ---
// const groupOptions = [
//   "Architect", "Ashrams", "Builders", "Building Materials", "Car Detailing", 
//   "Client", "Club", "Cold Storage", "Consumer", "Dairy", "Dealership/Partnership", 
//   "Developer", "Export", "Export Partner", "Factory", "Family", "Friend", 
//   "Govt Contractor", "Govt Deptt", "Green building", "Hardware", "Heat Insulation", 
//   "Home", "Hospitals", "Hotels", "Interior Designer", "Office", "Paint Contractors", 
//   "Paint Dealers", "Paint shop", "Partner", "Pre Fabrication", "Purchase", 
//   "Raw Material", "School", "Society", "Solar panel", "Vendor", "Others"
// ].sort();


// // --- Type Definitions ---
// interface ContactData {
//   id: string;
//   name: string;
//   designation: string;
//   company: string;
//   phoneNumbers: string[];
//   emails: string[];
//   websites: string[];
//   address: string;
//   imageBase64: string;
//   notes: string;
//   group: string;
//   whatsapp: string;
// }

// // Initialize Firebase
// let db: Firestore | undefined;
// let contactsCollectionRef: CollectionReference<DocumentData> | undefined;
// if (isFirebaseConfigured) {
//   try {
//     const app: FirebaseApp = initializeApp(firebaseConfig);
//     db = getFirestore(app);
//     contactsCollectionRef = collection(db, "visiting_cards");
//   } catch (e) {
//     console.error("Firebase initialization error:", (e as Error).message);
//   }
// }

// // --- App-specific Type Definitions ---
// type AppMode = 'single' | 'bulk' | 'chat';
// type BulkItemStatus = 'pending' | 'processing' | 'success' | 'error';
// type ChatRole = 'user' | 'model';

// interface BulkFileItem {
//   id: string;
//   file: File;
//   base64: string;
//   status: BulkItemStatus;
//   extractedData?: Partial<ContactData>;
//   error?: string;
// }

// interface ChatMessage {
//     role: ChatRole;
//     text: string;
// }

// type Part = { text: string } | { inlineData: { mimeType: string; data: string; } };

// interface BeforeInstallPromptEvent extends Event {
//   prompt: () => Promise<void>;
//   userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
// }

// // --- Standalone UI Components (Memoized for performance) ---

// const ActionPanel = React.memo(({
//     extractedData,
//     ...props
// }: any) => {
//     if (extractedData) return <VerificationForm extractedData={extractedData} {...props} />;
    
//     return (
//        <div className="card">
//           <div className="tabs">
//             <button className={`tab ${props.mode === 'single' ? 'active' : ''}`} onClick={() => props.setMode('single')}>Single Card</button>
//             <button className={`tab ${props.mode === 'bulk' ? 'active' : ''}`} onClick={() => props.setMode('bulk')}>Bulk Upload</button>
//             <button className={`tab ${props.mode === 'chat' ? 'active' : ''}`} onClick={() => props.setMode('chat')}>AI Assistant</button>
//           </div>
//           <input type="file" ref={props.fileInputRef} onChange={props.handleFileChange} accept="image/*" multiple={props.mode === 'bulk'} style={{display: 'none'}}/>
          
//           {props.mode === 'single' && <SingleCardUI {...props} />}
//           {props.mode === 'bulk' && <BulkUploadUI {...props} />}
//           {props.mode === 'chat' && <ChatUI {...props} />}
//       </div>
//     );
// });

// const VerificationForm = React.memo(({ extractedData, ...props }: any) => (
//     <div className="card">
//       <h2 className="card-title">{'id' in extractedData ? 'Edit Contact' : 'Verify & Save Contact'}</h2>
//       <div className="form-grid">
//         {renderField("Name", "name", extractedData, props.handleDataChange)}
//         {renderField("Designation", "designation", extractedData, props.handleDataChange)}
//         {renderField("Company", "company", extractedData, props.handleDataChange)}
//         {renderGroupDropdown("Group", "group", extractedData, props.handleDataChange)}
//         {renderField("WhatsApp Number", "whatsapp", extractedData, props.handleDataChange)}
//         {renderArrayField("Phone Numbers", "phoneNumbers", extractedData, props.handleDataChange, props.handleArrayDataChange)}
//         {renderArrayField("Emails", "emails", extractedData, props.handleDataChange, props.handleArrayDataChange)}
//         {renderArrayField("Websites", "websites", extractedData, props.handleDataChange, props.handleArrayDataChange)}
//         {renderField("Address", "address", extractedData, props.handleDataChange, true)}
//         {renderField("Notes", "notes", extractedData, props.handleDataChange, true)}
//       </div>
//       <div className="actions-row">
//         <button onClick={props.handleSave} disabled={props.isLoading} className="btn-primary">Save Contact</button>
//         <button onClick={props.resetState} className="btn-cancel">Cancel</button>
//       </div>
//     </div>
// ));

// const SingleCardUI = React.memo((props: any) => {
//     const isCameraSupported = window.isSecureContext;
//     return (
//     <>
//       {!props.frontImageBase64 ? (
//         <div onClick={() => props.fileInputRef.current?.click()} className="upload-box">
//           <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15l4-4c.928-.893 2.072-.893 3 0l4 4"/><path d="M14 14l1-1c.928-.893 2.072-.893 3 0l2 2"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"/></svg>
//           <p><span>Upload Card Image</span> or use camera</p>
//           <p className="upload-box-subtitle">PNG, JPG, GIF up to 10MB</p>
//         </div>
//       ) : (
//         <div className="image-previews">
//           <div className="preview-container">
//             <img src={`data:image/jpeg;base64,${props.frontImageBase64}`} alt="Front Preview" />
//             <p>Front / Profile</p>
//           </div>
//           <div className="preview-container">
//             {props.backImageBase64 ? <img src={`data:image/jpeg;base64,${props.backImageBase64}`} alt="Back Preview"/> :
//             ( <div onClick={() => props.fileInputRef.current?.click()} className="upload-box-small">
//                 <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
//                 <p>Add back side</p>
//               </div>
//             )}
//           </div>
//         </div>
//       )}
//       <div className="actions-row">
//         <button onClick={() => props.frontImageBase64 && props.processCardImages(props.frontImageBase64, props.backImageBase64)} disabled={props.isLoading || !props.frontImageBase64} className="btn-primary">Process Card</button>
//         <button 
//             onClick={() => props.openCamera(props.frontImageBase64 ? 'back' : 'front')} 
//             disabled={props.isLoading || (!!props.frontImageBase64 && !!props.backImageBase64) || !isCameraSupported} 
//             className="btn-secondary"
//             title={!isCameraSupported ? "Camera requires a secure (HTTPS) connection" : "Use your device's camera"}
//         >
//             Use Camera
//         </button>
//       </div>
//     </>
// )});

// const BulkUploadUI = React.memo((props: any) => (
//     <>
//         <div className="actions-row">
//             <button onClick={() => props.fileInputRef.current?.click()} disabled={props.isLoading} className="btn-primary">Upload Multiple Cards</button>
//             <button onClick={() => props.openCamera('bulk')} disabled={props.isLoading} className="btn-secondary">Use Camera</button>
//         </div>
//         {props.bulkItems.length > 0 && (
//             <div className="bulk-list">
//                 <ul>
//                     {props.bulkItems.map((item: any) => (
//                         <li key={item.id} className="bulk-item">
//                             <span className="bulk-item-name">{item.file.name}</span>
//                             <span className={`status-badge status-${item.status}`}>{item.status}</span>
//                         </li>
//                     ))}
//                 </ul>
//                 <div className="actions-row">
//                    <button onClick={props.saveAllBulk} disabled={props.isLoading || props.bulkItems.every((i: any) => i.status !== 'success')} className="btn-primary">Save All Successful</button>
//                 </div>
//             </div>
//         )}
//     </>
// ));
  
// const ChatUI = React.memo(({ chatHistory, isChatLoading, chatInput, setChatInput, handleCommandSubmit, chatDisplayRef }: any) => (
//     <div className="chat-container">
//        <div className="chat-display" ref={chatDisplayRef}>
//            {chatHistory.length === 0 ? (
//              <div className="chat-placeholder">
//                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
//                  <p>Ask anything about your contacts!</p>
//                  <p className="chat-placeholder-subtitle">e.g., "Who works at Google?"</p>
//              </div>
//            ) : chatHistory.map((msg: any, index: number) => (
//                <div key={index} className={`chat-message ${msg.role === 'user' ? 'user' : 'model'}`}>
//                     <p>{msg.text}</p>
//                </div>
//            ))}
//            {isChatLoading && chatHistory[chatHistory.length - 1]?.role === 'model' && <div className="chat-message model"><span className="typing-indicator"></span></div>}
//        </div>
//        <form onSubmit={(e) => { e.preventDefault(); handleCommandSubmit(); }} className="chat-form">
//            <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Ask the AI assistant..." disabled={isChatLoading} />
//            <button type="submit" disabled={isChatLoading || !chatInput.trim()}>
//              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
//            </button>
//        </form>
//    </div>
// ));
  
// const renderField = (label: string, field: string, extractedData: any, handleDataChange: any, isTextArea = false) => {
//      const commonProps = {
//         id: field,
//         value: (extractedData?.[field] || ''),
//         onChange: (e: any) => handleDataChange(field, e.target.value),
//      };
//      return (
//      <div className={`form-group ${isTextArea ? 'full-width' : ''}`}>
//       <label htmlFor={field}>{label}</label>
//       {isTextArea ? <textarea {...commonProps} rows={3} /> : <input type="text" {...commonProps} />}
//     </div>
//   )};

// const renderGroupDropdown = (label: string, field: string, extractedData: any, handleDataChange: any) => (
//     <div className="form-group">
//         <label htmlFor={field}>{label}</label>
//         <select
//             id={field}
//             value={extractedData?.[field] || ''}
//             onChange={(e) => handleDataChange(field, e.target.value)}
//         >
//             <option value="" disabled>Select a group</option>
//             {groupOptions.map(option => (
//                 <option key={option} value={option}>{option}</option>
//             ))}
//         </select>
//     </div>
// );

// const renderArrayField = (label: string, field: string, extractedData: any, handleDataChange: any, handleArrayDataChange: any) => (
//     <div className="form-group full-width">
//       <label>{label}</label>
//       {(extractedData?.[field] || []).map((item: string, index: number) => (
//          <input key={index} type="text" value={item} onChange={(e) => handleArrayDataChange(field, index, e.target.value)} />
//       ))}
//        <button onClick={() => handleDataChange(field, [...(extractedData?.[field] || []), ''])} className="btn-add-field">+ Add {label.slice(0,-1)}</button>
//     </div>
// );

// // --- Main App Component ---
// const App = () => {
//   // --- State Management ---
//   const [mode, setMode] = useState<AppMode>('single');
//   const [savedContacts, setSavedContacts] = useState<ContactData[]>([]);
//   const [isLoading, setIsLoading] = useState(false);
//   const [isExporting, setIsExporting] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [frontImageBase64, setFrontImageBase64] = useState<string | null>(null);
//   const [backImageBase64, setBackImageBase64] = useState<string | null>(null);
//   const [extractedData, setExtractedData] = useState<Partial<ContactData> | null>(null);
//   const [isCameraOpen, setIsCameraOpen] = useState(false);
//   const [cameraFor, setCameraFor] = useState<'front' | 'back' | 'bulk'>('front');
//   const [isCameraReady, setIsCameraReady] = useState(false);
//   const [bulkItems, setBulkItems] = useState<BulkFileItem[]>([]);
//   const [chatInput, setChatInput] = useState('');
//   const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
//   const [isChatLoading, setIsChatLoading] = useState(false);
//   const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
//   const [focusBox, setFocusBox] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

//   // --- PAGINATION STATE ---
//   const [currentPage, setCurrentPage] = useState(1);
//   const itemsPerPage = 5; // Change this number to show more/less per page

//   // --- Refs ---
//   const fileInputRef = useRef<HTMLInputElement>(null);
//   const videoRef = useRef<HTMLVideoElement>(null);
//   const chatDisplayRef = useRef<HTMLDivElement>(null);
//   const focusBoxRef = useRef<HTMLDivElement>(null);

//   // --- Effects ---
//   useEffect(() => {
//     const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
//       e.preventDefault();
//       setDeferredPrompt(e);
//     };
//     window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
//     return () => {
//       window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
//     };
//   }, []);

//   useEffect(() => {
//     if (chatDisplayRef.current) {
//         chatDisplayRef.current.scrollTop = chatDisplayRef.current.scrollHeight;
//     }
//   }, [chatHistory]);

//   const fetchContacts = useCallback(async () => {
//     if (!contactsCollectionRef) return;
//     setIsLoading(true);
//     try {
//       const q = query(contactsCollectionRef, orderBy("createdAt", "desc"));
//       const data = await getDocs(q);
//       const contacts = data.docs.map(doc => ({ id: doc.id, ...doc.data() } as ContactData));
//       setSavedContacts(contacts);
//     } catch (e) {
//        const err = e as Error;
//        console.error("Failed to load contacts:", err.message);
//        setError("Could not load saved contacts.");
//     }
//     setIsLoading(false);
//   }, []);

//   useEffect(() => {
//     if(isFirebaseConfigured) {
//         fetchContacts();
//     }
//   }, [fetchContacts]);

//   // --- Camera Lifecycle Effect ---
//   useEffect(() => {
//     let stream: MediaStream | null = null;
//     const videoNode = videoRef.current;

//     const setupCamera = async () => {
//         if (!isCameraOpen || !videoNode) return;

//         setIsCameraReady(false);
//         if (!window.isSecureContext) {
//             setError("Camera access requires a secure connection (HTTPS).");
//             setIsCameraOpen(false);
//             return;
//         }

//         try {
//             stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
//             videoNode.srcObject = stream;
//         } catch (err) {
//             if (err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "PermissionDeniedError")) {
//                 setError("Camera permission was denied. Please enable it in your browser settings.");
//             } else {
//                 setError("Could not access the camera. It might be in use by another app.");
//             }
//             console.error("Camera access error:", err);
//             setIsCameraOpen(false);
//         }
//     };

//     setupCamera();

//     // Cleanup function
//     return () => {
//         if (stream) {
//             stream.getTracks().forEach(track => track.stop());
//         }
//     };
//   }, [isCameraOpen]);

//   const updateFocusBox = () => {
//     if (!videoRef.current) return;
//     const CARD_RATIO = 1.586; // standard business card aspect ratio
//     const vw = videoRef.current.videoWidth;
//     const vh = videoRef.current.videoHeight;
//     let width = vw * 0.8;
//     let height = width / CARD_RATIO;
//     if (height > vh * 0.8) {
//       height = vh * 0.8;
//       width = height * CARD_RATIO;
//     }
//     setFocusBox({ width, height });
//   };

//   useEffect(() => {
//     if (!isCameraOpen) return;
//     const handleResize = () => updateFocusBox();
//     window.addEventListener('resize', handleResize);
//     updateFocusBox();
//     return () => window.removeEventListener('resize', handleResize);
//   }, [isCameraOpen]);

//   const handleCanPlay = () => {
//     if(videoRef.current) {
//         videoRef.current.play().then(() => {
//             setIsCameraReady(true);
//             updateFocusBox();
//         }).catch(err => {
//             console.error("Video play failed:", err);
//             setError("Could not start camera stream.");
//             setIsCameraOpen(false);
//         });
//     }
//   };

//   // --- Helper Functions ---
//   const handleInstallClick = async () => {
//     if (deferredPrompt) {
//       deferredPrompt.prompt();
//       const { outcome } = await deferredPrompt.userChoice;
//       if (outcome === 'accepted') {
//         console.log('User accepted the install prompt');
//       }
//       setDeferredPrompt(null);
//     }
//   };

//   const resetState = () => {
//     setFrontImageBase64(null);
//     setBackImageBase64(null);
//     setExtractedData(null);
//     setBulkItems([]);
//     setError(null);
//     setIsLoading(false);
//     setMode('single');
//   };

//   const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
//     const files = event.target.files;
//     if (!files || files.length === 0) return;
    
//     const processFile = (file: File, isBulk: boolean) => {
//         const reader = new FileReader();
//         reader.onloadend = () => {
//             const base64String = (reader.result as string).split(",")[1];
//             if (isBulk) {
//                 const newItem: BulkFileItem = { id: `${file.name}-${Date.now()}`, file, base64: base64String, status: 'pending' };
//                 setBulkItems(prev => [...prev, newItem]);
//                 processCardImages(base64String, null, newItem.id);
//             } else {
//                  if (!frontImageBase64) setFrontImageBase64(base64String);
//                  else setBackImageBase64(base64String);
//             }
//         };
//         reader.readAsDataURL(file);
//     };

//     if (mode === 'bulk') {
//         Array.from(files).forEach(file => processFile(file, true));
//     } else {
//         processFile(files[0], false);
//     }
//     if(fileInputRef.current) fileInputRef.current.value = '';
//   };
  
//   const openCamera = (forSide: 'front' | 'back' | 'bulk') => {
//     setCameraFor(forSide);
//     setIsCameraOpen(true);
//   };

//   const closeCamera = () => {
//     setIsCameraOpen(false);
//   };
  
//   const takeSnapshot = () => {
//     if (!videoRef.current || !isCameraReady || videoRef.current.videoWidth === 0) {
//         setError("Camera is not ready yet.");
//         return;
//     }

//     const video = videoRef.current;
    
//     const videoRect = video.getBoundingClientRect();
//     const boxRect = focusBoxRef.current?.getBoundingClientRect();

//     if (!boxRect) return;

//     // Scale Logic
//     const scaleX = video.videoWidth / videoRect.width;
//     const scaleY = video.videoHeight / videoRect.height;

//     // Calculate Crop
//     const cropX = (boxRect.left - videoRect.left) * scaleX;
//     const cropY = (boxRect.top - videoRect.top) * scaleY;
//     const cropWidth = boxRect.width * scaleX;
//     const cropHeight = boxRect.height * scaleY;

//     const canvas = document.createElement("canvas");
//     canvas.width = cropWidth;
//     canvas.height = cropHeight;
//     const ctx = canvas.getContext('2d');

//     const base64ToFile = (b64: string, filename: string): File => {
//         const byteString = atob(b64);
//         const ab = new ArrayBuffer(byteString.length);
//         const ia = new Uint8Array(ab);
//         for (let i = 0; i < byteString.length; i++) {
//             ia[i] = byteString.charCodeAt(i);
//         }
//         return new File([ia], filename, { type: 'image/jpeg' });
//     };

//     if (ctx) {
//         ctx.drawImage(
//             video, 
//             cropX, cropY, cropWidth, cropHeight, 
//             0, 0, cropWidth, cropHeight          
//         );
        
//         const dataUrl = canvas.toDataURL('image/jpeg');
//         const base64String = dataUrl.split(',')[1];
        
//         // Auto Download Cropped Image
//         const downloadLink = document.createElement('a');
//         downloadLink.href = dataUrl;
//         downloadLink.download = `cropped_card_${Date.now()}.jpg`;
//         document.body.appendChild(downloadLink);
//         downloadLink.click();
//         document.body.removeChild(downloadLink);

//         if(cameraFor === 'bulk') {
//             const filename = `camera-${Date.now()}.jpg`;
//             const file = base64ToFile(base64String, filename);
//             const newItem: BulkFileItem = { id: `${filename}-${Date.now()}`, file, base64: base64String, status: 'pending' };
//             setBulkItems(prev => [...prev, newItem]);
//             processCardImages(base64String, null, newItem.id);
//         } else if(cameraFor === 'front') {
//             setFrontImageBase64(base64String);
//         } else {
//             setBackImageBase64(base64String);
//         }
//         closeCamera();
//     } else {
//         setError("Could not process image from camera.");
//     }
//   };

//   const processCardImages = async (frontB64: string, backB64?: string | null, bulkItemId?: string) => {
//     if (!isAiConfigured || !API_KEY) {
//         setError("AI API Key is not configured.");
//         return;
//     }

//     if (bulkItemId) {
//         setBulkItems(prev => prev.map(item => item.id === bulkItemId ? { ...item, status: 'processing' } : item));
//     } else {
//         setIsLoading(true);
//         setExtractedData(null);
//     }
//     setError(null);

//     try {
//         const { GoogleGenerativeAI } = await import("@google/generative-ai");

//         const genAI = new GoogleGenerativeAI(API_KEY);
//         const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
//         const parts: Part[] = [{ inlineData: { mimeType: 'image/jpeg', data: frontB64 } }];
//         if (backB64) parts.push({ inlineData: { mimeType: 'image/jpeg', data: backB64 } });
        
//         const promptText = `Analyze the business card image(s) and extract contact details. Return a single JSON object with keys: "name", "designation", "company", "phoneNumbers", "emails", "websites", "address", "whatsapp", "group", "notes". For the "group" field, categorize the contact based on their profession or company into one of the following options: ${groupOptions.join(', ')}. If no category fits, use "Others". If info is not found, use empty strings or arrays.`;
//         parts.push({ text: promptText });

//         const result = await model.generateContent({
//             contents: [{ role: "user", parts }],
//             generationConfig: { responseMimeType: "application/json" },
//         });
        
//         const parsedData = JSON.parse(result.response.text());

//         if (bulkItemId) {
//             setBulkItems(prev => prev.map(item => item.id === bulkItemId ? { ...item, status: 'success', extractedData: parsedData } : item));
//         } else {
//             setExtractedData(parsedData);
//         }
//     } catch (e) {
//         const err = e as Error;
//         console.error("Error processing card:", err.message);
//         const errorMsg = `Failed to process image. ${err.message || 'An unknown error occurred.'}`;
//         if (bulkItemId) {
//             setBulkItems(prev => prev.map(item => item.id === bulkItemId ? { ...item, status: 'error', error: errorMsg } : item));
//         } else {
//             setError(errorMsg);
//         }
//     } finally {
//         if (!bulkItemId) setIsLoading(false);
//     }
//   };

//   const handleDataChange = (field: keyof Omit<ContactData, 'id' | 'imageBase64'>, value: string | string[]) => {
//     setExtractedData(prev => prev ? ({ ...prev, [field]: value }) : null);
//   };

//   const handleArrayDataChange = (field: keyof Omit<ContactData, 'id' | 'imageBase64'>, index: number, value: string) => {
//     setExtractedData(prev => {
//         if (!prev) return null;
//         const currentArray = (prev[field] as string[]) || [];
//         const newArray = [...currentArray];
//         newArray[index] = value;
//         return { ...prev, [field]: newArray };
//     });
//   };
  
//   const saveContactToFirebase = async () => {
//     if (!db || !contactsCollectionRef || !extractedData || !frontImageBase64) {
//         setError("Cannot save contact. Check configuration and data.");
//         return;
//     }
//     setIsLoading(true);
//     const contactPayload = {
//       name: extractedData.name || "",
//       designation: extractedData.designation || "",
//       company: extractedData.company || "",
//       phoneNumbers: extractedData.phoneNumbers || [],
//       emails: extractedData.emails || [],
//       websites: extractedData.websites || [],
//       address: extractedData.address || "",
//       imageBase64: frontImageBase64,
//       notes: extractedData.notes || "",
//       group: extractedData.group || "",
//       whatsapp: extractedData.whatsapp || "",
//       createdAt: serverTimestamp(),
//     };

//       try {
//         if ('id' in extractedData && extractedData.id) {
//             await updateDoc(doc(db, "visiting_cards", extractedData.id), contactPayload);
//         } else {
//             await addDoc(contactsCollectionRef, contactPayload);
//         }
//         resetState();
//         fetchContacts();
//       } catch {
//         setError("Failed to save contact.");
//         setIsLoading(false);
//       }
//   };

//   const downloadVcf = (data: Partial<ContactData>, currentImage?: string | null) => {
//     const { name, designation, company, phoneNumbers, emails, websites, address, whatsapp } = data;
//     let vCard = "BEGIN:VCARD\nVERSION:3.0\n";
//     if (name) {
//         const nameParts = name.split(' ');
//         const lastName = nameParts.pop() || '';
//         const firstName = nameParts.join(' ');
//         vCard += `FN:${name}\n`;
//         vCard += `N:${lastName};${firstName};;;\n`;
//     }
//     if (company) vCard += `ORG:${company}\n`;
//     if (designation) vCard += `TITLE:${designation}\n`;
//     if (phoneNumbers) phoneNumbers.forEach((p, i) => { vCard += `TEL;TYPE=WORK,VOICE${i === 0 ? ',PREF' : ''}:${p}\n`; });
//     if (whatsapp) vCard += `TEL;TYPE=CELL,WHATSAPP:${whatsapp}\n`;
//     if (emails) emails.forEach(e => { vCard += `EMAIL:${e}\n`; });
//     if (websites) websites.forEach(w => { vCard += `URL:${w}\n`; });
//     if (address) vCard += `ADR;TYPE=WORK:;;${address.replace(/\n/g, '\\n')};;;;\n`;
//     if (currentImage) {
//         vCard += `PHOTO;ENCODING=b;TYPE=JPEG:${currentImage.replace(/\s/g, '')}\n`;
//     }
//     vCard += "END:VCARD";

//     const blob = new Blob([vCard], { type: "text/vcard;charset=utf-8" });
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement("a");
//     a.href = url;
//     a.download = (name?.replace(/\s/g, '_') || 'contact') + '.vcf';
//     document.body.appendChild(a);
//     a.click();
//     document.body.removeChild(a);
//     URL.revokeObjectURL(url);
//   };
  
//   const handleSave = () => {
//       if (extractedData) {
//           downloadVcf(extractedData, frontImageBase64);
//           saveContactToFirebase();
//       }
//   };

//   const downloadContactsAsExcel = async () => {
//     if (savedContacts.length === 0) {
//         setError("No contacts available to export yet.");
//         return;
//     }

//     setError(null);
//     setIsExporting(true);
//     try {
//         const { Workbook } = await import('exceljs');
//         const workbook = new Workbook();
//         const worksheet = workbook.addWorksheet('Contacts');

//         worksheet.columns = [
//             { header: 'Photo', key: 'photo', width: 18 },
//             { header: 'Name', key: 'name', width: 25 },
//             { header: 'Designation', key: 'designation', width: 22 },
//             { header: 'Company', key: 'company', width: 25 },
//             { header: 'Phone Numbers', key: 'phones', width: 24 },
//             { header: 'WhatsApp', key: 'whatsapp', width: 18 },
//             { header: 'Emails', key: 'emails', width: 28 },
//             { header: 'Websites', key: 'websites', width: 28 },
//             { header: 'Group', key: 'group', width: 18 },
//             { header: 'Address', key: 'address', width: 36 },
//             { header: 'Notes', key: 'notes', width: 36 },
//         ];
//         worksheet.getRow(1).font = { bold: true };

//         savedContacts.forEach((contact) => {
//             const row = worksheet.addRow({
//                 photo: '',
//                 name: contact.name || '',
//                 designation: contact.designation || '',
//                 company: contact.company || '',
//                 phones: (contact.phoneNumbers || []).join(', '),
//                 whatsapp: contact.whatsapp || '',
//                 emails: (contact.emails || []).join(', '),
//                 websites: (contact.websites || []).join(', '),
//                 group: contact.group || '',
//                 address: contact.address || '',
//                 notes: contact.notes || '',
//             });
//             row.alignment = { vertical: 'top', wrapText: true };
//             if (contact.imageBase64) {
//                 const imageId = workbook.addImage({
//                     base64: contact.imageBase64,
//                     extension: 'jpeg',
//                 });
//                 const rowIndex = row.number;
//                 worksheet.getRow(rowIndex).height = 90;
//                 worksheet.addImage(imageId, `A${rowIndex}:A${rowIndex}`);
//             }
//         });

//         const buffer = await workbook.xlsx.writeBuffer();
//         const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
//         const url = URL.createObjectURL(blob);
//         const link = document.createElement('a');
//         link.href = url;
//         link.download = `contacts-${new Date().toISOString().split('T')[0]}.xlsx`;
//         document.body.appendChild(link);
//         link.click();
//         document.body.removeChild(link);
//         URL.revokeObjectURL(url);
//     } catch (err) {
//         console.error('Failed to export contacts:', err);
//         setError("Could not export contacts. Please try again.");
//     } finally {
//         setIsExporting(false);
//     }
//   };

//   const saveAllBulk = async () => {
//     if (!db || !contactsCollectionRef) return;
//     const successfulItems = bulkItems.filter(item => item.status === 'success' && item.extractedData);
//     if(successfulItems.length === 0) return;

//     setIsLoading(true);
//     let successCount = 0;
//     for (const item of successfulItems) {
//         if(item.extractedData){
//             try {
//                 const payload = { ...item.extractedData, imageBase64: item.base64, createdAt: serverTimestamp() };
//                 await addDoc(contactsCollectionRef, payload);
//                 successCount++;
//            } catch (e) { console.error(`Failed to save ${item.file.name}:`, (e as Error).message); }
//         }
//     }
//     alert(`${successCount} of ${successfulItems.length} contacts saved.`);
//     resetState();
//     fetchContacts();
//   }

//   const deleteContact = async (id: string) => {
//     if (!db) return;
//       if (window.confirm("Are you sure you want to delete this contact?")) {
//           try {
//               await deleteDoc(doc(db, "visiting_cards", id));
//               if(extractedData && (extractedData as ContactData).id === id) resetState();
//               fetchContacts();
//           } catch {
//               setError("Failed to delete contact.");
//           }
//       }
//   };

//   const editContact = (contact: ContactData) => {
//     setExtractedData(contact);
//     setFrontImageBase64(contact.imageBase64);
//     setBackImageBase64(null);
//     setMode('single');
//     window.scrollTo({ top: 0, behavior: 'smooth' });
//   };

//   const handleCommandSubmit = async () => {
//     if (!chatInput.trim() || isChatLoading || !isAiConfigured || !API_KEY) return;
//     const userMessage: ChatMessage = { role: 'user', text: chatInput.trim() };
//     setChatHistory(prev => [...prev, userMessage, { role: 'model', text: '' }]);
//     setChatInput("");
//     setIsChatLoading(true);
    
//     try {
//         const { GoogleGenerativeAI } = await import("@google/generative-ai");
        
//         const genAI = new GoogleGenerativeAI(API_KEY);
//         const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
//         const contactsJson = JSON.stringify(savedContacts.map(c => ({ name: c.name, designation: c.designation, company: c.company, phoneNumbers: c.phoneNumbers, emails: c.emails, group: c.group })));
//         const prompt = `You are an AI assistant for a business card app. Answer questions about the user's saved contacts based STRICTLY on this JSON data. If info isn't present, say so. Keep answers concise. Contact data: ${contactsJson}\n\nUser question: ${userMessage.text}`;
//         const result = await model.generateContent(prompt);
//         const fullResponse = result.response.text();
//         setChatHistory(prev => {
//             const newHistory = [...prev];
//             newHistory[newHistory.length - 1] = { role: 'model', text: fullResponse };
//             return newHistory;
//         });
//     } catch (err) {
//         const errorMsg = `Sorry, an error occurred: ${(err as Error).message}`;
//         setChatHistory(prev => {
//             const newHistory = [...prev];
//             newHistory[newHistory.length - 1] = { role: 'model', text: errorMsg };
//             return newHistory;
//         });
//     } finally {
//         setIsChatLoading(false);
//     }
//   };

//   // --- PAGINATION HELPERS ---
//   const indexOfLastItem = currentPage * itemsPerPage;
//   const indexOfFirstItem = indexOfLastItem - itemsPerPage;
//   const currentContacts = savedContacts.slice(indexOfFirstItem, indexOfLastItem);
//   const totalPages = Math.ceil(savedContacts.length / itemsPerPage);

//   const goToNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
//   const goToPrevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));


//   if (!isFirebaseConfigured || !isAiConfigured) {
//       return (
//         <div className="config-error-container">
//             <div className="config-error-box">
//               <h2>Configuration Error</h2>
//               <p>Please make sure your Firebase and Google AI API keys are correctly set up in your environment variables.</p>
//               {!isFirebaseConfigured && <p className="error-highlight">Firebase configuration is INCOMPLETE.</p>}
//               {!isAiConfigured && <p className="error-highlight">Google AI API Key is MISSING.</p>}
//             </div>
//         </div>
//       )
//   }

//   const componentProps = {
//       mode, setMode,
//       isLoading,
//       extractedData,
//       frontImageBase64,
//       backImageBase64,
//       fileInputRef,
//       handleFileChange,
//       processCardImages,
//       openCamera,
//       bulkItems,
//       saveAllBulk,
//       chatHistory,
//       isChatLoading,
//       chatInput,
//       setChatInput,
//       handleCommandSubmit,
//       chatDisplayRef,
//       handleDataChange,
//       handleArrayDataChange,
//       handleSave,
//       resetState,
//   };

//   return (
//     <>
//     <style>{`
//       /* --- MODERN UI THEME --- */
//       :root {
//         --font-main: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
//         --c-bg: #f0f2f5;
//         --c-surface: #ffffff;
//         --c-primary: #6366f1; /* Indigo-500 */
//         --c-primary-dark: #4f46e5;
//         --c-text-main: #1f2937;
//         --c-text-sec: #6b7280;
//         --c-border: #e5e7eb;
//         --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
//         --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
//         --radius: 12px;
//       }

//       * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
      
//       body {
//         background-color: var(--c-bg);
//         color: var(--c-text-main);
//         font-family: var(--font-main);
//         -webkit-font-smoothing: antialiased;
//         width: 100%;
//         overflow-x: hidden;
//       }

//       /* --- LAYOUT CONTAINER --- */
//       .app-container {
//         display: flex;
//         flex-direction: column;
//         min-height: 100vh;
//         max-width: 100%;
//         overflow-x: hidden;
//       }

//       /* --- HEADER --- */
//       .app-header {
//         position: sticky;
//         top: 0;
//         z-index: 50;
//         background: rgba(255, 255, 255, 0.9);
//         backdrop-filter: blur(10px);
//         border-bottom: 1px solid rgba(0,0,0,0.05);
//         padding: 0.8rem 1.2rem;
//         display: flex;
//         align-items: center;
//         justify-content: space-between;
//         box-shadow: var(--shadow-sm);
//       }

//       .header-title { display: flex; align-items: center; gap: 0.75rem; }
//       .header-title img { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; }
//       .header-title h1 { font-size: 1.15rem; font-weight: 700; color: var(--c-text-main); letter-spacing: -0.025em; }

//       /* --- DASHBOARD --- */
//       .dashboard {
//         flex: 1;
//         width: 100%;
//         max-width: 600px;
//         margin: 0 auto;
//         padding: 1.5rem 1rem;
//         display: flex;
//         flex-direction: column;
//         gap: 1.5rem;
//       }

//       /* --- CARDS --- */
//       .card {
//         background: var(--c-surface);
//         border-radius: var(--radius);
//         box-shadow: var(--shadow-md);
//         padding: 1.5rem;
//         border: 1px solid var(--c-border);
//         transition: transform 0.2s;
//         width: 100%;
//         min-width: 0;
//         overflow: hidden;
//       }

//       .card-title {
//         font-size: 1.1rem;
//         font-weight: 700;
//         color: var(--c-text-main);
//         margin-bottom: 1rem;
//         display: flex;
//         align-items: center;
//         justify-content: space-between;
//       }

//       /* --- TABS --- */
//       .tabs {
//         display: flex;
//         background: #f3f4f6;
//         padding: 0.25rem;
//         border-radius: 10px;
//         margin-bottom: 1.5rem;
//       }
//       .tab {
//         flex: 1;
//         text-align: center;
//         padding: 0.5rem;
//         font-size: 0.9rem;
//         font-weight: 600;
//         color: var(--c-text-sec);
//         border-radius: 8px;
//         border: none;
//         background: transparent;
//         cursor: pointer;
//         transition: all 0.2s ease;
//       }
//       .tab.active {
//         background: white;
//         color: var(--c-primary);
//         box-shadow: var(--shadow-sm);
//       }

//       /* --- UPLOAD BOX --- */
//       .upload-box {
//         border: 2px dashed #d1d5db;
//         border-radius: var(--radius);
//         padding: 2.5rem 1rem;
//         text-align: center;
//         cursor: pointer;
//         transition: all 0.2s;
//         background: #f9fafb;
//       }
//       .upload-box:active { transform: scale(0.98); background: #f3f4f6; }
//       .upload-box svg { color: var(--c-text-sec); margin-bottom: 0.5rem; }
//       .upload-box p span { color: var(--c-primary); font-weight: 600; }

//       /* --- INPUTS --- */
//       .form-group label {
//         display: block;
//         font-size: 0.85rem;
//         font-weight: 600;
//         color: var(--c-text-sec);
//         margin-bottom: 0.4rem;
//         margin-top: 0.8rem;
//       }
//       input, select, textarea {
//         width: 100%;
//         padding: 0.75rem;
//         border: 1px solid var(--c-border);
//         border-radius: 8px;
//         font-size: 1rem;
//         background: #fff;
//         transition: border-color 0.2s, box-shadow 0.2s;
//       }
//       input:focus, select:focus, textarea:focus {
//         outline: none;
//         border-color: var(--c-primary);
//         box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
//       }

//       /* --- BUTTONS --- */
//       button {
//         display: inline-flex;
//         align-items: center;
//         justify-content: center;
//         padding: 0.75rem 1.25rem;
//         font-size: 0.95rem;
//         font-weight: 600;
//         border-radius: 10px;
//         border: none;
//         cursor: pointer;
//         transition: transform 0.1s, opacity 0.2s;
//         gap: 0.5rem;
//       }
//       button:active { transform: scale(0.97); }
      
//       .btn-primary {
//         background: linear-gradient(135deg, var(--c-primary) 0%, var(--c-primary-dark) 100%);
//         color: white;
//         box-shadow: 0 4px 6px rgba(79, 70, 229, 0.3);
//         width: 100%;
//       }
//       .btn-secondary {
//         background: white;
//         color: var(--c-text-main);
//         border: 1px solid var(--c-border);
//         width: 100%;
//       }
//       .actions-row { display: flex; flex-direction: column; gap: 0.8rem; margin-top: 1.5rem; }
//       @media (min-width: 640px) { .actions-row { flex-direction: row; } }

//       /* --- CONTACT LIST --- */
//       .contact-list { display: flex; flex-direction: column; gap: 0.8rem; }
//       .contact-list-item {
//         display: flex;
//         align-items: center;
//         justify-content: space-between;
//         padding: 0.8rem;
//         background: white;
//         border-radius: 10px;
//         border: 1px solid var(--c-border);
//         box-shadow: var(--shadow-sm);
//         width: 100%;
//       }
//       .contact-info { display: flex; align-items: center; gap: 1rem; min-width: 0; flex: 1; }
//       .contact-info img {
//         width: 42px; height: 42px;
//         border-radius: 50%;
//         object-fit: cover;
//         border: 2px solid white;
//         box-shadow: 0 2px 4px rgba(0,0,0,0.1);
//         flex-shrink: 0;
//       }
//       .contact-info-text { display: flex; flex-direction: column; min-width: 0; }
//       .contact-info-text h3 { font-size: 0.95rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
//       .contact-info-text p { font-size: 0.8rem; color: var(--c-text-sec); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
//       .delete-btn { color: #ef4444; padding: 0.5rem; background: transparent; width: auto; }

//       /* --- PAGINATION CONTROLS --- */
//       .pagination {
//         display: flex;
//         justify-content: center;
//         align-items: center;
//         gap: 1rem;
//         margin-top: 1.5rem;
//       }
//       .pagination button {
//         background: white;
//         border: 1px solid var(--c-border);
//         padding: 0.5rem 1rem;
//         width: auto;
//       }
//       .pagination button:disabled { opacity: 0.5; cursor: not-allowed; }
//       .pagination span { font-size: 0.9rem; color: var(--c-text-sec); font-weight: 500; }

//       /* --- CAMERA OVERLAY --- */
//       .video-container {
//         position: fixed; top: 0; left: 0; width: 100%; height: 100%;
//         background: black; z-index: 100;
//         display: flex; flex-direction: column;
//       }
//       .video-wrapper { flex: 1; position: relative; overflow: hidden; }
//       .video-container video { width: 100%; height: 100%; object-fit: cover; }
      
//       .focus-box {
//         position: absolute; top: 50%; left: 50%;
//         transform: translate(-50%, -50%);
//         border: 2px solid white;
//         border-radius: 12px;
//         box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.6);
//         z-index: 10;
//       }
//       .focus-box::after {
//         content: "Align card here";
//         position: absolute; bottom: -30px; left: 0; width: 100%;
//         text-align: center; color: white; font-weight: 600; font-size: 0.9rem;
//         text-shadow: 0 2px 4px rgba(0,0,0,0.5);
//       }

//       .video-controls {
//         position: absolute; bottom: 0; left: 0; width: 100%;
//         padding: 2rem;
//         background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
//         display: flex; justify-content: center; gap: 2rem;
//         z-index: 20;
//       }
//       .video-controls button {
//         border-radius: 50px;
//         padding: 0.8rem 2rem;
//         font-size: 1rem;
//         text-transform: uppercase;
//         letter-spacing: 0.05em;
//         width: auto;
//       }
//       .btn-capture { background: white; color: black; font-weight: 800; }
//       .btn-close-cam { background: rgba(255,255,255,0.2); color: white; backdrop-filter: blur(4px); }

//       /* --- UTILS --- */
//       .loading-overlay { 
//         position: fixed; inset: 0; background: rgba(255,255,255,0.8); backdrop-filter: blur(5px);
//         z-index: 99; display: flex; flex-direction: column; align-items: center; justify-content: center; 
//       }
//       .spinner { 
//         width: 3rem; height: 3rem; 
//         border: 4px solid #e5e7eb; border-top-color: var(--c-primary); 
//         border-radius: 50%; animation: spin 0.8s linear infinite; 
//       }
//       @keyframes spin { to { transform: rotate(360deg); } }
//       .notification { position: fixed; bottom: 1rem; left: 1rem; right: 1rem; background: #334155; color: white; padding: 1rem; border-radius: 0.5rem; z-index: 100; text-align: center; }
//       .app-footer { text-align: center; padding: 2rem; color: #9ca3af; font-size: 0.8rem; width: 100%; }
//     `}</style>
//     <div className="app-container">
//       <header className="app-header">
//         <div className="header-title">
//             <img src={logo} alt="App Logo" />
//             <h1>AI Card Scanner</h1>
//         </div>
//         {deferredPrompt && (
//             <button className="btn-install" onClick={handleInstallClick}>Install App</button>
//         )}
//       </header>
//       <main className="dashboard">
//         <div className="action-panel">
//           <ActionPanel extractedData={extractedData} {...componentProps} />
//         </div>
//         <div className="contact-list-panel">
//           <div className="card">
//             <div className="card-header">
//               <h2 className="card-title">Saved Contacts</h2>
//               <button
//                 onClick={downloadContactsAsExcel}
//                 disabled={isExporting || isLoading || savedContacts.length === 0}
//                 className="btn-secondary download-btn"
//               >
//                 {isExporting ? 'Preparing...' : 'Download Excel'}
//               </button>
//             </div>
            
//             <div className="contact-list">
//               {currentContacts.length === 0 && savedContacts.length > 0 ? (
//                  <p style={{textAlign: 'center', color: '#6b7280', padding: '1rem'}}>No contacts on this page.</p>
//               ) : currentContacts.map(contact => (
//                 <div key={contact.id} onClick={() => editContact(contact)} className="contact-list-item">
//                   <div className="contact-info">
//                     <img src={contact.imageBase64 ? `data:image/jpeg;base64,${contact.imageBase64}` : `https://placehold.co/100x100/e2e8f0/64748b?text=${contact.name.charAt(0)}`} alt={contact.name} />
//                     <div className="contact-info-text">
//                         <h3>{contact.name || 'No Name'}</h3>
//                         <p>{contact.company || 'No Company'}</p>
//                     </div>
//                   </div>
//                   <div className="contact-actions">
//                     <button onClick={(e) => { e.stopPropagation(); deleteContact(contact.id)}} title="Delete" className="delete-btn">
//                       <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
//                     </button>
//                   </div>
//                 </div>
//               ))}
//             </div>

//             {/* --- PAGINATION CONTROLS --- */}
//             {savedContacts.length > itemsPerPage && (
//                 <div className="pagination">
//                     <button onClick={goToPrevPage} disabled={currentPage === 1}>
//                         &larr; Prev
//                     </button>
//                     <span>Page {currentPage} of {totalPages}</span>
//                     <button onClick={goToNextPage} disabled={currentPage === totalPages}>
//                         Next &rarr;
//                     </button>
//                 </div>
//             )}

//           </div>
//         </div>
//       </main>
      
//       {isCameraOpen && (
//           <div className="video-container">
//               <div className="video-wrapper">
//                 <video ref={videoRef} autoPlay playsInline muted className="camera-view" onCanPlay={handleCanPlay} onClick={() => isCameraReady && takeSnapshot()}></video>
//                 <div ref={focusBoxRef} className="focus-box" style={{ width: `${focusBox.width}px`, height: `${focusBox.height}px` }}></div>
//                 {!isCameraReady && <div className="camera-loading-spinner"><div className="spinner"></div></div>}
//               </div>
//               <div className="video-controls">
//                  <button className="btn-capture" onClick={takeSnapshot} disabled={!isCameraReady}>Capture</button>
//                  <button className="btn-close-cam" onClick={closeCamera}>Cancel</button>
//               </div>
//           </div>
//       )}
//       {isLoading && !extractedData && (
//           <div className="loading-overlay">
//               <div className="spinner"></div>
//               <p style={{marginTop: '1rem', fontWeight: 600}}>Scanning your card...</p>
//           </div>
//       )}
//       {error && (
//         <div className="notification">
//             {error}
//             <button onClick={() => setError(null)} style={{ marginLeft: '1rem', background: 'none', border: 'none', color: 'white', fontWeight: 'bold' }}>X</button>
//         </div>
//       )}

//       <footer className="app-footer">
//         <p>© {new Date().getFullYear()} AI Card Scanner. All rights reserved.</p>
//       </footer>
//     </div>
//     </>
//   );
// };

// export default App;





import React, { useState, useRef, useEffect, useCallback } from "react";
// import { GoogleGenerativeAI } from "@google/generative-ai"; 

import type { FirebaseApp } from "firebase/app";
import { initializeApp } from "firebase/app";
import type { Firestore, CollectionReference, DocumentData } from "firebase/firestore";
import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, query } from "firebase/firestore";

// --- Asset Placeholder ---
const logo = 'https://placehold.co/100x100/4F46E5/ffffff?text=CS';

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const isFirebaseConfigured = !!firebaseConfig?.projectId;
const isAiConfigured = !!API_KEY;

const groupOptions = [
  "Architect", "Ashrams", "Builders", "Building Materials", "Car Detailing", 
  "Client", "Club", "Cold Storage", "Consumer", "Dairy", "Dealership/Partnership", 
  "Developer", "Export", "Export Partner", "Factory", "Family", "Friend", 
  "Govt Contractor", "Govt Deptt", "Green building", "Hardware", "Heat Insulation", 
  "Home", "Hospitals", "Hotels", "Interior Designer", "Office", "Paint Contractors", 
  "Paint Dealers", "Paint shop", "Partner", "Pre Fabrication", "Purchase", 
  "Raw Material", "School", "Society", "Solar panel", "Vendor", "Others"
].sort();

// --- TYPES ---
interface ContactData {
  id: string;
  name: string;
  designation: string;
  company: string;
  phoneNumbers: string[];
  emails: string[];
  websites: string[];
  address: string;
  imageBase64: string;
  notes: string;
  group: string;
  whatsapp: string;
  createdAt?: any;
}

// Initialize Firebase
let db: Firestore | undefined;
let contactsCollectionRef: CollectionReference<DocumentData> | undefined;

if (isFirebaseConfigured) {
  try {
    const app: FirebaseApp = initializeApp(firebaseConfig);
    db = getFirestore(app);
    contactsCollectionRef = collection(db, "visiting_cards");
  } catch (e) {
    console.error("Firebase initialization error:", (e as Error).message);
  }
}

type AppMode = 'single' | 'bulk' | 'chat';
type BulkItemStatus = 'pending' | 'processing' | 'success' | 'error';
type ChatRole = 'user' | 'model';

interface BulkFileItem {
  id: string;
  file: File;
  base64: string;
  status: BulkItemStatus;
  extractedData?: Partial<ContactData>;
  error?: string;
}

interface ChatMessage {
    role: ChatRole;
    text: string;
}

type Part = { text: string } | { inlineData: { mimeType: string; data: string; } };

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// --- IMAGE OPTIMIZER & BACKGROUND REMOVER ---
const processAndOptimizeImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = `data:image/jpeg;base64,${base64Str}`;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_SIZE = 1024;
            let width = img.width;
            let height = img.height;

            // Resize Logic
            if (width > height) {
                if (width > MAX_SIZE) {
                    height *= MAX_SIZE / width;
                    width = MAX_SIZE;
                }
            } else {
                if (height > MAX_SIZE) {
                    width *= MAX_SIZE / height;
                    height = MAX_SIZE;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);

                // --- AGGRESSIVE SCANNER FILTER ---
                const imageData = ctx.getImageData(0, 0, width, height);
                const data = imageData.data;
                
                const contrast = 1.4; 
                const brightness = 30; 
                const intercept = 128 * (1 - contrast);

                for (let i = 0; i < data.length; i += 4) {
                    let r = data[i] * contrast + intercept + brightness;
                    let g = data[i + 1] * contrast + intercept + brightness;
                    let b = data[i + 2] * contrast + intercept + brightness;

                    if (r > 180 && g > 180 && b > 180) { 
                        r = 255; g = 255; b = 255; 
                    }

                    data[i] = Math.min(255, Math.max(0, r));
                    data[i + 1] = Math.min(255, Math.max(0, g));
                    data[i + 2] = Math.min(255, Math.max(0, b));
                }
                ctx.putImageData(imageData, 0, 0);

                const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                resolve(dataUrl.split(',')[1]);
            } else {
                resolve(base64Str);
            }
        };
        img.onerror = () => resolve(base64Str);
    });
};

// --- COMPONENTS ---

const ActionPanel = React.memo(({ extractedData, ...props }: any) => {
    if (extractedData) return <VerificationForm extractedData={extractedData} {...props} />;
    return (
       <div className="card">
          <div className="tabs">
            <button className={`tab ${props.mode === 'single' ? 'active' : ''}`} onClick={() => props.setMode('single')}>Single Card</button>
            <button className={`tab ${props.mode === 'bulk' ? 'active' : ''}`} onClick={() => props.setMode('bulk')}>Bulk Upload</button>
            <button className={`tab ${props.mode === 'chat' ? 'active' : ''}`} onClick={() => props.setMode('chat')}>AI Assistant</button>
          </div>
          <input type="file" ref={props.fileInputRef} onChange={props.handleFileChange} accept="image/*" multiple={props.mode === 'bulk'} style={{display: 'none'}}/>
          
          {props.mode === 'single' && <SingleCardUI {...props} />}
          {props.mode === 'bulk' && <BulkUploadUI {...props} />}
          {props.mode === 'chat' && <ChatUI {...props} />}
      </div>
    );
});

const VerificationForm = React.memo(({ extractedData, ...props }: any) => (
    <div className="card">
      <h2 className="card-title">{'id' in extractedData ? 'Edit Contact' : 'Verify & Save Contact'}</h2>
      <div className="form-grid">
        {renderField("Name", "name", extractedData, props.handleDataChange)}
        {renderField("Designation", "designation", extractedData, props.handleDataChange)}
        {renderField("Company", "company", extractedData, props.handleDataChange)}
        {renderGroupDropdown("Group", "group", extractedData, props.handleDataChange)}
        {renderField("WhatsApp Number", "whatsapp", extractedData, props.handleDataChange)}
        {renderArrayField("Phone Numbers", "phoneNumbers", extractedData, props.handleDataChange, props.handleArrayDataChange)}
        {renderArrayField("Emails", "emails", extractedData, props.handleDataChange, props.handleArrayDataChange)}
        {renderArrayField("Websites", "websites", extractedData, props.handleDataChange, props.handleArrayDataChange)}
        {renderField("Address", "address", extractedData, props.handleDataChange, true)}
        {renderField("Notes", "notes", extractedData, props.handleDataChange, true)}
      </div>
      <div className="actions-row">
        <button onClick={props.handleSave} disabled={props.isLoading} className="btn-primary">Save Contact</button>
        <button onClick={props.resetState} className="btn-cancel">Cancel</button>
      </div>
    </div>
));

const SingleCardUI = React.memo((props: any) => {
    const isCameraSupported = window.isSecureContext;
    return (
    <>
      {!props.frontImageBase64 ? (
        <div onClick={() => props.fileInputRef.current?.click()} className="upload-box">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15l4-4c.928-.893 2.072-.893 3 0l4 4"/><path d="M14 14l1-1c.928-.893 2.072-.893 3 0l2 2"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"/></svg>
          <p><span>Upload Card Image</span> or use camera</p>
          <p className="upload-box-subtitle">Auto-Enhanced & Cropped</p>
        </div>
      ) : (
        <div className="image-previews">
          <div className="preview-container">
            <img src={`data:image/jpeg;base64,${props.frontImageBase64}`} alt="Front Preview" />
            <p>Front / Profile</p>
          </div>
          <div className="preview-container">
            {props.backImageBase64 ? <img src={`data:image/jpeg;base64,${props.backImageBase64}`} alt="Back Preview"/> :
            ( <div onClick={() => props.fileInputRef.current?.click()} className="upload-box-small">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                <p>Add back side</p>
              </div>
            )}
          </div>
        </div>
      )}
      <div className="actions-row">
        <button onClick={() => props.frontImageBase64 && props.processCardImages(props.frontImageBase64, props.backImageBase64)} disabled={props.isLoading || !props.frontImageBase64} className="btn-primary">Process Card</button>
        <button 
            onClick={() => props.openCamera(props.frontImageBase64 ? 'back' : 'front')} 
            disabled={props.isLoading || (!!props.frontImageBase64 && !!props.backImageBase64) || !isCameraSupported} 
            className="btn-secondary"
            title={!isCameraSupported ? "Camera requires HTTPS" : "Use your device's camera"}
        >
            Use Camera
        </button>
      </div>
    </>
)});

const BulkUploadUI = React.memo((props: any) => (
    <>
        <div className="actions-row">
            <button onClick={() => props.fileInputRef.current?.click()} disabled={props.isLoading} className="btn-primary">Upload Multiple Cards</button>
            <button onClick={() => props.openCamera('bulk')} disabled={props.isLoading} className="btn-secondary">Use Camera</button>
        </div>
        {props.bulkItems.length > 0 && (
            <div className="bulk-list">
                <ul>
                    {props.bulkItems.map((item: any) => (
                        <li key={item.id} className="bulk-item">
                            <span className="bulk-item-name">{item.file.name}</span>
                            <span className={`status-badge status-${item.status}`}>{item.status}</span>
                        </li>
                    ))}
                </ul>
                <div className="actions-row">
                   <button onClick={props.saveAllBulk} disabled={props.isLoading || props.bulkItems.every((i: any) => i.status !== 'success')} className="btn-primary">Save All Successful</button>
                </div>
            </div>
        )}
    </>
));
  
const ChatUI = React.memo(({ chatHistory, isChatLoading, chatInput, setChatInput, handleCommandSubmit, chatDisplayRef }: any) => (
    <div className="chat-container">
       <div className="chat-display" ref={chatDisplayRef}>
           {chatHistory.length === 0 ? (
             <div className="chat-placeholder">
                 <p>Ask anything about your contacts!</p>
             </div>
           ) : chatHistory.map((msg: any, index: number) => (
               <div key={index} className={`chat-message ${msg.role === 'user' ? 'user' : 'model'}`}>
                    <p>{msg.text}</p>
               </div>
           ))}
           {isChatLoading && <div className="chat-message model">...</div>}
       </div>
       <form onSubmit={(e) => { e.preventDefault(); handleCommandSubmit(); }} className="chat-form">
           <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Ask..." disabled={isChatLoading} />
           <button type="submit" disabled={isChatLoading || !chatInput.trim()}>Send</button>
       </form>
    </div>
));
  
const renderField = (label: string, field: string, extractedData: any, handleDataChange: any, isTextArea = false) => {
      const commonProps = {
        id: field,
        value: (extractedData?.[field] || ''),
        onChange: (e: any) => handleDataChange(field, e.target.value),
      };
      return (
      <div className={`form-group ${isTextArea ? 'full-width' : ''}`}>
       <label htmlFor={field}>{label}</label>
       {isTextArea ? <textarea {...commonProps} rows={3} /> : <input type="text" {...commonProps} />}
     </div>
  )};

const renderGroupDropdown = (label: string, field: string, extractedData: any, handleDataChange: any) => (
    <div className="form-group">
        <label htmlFor={field}>{label}</label>
        <select
            id={field}
            value={extractedData?.[field] || ''}
            onChange={(e) => handleDataChange(field, e.target.value)}
        >
            <option value="" disabled>Select a group</option>
            {groupOptions.map(option => (
                <option key={option} value={option}>{option}</option>
            ))}
        </select>
    </div>
);

const renderArrayField = (label: string, field: string, extractedData: any, handleDataChange: any, handleArrayDataChange: any) => (
    <div className="form-group full-width">
      <label>{label}</label>
      {(extractedData?.[field] || []).map((item: string, index: number) => (
         <input key={index} type="text" value={item} onChange={(e) => handleArrayDataChange(field, index, e.target.value)} />
      ))}
       <button onClick={() => handleDataChange(field, [...(extractedData?.[field] || []), ''])} className="btn-add-field">+ Add {label.slice(0,-1)}</button>
    </div>
);

// --- MAIN APP ---
const App = () => {
  const [mode, setMode] = useState<AppMode>('single');
  const [savedContacts, setSavedContacts] = useState<ContactData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [frontImageBase64, setFrontImageBase64] = useState<string | null>(null);
  const [backImageBase64, setBackImageBase64] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<Partial<ContactData> | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraFor, setCameraFor] = useState<'front' | 'back' | 'bulk'>('front');
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [bulkItems, setBulkItems] = useState<BulkFileItem[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [focusBox, setFocusBox] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  
  // PAGINATION STATE
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5; 

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const chatDisplayRef = useRef<HTMLDivElement>(null);
  const focusBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
  }, []);

  useEffect(() => {
    if (chatDisplayRef.current) chatDisplayRef.current.scrollTop = chatDisplayRef.current.scrollHeight;
  }, [chatHistory]);

  const fetchContacts = useCallback(async () => {
    setIsLoading(true);
    let loadedFromFirebase = false;

    // --- FIX: Client-side sorting ---
    if (contactsCollectionRef && isFirebaseConfigured) {
      try {
        const q = query(contactsCollectionRef); 
        const data = await getDocs(q);
        let docs = data.docs.map(doc => ({ id: doc.id, ...doc.data() } as ContactData));
        
        docs.sort((a, b) => {
             const tA = a.createdAt?.seconds || 0;
             const tB = b.createdAt?.seconds || 0;
             return tB - tA; // Descending
        });
        
        setSavedContacts(docs);
        loadedFromFirebase = true;
      } catch (e) { console.warn("Firebase fetch warning:", e); }
    }

    if (!loadedFromFirebase) {
        const localData = localStorage.getItem('scannedCardsLocal');
        if (localData) setSavedContacts(JSON.parse(localData));
    }
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  // --- CAMERA SETUP ---
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (!isCameraOpen || !videoRef.current) return;
    
    setIsCameraReady(false);
    const setupCamera = async () => {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment', width: { ideal: 3840 }, height: { ideal: 2160 } } 
            });
            if(videoRef.current) videoRef.current.srcObject = stream;
        } catch (err) {
            setError("Camera access denied or unavailable.");
            setIsCameraOpen(false);
        }
    };
    setupCamera();
    return () => stream?.getTracks().forEach(t => t.stop());
  }, [isCameraOpen]);

  // --- RESIZE BOX ---
  const updateFocusBox = () => {
    if (!videoRef.current) return;
    const CARD_RATIO = 1.586; 
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let width = Math.min(vw * 0.9, 600); 
    let height = width / CARD_RATIO;
    setFocusBox({ width, height });
  };

  useEffect(() => {
    if (!isCameraOpen) return;
    window.addEventListener('resize', updateFocusBox);
    updateFocusBox();
    return () => window.removeEventListener('resize', updateFocusBox);
  }, [isCameraOpen]);

  const handleCanPlay = () => {
    videoRef.current?.play().then(() => {
        setIsCameraReady(true);
        updateFocusBox();
    }).catch(console.error);
  };

  // --- CROP & SCAN LOGIC ---
  const takeSnapshot = async () => {
    if (!videoRef.current || !isCameraReady || !focusBoxRef.current) return;

    const video = videoRef.current;
    
    // Intrinsic & Rendered Sizes
    const videoW = video.videoWidth;
    const videoH = video.videoHeight;
    const rect = video.getBoundingClientRect(); 
    const boxRect = focusBoxRef.current.getBoundingClientRect(); 

    const scaleX = rect.width / videoW;
    const scaleY = rect.height / videoH;
    const scale = Math.max(scaleX, scaleY); 

    const displayedW = videoW * scale;
    const displayedH = videoH * scale;

    const offsetX = (displayedW - rect.width) / 2;
    const offsetY = (displayedH - rect.height) / 2;

    const sourceX = (boxRect.left - rect.left + offsetX) / scale;
    const sourceY = (boxRect.top - rect.top + offsetY) / scale;
    const sourceW = boxRect.width / scale;
    const sourceH = boxRect.height / scale;

    const canvas = document.createElement("canvas");
    canvas.width = sourceW;
    canvas.height = sourceH;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
        // Draw Cropped Region
        ctx.drawImage(video, sourceX, sourceY, sourceW, sourceH, 0, 0, sourceW, sourceH);
        
        const rawBase64 = canvas.toDataURL('image/jpeg').split(',')[1];
        // Apply Scan Filter
        const optimizedBase64 = await processAndOptimizeImage(rawBase64);

        if(cameraFor === 'bulk') {
            const file = new File([atob(optimizedBase64).split('').map(c=>c.charCodeAt(0))], `cam-${Date.now()}.jpg`, {type:'image/jpeg'});
            const newItem: BulkFileItem = { id: `cam-${Date.now()}`, file, base64: optimizedBase64, status: 'pending' };
            setBulkItems(prev => [...prev, newItem]);
            processCardImages(optimizedBase64, null, newItem.id);
        } else if(cameraFor === 'front') {
            setFrontImageBase64(optimizedBase64);
        } else {
            setBackImageBase64(optimizedBase64);
        }
        closeCamera();
    }
  };

  const processCardImages = async (frontB64: string, backB64?: string | null, bulkItemId?: string) => {
    if (!isAiConfigured) return setError("AI Key Missing");
    
    if (bulkItemId) setBulkItems(prev => prev.map(i => i.id === bulkItemId ? { ...i, status: 'processing' } : i));
    else setIsLoading(true);
    
    try {
        const { GoogleGenerativeAI } = await import("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        
        const parts: Part[] = [{ inlineData: { mimeType: 'image/jpeg', data: frontB64 } }];
        if (backB64) parts.push({ inlineData: { mimeType: 'image/jpeg', data: backB64 } });
        
        parts.push({ text: `Extract contact details into JSON: { name, designation, company, phoneNumbers[], emails[], websites[], address, whatsapp, group, notes }. Group options: ${groupOptions.join(',')}. Use "Others" if unsure.` });

        const result = await model.generateContent({ contents: [{ role: "user", parts }], generationConfig: { responseMimeType: "application/json" } });
        const data = JSON.parse(result.response.text().replace(/```json|```/g, '').trim());

        if (bulkItemId) setBulkItems(prev => prev.map(i => i.id === bulkItemId ? { ...i, status: 'success', extractedData: data } : i));
        else setExtractedData(data);
    } catch (e) {
        const msg = "Failed to process";
        if (bulkItemId) setBulkItems(prev => prev.map(i => i.id === bulkItemId ? { ...i, status: 'error', error: msg } : i));
        else setError(msg);
    } finally {
        if (!bulkItemId) setIsLoading(false);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;
    
    const processFile = (file: File, isBulk: boolean) => {
        const reader = new FileReader();
        reader.onloadend = async () => {
            const raw = (reader.result as string).split(",")[1];
            const optimized = await processAndOptimizeImage(raw); 
            
            if (isBulk) {
                const newItem = { id: `${file.name}-${Date.now()}`, file, base64: optimized, status: 'pending' as const };
                setBulkItems(prev => [...prev, newItem]);
                processCardImages(optimized, null, newItem.id);
            } else {
                 if (!frontImageBase64) setFrontImageBase64(optimized);
                 else setBackImageBase64(optimized);
            }
        };
        reader.readAsDataURL(file);
    };

    if (mode === 'bulk') Array.from(files).forEach(f => processFile(f, true));
    else processFile(files[0], false);
    
    if(fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDataChange = (field: any, value: any) => setExtractedData(p => p ? ({ ...p, [field]: value }) : null);
  const handleArrayDataChange = (field: any, index: number, value: string) => {
    setExtractedData(prev => {
        if (!prev) return null;
        const arr = (prev[field as keyof ContactData] as string[]) || [];
        const newArr = [...arr]; newArr[index] = value;
        return { ...prev, [field]: newArr };
    });
  };

  const saveContactToFirebase = async () => {
    if (!extractedData || !frontImageBase64) return;
    setIsLoading(true);
    const payload = { ...extractedData, imageBase64: frontImageBase64, createdAt: serverTimestamp() };
    
    try {
        if (db && contactsCollectionRef) {
             if (extractedData.id) await updateDoc(doc(db, "visiting_cards", extractedData.id), payload);
             else await addDoc(contactsCollectionRef, payload);
        } else {
             const existing = JSON.parse(localStorage.getItem('scannedCardsLocal') || '[]');
             existing.unshift({ ...payload, id: Date.now().toString() });
             localStorage.setItem('scannedCardsLocal', JSON.stringify(existing));
             setSavedContacts(existing);
        }
        setExtractedData(null); setFrontImageBase64(null); setBackImageBase64(null); setMode('single');
        fetchContacts();
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  const handleSave = () => { if(extractedData) saveContactToFirebase(); };
  const resetState = () => { setFrontImageBase64(null); setBackImageBase64(null); setExtractedData(null); setError(null); };
  const openCamera = (side: any) => { setCameraFor(side); setIsCameraOpen(true); };
  const closeCamera = () => setIsCameraOpen(false);

  const saveAllBulk = async () => {
      const valid = bulkItems.filter(i => i.status === 'success' && i.extractedData);
      for(const item of valid) {
          const payload = { ...item.extractedData, imageBase64: item.base64, createdAt: serverTimestamp() };
          if(db && contactsCollectionRef) await addDoc(contactsCollectionRef, payload);
          else {
              const local = JSON.parse(localStorage.getItem('scannedCardsLocal') || '[]');
              local.unshift({...payload, id: Date.now().toString()});
              localStorage.setItem('scannedCardsLocal', JSON.stringify(local));
          }
      }
      setBulkItems([]); fetchContacts();
  };

  const deleteContact = async (id: string) => {
      if(!confirm("Delete?")) return;
      if(db) try { await deleteDoc(doc(db, "visiting_cards", id)); } catch(e){}
      const local = JSON.parse(localStorage.getItem('scannedCardsLocal') || '[]');
      const filtered = local.filter((c: ContactData) => c.id !== id);
      localStorage.setItem('scannedCardsLocal', JSON.stringify(filtered));
      fetchContacts();
  };

  // --- EXCEL DOWNLOAD ---
  const downloadContactsAsExcel = async () => {
    if (savedContacts.length === 0) return setError("No contacts to export");
    setError(null); setIsExporting(true);
    try {
        const { Workbook } = await import('exceljs');
        const workbook = new Workbook();
        const worksheet = workbook.addWorksheet('Contacts');
        worksheet.columns = [
            { header: 'Photo', key: 'photo', width: 18 },
            { header: 'Name', key: 'name', width: 25 },
            { header: 'Designation', key: 'designation', width: 22 },
            { header: 'Company', key: 'company', width: 25 },
            { header: 'Phone Numbers', key: 'phones', width: 24 },
            { header: 'WhatsApp', key: 'whatsapp', width: 18 },
            { header: 'Emails', key: 'emails', width: 28 },
            { header: 'Websites', key: 'websites', width: 28 },
            { header: 'Group', key: 'group', width: 18 },
            { header: 'Address', key: 'address', width: 36 },
            { header: 'Notes', key: 'notes', width: 36 },
        ];
        savedContacts.forEach((contact) => {
            const row = worksheet.addRow({
                photo: '',
                name: contact.name, designation: contact.designation, company: contact.company,
                phones: (contact.phoneNumbers || []).join(', '), whatsapp: contact.whatsapp,
                emails: (contact.emails || []).join(', '), websites: (contact.websites || []).join(', '),
                group: contact.group, address: contact.address, notes: contact.notes,
            });
            row.alignment = { vertical: 'top', wrapText: true };
            if (contact.imageBase64) {
                const imageId = workbook.addImage({ base64: contact.imageBase64, extension: 'jpeg' });
                worksheet.getRow(row.number).height = 90;
                worksheet.addImage(imageId, `A${row.number}:A${row.number}`);
            }
        });
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a'); link.href = url; link.download = 'contacts.xlsx';
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    } catch (e) { setError("Export failed"); } finally { setIsExporting(false); }
  };

  const handleCommandSubmit = async () => { /* Chat logic simplified for brevity */ };

  // --- PAGINATION HELPERS ---
  const totalPages = Math.ceil(savedContacts.length / itemsPerPage);
  const goToNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const goToPrevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

  const componentProps = {
    mode, setMode,
    isLoading,
    extractedData,
    frontImageBase64,
    backImageBase64,
    fileInputRef,
    handleFileChange,
    processCardImages,
    openCamera,
    bulkItems,
    saveAllBulk,
    chatHistory,
    isChatLoading,
    chatInput,
    setChatInput,
    handleCommandSubmit,
    chatDisplayRef,
    handleDataChange,
    handleArrayDataChange,
    handleSave,
    resetState,
  };

  return (
    <>
    <style>{`
      :root { --c-primary: #6366f1; --c-bg: #f0f2f5; }
      body { background: var(--c-bg); font-family: sans-serif; margin: 0; padding-bottom: 50px; }
      .app-container { max-width: 600px; margin: 0 auto; min-height: 100vh; display: flex; flex-direction: column; }
      .app-header { background: white; padding: 1rem; position: sticky; top: 0; z-index: 50; box-shadow: 0 1px 3px rgba(0,0,0,0.1); display: flex; justify-content: space-between; align-items: center; }
      .header-title { display: flex; align-items: center; gap: 10px; font-weight: bold; font-size: 1.2rem; }
      .header-title img { width: 30px; height: 30px; border-radius: 50%; }
      .dashboard { padding: 1rem; flex: 1; display: flex; flex-direction: column; gap: 1rem; }
      .card { background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
      .tabs { display: flex; background: #f3f4f6; padding: 4px; border-radius: 8px; margin-bottom: 1rem; }
      .tab { flex: 1; padding: 8px; border: none; background: transparent; cursor: pointer; font-weight: 600; color: #666; border-radius: 6px; }
      .tab.active { background: white; color: var(--c-primary); shadow: 0 1px 2px rgba(0,0,0,0.1); }
      .upload-box { border: 2px dashed #ddd; padding: 2rem; text-align: center; border-radius: 12px; cursor: pointer; background: #fafafa; }
      .upload-box:active { background: #f0f0f0; }
      .form-group { margin-bottom: 1rem; }
      .form-group label { display: block; font-size: 0.8rem; font-weight: 600; color: #555; margin-bottom: 4px; }
      input, select, textarea { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px; font-size: 1rem; }
      .btn-primary { background: var(--c-primary); color: white; border: none; padding: 12px; width: 100%; border-radius: 8px; font-weight: bold; cursor: pointer; }
      .btn-secondary { background: white; border: 1px solid #ddd; color: #333; padding: 12px; width: 100%; border-radius: 8px; font-weight: bold; cursor: pointer; }
      .actions-row { display: flex; gap: 10px; margin-top: 10px; }
      .video-container { position: fixed; inset: 0; background: black; z-index: 100; display: flex; flex-direction: column; }
      .video-wrapper { flex: 1; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; }
      video { width: 100%; height: 100%; object-fit: cover; }
      .focus-box { position: absolute; border: 2px solid white; box-shadow: 0 0 0 9999px rgba(0,0,0,0.7); z-index: 10; border-radius: 12px; pointer-events: none; }
      .focus-box::after { content: "Align card here"; color: white; position: absolute; bottom: -25px; width: 100%; text-align: center; font-weight: bold; text-shadow: 0 1px 2px black; }
      .video-controls { position: absolute; bottom: 30px; width: 100%; display: flex; justify-content: center; gap: 20px; z-index: 20; }
      .btn-capture { background: white; width: 70px; height: 70px; border-radius: 50%; border: 4px solid rgba(255,255,255,0.3); cursor: pointer; }
      .btn-close-cam { background: rgba(255,255,255,0.2); color: white; border: none; padding: 10px 20px; border-radius: 20px; backdrop-filter: blur(4px); cursor: pointer; }
      .loading-overlay { position: fixed; inset: 0; background: rgba(255,255,255,0.9); z-index: 200; display: flex; align-items: center; justify-content: center; font-weight: bold; }
      .contact-list-item { display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #eee; }
      .contact-info { display: flex; align-items: center; gap: 10px; }
      .contact-info img { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; background: #eee; }
      .list-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
      .excel-btn { display: flex; align-items: center; gap: 6px; background: #10b981; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 0.9rem; cursor: pointer; }
      
      /* --- PREVIEW FIX --- */
      .image-previews { display: flex; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap; justify-content: center; }
      .preview-container { flex: 1; min-width: 150px; max-width: 100%; position: relative; text-align: center; }
      .preview-container img { width: 100%; height: auto; max-height: 250px; object-fit: contain; border-radius: 8px; border: 1px solid #ddd; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
      .upload-box-small { border: 2px dashed #ddd; padding: 1rem; text-align: center; border-radius: 8px; cursor: pointer; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 150px; }

      /* --- PAGINATION CSS --- */
      .pagination { display: flex; justify-content: center; align-items: center; gap: 1rem; margin-top: 1.5rem; }
      .pagination button { background: white; border: 1px solid #ddd; padding: 6px 12px; width: auto; font-size: 0.9rem; border-radius: 6px; }
      .pagination button:disabled { opacity: 0.5; cursor: not-allowed; }
      .pagination span { font-size: 0.9rem; color: #666; }
    `}</style>

    <div className="app-container">
      <header className="app-header">
        <div className="header-title">
            <img src={logo} alt="Logo" />
            <span>AI Card Scanner</span>
        </div>
      </header>

      <main className="dashboard">
        <div className="action-panel">
          <ActionPanel extractedData={extractedData} {...componentProps} />
        </div>

        <div className="card">
            <div className="list-header">
                <h3>Saved Contacts ({savedContacts.length})</h3>
                {savedContacts.length > 0 && (
                  <button onClick={downloadContactsAsExcel} className="excel-btn" disabled={isExporting}>
                    {isExporting ? '...' : <><span style={{fontSize:'1.2em'}}>⤓</span> Excel</>}
                  </button>
                )}
            </div>
            
            <div className="contact-list">
              {savedContacts.length === 0 ? <p style={{color:'#888', textAlign:'center'}}>No contacts yet.</p> : 
               savedContacts.slice((currentPage-1)*itemsPerPage, currentPage*itemsPerPage).map(contact => (
                <div key={contact.id} className="contact-list-item" onClick={() => { setExtractedData(contact); setFrontImageBase64(contact.imageBase64); setMode('single'); window.scrollTo(0,0); }}>
                  <div className="contact-info">
                    <img src={`data:image/jpeg;base64,${contact.imageBase64}`} alt="Thumbnail" />
                    <div>
                        <div style={{fontWeight:'bold'}}>{contact.name || 'Unknown'}</div>
                        <div style={{fontSize:'0.8em', color:'#666'}}>{contact.company}</div>
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); deleteContact(contact.id); }} style={{color:'red', border:'none', background:'transparent'}}>✕</button>
                </div>
              ))}
            </div>

            {/* --- RESTORED PAGINATION CONTROLS --- */}
            {savedContacts.length > itemsPerPage && (
                <div className="pagination">
                    <button onClick={goToPrevPage} disabled={currentPage === 1}>
                        &larr; Prev
                    </button>
                    <span>Page {currentPage} of {totalPages}</span>
                    <button onClick={goToNextPage} disabled={currentPage === totalPages}>
                        Next &rarr;
                    </button>
                </div>
            )}

        </div>
      </main>

      {isCameraOpen && (
          <div className="video-container">
              <div className="video-wrapper">
                <video ref={videoRef} autoPlay playsInline muted onCanPlay={handleCanPlay} onClick={() => isCameraReady && takeSnapshot()} />
                <div ref={focusBoxRef} className="focus-box" style={{ width: focusBox.width, height: focusBox.height }} />
              </div>
              <div className="video-controls">
                 <button className="btn-close-cam" onClick={closeCamera}>Cancel</button>
                 <button className="btn-capture" onClick={takeSnapshot} />
              </div>
          </div>
      )}

      {isLoading && <div className="loading-overlay">Processing...</div>}
      {error && <div className="loading-overlay" style={{background:'rgba(255,0,0,0.8)', color:'white', flexDirection:'column', gap:'10px'}}>
          {error} <button onClick={()=>setError(null)} style={{background:'white', color:'black', border:'none', padding:'5px 10px', borderRadius:'4px'}}>OK</button>
      </div>}
    </div>
    </>
  );
};

export default App;
