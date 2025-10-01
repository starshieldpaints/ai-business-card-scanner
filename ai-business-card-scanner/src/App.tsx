import React, { useState, useRef, useEffect, useCallback } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { FirebaseApp } from "firebase/app";
import { initializeApp } from "firebase/app";
// import AutoFrameCardCapture from './components/AutoFrameCardCapture';

import type {
  Firestore,
  CollectionReference,
  DocumentData
} from "firebase/firestore";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy
} from "firebase/firestore";

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

// --- Google AI Configuration ---
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

// --- Configuration Checks ---
const isFirebaseConfigured = firebaseConfig?.projectId;
const isAiConfigured = !!API_KEY;

// --- Predefined Group Options ---
const groupOptions = [
  "Architect", "Ashrams", "Builders", "Building Materials", "Car Detailing", 
  "Client", "Club", "Cold Storage", "Consumer", "Dairy", "Dealership/Partnership", 
  "Developer", "Export", "Export Partner", "Factory", "Family", "Friend", 
  "Govt Contractor", "Govt Deptt", "Green building", "Hardware", "Heat Insulation", 
  "Home", "Hospitals", "Hotels", "Interior Designer", "Office", "Paint Contractors", 
  "Paint Dealers", "Paint shop", "Partner", "Pre Fabrication", "Purchase", 
  "Raw Material", "School", "Society", "Solar panel", "Vendor", "Others"
].sort();


// --- Type Definitions ---
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

// --- App-specific Type Definitions ---
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

// --- Standalone UI Components (Memoized for performance) ---

const ActionPanel = React.memo(({
    extractedData,
    ...props
}) => {
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

const VerificationForm = React.memo(({ extractedData, ...props }) => (
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

const SingleCardUI = React.memo((props) => {
    const isCameraSupported = window.isSecureContext;
    return (
    <>
      {!props.frontImageBase64 ? (
        <div onClick={() => props.fileInputRef.current?.click()} className="upload-box">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15l4-4c.928-.893 2.072-.893 3 0l4 4"/><path d="M14 14l1-1c.928-.893 2.072-.893 3 0l2 2"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"/></svg>
          <p><span>Upload Card Image</span> or use camera</p>
          <p className="upload-box-subtitle">PNG, JPG, GIF up to 10MB</p>
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
            title={!isCameraSupported ? "Camera requires a secure (HTTPS) connection" : "Use your device's camera"}
        >
            Use Camera
        </button>
      </div>
    </>
)});

const BulkUploadUI = React.memo((props) => (
    <>
        <div className="actions-row">
            <button onClick={() => props.fileInputRef.current?.click()} disabled={props.isLoading} className="btn-primary">Upload Multiple Cards</button>
            <button onClick={() => props.openCamera('bulk')} disabled={props.isLoading} className="btn-secondary">Use Camera</button>
        </div>
        {props.bulkItems.length > 0 && (
            <div className="bulk-list">
                <ul>
                    {props.bulkItems.map(item => (
                        <li key={item.id} className="bulk-item">
                            <span className="bulk-item-name">{item.file.name}</span>
                            <span className={`status-badge status-${item.status}`}>{item.status}</span>
                        </li>
                    ))}
                </ul>
                <div className="actions-row">
                   <button onClick={props.saveAllBulk} disabled={props.isLoading || props.bulkItems.every(i => i.status !== 'success')} className="btn-primary">Save All Successful</button>
                </div>
            </div>
        )}
    </>
));
  
const ChatUI = React.memo(({ chatHistory, isChatLoading, chatInput, setChatInput, handleCommandSubmit, chatDisplayRef }) => (
    <div className="chat-container">
       <div className="chat-display" ref={chatDisplayRef}>
           {chatHistory.length === 0 ? (
             <div className="chat-placeholder">
                 <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                 <p>Ask anything about your contacts!</p>
                 <p className="chat-placeholder-subtitle">e.g., "Who works at Google?"</p>
             </div>
           ) : chatHistory.map((msg, index) => (
               <div key={index} className={`chat-message ${msg.role === 'user' ? 'user' : 'model'}`}>
                    <p>{msg.text}</p>
               </div>
           ))}
           {isChatLoading && chatHistory[chatHistory.length - 1]?.role === 'model' && <div className="chat-message model"><span className="typing-indicator"></span></div>}
       </div>
       <form onSubmit={(e) => { e.preventDefault(); handleCommandSubmit(); }} className="chat-form">
           <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Ask the AI assistant..." disabled={isChatLoading} />
           <button type="submit" disabled={isChatLoading || !chatInput.trim()}>
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
           </button>
       </form>
   </div>
));
  
const renderField = (label, field, extractedData, handleDataChange, isTextArea = false) => {
     const commonProps = {
        id: field,
        value: (extractedData?.[field] || ''),
        onChange: (e) => handleDataChange(field, e.target.value),
     };
     return (
     <div className={`form-group ${isTextArea ? 'full-width' : ''}`}>
      <label htmlFor={field}>{label}</label>
      {isTextArea ? <textarea {...commonProps} rows={3} /> : <input type="text" {...commonProps} />}
    </div>
  )};

const renderGroupDropdown = (label, field, extractedData, handleDataChange) => (
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

const renderArrayField = (label, field, extractedData, handleDataChange, handleArrayDataChange) => (
    <div className="form-group full-width">
      <label>{label}</label>
      {(extractedData?.[field] || []).map((item, index) => (
         <input key={index} type="text" value={item} onChange={(e) => handleArrayDataChange(field, index, e.target.value)} />
      ))}
       <button onClick={() => handleDataChange(field, [...(extractedData?.[field] || []), ''])} className="btn-add-field">+ Add {label.slice(0,-1)}</button>
    </div>
);

// --- Main App Component ---
const App = () => {
  // --- State Management ---
  const [mode, setMode] = useState<AppMode>('single');
  const [savedContacts, setSavedContacts] = useState<ContactData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
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


  // --- Refs ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const chatDisplayRef = useRef<HTMLDivElement>(null);

  // --- Effects ---
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
    };
  }, []);

  useEffect(() => {
    if (chatDisplayRef.current) {
        chatDisplayRef.current.scrollTop = chatDisplayRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const fetchContacts = useCallback(async () => {
    if (!contactsCollectionRef) return;
    setIsLoading(true);
    try {
      const q = query(contactsCollectionRef, orderBy("createdAt", "desc"));
      const data = await getDocs(q);
      const contacts = data.docs.map(doc => ({ id: doc.id, ...doc.data() } as ContactData));
      setSavedContacts(contacts);
    } catch (e) {
       const err = e as Error;
       console.error("Failed to load contacts:", err.message);
       setError("Could not load saved contacts.");
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if(isFirebaseConfigured) {
        fetchContacts();
    }
  }, [fetchContacts]);

  // --- Camera Lifecycle Effect ---
  useEffect(() => {
    let stream: MediaStream | null = null;
    const videoNode = videoRef.current;

    const setupCamera = async () => {
        if (!isCameraOpen || !videoNode) return;

        setIsCameraReady(false);
        if (!window.isSecureContext) {
            setError("Camera access requires a secure connection (HTTPS).");
            setIsCameraOpen(false);
            return;
        }

        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            videoNode.srcObject = stream;
        } catch (err) {
            if (err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "PermissionDeniedError")) {
                setError("Camera permission was denied. Please enable it in your browser settings.");
            } else {
                setError("Could not access the camera. It might be in use by another app.");
            }
            console.error("Camera access error:", err);
            setIsCameraOpen(false);
        }
    };

    setupCamera();

    // Cleanup function
    return () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
    };
  }, [isCameraOpen]);

  const updateFocusBox = () => {
    if (!videoRef.current) return;
    const CARD_RATIO = 1.586; // standard business card aspect ratio
    const vw = videoRef.current.videoWidth;
    const vh = videoRef.current.videoHeight;
    let width = vw * 0.8;
    let height = width / CARD_RATIO;
    if (height > vh * 0.8) {
      height = vh * 0.8;
      width = height * CARD_RATIO;
    }
    setFocusBox({ width, height });
  };

  useEffect(() => {
    if (!isCameraOpen) return;
    const handleResize = () => updateFocusBox();
    window.addEventListener('resize', handleResize);
    updateFocusBox();
    return () => window.removeEventListener('resize', handleResize);
  }, [isCameraOpen]);

  const handleCanPlay = () => {
    if(videoRef.current) {
        videoRef.current.play().then(() => {
            setIsCameraReady(true);
            updateFocusBox();
        }).catch(err => {
            console.error("Video play failed:", err);
            setError("Could not start camera stream.");
            setIsCameraOpen(false);
        });
    }
  };

  // --- Helper Functions ---
  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      }
      setDeferredPrompt(null);
    }
  };

  const resetState = () => {
    setFrontImageBase64(null);
    setBackImageBase64(null);
    setExtractedData(null);
    setBulkItems([]);
    setError(null);
    setIsLoading(false);
    setMode('single');
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    const processFile = (file: File, isBulk: boolean) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = (reader.result as string).split(",")[1];
            if (isBulk) {
                const newItem: BulkFileItem = { id: `${file.name}-${Date.now()}`, file, base64: base64String, status: 'pending' };
                setBulkItems(prev => [...prev, newItem]);
                processCardImages(base64String, null, newItem.id);
            } else {
                 if (!frontImageBase64) setFrontImageBase64(base64String);
                 else setBackImageBase64(base64String);
            }
        };
        reader.readAsDataURL(file);
    };

    if (mode === 'bulk') {
        Array.from(files).forEach(file => processFile(file, true));
    } else {
        processFile(files[0], false);
    }
    if(fileInputRef.current) fileInputRef.current.value = '';
  };
  
  const openCamera = (forSide: 'front' | 'back' | 'bulk') => {
    setCameraFor(forSide);
    setIsCameraOpen(true);
  };

  const closeCamera = () => {
    setIsCameraOpen(false);
  };
  
  const takeSnapshot = () => {
    if (!videoRef.current || !isCameraReady || videoRef.current.videoWidth === 0) {
        setError("Camera is not ready yet.");
        return;
    }

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');

    const base64ToFile = (b64: string, filename: string): File => {
        const byteString = atob(b64);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        return new File([ia], filename, { type: 'image/jpeg' });
    };

    if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const base64String = canvas.toDataURL('image/jpeg').split(',')[1];
        if(cameraFor === 'bulk') {
            const filename = `camera-${Date.now()}.jpg`;
            const file = base64ToFile(base64String, filename);
            const newItem: BulkFileItem = { id: `${filename}-${Date.now()}`, file, base64: base64String, status: 'pending' };
            setBulkItems(prev => [...prev, newItem]);
            processCardImages(base64String, null, newItem.id);
        } else if(cameraFor === 'front') {
            setFrontImageBase64(base64String);
        } else {
            setBackImageBase64(base64String);
        }
        closeCamera();
    } else {
        setError("Could not process image from camera.");
    }
  };

  const processCardImages = async (frontB64: string, backB64?: string | null, bulkItemId?: string) => {
    if (!isAiConfigured || !API_KEY) {
        setError("AI API Key is not configured.");
        return;
    }

    if (bulkItemId) {
        setBulkItems(prev => prev.map(item => item.id === bulkItemId ? { ...item, status: 'processing' } : item));
    } else {
        setIsLoading(true);
        setExtractedData(null);
    }
    setError(null);

    try {
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const parts: Part[] = [{ inlineData: { mimeType: 'image/jpeg', data: frontB64 } }];
        if (backB64) parts.push({ inlineData: { mimeType: 'image/jpeg', data: backB64 } });
        
        const promptText = `Analyze the business card image(s) and extract contact details. Return a single JSON object with keys: "name", "designation", "company", "phoneNumbers", "emails", "websites", "address", "whatsapp", "group", "notes". For the "group" field, categorize the contact based on their profession or company into one of the following options: ${groupOptions.join(', ')}. If no category fits, use "Others". If info is not found, use empty strings or arrays.`;
        parts.push({ text: promptText });

        const result = await model.generateContent({
            contents: [{ role: "user", parts }],
            generationConfig: { responseMimeType: "application/json" },
        });
        
        const parsedData = JSON.parse(result.response.text());

        if (bulkItemId) {
            setBulkItems(prev => prev.map(item => item.id === bulkItemId ? { ...item, status: 'success', extractedData: parsedData } : item));
        } else {
            setExtractedData(parsedData);
        }
    } catch (e) {
        const err = e as Error;
        console.error("Error processing card:", err.message);
        const errorMsg = `Failed to process image. ${err.message || 'An unknown error occurred.'}`;
        if (bulkItemId) {
            setBulkItems(prev => prev.map(item => item.id === bulkItemId ? { ...item, status: 'error', error: errorMsg } : item));
        } else {
            setError(errorMsg);
        }
    } finally {
        if (!bulkItemId) setIsLoading(false);
    }
  };

  const handleDataChange = (field: keyof Omit<ContactData, 'id' | 'imageBase64'>, value: string | string[]) => {
    setExtractedData(prev => prev ? ({ ...prev, [field]: value }) : null);
  };

  const handleArrayDataChange = (field: keyof Omit<ContactData, 'id' | 'imageBase64'>, index: number, value: string) => {
    setExtractedData(prev => {
        if (!prev) return null;
        const currentArray = (prev[field] as string[]) || [];
        const newArray = [...currentArray];
        newArray[index] = value;
        return { ...prev, [field]: newArray };
    });
  };
  
  const saveContactToFirebase = async () => {
    if (!db || !contactsCollectionRef || !extractedData || !frontImageBase64) {
        setError("Cannot save contact. Check configuration and data.");
        return;
    }
    setIsLoading(true);
    const contactPayload = {
      name: extractedData.name || "",
      designation: extractedData.designation || "",
      company: extractedData.company || "",
      phoneNumbers: extractedData.phoneNumbers || [],
      emails: extractedData.emails || [],
      websites: extractedData.websites || [],
      address: extractedData.address || "",
      imageBase64: frontImageBase64,
      notes: extractedData.notes || "",
      group: extractedData.group || "",
      whatsapp: extractedData.whatsapp || "",
      createdAt: serverTimestamp(),
    };

      try {
        if ('id' in extractedData && extractedData.id) {
            await updateDoc(doc(db, "visiting_cards", extractedData.id), contactPayload);
        } else {
            await addDoc(contactsCollectionRef, contactPayload);
        }
        resetState();
        fetchContacts();
      } catch {
        setError("Failed to save contact.");
        setIsLoading(false);
      }
  };

  const downloadVcf = (data: Partial<ContactData>) => {
    const { name, designation, company, phoneNumbers, emails, websites, address, whatsapp } = data;
    let vCard = "BEGIN:VCARD\nVERSION:3.0\n";
    if (name) {
        const nameParts = name.split(' ');
        const lastName = nameParts.pop() || '';
        const firstName = nameParts.join(' ');
        vCard += `FN:${name}\n`;
        vCard += `N:${lastName};${firstName};;;\n`;
    }
    if (company) vCard += `ORG:${company}\n`;
    if (designation) vCard += `TITLE:${designation}\n`;
    if (phoneNumbers) phoneNumbers.forEach((p, i) => { vCard += `TEL;TYPE=WORK,VOICE${i === 0 ? ',PREF' : ''}:${p}\n`; });
    if (whatsapp) vCard += `TEL;TYPE=CELL,WHATSAPP:${whatsapp}\n`;
    if (emails) emails.forEach(e => { vCard += `EMAIL:${e}\n`; });
    if (websites) websites.forEach(w => { vCard += `URL:${w}\n`; });
    if (address) vCard += `ADR;TYPE=WORK:;;${address.replace(/\n/g, '\\n')};;;;\n`;
    vCard += "END:VCARD";

    const blob = new Blob([vCard], { type: "text/vcard;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (name?.replace(/\s/g, '_') || 'contact') + '.vcf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const handleSave = () => {
      if (extractedData) {
          downloadVcf(extractedData);
          saveContactToFirebase();
      }
  };

  const saveAllBulk = async () => {
    if (!db || !contactsCollectionRef) return;
    const successfulItems = bulkItems.filter(item => item.status === 'success' && item.extractedData);
    if(successfulItems.length === 0) return;

    setIsLoading(true);
    let successCount = 0;
    for (const item of successfulItems) {
        if(item.extractedData){
            try {
                const payload = { ...item.extractedData, imageBase64: item.base64, createdAt: serverTimestamp() };
                await addDoc(contactsCollectionRef, payload);
                successCount++;
           } catch (e) { console.error(`Failed to save ${item.file.name}:`, (e as Error).message); }
        }
    }
    alert(`${successCount} of ${successfulItems.length} contacts saved.`);
    resetState();
    fetchContacts();
  }

  const deleteContact = async (id: string) => {
    if (!db) return;
      if (window.confirm("Are you sure you want to delete this contact?")) {
          try {
              await deleteDoc(doc(db, "visiting_cards", id));
              if(extractedData && (extractedData as ContactData).id === id) resetState();
              fetchContacts();
          } catch {
              setError("Failed to delete contact.");
          }
      }
  };

  const editContact = (contact: ContactData) => {
    setExtractedData(contact);
    setFrontImageBase64(contact.imageBase64);
    setBackImageBase64(null);
    setMode('single');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCommandSubmit = async () => {
    if (!chatInput.trim() || isChatLoading || !isAiConfigured || !API_KEY) return;
    const userMessage: ChatMessage = { role: 'user', text: chatInput.trim() };
    setChatHistory(prev => [...prev, userMessage, { role: 'model', text: '' }]);
    setChatInput("");
    setIsChatLoading(true);
    
    try {
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const contactsJson = JSON.stringify(savedContacts.map(c => ({ name: c.name, designation: c.designation, company: c.company, phoneNumbers: c.phoneNumbers, emails: c.emails, group: c.group })));
        const prompt = `You are an AI assistant for a business card app. Answer questions about the user's saved contacts based STRICTLY on this JSON data. If info isn't present, say so. Keep answers concise. Contact data: ${contactsJson}\n\nUser question: ${userMessage.text}`;
        const result = await model.generateContent(prompt);
        const fullResponse = result.response.text();
        setChatHistory(prev => {
            const newHistory = [...prev];
            newHistory[newHistory.length - 1] = { role: 'model', text: fullResponse };
            return newHistory;
        });
    } catch (err) {
        const errorMsg = `Sorry, an error occurred: ${(err as Error).message}`;
        setChatHistory(prev => {
            const newHistory = [...prev];
            newHistory[newHistory.length - 1] = { role: 'model', text: errorMsg };
            return newHistory;
        });
    } finally {
        setIsChatLoading(false);
    }
  };

  if (!isFirebaseConfigured || !isAiConfigured) {
      return (
        <div className="config-error-container">
            <div className="config-error-box">
              <h2>Configuration Error</h2>
              <p>Please make sure your Firebase and Google AI API keys are correctly set up in your environment variables.</p>
              {!isFirebaseConfigured && <p className="error-highlight">Firebase configuration is INCOMPLETE.</p>}
              {!isAiConfigured && <p className="error-highlight">Google AI API Key is MISSING.</p>}
            </div>
        </div>
      )
  }

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
      /* --- Global Styles & Resets --- */
      :root {
        --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        --c-bg: #f8fafc; --c-text: #1e293b; --c-border: #e2e8f0;
        --c-primary: #4f46e5; --c-primary-hover: #4338ca; --c-primary-text: #ffffff;
        --c-secondary: #334155; --c-secondary-hover: #1e293b; --c-secondary-text: #ffffff;
        --c-card-bg: #ffffff; --c-card-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1);
        --radius: 0.75rem;
      }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      html { font-family: var(--font-sans); background-color: var(--c-bg); color: var(--c-text); line-height: 1.5; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
      body { max-width: 100%; overflow-x: hidden; }
      input, button, textarea, select { font-family: inherit; font-size: 1rem; border: 1px solid var(--c-border); border-radius: 0.5rem; padding: 0.75rem 1rem; transition: all 0.2s; }
      button { cursor: pointer; }
      
      /* --- Main Layout --- */
      .app-container { min-height: 0vh; display: flex; flex-direction: column; }
      .app-header { background: rgba(255,255,255,0.8); backdrop-filter: blur(8px); padding: 1rem; border-bottom: 1px solid var(--c-border); display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; position: sticky; top: 0; z-index: 10; }
      .header-title { display: flex; align-items: center; gap: 0.75rem; }
      .app-header img { height: 40px; width: 40px; border-radius: 9999px; }
      .app-header h1 { font-size: 1.25rem; font-weight: 700; }
      .dashboard { display: grid; grid-template-columns: 1fr; gap: 1.5rem; padding: 0rem; max-w: 1280px; margin: 0 auto; width: 100%; }
      @media (min-width: 1024px) { .dashboard { grid-template-columns: 3fr 2fr; padding: 0rem; gap: 2rem; } .app-header { padding: 2rem 2rem; } }
      .app-footer { background-color: var(--c-secondary); width: 180vw;  color: #cbd5e1; text-align: center; padding: 1.5rem; margin-top: auto; font-size: 0.875rem; }

      /* --- Card & Panel Styles --- */
      .card { background-color: var(--c-card-bg); border-radius: var(--radius); box-shadow: var(--c-card-shadow); padding: 1.25rem; border: 1px solid var(--c-border); }
      .card-title { font-size: 1.25rem; font-weight: 700; margin-bottom: 1.25rem; }
      .contact-list-panel .card-title { margin-bottom: 1rem; }
      .contact-list { max-height: 60vh; overflow-y: auto; padding-right: 0.5rem; display: flex; flex-direction: column; gap: 0.75rem; }
      @media (min-width: 1024px) { .contact-list { max-height: 75vh; } }
      .contact-list-item { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background-color: var(--c-bg); border-radius: var(--radius); border: 1px solid var(--c-border); transition: all 0.2s; cursor: pointer; }
      .contact-list-item:hover { border-color: var(--c-primary); background-color: #eef2ff; transform: translateY(-2px); box-shadow: var(--c-card-shadow); }
      .contact-info { display: flex; align-items: center; gap: 1rem; overflow: hidden; }
      .contact-info img { height: 48px; width: 48px; border-radius: 9999px; object-fit: cover; flex-shrink: 0; border: 2px solid white; }
      .contact-info-text { overflow: hidden; }
      .contact-info-text h3 { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 1rem; }
      .contact-info-text p { color: #64748b; font-size: 0.875rem; }
      .contact-actions { display: flex; gap: 0.5rem; }
      .contact-actions button { background: none; border: none; padding: 0.25rem; color: #94a3b8; }
      .contact-actions button:hover { color: var(--c-text); }
      .contact-actions .delete-btn:hover { color: #ef4444; }
      
      /* --- Buttons --- */
      .btn-primary { background-color: var(--c-primary); color: var(--c-primary-text); font-weight: 600; }
      .btn-primary:hover { background-color: var(--c-primary-hover); }
      .btn-primary:disabled, .btn-secondary:disabled, .btn-cancel:disabled { background-color: #9ca3af; cursor: not-allowed; opacity: 0.7; }
      .btn-secondary { background-color: var(--c-secondary); color: var(--c-secondary-text); font-weight: 600; }
      .btn-secondary:hover { background-color: var(--c-secondary-hover); }
      .btn-cancel { background-color: #d1d5db; color: var(--c-text); font-weight: 600; }
      .btn-cancel:hover { background-color: #9ca3af; }
      .btn-add-field { background: none; border: none; padding: 0.25rem 0; color: var(--c-primary); font-weight: 600; font-size: 0.875rem; }
      .btn-install { background-color: var(--c-primary); color: var(--c-primary-text); font-weight: 600; padding: 0.5rem 1rem; font-size: 0.875rem; }
      
      /* --- Forms & Inputs --- */
      .form-grid { display: grid; grid-template-columns: 1fr; gap: 1rem; }
      @media (min-width: 768px) { .form-grid { grid-template-columns: 1fr 1fr; } }
      .form-group.full-width { grid-column: 1 / -1; }
      .form-group label { display: block; font-weight: 500; margin-bottom: 0.5rem; font-size: 0.875rem; }
      .form-group input, .form-group textarea, .form-group select { width: 100%; background-color: #f8fafc; }
      .form-group input:focus, .form-group textarea:focus, .form-group select:focus { outline: 2px solid var(--c-primary); border-color: var(--c-primary); }
      .actions-row { display: flex; flex-wrap: wrap; gap: 1rem; margin-top: 1.5rem; }
      
      /* --- Tabs --- */
      .tabs { display: flex; border-bottom: 1px solid var(--c-border); margin-bottom: 1.5rem; }
      .tab { background: none; border: none; padding: 0.75rem 0.5rem; font-size: 0.875rem; font-weight: 600; color: #64748b; border-bottom: 2px solid transparent; margin-bottom: -1px; }
      @media (min-width: 640px) { .tab { padding: 0.75rem 1rem; font-size: 1rem; } }
      .tab.active { color: var(--c-primary); border-bottom-color: var(--c-primary); }
      
      /* --- Upload Box --- */
      .upload-box, .upload-box-small { display: flex; flex-direction: column; align-items: center; justify-content: center; border: 2px dashed var(--c-border); border-radius: var(--radius); text-align: center; transition: all 0.2s; padding: 2.5rem 1.5rem; }
      .upload-box-small { padding: 1.5rem 1rem; height: 100%; }
      .upload-box:hover, .upload-box-small:hover { border-color: var(--c-primary); background-color: #eef2ff; cursor: pointer; }
      .upload-box p span { font-weight: 600; color: var(--c-primary); }
      .upload-box-subtitle { font-size: 0.75rem; color: #64748b; margin-top: 0.25rem; }
      
      /* --- Image Previews --- */
      .image-previews { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem; }
      .preview-container img { width: 100%; border-radius: var(--radius); box-shadow: var(--c-card-shadow); }
      .preview-container p { text-align: center; font-weight: 500; margin-top: 0.5rem; font-size: 0.875rem; }
      
      /* --- Bulk Upload List --- */
      .bulk-list { margin-top: 1.5rem; display: flex; flex-direction: column; gap: 0.75rem; }
      .bulk-item { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background-color: var(--c-bg); border-radius: 0.5rem; }
      .bulk-item-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding-right: 1rem; }
      .status-badge { padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; }
      .status-pending { background-color: #e2e8f0; color: #475569; }
      .status-processing { background-color: #fef3c7; color: #b45309; }
      .status-success { background-color: #dcfce7; color: #166534; }
      .status-error { background-color: #fee2e2; color: #991b1b; }

      /* --- Chat UI --- */
      .chat-container { display: flex; flex-direction: column; }
      .chat-display { height: 20rem; overflow-y: auto; border: 1px solid var(--c-border); border-radius: var(--radius); padding: 1rem; margin-bottom: 1rem; background-color: var(--c-bg); }
      .chat-placeholder { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; text-align: center; color: #64748b; }
      .chat-placeholder svg { margin-bottom: 0.5rem; }
      .chat-placeholder p { font-weight: 600; }
      .chat-placeholder-subtitle { font-size: 0.875rem; font-weight: 400; }
      .chat-message { max-width: 80%; margin-bottom: 1rem; display: flex; }
      .chat-message p { padding: 0.75rem 1rem; border-radius: 1rem; line-break: anywhere; }
      .chat-message.user { justify-content: flex-end; margin-left: auto; }
      .chat-message.user p { background-color: var(--c-primary); color: var(--c-primary-text); border-bottom-right-radius: 0.25rem; }
      .chat-message.model { justify-content: flex-start; }
      .chat-message.model p { background-color: #e2e8f0; color: var(--c-text); border-bottom-left-radius: 0.25rem; }
      .chat-form { display: flex; gap: 0.75rem; }
      .chat-form input { flex-grow: 1; }
      .chat-form button { padding: 0.75rem; background-color: var(--c-primary); color: var(--c-primary-text); }
      .typing-indicator { height: 24px; display: flex; align-items: center; gap: 4px; }
      .typing-indicator span { width: 8px; height: 8px; background-color: #94a3b8; border-radius: 50%; animation: bounce 1.2s infinite ease-in-out; }
      .typing-indicator span:nth-of-type(2) { animation-delay: -1.0s; }
      .typing-indicator span:nth-of-type(3) { animation-delay: -0.8s; }
      @keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1.0); } }
      
      /* --- Modals & Overlays --- */
      .video-container { position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 50; }
      .video-wrapper { position: relative; width: 100%; flex: 1; display: flex; }
      .video-container video { width: 100%; height: 100%; object-fit: contain; border-radius: var(--radius); display: block; }
      .focus-box { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); border: 2px solid #ffffff; border-radius: var(--radius); pointer-events: none; }
      @media (max-width: 640px) { .actions-row { flex-direction: column; } }

      .video-controls { display: flex; gap: 1.5rem; margin-top: 1.5rem; }
      .video-controls button { padding: 1rem 2rem; font-size: 1.125rem; border-radius: 9999px; }
      .loading-overlay { position: fixed; inset: 0; background: rgba(255,255,255,0.8); backdrop-filter: blur(4px); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 50; }
      .camera-loading-spinner { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); }
      .spinner { width: 4rem; height: 4rem; border-radius: 50%; border: 4px solid #e5e7eb; border-top-color: var(--c-primary); animation: spin 1s linear infinite; }
      @keyframes spin { to { transform: rotate(360deg); } }
      .config-error-container { min-height: 100vh; display: flex; align-items: center; justify-content: center; background-color: #111827; padding: 1rem; }
      .config-error-box { background-color: #ef4444; color: #ffffff; padding: 2rem; border-radius: var(--radius); text-align: center; max-width: 450px; }
      .config-error-box h2 { font-size: 1.875rem; font-weight: 700; margin-bottom: 1rem; }
      .config-error-box .error-highlight { font-weight: 600; background: rgba(0,0,0,0.2); padding: 0.25rem 0.5rem; border-radius: 0.25rem; margin-top: 0.5rem; display: inline-block; }
      .notification { position: fixed; bottom: 1rem; left: 1rem; right: 1rem; background-color: var(--c-secondary); color: white; padding: 1rem; border-radius: var(--radius); box-shadow: var(--c-card-shadow); z-index: 100; text-align: center; animation: slide-up 0.5s ease-out; }
      @keyframes slide-up { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      @media (min-width: 640px) { .notification { left: auto; right: 1rem; max-width: 400px; } }
    `}</style>
    <div className="app-container">
      <header className="app-header">
        <div className="header-title">
            <img src={logo} alt="App Logo" />
            <h1>AI Card Scanner</h1>
        </div>
        {deferredPrompt && (
            <button className="btn-install" onClick={handleInstallClick}>Install App</button>
        )}
      </header>
      <>
    <style>{/* ...styles... */}</style>
    <div className="app-container">
      <header className="app-header">
        {/* ...existing header code... */}
      </header>

  

      <main className="dashboard">
        {/* ...your dashboard, contacts, etc... */}
      </main>
      {/* ...modals and footer... */}
    </div>
  </>
      <main className="dashboard">
        <div className="action-panel">
          <ActionPanel extractedData={extractedData} {...componentProps} />
        </div>
        <div className="contact-list-panel">
          <div className="card">
            <h2 className="card-title">Saved Contacts</h2>
            <div className="contact-list">
              {savedContacts.map(contact => (
                <div key={contact.id} onClick={() => editContact(contact)} className="contact-list-item">
                  <div className="contact-info">
                    <img src={contact.imageBase64 ? `data:image/jpeg;base64,${contact.imageBase64}` : `https://placehold.co/100x100/e2e8f0/64748b?text=${contact.name.charAt(0)}`} alt={contact.name} />
                    <div className="contact-info-text">
                        <h3>{contact.name || 'No Name'}</h3>
                        <p>{contact.company || 'No Company'}</p>
                    </div>
                  </div>
                  <div className="contact-actions">
                    <button onClick={(e) => { e.stopPropagation(); deleteContact(contact.id)}} title="Delete" className="delete-btn">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      
      {isCameraOpen && (
          <div className="video-container">
              <div className="video-wrapper">
                <video ref={videoRef} autoPlay playsInline muted className="camera-view" onCanPlay={handleCanPlay} onClick={() => isCameraReady && takeSnapshot()}></video>
                <div className="focus-box" style={{ width: `${focusBox.width}px`, height: `${focusBox.height}px` }}></div>

                {!isCameraReady && <div className="camera-loading-spinner"><div className="spinner"></div></div>}
              </div>
              <div className="video-controls">
                 <button className="btn-primary" onClick={takeSnapshot} disabled={!isCameraReady}>Capture</button>
                 <button className="btn-secondary" onClick={closeCamera}>Cancel</button>
              </div>
          </div>
      )}
      {isLoading && !extractedData && (
          <div className="loading-overlay">
              <div className="spinner"></div>
              <p style={{marginTop: '1rem', fontWeight: 600}}>Scanning your card...</p>
          </div>
      )}
      {error && (
        <div className="notification">
            {error}
            <button onClick={() => setError(null)} style={{ marginLeft: '1rem', background: 'none', border: 'none', color: 'white', fontWeight: 'bold' }}>X</button>
        </div>
      )}

      <footer className="app-footer">
        <p>© {new Date().getFullYear()} AI Card Scanner. All rights reserved.</p>
      </footer>
    </div>
    </>
  );
};

export default App;
