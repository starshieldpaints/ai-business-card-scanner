
// import React, { useState, useRef, useEffect, useCallback } from "react";
// import { createRoot } from "react-dom/client";
// import { GoogleGenAI, Type } from "@google/genai";
// import { initializeApp } from "firebase/app";
// import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from "firebase/firestore";

// // --- Global Error Handler ---
// // Catches unhandled promise rejections from libraries like Firebase
// // and prevents the browser from crashing on circular JSON errors.
// window.addEventListener('unhandledrejection', function(event) {
//   event.preventDefault();
//   if (event.reason) {
//     console.error("Unhandled Rejection:", event.reason.message || event.reason);
//   } else {
//     console.error("Unhandled Rejection with no reason object.");
//   }
// });


// // --- Firebase Configuration ---
// // IMPORTANT: Replace with your Firebase project's configuration.
// const firebaseConfig = {
//   apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
//   authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
//   projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
//   storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
//   messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
//   appId: import.meta.env.VITE_FIREBASE_APP_ID,
// };

// const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

// // --- API Key Configuration ---
// // IMPORTANT: Replace "AIzaSy..." with your actual Google AI API Key.
// // You can get a key from Google AI Studio: https://aistudio.google.com/

// // --- Configuration Checks ---
// const isFirebaseConfigured =
//   firebaseConfig &&
//   firebaseConfig.apiKey &&
//   firebaseConfig.projectId;

// const isAiConfigured = !!API_KEY;


// // Initialize Firebase only if configured
// let db;
// let contactsCollectionRef;
// if (isFirebaseConfigured) {
//   try {
//     const app = initializeApp(firebaseConfig);
//     db = getFirestore(app);
//     contactsCollectionRef = collection(db, "visiting_cards");
//   } catch (e: any) {
//     console.error("Firebase initialization error:", e.message);
//   }
// }

// interface ContactData {
//   id: string; // Firestore document ID
//   name: string;
//   designation: string;
//   company: string;
//   phoneNumbers: string[];
//   emails: string[];
//   websites: string[];
//   address: string;
//   imageBase64: string; // Base64 of the front of the card
// }

// type AppMode = 'single' | 'bulk';
// type BulkItemStatus = 'pending' | 'processing' | 'success' | 'error';
// type ChatRole = 'user' | 'model';

// interface BulkFileItem {
//   id: string; // Unique ID for the item in the list
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


// const App = () => {
//   // Global State
//   const [mode, setMode] = useState<AppMode>('single');
//   const [savedContacts, setSavedContacts] = useState<ContactData[]>([]);
//   const [isLoading, setIsLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   // Single Card State
//   const [frontImageBase64, setFrontImageBase64] = useState<string | null>(null);
//   const [backImageBase64, setBackImageBase64] = useState<string | null>(null);
//   const [extractedData, setExtractedData] = useState<Partial<ContactData> | null>(null);
//   const [isCameraOpen, setIsCameraOpen] = useState(false);
//   const [cameraFor, setCameraFor] = useState<'front' | 'back'>('front');

//   // Bulk Upload State
//   const [bulkItems, setBulkItems] = useState<BulkFileItem[]>([]);
  
//   // AI Command Center State
//   const [chatInput, setChatInput] = useState('');
//   const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
//   const [isChatLoading, setIsChatLoading] = useState(false);

//   // Refs
//   const fileInputRef = useRef<HTMLInputElement>(null);
//   const videoRef = useRef<HTMLVideoElement>(null);
//   const streamRef = useRef<MediaStream | null>(null);
//   const chatDisplayRef = useRef<HTMLDivElement>(null);

//   useEffect(() => {
//     if (chatDisplayRef.current) {
//         chatDisplayRef.current.scrollTop = chatDisplayRef.current.scrollHeight;
//     }
//   }, [chatHistory]);

//   const fetchContacts = useCallback(async () => {
//     if (!contactsCollectionRef) {
//       return;
//     }
//     setIsLoading(true);
//     try {
//       const q = query(contactsCollectionRef, orderBy("createdAt", "desc"));
//       const data = await getDocs(q);
//       const contacts = data.docs.map(doc => {
//         const docData = doc.data();
//         const contact: ContactData = {
//           id: doc.id,
//           name: docData.name || "",
//           designation: docData.designation || "",
//           company: docData.company || "",
//           phoneNumbers: docData.phoneNumbers || [],
//           emails: docData.emails || [],
//           websites: docData.websites || [],
//           address: docData.address || "",
//           imageBase64: docData.imageBase64 || "",
//         };
//         return contact;
//       });
//       setSavedContacts(contacts);
//     } catch (e: any) {
//       console.error("Failed to load contacts from Firestore:", e.message);
//        if (e.message.includes("Could not reach Cloud Firestore backend")) {
//         setError("Could not connect to Firestore. Please check your internet connection and ensure this app's domain is added to your Firebase project's authorized domains.");
//       } else if (e.message.includes("Missing or insufficient permissions")) {
//         setError("Firestore permissions error. Please check your project's Firestore security rules.");
//       } else {
//         setError("Could not load saved contacts. An unknown error occurred.");
//       }
//     }
//     setIsLoading(false);
//   }, []);

//   useEffect(() => {
//     if(isFirebaseConfigured) {
//         fetchContacts();
//     }
//   }, [fetchContacts]);

//   const resetState = () => {
//     setFrontImageBase64(null);
//     setBackImageBase64(null);
//     setExtractedData(null);
//     setBulkItems([]);
//     setError(null);
//     setIsLoading(false);
//     // Do not reset chat state
//   };

//   const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, forSide: 'front' | 'back' | 'bulk') => {
//     const files = event.target.files;
//     if (!files || files.length === 0) return;
    
//     if (forSide === 'bulk') {
//         resetState();
//         const newBulkItems: BulkFileItem[] = Array.from(files).map((file: File) => ({
//             id: `${file.name}-${Date.now()}`,
//             file,
//             base64: '',
//             status: 'pending',
//         }));
//         setBulkItems(newBulkItems);
//         processBulkQueue(newBulkItems);
//     } else {
//         const file = files[0];
//         const reader = new FileReader();
//         reader.onloadend = () => {
//             const base64String = (reader.result as string).split(",")[1];
//             if (forSide === 'front') {
//                 setFrontImageBase64(base64String);
//             } else {
//                 setBackImageBase64(base64String);
//             }
//         };
//         reader.readAsDataURL(file);
//     }
//      // Reset file input value to allow re-uploading the same file
//     if(fileInputRef.current) fileInputRef.current.value = '';
//   };

//   const openCamera = async (forSide: 'front' | 'back') => {
//     setCameraFor(forSide);
//     try {
//       if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
//         const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
//         setIsCameraOpen(true);
//         streamRef.current = stream;
//         if (videoRef.current) {
//           videoRef.current.srcObject = stream;
//         }
//       } else {
//         setError("Camera not supported on this device/browser.");
//       }
//     } catch (err: any) {
//       console.error("Error accessing camera: ", err.message);
//       setError("Could not access the camera. Please ensure permissions are granted.");
//     }
//   };

//   const closeCamera = () => {
//     if (streamRef.current) {
//       streamRef.current.getTracks().forEach(track => track.stop());
//     }
//     setIsCameraOpen(false);
//     streamRef.current = null;
//   };
  
//   const takeSnapshot = () => {
//     if (videoRef.current) {
//       const canvas = document.createElement("canvas");
//       canvas.width = videoRef.current.videoWidth;
//       canvas.height = videoRef.current.videoHeight;
//       const ctx = canvas.getContext('2d');
//       if (ctx) {
//         ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
//         const base64String = canvas.toDataURL('image/jpeg').split(',')[1];
//         if(cameraFor === 'front') setFrontImageBase64(base64String);
//         else setBackImageBase64(base64String);
//       }
//       closeCamera();
//     }
//   };

//  const processCardImages = async (frontB64: string, backB64?: string | null): Promise<Partial<ContactData>> => {
//     if (!isAiConfigured || !API_KEY) throw new Error("Google AI API Key is not configured.");

//     const ai = new GoogleGenAI({ apiKey: API_KEY });
//     const responseSchema = {
//       type: Type.OBJECT,
//       properties: {
//         name: { type: Type.STRING, description: "Full name of the person." },
//         designation: { type: Type.STRING, description: "Job title or designation." },
//         company: { type: Type.STRING, description: "Company name." },
//         phoneNumbers: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of phone numbers." },
//         emails: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of email addresses." },
//         websites: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of websites." },
//         address: { type: Type.STRING, description: "Full address." },
//       },
//       required: ["name"]
//     };

//     const parts: ({ text: string } | { inlineData: { mimeType: string; data: string } })[] = [
//       { inlineData: { mimeType: 'image/jpeg', data: frontB64 } },
//     ];
    
//     let promptText = "Analyze this image of a business card and extract the contact details.";
//     if (backB64) {
//       parts.push({ inlineData: { mimeType: 'image/jpeg', data: backB64 } });
//       promptText = "Analyze these two images (front and back of a business card) and extract the combined contact details.";
//     }
//     promptText += " If a field is not present, return an empty string or empty array for it.";
//     parts.push({ text: promptText });
    
//     const response = await ai.models.generateContent({
//       model: 'gemini-2.5-flash',
//       contents: { parts },
//       config: {
//         responseMimeType: "application/json",
//         responseSchema: responseSchema,
//       }
//     });
    
//     return JSON.parse(response.text);
//   };

//   const handleSingleCardProcess = async () => {
//     if(!frontImageBase64) return;
//     setIsLoading(true);
//     setError(null);
//     setExtractedData(null);
//     try {
//         const parsedData = await processCardImages(frontImageBase64, backImageBase64);
//         setExtractedData(parsedData);
//     } catch (e: any) {
//         console.error("Error processing card:", e.message);
//         setError(`Failed to process image. ${e.message || 'An unknown error occurred.'}`);
//     } finally {
//         setIsLoading(false);
//     }
//   };

//   const processBulkQueue = async (items: BulkFileItem[]) => {
//     setIsLoading(true);
//     let processedItems = [...items];

//     for (let i = 0; i < items.length; i++) {
//         const item = items[i];
        
//         const base64 = await new Promise<string>((resolve, reject) => {
//             const reader = new FileReader();
//             reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
//             reader.onerror = reject;
//             reader.readAsDataURL(item.file);
//         });
        
//         processedItems = processedItems.map(p => p.id === item.id ? { ...p, base64, status: 'processing' } : p);
//         setBulkItems(processedItems);

//         try {
//             const parsedData = await processCardImages(base64);
//             processedItems = processedItems.map(p => p.id === item.id ? { ...p, status: 'success', extractedData: parsedData } : p);
//             setBulkItems(processedItems);
//         } catch(e: any) {
//             console.error(`Error processing ${item.file.name}:`, e.message);
//             processedItems = processedItems.map(p => p.id === item.id ? { ...p, status: 'error', error: e.message || "Failed to process" } : p);
//             setBulkItems(processedItems);
//         }
//     }
//     setIsLoading(false);
//   }

//   const handleDataChange = (field: keyof Omit<ContactData, 'id' | 'imageBase64'>, value: string | string[]) => {
//     if (extractedData) {
//       setExtractedData({ ...extractedData, [field]: value });
//     }
//   };

//   const handleArrayDataChange = (field: keyof Omit<ContactData, 'id' | 'imageBase64'>, index: number, value: string) => {
//       if (extractedData) {
//           const currentArray = (extractedData[field] as string[]) || [];
//           const newArray = [...currentArray];
//           newArray[index] = value;
//           handleDataChange(field, newArray);
//       }
//   };
  
//   const saveContact = async () => {
//     if (!contactsCollectionRef) {
//         setError("Firebase not configured. Cannot save contact.");
//         return;
//     }
//     if (extractedData && frontImageBase64) {
//       setIsLoading(true);
//       const newContactPayload = {
//         name: extractedData.name || "",
//         designation: extractedData.designation || "",
//         company: extractedData.company || "",
//         phoneNumbers: extractedData.phoneNumbers || [],
//         emails: extractedData.emails || [],
//         websites: extractedData.websites || [],
//         address: extractedData.address || "",
//         imageBase64: frontImageBase64,
//         createdAt: serverTimestamp(),
//       };
//       try {
//         await addDoc(contactsCollectionRef, newContactPayload);
//         resetState();
//         fetchContacts();
//       } catch (e: any) {
//         console.error("Error saving to firestore:", e.message);
//         setError("Failed to save contact.");
//         setIsLoading(false);
//       }
//     }
//   };

//   const saveAllBulk = async () => {
//     if (!contactsCollectionRef) {
//         setError("Firebase not configured. Cannot save contacts.");
//         return;
//     }
//     const successfulItems = bulkItems.filter(item => item.status === 'success' && item.extractedData);
//     if(successfulItems.length === 0) return;

//     setIsLoading(true);
//     let successCount = 0;
//     for (const item of successfulItems) {
//         try {
//              const newContactPayload = {
//                 name: item.extractedData.name || "",
//                 designation: item.extractedData.designation || "",
//                 company: item.extractedData.company || "",
//                 phoneNumbers: item.extractedData.phoneNumbers || [],
//                 emails: item.extractedData.emails || [],
//                 websites: item.extractedData.websites || [],
//                 address: item.extractedData.address || "",
//                 imageBase64: item.base64,
//                 createdAt: serverTimestamp(),
//             };
//             await addDoc(contactsCollectionRef, newContactPayload);
//             successCount++;
//         } catch (e: any) {
//             console.error(`Failed to save ${item.file.name}:`, e.message);
//         }
//     }
//     alert(`${successCount} of ${successfulItems.length} contacts saved successfully.`);
//     resetState();
//     fetchContacts();
//   }

//   const deleteContact = async (id: string) => {
//     if (!db || !contactsCollectionRef) return;
//     const isConfirmed = window.confirm("Are you sure you want to delete this contact?");
//     if (isConfirmed) {
//         try {
//             await deleteDoc(doc(db, "visiting_cards", id));
//             fetchContacts();
//         } catch (e: any) {
//             console.error("Error deleting document: ", e.message);
//             setError("Failed to delete contact.");
//         }
//     }
//   };
  
//   const editContact = (contact: ContactData) => {
//     setMode('single');
//     resetState();
//     setExtractedData(contact);
//     setFrontImageBase64(contact.imageBase64);
//     alert("Editing mode: After saving, this will create a new contact. You may want to delete the old one.");
//   }

//   const downloadVcf = (data: Partial<ContactData>) => {
//     const { name, designation, company, phoneNumbers, emails, websites, address } = data;
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
//     if (phoneNumbers) phoneNumbers.forEach(p => { vCard += `TEL;TYPE=WORK,VOICE:${p}\n`; });
//     if (emails) emails.forEach(e => { vCard += `EMAIL:${e}\n`; });
//     if (websites) websites.forEach(w => { vCard += `URL:${w}\n`; });
//     if (address) vCard += `ADR;TYPE=WORK:;;${address.replace(/\n/g, '\\n')};;;;\n`;
//     vCard += "END:VCARD";

//     const blob = new Blob([vCard], { type: "text/vcard" });
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement("a");
//     a.href = url;
//     a.download = (name?.replace(/\s/g, '_') || 'contact') + '.vcf';
//     document.body.appendChild(a);
//     a.click();
//     document.body.removeChild(a);
//     URL.revokeObjectURL(url);
//   };
  
//   const downloadCsv = (data: Partial<ContactData>[]) => {
//       const headers = "Name,Designation,Company,Phone Numbers,Emails,Websites,Address\n";
      
//       const escapeCsvField = (field: string | null | undefined): string => {
//         if (field === null || field === undefined) return '""';
//         const str = String(field).replace(/"/g, '""').replace(/\n/g, ' ');
//         return `"${str}"`;
//       };

//       const rows = data.map(d => [
//           escapeCsvField(d.name),
//           escapeCsvField(d.designation),
//           escapeCsvField(d.company),
//           escapeCsvField((d.phoneNumbers || []).join(', ')),
//           escapeCsvField((d.emails || []).join(', ')),
//           escapeCsvField((d.websites || []).join(', ')),
//           escapeCsvField(d.address),
//       ].join(','));
      
//       const csv = headers + rows.join('\n');

//       const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
//       const url = URL.createObjectURL(blob);
//       const a = document.createElement("a");
//       a.href = url;
//       a.download = data.length > 1 ? 'contacts_export.csv' : (data[0].name?.replace(/\s/g, '_') || 'contact') + '.csv';
//       document.body.appendChild(a);
//       a.click();
//       document.body.removeChild(a);
//       URL.revokeObjectURL(url);
//   };
  
//   const handleCommandSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!chatInput.trim() || isChatLoading || !isAiConfigured || !API_KEY) return;

//     const userMessage: ChatMessage = { role: 'user', text: chatInput.trim() };
//     setChatHistory(prev => [...prev, userMessage]);
//     setChatInput("");
//     setIsChatLoading(true);

//     // Add an empty model message to render the typing indicator
//     setChatHistory(prev => [...prev, { role: 'model', text: '' }]);

//     try {
//         const ai = new GoogleGenAI({ apiKey: API_KEY });
//         const contactsJson = JSON.stringify(
//             savedContacts.map(c => ({
//                 name: c.name,
//                 designation: c.designation,
//                 company: c.company,
//                 phoneNumbers: c.phoneNumbers,
//                 emails: c.emails,
//                 websites: c.websites,
//                 address: c.address,
//             }))
//         );
        
//         const systemInstruction = `You are an AI assistant for a business card app. Your task is to answer questions about the user's saved contacts. You will be given a list of contacts in JSON format. Base your answers STRICTLY on the information provided in the JSON data. If the information is not present in the contacts, state that you cannot find the information. Do not make up any details. Keep your answers concise and helpful. Here is the contact data: ${contactsJson}`;

//         const responseStream = await ai.models.generateContentStream({
//             model: "gemini-2.5-flash",
//             contents: userMessage.text,
//             config: { systemInstruction },
//         });

//         let fullResponse = "";
//         for await (const chunk of responseStream) {
//             fullResponse += chunk.text;
//             setChatHistory(prev => {
//                 const updated = [...prev];
//                 updated[updated.length - 1] = { role: 'model', text: fullResponse };
//                 return updated;
//             });
//         }
        
//         if (fullResponse.trim() === "") {
//             setChatHistory(prev => {
//                 const updated = [...prev];
//                 updated[updated.length - 1] = { role: 'model', text: "I don't have a response for that." };
//                 return updated;
//             });
//         }

//     } catch (err: any) {
//         console.error("Chat command failed:", err.message);
//         const errorMessage = `Sorry, I encountered an error: ${err.message}`;
//         setChatHistory(prev => {
//              const updated = [...prev];
//              updated[updated.length - 1] = { role: 'model', text: errorMessage };
//              return updated;
//         });
//     } finally {
//         setIsChatLoading(false);
//     }
//   };


//   if (!isFirebaseConfigured || !isAiConfigured) {
//       return (
//         <>
//         <header>
//             <h1><span role="img" aria-label="contact card" className="icon">📇</span> AI Business Card Scanner</h1>
//         </header>
//         <main><div className="card error-message">
//               <h2>Configuration Error</h2>
//               {!isFirebaseConfigured && <p>Your Firebase configuration is incomplete. Please add your project credentials to the <code>firebaseConfig</code> object in <code>index.tsx</code>.</p>}
//               {!isAiConfigured && <p>Your Google AI API Key is missing. Please replace the placeholder in <code>index.tsx</code> with your actual key.</p>}
//               <p>The application cannot start without valid configurations.</p>
//         </div></main>
//         </>
//       )
//   }

//   const renderField = (label: string, field: keyof Omit<ContactData, 'id' | 'imageBase64'>) => (
//      <div className="form-group">
//       <label htmlFor={field}>{label}</label>
//       <input
//         type="text"
//         id={field}
//         value={((extractedData?.[field] as string) || '')}
//         onChange={(e) => handleDataChange(field, e.target.value)}
//       />
//     </div>
//   );
  
//   const renderArrayField = (label: string, field: keyof Omit<ContactData, 'id' | 'imageBase64'>) => (
//     <div className="form-group" style={{gridColumn: '1 / -1'}}>
//       <label>{label}</label>
//       {((extractedData?.[field] as string[]) || []).map((item, index) => (
//          <input
//             key={index}
//             type="text"
//             value={item}
//             onChange={(e) => handleArrayDataChange(field, index, e.target.value)}
//             style={{marginBottom: '0.5rem'}}
//           />
//       ))}
//     </div>
//   );

//   return (
//     <>
//       <header>
//         <h1><span role="img" aria-label="contact card" className="icon">📇</span> AI Business Card Scanner</h1>
//       </header>
//       <main>
//         <div className="card input-section">
//             <div className="mode-toggle">
//                 <button className={mode === 'single' ? 'active' : ''} onClick={() => { resetState(); setMode('single'); }}>Single Card</button>
//                 <button className={mode === 'bulk' ? 'active' : ''} onClick={() => { resetState(); setMode('bulk'); }}>Bulk Upload</button>
//             </div>
          
//             <input type="file" ref={fileInputRef} onChange={(e) => handleFileChange(e, mode === 'single' ? (frontImageBase64 ? 'back' : 'front') : 'bulk')} accept="image/*" multiple={mode === 'bulk'} style={{display: 'none'}}/>

//             {mode === 'single' && (
//                 <>
//                     <div className="actions">
//                         <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()} disabled={isLoading || !!backImageBase64}>
//                             <span role="img" aria-label="upload">📤</span> {frontImageBase64 ? 'Upload Back' : 'Upload Front'}
//                         </button>
//                         <button className="btn btn-secondary" onClick={() => openCamera(frontImageBase64 ? 'back' : 'front')} disabled={isLoading || !!backImageBase64}>
//                             <span role="img" aria-label="camera">📸</span> {frontImageBase64 ? 'Camera (Back)' : 'Camera (Front)'}
//                         </button>
//                     </div>
//                     {(frontImageBase64 || backImageBase64) && (
//                          <div className="image-previews">
//                             {frontImageBase64 && <div className="preview-container"><img src={`data:image/jpeg;base64,${frontImageBase64}`} alt="Front Preview"/><p>Front</p></div>}
//                             {backImageBase64 && <div className="preview-container"><img src={`data:image/jpeg;base64,${backImageBase64}`} alt="Back Preview"/><p>Back</p></div>}
//                          </div>
//                     )}
//                     <div className="result-actions" style={{marginTop: '1.5rem'}}>
//                         {frontImageBase64 && <button className="btn btn-primary" onClick={handleSingleCardProcess} disabled={isLoading}>Process Card</button>}
//                     </div>
//                 </>
//             )}

//             {mode === 'bulk' && (
//                 <>
//                     <div className="actions">
//                         <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
//                             <span role="img" aria-label="upload">📤</span> Upload Multiple Cards
//                         </button>
//                     </div>
//                     {bulkItems.length > 0 && (
//                         <div className="bulk-list">
//                             <ul style={{marginTop: '1.5rem'}}>
//                                 {bulkItems.map(item => (
//                                     <li key={item.id} className="bulk-item">
//                                         <div className="info">
//                                             <h3>{item.file.name}</h3>
//                                             {item.status === 'error' && <p style={{color: 'var(--error-color)'}}>{item.error}</p>}
//                                         </div>
//                                         <span className={`status status-${item.status}`}>{item.status}</span>
//                                     </li>
//                                 ))}
//                             </ul>
//                             <div className="bulk-actions">
//                                <button className="btn btn-primary" onClick={saveAllBulk} disabled={isLoading || bulkItems.every(i => i.status !== 'success')}>
//                                    <span role="img" aria-label="save">💾</span> Save All Successful
//                                 </button>
//                                 <button className="btn btn-secondary" onClick={() => downloadCsv(bulkItems.filter(i => i.status === 'success').map(i => i.extractedData || {}))} disabled={isLoading || bulkItems.every(i => i.status !== 'success')}>
//                                     Export All to CSV
//                                 </button>
//                             </div>
//                         </div>
//                     )}
//                 </>
//             )}

//             {isCameraOpen && (
//                 <div className="video-container">
//                     <video ref={videoRef} autoPlay playsInline></video>
//                     <div className="controls">
//                        <button className="btn btn-primary" onClick={takeSnapshot}>Capture</button>
//                        <button className="btn btn-secondary" onClick={closeCamera}>Cancel</button>
//                     </div>
//                 </div>
//             )}
//             {error && <div className="error-message">{error}</div>}
//             {isLoading && mode !== 'bulk' && (
//                 <div className="loading-overlay">
//                     <div className="spinner"></div>
//                     <p>Scanning your card...</p>
//                 </div>
//             )}
//         </div>

//         {extractedData && (
//           <div className="card results-section">
//             <h2>Verify & Save</h2>
//              <div className="form-grid">
//               {renderField("Name", "name")}
//               {renderField("Designation", "designation")}
//               {renderField("Company", "company")}
//               {renderField("Address", "address")}
//               {renderArrayField("Phone Numbers", "phoneNumbers")}
//               {renderArrayField("Emails", "emails")}
//               {renderArrayField("Websites", "websites")}
//             </div>
//             <div className="result-actions">
//               <button className="btn btn-primary" onClick={saveContact} disabled={isLoading}>
//                 <span role="img" aria-label="save">💾</span> Save to Firebase
//               </button>
//               <button className="btn btn-secondary" onClick={() => downloadVcf(extractedData)}>Download .vcf</button>
//               <button className="btn btn-secondary" onClick={() => downloadCsv([extractedData])}>Download .csv</button>
//               <button className="btn btn-secondary" style={{borderColor: 'var(--error-color)', color: 'var(--error-color)'}} onClick={resetState}>Cancel</button>
//             </div>
//           </div>
//         )}

//         {savedContacts.length > 0 && !extractedData && bulkItems.length === 0 && (
//           <>
//             <div className="card command-center">
//                 <h2><span role="img" aria-label="magic-wand" style={{ marginRight: '0.5rem' }}>🪄</span>AI Command Center</h2>
//                 <div className="chat-display" ref={chatDisplayRef}>
//                     {chatHistory.map((msg, index) => (
//                         <div key={index} className={`chat-message ${msg.role}-message`}>
//                             {msg.role === 'model' && msg.text === '' && isChatLoading ? (
//                                 <div className="typing-indicator"><span></span><span></span><span></span></div>
//                             ) : (
//                                 <p>{msg.text}</p>
//                             )}
//                         </div>
//                     ))}
//                 </div>
//                 <form onSubmit={handleCommandSubmit} className="command-form">
//                     <input
//                         type="text"
//                         value={chatInput}
//                         onChange={(e) => setChatInput(e.target.value)}
//                         placeholder="e.g., 'Who works at Google?'"
//                         disabled={isChatLoading}
//                         aria-label="Ask the AI assistant a question about your contacts"
//                     />
//                     <button type="submit" disabled={isChatLoading || !chatInput.trim()} aria-label="Send command">
//                         <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
//                     </button>
//                 </form>
//             </div>
//             <div className="card contact-list">
//                 <h2>Saved Contacts</h2>
//                 <ul>
//                 {savedContacts.map(contact => (
//                     <li key={contact.id} className="contact-item">
//                     <div className="info">
//                         <h3>{contact.name || 'No Name'}</h3>
//                         <p>{contact.company || 'No Company'}</p>
//                     </div>
//                     <div className="actions">
//                         <button onClick={() => editContact(contact)} title="Edit">
//                             <span role="img" aria-label="edit">✏️</span>
//                         </button>
//                         <button onClick={() => deleteContact(contact.id)} title="Delete" style={{color: 'var(--error-color)'}}>
//                             <span role="img" aria-label="delete">🗑️</span>
//                         </button>
//                     </div>
//                     </li>
//                 ))}
//                 </ul>
//             </div>
//           </>
//         )}
//       </main>
//     </>
//   );
// };

// export default App;


// import React, { useState, useRef, useEffect, useCallback } from "react";
// import { createRoot } from "react-dom/client";
// import { GoogleGenerativeAI } from "@google/generative-ai";
// import { initializeApp } from "firebase/app";
// import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from "firebase/firestore";
// import logo from './assets/logo.jpg'

// // --- Global Error Handler ---
// window.addEventListener('unhandledrejection', function(event) {
//   event.preventDefault();
//   if (event.reason) {
//     console.error("Unhandled Rejection:", event.reason.message || event.reason);
//   } else {
//     console.error("Unhandled Rejection with no reason object.");
//   }
// });


// // --- Firebase Configuration ---
// const firebaseConfig = {
//   apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
//   authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
//   projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
//   storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
//   messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
//   appId: import.meta.env.VITE_FIREBASE_APP_ID,
// };

// const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

// // --- Configuration Checks ---
// const isFirebaseConfigured =
//   firebaseConfig &&
//   firebaseConfig.apiKey &&
//   firebaseConfig.projectId;

// const isAiConfigured = !!API_KEY;


// // Initialize Firebase only if configured
// let db;
// let contactsCollectionRef;
// if (isFirebaseConfigured) {
//   try {
//     const app = initializeApp(firebaseConfig);
//     db = getFirestore(app);
//     contactsCollectionRef = collection(db, "visiting_cards");
//   } catch (e) {
//     console.error("Firebase initialization error:", e.message);
//   }
// }

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
// }

// type AppMode = 'single' | 'bulk';
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

// type Part = {
//   text: string;
// } | {
//   inlineData: {
//     mimeType: string;
//     data: string;
//   };
// };
// // --- Main App Component ---
// const App = () => {
//   // --- State Management ---
//   const [mode, setMode] = useState<AppMode>('single');
//   const [savedContacts, setSavedContacts] = useState<ContactData[]>([]);
//   const [isLoading, setIsLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   // Single Card State
//   const [frontImageBase64, setFrontImageBase64] = useState<string | null>(null);
//   const [backImageBase64, setBackImageBase64] = useState<string | null>(null);
//   const [extractedData, setExtractedData] = useState<Partial<ContactData> | null>(null);
//   const [isCameraOpen, setIsCameraOpen] = useState(false);
//   const [cameraFor, setCameraFor] = useState<'front' | 'back'>('front');

//   // Bulk Upload State
//   const [bulkItems, setBulkItems] = useState<BulkFileItem[]>([]);
  
//   // AI Command Center State
//   const [chatInput, setChatInput] = useState('');
//   const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
//   const [isChatLoading, setIsChatLoading] = useState(false);

//   // --- Refs ---
//   const fileInputRef = useRef<HTMLInputElement>(null);
//   const videoRef = useRef<HTMLVideoElement>(null);
//   const streamRef = useRef<MediaStream | null>(null);
//   const chatDisplayRef = useRef<HTMLDivElement>(null);

//   // --- Effects ---
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
//       const contacts = data.docs.map(doc => {
//         const docData = doc.data();
//         return {
//           id: doc.id,
//           name: docData.name || "",
//           designation: docData.designation || "",
//           company: docData.company || "",
//           phoneNumbers: docData.phoneNumbers || [],
//           emails: docData.emails || [],
//           websites: docData.websites || [],
//           address: docData.address || "",
//           imageBase64: docData.imageBase64 || "",
//         } as ContactData;
//       });
//       setSavedContacts(contacts);
//     } catch (e) {
//        const error = e as Error;
//        console.error("Failed to load contacts from Firestore:", error.message);
//        if (error.message.includes("Could not reach Cloud Firestore backend")) {
//         setError("Could not connect to Firestore. Please check your internet connection and ensure this app's domain is added to your Firebase project's authorized domains.");
//       } else if (error.message.includes("Missing or insufficient permissions")) {
//         setError("Firestore permissions error. Please check your project's Firestore security rules.");
//       } else {
//         setError("Could not load saved contacts. An unknown error occurred.");
//       }
//     }
//     setIsLoading(false);
//   }, []);

//   useEffect(() => {
//     if(isFirebaseConfigured) {
//         fetchContacts();
//     }
//   }, [fetchContacts]);

//   // --- Helper Functions ---
//   const resetState = () => {
//     setFrontImageBase64(null);
//     setBackImageBase64(null);
//     setExtractedData(null);
//     setBulkItems([]);
//     setError(null);
//     setIsLoading(false);
//   };

//   const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
//     const files = event.target.files;
//     if (!files || files.length === 0) return;
    
//     if (mode === 'bulk') {
//         resetState();
//         const newBulkItems: BulkFileItem[] = Array.from(files).map((file: File) => ({
//             id: `${file.name}-${Date.now()}`,
//             file,
//             base64: '',
//             status: 'pending',
//         }));
//         setBulkItems(newBulkItems);
//         processBulkQueue(newBulkItems);
//     } else {
//         const file = files[0];
//         const reader = new FileReader();
//         reader.onloadend = () => {
//             const base64String = (reader.result as string).split(",")[1];
//             if (!frontImageBase64) {
//                 setFrontImageBase64(base64String);
//             } else {
//                 setBackImageBase64(base64String);
//             }
//         };
//         reader.readAsDataURL(file);
//     }
//     if(fileInputRef.current) fileInputRef.current.value = '';
//   };
  
//   const openCamera = async (forSide: 'front' | 'back') => {
//     setCameraFor(forSide);
//     try {
//       if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
//         const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
//         setIsCameraOpen(true);
//         streamRef.current = stream;
//         if (videoRef.current) {
//           videoRef.current.srcObject = stream;
//         }
//       } else {
//         setError("Camera not supported on this device/browser.");
//       }
//     } catch (err) {
//       const error = err as Error;
//       console.error("Error accessing camera: ", error.message);
//       setError("Could not access the camera. Please ensure permissions are granted.");
//     }
//   };

//   const closeCamera = () => {
//     if (streamRef.current) {
//       streamRef.current.getTracks().forEach(track => track.stop());
//     }
//     setIsCameraOpen(false);
//     streamRef.current = null;
//   };
  
//   const takeSnapshot = () => {
//     if (videoRef.current) {
//       const canvas = document.createElement("canvas");
//       canvas.width = videoRef.current.videoWidth;
//       canvas.height = videoRef.current.videoHeight;
//       const ctx = canvas.getContext('2d');
//       if (ctx) {
//         ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
//         const base64String = canvas.toDataURL('image/jpeg').split(',')[1];
//         if(cameraFor === 'front') setFrontImageBase64(base64String);
//         else setBackImageBase64(base64String);
//       }
//       closeCamera();
//     }
//   };

//   // const processCardImages = async (frontB64: string, backB64?: string | null): Promise<Partial<ContactData>> => {
//   //   if (!isAiConfigured || !API_KEY) throw new Error("Google AI API Key is not configured.");

//   //   const genAI = new GoogleGenerativeAI(API_KEY);
//   //   const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

//   //   const parts: Part[] = [
//   //     { inlineData: { mimeType: 'image/jpeg', data: frontB64 } },
//   //   ];
    
//   //   let promptText = "Analyze this image of a business card and extract the contact details in JSON format with the following keys: name, designation, company, phoneNumbers, emails, websites, address. If a field is not present, return an empty string or empty array for it.";
//   //   if (backB64) {
//   //     parts.push({ inlineData: { mimeType: 'image/jpeg', data: backB64 } });
//   //     promptText = "Analyze these two images (front and back of a business card) and extract the combined contact details in JSON format with the following keys: name, designation, company, phoneNumbers, emails, websites, address. If a field is not present, return an empty string or empty array for it.";
//   //   }
//   //   parts.push({ text: promptText });
    
//   //   const result = await model.generateContent({ contents: [{ role: "user", parts }] });
//   //   const response = result.response;
//   //   const text = response.text().replace("```json", "").replace("```", "").trim();
//   //   return JSON.parse(text);
//   // };
//     const processCardImages = async (frontB64: string, backB64?: string | null): Promise<Partial<ContactData>> => {
//     if (!isAiConfigured || !API_KEY) throw new Error("Google AI API Key is not configured.");

//     const genAI = new GoogleGenerativeAI(API_KEY);
//     const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

//     const parts: Part[] = [
//       { inlineData: { mimeType: 'image/jpeg', data: frontB64 } },
//     ];
    
//     // The prompt is simplified; we just describe the task.
//     // The JSON structure is handled by the model's JSON mode.
//     let promptText = `Analyze the business card image(s) and extract the contact details. Return a single JSON object with the following keys: "name", "designation", "company", "phoneNumbers", "emails", "websites", "address". If any information is not found, return an empty string for string fields or an empty array for array fields.`;

//     if (backB64) {
//       parts.push({ inlineData: { mimeType: 'image/jpeg', data: backB64 } });
//     }
//     parts.push({ text: promptText });
    
//     const result = await model.generateContent({
//       contents: [{ role: "user", parts }],
//       // THIS IS THE CRITICAL FIX
//       generationConfig: {
//         responseMimeType: "application/json",
//       },
//     });
    
//     const response = result.response;
//     // Now, response.text() will be a pure, valid JSON string. No more cleaning needed!
//     const text = response.text();
//     return JSON.parse(text);
//   };
//     const handleSingleCardProcess = async () => {
//     if(!frontImageBase64) return;
//     setIsLoading(true);
//     setError(null);
//     setExtractedData(null);
//     try {
//         const parsedData = await processCardImages(frontImageBase64, backImageBase64 ?? undefined);
//         setExtractedData(parsedData);
//     } catch (e) {
//         const error = e as Error;
//         console.error("Error processing card:", error.message);
//         setError(`Failed to process image. ${error.message || 'An unknown error occurred.'}`);
//     } finally {
//         setIsLoading(false);
//     }
//   };

//   const processBulkQueue = async (items: BulkFileItem[]) => {
//     setIsLoading(true);
//     let processedItems = [...items];

//     for (let i = 0; i < items.length; i++) {
//         const item = items[i];
        
//         const base64 = await new Promise<string>((resolve, reject) => {
//             const reader = new FileReader();
//             reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
//             reader.onerror = reject;
//             reader.readAsDataURL(item.file);
//         });
        
//         processedItems = processedItems.map(p => p.id === item.id ? { ...p, base64, status: 'processing' } : p);
//         setBulkItems(processedItems);

//         try {
//             const parsedData = await processCardImages(base64);
//             processedItems = processedItems.map(p => p.id === item.id ? { ...p, status: 'success', extractedData: parsedData } : p);
//             setBulkItems(processedItems);
//         } catch(e) {
//             const error = e as Error;
//             console.error(`Error processing ${item.file.name}:`, error.message);
//             processedItems = processedItems.map(p => p.id === item.id ? { ...p, status: 'error', error: error.message || "Failed to process" } : p);
//             setBulkItems(processedItems);
//         }
//     }
//     setIsLoading(false);
//   }

//   const handleDataChange = (field: keyof Omit<ContactData, 'id' | 'imageBase64'>, value: string | string[]) => {
//     if (extractedData) {
//       setExtractedData({ ...extractedData, [field]: value });
//     }
//   };

//   const handleArrayDataChange = (field: keyof Omit<ContactData, 'id' | 'imageBase64'>, index: number, value: string) => {
//       if (extractedData) {
//           const currentArray = (extractedData[field] as string[]) || [];
//           const newArray = [...currentArray];
//           newArray[index] = value;
//           handleDataChange(field, newArray);
//       }
//   };
  
//   const saveContact = async () => {
//     if (!contactsCollectionRef) {
//         setError("Firebase not configured. Cannot save contact.");
//         return;
//     }
//     if (extractedData && frontImageBase64) {
//       setIsLoading(true);
//       const newContactPayload = {
//         name: extractedData.name || "",
//         designation: extractedData.designation || "",
//         company: extractedData.company || "",
//         phoneNumbers: extractedData.phoneNumbers || [],
//         emails: extractedData.emails || [],
//         websites: extractedData.websites || [],
//         address: extractedData.address || "",
//         imageBase64: frontImageBase64,
//         createdAt: serverTimestamp(),
//       };
//       try {
//         await addDoc(contactsCollectionRef, newContactPayload);
//         resetState();
//         fetchContacts();
//       } catch (e) {
//         const error = e as Error;
//         console.error("Error saving to firestore:", error.message);
//         setError("Failed to save contact.");
//         setIsLoading(false);
//       }
//     }
//   };

//   const saveAllBulk = async () => {
//     if (!contactsCollectionRef) {
//         setError("Firebase not configured. Cannot save contacts.");
//         return;
//     }
//     const successfulItems = bulkItems.filter(item => item.status === 'success' && item.extractedData);
//     if(successfulItems.length === 0) return;

//     setIsLoading(true);
//     let successCount = 0;
//     for (const item of successfulItems) {
//         if(item.extractedData){
//             try {
//                 const newContactPayload = {
//                    name: item.extractedData.name || "",
//                    designation: item.extractedData.designation || "",
//                    company: item.extractedData.company || "",
//                    phoneNumbers: item.extractedData.phoneNumbers || [],
//                    emails: item.extractedData.emails || [],
//                    websites: item.extractedData.websites || [],
//                    address: item.extractedData.address || "",
//                    imageBase64: item.base64,
//                    createdAt: serverTimestamp(),
//                };
//                await addDoc(contactsCollectionRef, newContactPayload);
//                successCount++;
//            } catch (e) {
//                const error = e as Error;
//                console.error(`Failed to save ${item.file.name}:`, error.message);
//            }
//         }
//     }
//     alert(`${successCount} of ${successfulItems.length} contacts saved successfully.`);
//     resetState();
//     fetchContacts();
//   }

//   const deleteContact = async (id: string) => {
//     if (!db || !contactsCollectionRef) return;
//     const isConfirmed = window.confirm("Are you sure you want to delete this contact?");
//     if (isConfirmed) {
//         try {
//             await deleteDoc(doc(db, "visiting_cards", id));
//             fetchContacts();
//         } catch (e) {
//             const error = e as Error;
//             console.error("Error deleting document: ", error.message);
//             setError("Failed to delete contact.");
//         }
//     }
//   };
  
//   const editContact = (contact: ContactData) => {
//     setMode('single');
//     resetState();
//     setExtractedData(contact);
//     setFrontImageBase64(contact.imageBase64);
//     alert("Editing mode: After saving, this will create a new contact. You may want to delete the old one.");
//   }

//   const downloadVcf = (data: Partial<ContactData>) => {
//     const { name, designation, company, phoneNumbers, emails, websites, address } = data;
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
//     if (phoneNumbers) phoneNumbers.forEach(p => { vCard += `TEL;TYPE=WORK,VOICE:${p}\n`; });
//     if (emails) emails.forEach(e => { vCard += `EMAIL:${e}\n`; });
//     if (websites) websites.forEach(w => { vCard += `URL:${w}\n`; });
//     if (address) vCard += `ADR;TYPE=WORK:;;${address.replace(/\n/g, '\\n')};;;;\n`;
//     vCard += "END:VCARD";

//     const blob = new Blob([vCard], { type: "text/vcard" });
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement("a");
//     a.href = url;
//     a.download = (name?.replace(/\s/g, '_') || 'contact') + '.vcf';
//     document.body.appendChild(a);
//     a.click();
//     document.body.removeChild(a);
//     URL.revokeObjectURL(url);
//   };
  
//   const downloadCsv = (data: Partial<ContactData>[]) => {
//       const headers = "Name,Designation,Company,Phone Numbers,Emails,Websites,Address\n";
      
//       const escapeCsvField = (field: string | null | undefined): string => {
//         if (field === null || field === undefined) return '""';
//         const str = String(field).replace(/"/g, '""').replace(/\n/g, ' ');
//         return `"${str}"`;
//       };

//       const rows = data.map(d => [
//           escapeCsvField(d.name),
//           escapeCsvField(d.designation),
//           escapeCsvField(d.company),
//           escapeCsvField((d.phoneNumbers || []).join(', ')),
//           escapeCsvField((d.emails || []).join(', ')),
//           escapeCsvField((d.websites || []).join(', ')),
//           escapeCsvField(d.address),
//       ].join(','));
      
//       const csv = headers + rows.join('\n');

//       const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
//       const url = URL.createObjectURL(blob);
//       const a = document.createElement("a");
//       a.href = url;
//       a.download = data.length > 1 ? 'contacts_export.csv' : (data[0].name?.replace(/\s/g, '_') || 'contact') + '.csv';
//       document.body.appendChild(a);
//       a.click();
//       document.body.removeChild(a);
//       URL.revokeObjectURL(url);
//   };
  
//   const handleCommandSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!chatInput.trim() || isChatLoading || !isAiConfigured || !API_KEY) return;

//     const userMessage: ChatMessage = { role: 'user', text: chatInput.trim() };
//     setChatHistory(prev => [...prev, userMessage]);
//     setChatInput("");
//     setIsChatLoading(true);
//     setChatHistory(prev => [...prev, { role: 'model', text: '' }]);

//     try {
//         const genAI = new GoogleGenerativeAI(API_KEY);
//         const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

//         const contactsJson = JSON.stringify(
//             savedContacts.map(c => ({
//                 name: c.name,
//                 designation: c.designation,
//                 company: c.company,
//                 phoneNumbers: c.phoneNumbers,
//                 emails: c.emails,
//                 websites: c.websites,
//                 address: c.address,
//             }))
//         );
        
//         const prompt = `You are an AI assistant for a business card app. Your task is to answer questions about the user's saved contacts. You will be given a list of contacts in JSON format. Base your answers STRICTLY on the information provided in the JSON data. If the information is not present in the contacts, state that you cannot find the information. Do not make up any details. Keep your answers concise and helpful. Here is the contact data: ${contactsJson}\n\nUser question: ${userMessage.text}`;

//         const result = await model.generateContent(prompt);
//         const response = result.response;
//         const fullResponse = response.text();

//         setChatHistory(prev => {
//             const updated = [...prev];
//             updated[updated.length - 1] = { role: 'model', text: fullResponse };
//             return updated;
//         });

//     } catch (err) {
//         const error = err as Error;
//         console.error("Chat command failed:", error.message);
//         const errorMessage = `Sorry, I encountered an error: ${error.message}`;
//         setChatHistory(prev => {
//              const updated = [...prev];
//              updated[updated.length - 1] = { role: 'model', text: errorMessage };
//              return updated;
//         });
//     } finally {
//         setIsChatLoading(false);
//     }
//   };

//   // --- Render Logic ---
//   if (!isFirebaseConfigured || !isAiConfigured) {
//       return (
//         <div className="min-h-screen bg-black text-white font-sans flex items-center justify-center">
//             <div className="bg-red-700 p-8 rounded-lg shadow-lg text-center">
//               <h2 className="text-2xl font-bold mb-4">Configuration Error</h2>
//               {!isFirebaseConfigured && <p>Your Firebase configuration is incomplete. Please check your <code>.env</code> file.</p>}
//               {!isAiConfigured && <p>Your Google AI API Key is missing. Please check your <code>.env</code> file.</p>}
//               <p className="mt-4">The application cannot start without valid configurations.</p>
//             </div>
//         </div>
//       )
//   }
  
//   const renderField = (label: string, field: keyof Omit<ContactData, 'id' | 'imageBase64'>) => (
//      <div className="form-group">
//       <label htmlFor={field}>{label}</label>
//       <input
//         type="text"
//         id={field}
//         value={((extractedData?.[field] as string) || '')}
//         onChange={(e) => handleDataChange(field, e.target.value)}
//         className="w-full p-2 border border-gray-300 rounded"
//       />
//     </div>
//   );
  
//   const renderArrayField = (label: string, field: keyof Omit<ContactData, 'id' | 'imageBase64'>) => (
//     <div className="form-group" style={{gridColumn: '1 / -1'}}>
//       <label>{label}</label>
//       {((extractedData?.[field] as string[]) || []).map((item, index) => (
//          <input
//             key={index}
//             type="text"
//             value={item}
//             onChange={(e) => handleArrayDataChange(field, index, e.target.value)}
//             className="w-full p-2 border border-gray-300 rounded mb-2"
//           />
//       ))}
//     </div>
//   );

//   return (
//     <div className="min-h-screen bg-gray-100 text-gray-800 font-sans">
//       <header className="bg-red-700 text-white py-4 flex items-center justify-between px-6 shadow-lg border-b-4 border-white">
//         <div className="flex items-center gap-4">
//           <img src={logo} alt="Company Logo" className="h-12 w-12 rounded-full border-2 border-white shadow-lg" />
//           <h1 className="text-2xl font-bold tracking-wide">
//             <span role="img" aria-label="contact card">📇</span> AI Business Card Scanner
//           </h1>
//         </div>
//       </header>
//       <main className="p-6 max-w-7xl mx-auto">
//         <div className="card input-section bg-white p-6 rounded-lg shadow-md mb-8">
//             <div className="mode-toggle flex border-b mb-4">
//                 <button className={`py-2 px-4 ${mode === 'single' ? 'border-b-2 border-red-700 font-semibold' : ''}`} onClick={() => { resetState(); setMode('single'); }}>Single Card</button>
//                 <button className={`py-2 px-4 ${mode === 'bulk' ? 'border-b-2 border-red-700 font-semibold' : ''}`} onClick={() => { resetState(); setMode('bulk'); }}>Bulk Upload</button>
//             </div>
          
//             <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" multiple={mode === 'bulk'} style={{display: 'none'}}/>

//             {mode === 'single' && (
//                 <>
//                     <div className="actions flex gap-4">
//                         <button className="btn btn-primary bg-red-700 text-white py-2 px-4 rounded hover:bg-red-800" onClick={() => fileInputRef.current?.click()} disabled={isLoading || !!backImageBase64}>
//                             <span role="img" aria-label="upload">📤</span> {frontImageBase64 ? 'Upload Back' : 'Upload Front'}
//                         </button>
//                         <button className="btn btn-secondary bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700" onClick={() => openCamera(frontImageBase64 ? 'back' : 'front')} disabled={isLoading || !!backImageBase64}>
//                             <span role="img" aria-label="camera">📸</span> {frontImageBase64 ? 'Camera (Back)' : 'Camera (Front)'}
//                         </button>
//                     </div>
//                     {(frontImageBase64 || backImageBase64) && (
//                          <div className="image-previews flex gap-4 mt-4">
//                             {frontImageBase64 && <div className="preview-container"><img src={`data:image/jpeg;base64,${frontImageBase64}`} alt="Front Preview" className="max-w-xs rounded shadow-md"/><p className="text-center mt-2">Front</p></div>}
//                             {backImageBase64 && <div className="preview-container"><img src={`data:image/jpeg;base64,${backImageBase64}`} alt="Back Preview" className="max-w-xs rounded shadow-md"/><p className="text-center mt-2">Back</p></div>}
//                          </div>
//                     )}
//                     <div className="result-actions mt-6">
//                         {frontImageBase64 && <button className="btn btn-primary bg-red-700 text-white py-2 px-4 rounded hover:bg-red-800" onClick={handleSingleCardProcess} disabled={isLoading}>Process Card</button>}
//                     </div>
//                 </>
//             )}

//             {mode === 'bulk' && (
//                 <>
//                     <div className="actions">
//                         <button className="btn btn-primary bg-red-700 text-white py-2 px-4 rounded hover:bg-red-800" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
//                             <span role="img" aria-label="upload">📤</span> Upload Multiple Cards
//                         </button>
//                     </div>
//                     {bulkItems.length > 0 && (
//                         <div className="bulk-list mt-6">
//                             <ul className="space-y-2">
//                                 {bulkItems.map(item => (
//                                     <li key={item.id} className="bulk-item flex justify-between items-center p-2 bg-gray-100 rounded">
//                                         <div className="info">
//                                             <h3>{item.file.name}</h3>
//                                             {item.status === 'error' && <p className="text-red-500">{item.error}</p>}
//                                         </div>
//                                         <span className={`status status-${item.status} px-2 py-1 rounded-full text-sm ${
//                                             item.status === 'success' ? 'bg-green-200 text-green-800' :
//                                             item.status === 'error' ? 'bg-red-200 text-red-800' :
//                                             item.status === 'processing' ? 'bg-yellow-200 text-yellow-800' : 'bg-gray-200 text-gray-800'
//                                         }`}>{item.status}</span>
//                                     </li>
//                                 ))}
//                             </ul>
//                             <div className="bulk-actions flex gap-4 mt-4">
//                                <button className="btn btn-primary bg-red-700 text-white py-2 px-4 rounded hover:bg-red-800" onClick={saveAllBulk} disabled={isLoading || bulkItems.every(i => i.status !== 'success')}>
//                                    <span role="img" aria-label="save">💾</span> Save All Successful
//                                 </button>
//                                 <button className="btn btn-secondary bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700" onClick={() => downloadCsv(bulkItems.filter(i => i.status === 'success').map(i => i.extractedData || {}))} disabled={isLoading || bulkItems.every(i => i.status !== 'success')}>
//                                     Export All to CSV
//                                 </button>
//                             </div>
//                         </div>
//                     )}
//                 </>
//             )}

//             {isCameraOpen && (
//                 <div className="video-container fixed inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center z-50">
//                     <video ref={videoRef} autoPlay playsInline className="w-full max-w-lg"></video>
//                     <div className="controls mt-4 flex gap-4">
//                        <button className="btn btn-primary bg-red-700 text-white py-2 px-4 rounded hover:bg-red-800" onClick={takeSnapshot}>Capture</button>
//                        <button className="btn btn-secondary bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700" onClick={closeCamera}>Cancel</button>
//                     </div>
//                 </div>
//             )}
//             {error && <div className="error-message bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mt-4" role="alert">{error}</div>}
//             {isLoading && mode !== 'bulk' && (
//                 <div className="loading-overlay fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//                     <div className="spinner border-4 border-t-4 border-t-red-700 border-gray-200 rounded-full w-12 h-12 animate-spin"></div>
//                     <p className="ml-4 text-white">Scanning your card...</p>
//                 </div>
//             )}
//         </div>

//         {extractedData && (
//           <div className="card results-section bg-white p-6 rounded-lg shadow-md mb-8">
//             <h2 className="text-xl font-semibold mb-4">Verify & Save</h2>
//              <div className="form-grid grid grid-cols-1 md:grid-cols-2 gap-4">
//               {renderField("Name", "name")}
//               {renderField("Designation", "designation")}
//               {renderField("Company", "company")}
//               {renderField("Address", "address")}
//               {renderArrayField("Phone Numbers", "phoneNumbers")}
//               {renderArrayField("Emails", "emails")}
//               {renderArrayField("Websites", "websites")}
//             </div>
//             <div className="result-actions flex gap-4 mt-6">
//               <button className="btn btn-primary bg-red-700 text-white py-2 px-4 rounded hover:bg-red-800" onClick={saveContact} disabled={isLoading}>
//                 <span role="img" aria-label="save">💾</span> Save to Firebase
//               </button>
//               <button className="btn btn-secondary bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700" onClick={() => downloadVcf(extractedData)}>Download .vcf</button>
//               <button className="btn btn-secondary bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700" onClick={() => downloadCsv([extractedData])}>Download .csv</button>
//               <button className="btn btn-secondary border border-red-500 text-red-500 py-2 px-4 rounded hover:bg-red-500 hover:text-white" onClick={resetState}>Cancel</button>
//             </div>
//           </div>
//         )}

//         {savedContacts.length > 0 && !extractedData && bulkItems.length === 0 && (
//           <>
//             <div className="card command-center bg-white p-6 rounded-lg shadow-md mb-8">
//                 <h2 className="text-xl font-semibold mb-4"><span role="img" aria-label="magic-wand" className="mr-2">🪄</span>AI Command Center</h2>
//                 <div className="chat-display h-64 overflow-y-auto border rounded p-4 mb-4" ref={chatDisplayRef}>
//                     {chatHistory.map((msg, index) => (
//                         <div key={index} className={`chat-message mb-2 ${msg.role === 'user' ? 'text-right' : ''}`}>
//                              <p className={`inline-block p-2 rounded-lg ${msg.role === 'user' ? 'bg-red-700 text-white' : 'bg-gray-200'}`}>
//                                 {msg.role === 'model' && msg.text === '' && isChatLoading ? (
//                                     <div className="typing-indicator"><span></span><span></span><span></span></div>
//                                 ) : (
//                                     msg.text
//                                 )}
//                              </p>
//                         </div>
//                     ))}
//                 </div>
//                 <form onSubmit={handleCommandSubmit} className="command-form flex gap-2">
//                     <input
//                         type="text"
//                         value={chatInput}
//                         onChange={(e) => setChatInput(e.target.value)}
//                         placeholder="e.g., 'Who works at Google?'"
//                         disabled={isChatLoading}
//                         aria-label="Ask the AI assistant a question about your contacts"
//                         className="flex-grow p-2 border border-gray-300 rounded"
//                     />
//                     <button type="submit" disabled={isChatLoading || !chatInput.trim()} aria-label="Send command" className="bg-red-700 text-white p-2 rounded disabled:bg-red-300">
//                         <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
//                     </button>
//                 </form>
//             </div>
//             <div className="card contact-list bg-white p-6 rounded-lg shadow-md">
//                 <h2 className="text-xl font-semibold mb-4">Saved Contacts</h2>
//                 <ul className="space-y-2">
//                 {savedContacts.map(contact => (
//                     <li key={contact.id} className="contact-item flex justify-between items-center p-3 bg-gray-50 rounded hover:bg-gray-100">
//                     <div className="info">
//                         <h3 className="font-semibold">{contact.name || 'No Name'}</h3>
//                         <p className="text-sm text-gray-600">{contact.company || 'No Company'}</p>
//                     </div>
//                     <div className="actions flex gap-2">
//                         <button onClick={() => editContact(contact)} title="Edit" className="text-gray-500 hover:text-gray-700">
//                             <span role="img" aria-label="edit">✏️</span>
//                         </button>
//                         <button onClick={() => deleteContact(contact.id)} title="Delete" className="text-red-500 hover:text-red-700">
//                             <span role="img" aria-label="delete">🗑️</span>
//                         </button>
//                     </div>
//                     </li>
//                 ))}
//                 </ul>
//             </div>
//           </>
//         )}
//       </main>
//       <footer className="bg-red-700 text-white text-center py-3 mt-12 text-sm border-t-4 border-white">
//         © {new Date().getFullYear()} StarShield Technologies Pvt Ltd. All rights reserved.
//       </footer>
//     </div>
//   );
// };

// export default App;

// import React, { useState, useRef, useEffect, useCallback } from "react";
// import { GoogleGenerativeAI } from "@google/generative-ai";
// import { initializeApp } from "firebase/app";
// import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from "firebase/firestore";
// import logo from './assets/logo.jpg'
// const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
// const [showInstallBanner, setShowInstallBanner] = useState(false);

// // --- Global Error Handler ---
// window.addEventListener('unhandledrejection', function(event) {
//   event.preventDefault();
//   if (event.reason) {
//     console.error("Unhandled Rejection:", event.reason.message || event.reason);
//   } else {
//     console.error("Unhandled Rejection with no reason object.");
//   }
// });

// // --- Firebase Configuration ---
// const firebaseConfig = {
//   apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
//   authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
//   projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
//   storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
//   messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
//   appId: import.meta.env.VITE_FIREBASE_APP_ID,
// };

// const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

// // --- Configuration Checks ---
// const isFirebaseConfigured =
//   firebaseConfig &&
//   firebaseConfig.apiKey &&
//   firebaseConfig.projectId;

// const isAiConfigured = !!API_KEY;

// // Initialize Firebase only if configured
// let db;
// let contactsCollectionRef;
// if (isFirebaseConfigured) {
//   try {
//     const app = initializeApp(firebaseConfig);
//     db = getFirestore(app);
//     contactsCollectionRef = collection(db, "visiting_cards");
//   } catch (e) {
//     console.error("Firebase initialization error:", (e as Error).message);
//   }
// }

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
// }

// type AppMode = 'single' | 'bulk';
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

// type Part = {
//   text: string;
// } | {
//   inlineData: {
//     mimeType: string;
//     data: string;
//   };
// };

// // --- Main App Component ---
// const App = () => {
//   // --- State Management ---
//   const [mode, setMode] = useState<AppMode>('single');
//   const [savedContacts, setSavedContacts] = useState<ContactData[]>([]);
//   const [isLoading, setIsLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   // Single Card State
//   const [frontImageBase64, setFrontImageBase64] = useState<string | null>(null);
//   const [backImageBase64, setBackImageBase64] = useState<string | null>(null);
//   const [extractedData, setExtractedData] = useState<Partial<ContactData> | null>(null);
//   const [isCameraOpen, setIsCameraOpen] = useState(false);
//   const [cameraFor, setCameraFor] = useState<'front' | 'back'>('front');

//   // Bulk Upload State
//   const [bulkItems, setBulkItems] = useState<BulkFileItem[]>([]);
  
//   // AI Command Center State
//   const [chatInput, setChatInput] = useState('');
//   const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
//   const [isChatLoading, setIsChatLoading] = useState(false);

//   // --- Refs ---
//   const fileInputRef = useRef<HTMLInputElement>(null);
//   const videoRef = useRef<HTMLVideoElement>(null);
//   const streamRef = useRef<MediaStream | null>(null);
//   const chatDisplayRef = useRef<HTMLDivElement>(null);
  

//   // --- Effects ---
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
//       const contacts = data.docs.map(doc => {
//         const docData = doc.data();
//         return {
//           id: doc.id,
//           name: docData.name || "",
//           designation: docData.designation || "",
//           company: docData.company || "",
//           phoneNumbers: docData.phoneNumbers || [],
//           emails: docData.emails || [],
//           websites: docData.websites || [],
//           address: docData.address || "",
//           imageBase64: docData.imageBase64 || "",
//         } as ContactData;
//       });
//       setSavedContacts(contacts);
//     } catch (e) {
//        const error = e as Error;
//        console.error("Failed to load contacts from Firestore:", error.message);
//        if (error.message.includes("Could not reach Cloud Firestore backend")) {
//         setError("Could not connect to Firestore. Please check your internet connection and ensure this app's domain is added to your Firebase project's authorized domains.");
//       } else if (error.message.includes("Missing or insufficient permissions")) {
//         setError("Firestore permissions error. Please check your project's Firestore security rules.");
//       } else {
//         setError("Could not load saved contacts. An unknown error occurred.");
//       }
//     }
//     setIsLoading(false);
//   }, []);

//   useEffect(() => {
//     if(isFirebaseConfigured) {
//         fetchContacts();
//     }
//   }, [fetchContacts]);

//   // --- Helper Functions ---
//   const resetState = () => {
//     setFrontImageBase64(null);
//     setBackImageBase64(null);
//     setExtractedData(null);
//     setBulkItems([]);
//     setError(null);
//     setIsLoading(false);
//   };

//   const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
//     const files = event.target.files;
//     if (!files || files.length === 0) return;
    
//     if (mode === 'bulk') {
//         resetState();
//         const newBulkItems: BulkFileItem[] = Array.from(files).map((file: File) => ({
//             id: `${file.name}-${Date.now()}`,
//             file,
//             base64: '',
//             status: 'pending',
//         }));
//         setBulkItems(newBulkItems);
//         processBulkQueue(newBulkItems);
//     } else {
//         const file = files[0];
//         const reader = new FileReader();
//         reader.onloadend = () => {
//             const base64String = (reader.result as string).split(",")[1];
//             if (!frontImageBase64) {
//                 setFrontImageBase64(base64String);
//             } else {
//                 setBackImageBase64(base64String);
//             }
//         };
//         reader.readAsDataURL(file);
//     }
//     if(fileInputRef.current) fileInputRef.current.value = '';
//   };
  
//   const openCamera = async (forSide: 'front' | 'back') => {
//     setCameraFor(forSide);
//     try {
//       if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
//         const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
//         setIsCameraOpen(true);
//         streamRef.current = stream;
//         if (videoRef.current) {
//           videoRef.current.srcObject = stream;
//         }
//       } else {
//         setError("Camera not supported on this device/browser.");
//       }
//     } catch (err) {
//       const error = err as Error;
//       console.error("Error accessing camera: ", error.message);
//       setError("Could not access the camera. Please ensure permissions are granted.");
//     }
//   };

//   const closeCamera = () => {
//     if (streamRef.current) {
//       streamRef.current.getTracks().forEach(track => track.stop());
//     }
//     setIsCameraOpen(false);
//     streamRef.current = null;
//   };
  
//   const takeSnapshot = () => {
//     if (videoRef.current) {
//       const canvas = document.createElement("canvas");
//       canvas.width = videoRef.current.videoWidth;
//       canvas.height = videoRef.current.videoHeight;
//       const ctx = canvas.getContext('2d');
//       if (ctx) {
//         ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
//         const base64String = canvas.toDataURL('image/jpeg').split(',')[1];
//         if(cameraFor === 'front') setFrontImageBase64(base64String);
//         else setBackImageBase64(base64String);
//       }
//       closeCamera();
//     }
//   };

//     const processCardImages = async (frontB64: string, backB64?: string | null): Promise<Partial<ContactData>> => {
//     if (!isAiConfigured || !API_KEY) throw new Error("Google AI API Key is not configured.");

//     const genAI = new GoogleGenerativeAI(API_KEY);
//     const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

//     const parts: Part[] = [
//       { inlineData: { mimeType: 'image/jpeg', data: frontB64 } },
//     ];
    
//     let promptText = `Analyze the business card image(s) and extract the contact details. Return a single JSON object with the following keys: "name", "designation", "company", "phoneNumbers", "emails", "websites", "address". If any information is not found, return an empty string for string fields or an empty array for array fields.`;

//     if (backB64) {
//       parts.push({ inlineData: { mimeType: 'image/jpeg', data: backB64 } });
//     }
//     parts.push({ text: promptText });
    
//     const result = await model.generateContent({
//       contents: [{ role: "user", parts }],
//       generationConfig: {
//         responseMimeType: "application/json",
//       },
//     });
    
//     const response = result.response;
//     const text = response.text();
//     return JSON.parse(text);
//   };

//     const handleSingleCardProcess = async () => {
//     if(!frontImageBase64) return;
//     setIsLoading(true);
//     setError(null);
//     setExtractedData(null);
//     try {
//         const parsedData = await processCardImages(frontImageBase64, backImageBase64 ?? undefined);
//         setExtractedData(parsedData);
//     } catch (e) {
//         const error = e as Error;
//         console.error("Error processing card:", error.message);
//         setError(`Failed to process image. ${error.message || 'An unknown error occurred.'}`);
//     } finally {
//         setIsLoading(false);
//     }
//   };

//   const processBulkQueue = async (items: BulkFileItem[]) => {
//     setIsLoading(true);
//     let processedItems = [...items];

//     for (let i = 0; i < items.length; i++) {
//         const item = items[i];
        
//         const base64 = await new Promise<string>((resolve, reject) => {
//             const reader = new FileReader();
//             reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
//             reader.onerror = reject;
//             reader.readAsDataURL(item.file);
//         });
        
//         processedItems = processedItems.map(p => p.id === item.id ? { ...p, base64, status: 'processing' } : p);
//         setBulkItems(processedItems);

//         try {
//             const parsedData = await processCardImages(base64);
//             processedItems = processedItems.map(p => p.id === item.id ? { ...p, status: 'success', extractedData: parsedData } : p);
//             setBulkItems(processedItems);
//         } catch(e) {
//             const error = e as Error;
//             console.error(`Error processing ${item.file.name}:`, error.message);
//             processedItems = processedItems.map(p => p.id === item.id ? { ...p, status: 'error', error: error.message || "Failed to process" } : p);
//             setBulkItems(processedItems);
//         }
//     }
//     setIsLoading(false);
//   }

//   const handleDataChange = (field: keyof Omit<ContactData, 'id' | 'imageBase64'>, value: string | string[]) => {
//     if (extractedData) {
//       setExtractedData({ ...extractedData, [field]: value });
//     }
//   };

//   const handleArrayDataChange = (field: keyof Omit<ContactData, 'id' | 'imageBase64'>, index: number, value: string) => {
//       if (extractedData) {
//           const currentArray = (extractedData[field] as string[]) || [];
//           const newArray = [...currentArray];
//           newArray[index] = value;
//           handleDataChange(field, newArray);
//       }
//   };
  
//   const saveContact = async () => {
//     if (!contactsCollectionRef) {
//         setError("Firebase not configured. Cannot save contact.");
//         return;
//     }
//     if (extractedData && frontImageBase64) {
//       setIsLoading(true);
//       const newContactPayload = {
//         name: extractedData.name || "",
//         designation: extractedData.designation || "",
//         company: extractedData.company || "",
//         phoneNumbers: extractedData.phoneNumbers || [],
//         emails: extractedData.emails || [],
//         websites: extractedData.websites || [],
//         address: extractedData.address || "",
//         imageBase64: frontImageBase64,
//         createdAt: serverTimestamp(),
//       };
//       try {
//         await addDoc(contactsCollectionRef, newContactPayload);
//         resetState();
//         fetchContacts();
//       } catch (e) {
//         const error = e as Error;
//         console.error("Error saving to firestore:", error.message);
//         setError("Failed to save contact.");
//         setIsLoading(false);
//       }
//     }
//   };

//   const saveAllBulk = async () => {
//     if (!contactsCollectionRef) {
//         setError("Firebase not configured. Cannot save contacts.");
//         return;
//     }
//     const successfulItems = bulkItems.filter(item => item.status === 'success' && item.extractedData);
//     if(successfulItems.length === 0) return;

//     setIsLoading(true);
//     let successCount = 0;
//     for (const item of successfulItems) {
//         if(item.extractedData){
//             try {
//                 const newContactPayload = {
//                    name: item.extractedData.name || "",
//                    designation: item.extractedData.designation || "",
//                    company: item.extractedData.company || "",
//                    phoneNumbers: item.extractedData.phoneNumbers || [],
//                    emails: item.extractedData.emails || [],
//                    websites: item.extractedData.websites || [],
//                    address: item.extractedData.address || "",
//                    imageBase64: item.base64,
//                    createdAt: serverTimestamp(),
//                };
//                await addDoc(contactsCollectionRef, newContactPayload);
//                successCount++;
//            } catch (e) {
//                const error = e as Error;
//                console.error(`Failed to save ${item.file.name}:`, error.message);
//            }
//         }
//     }
//     alert(`${successCount} of ${successfulItems.length} contacts saved successfully.`);
//     resetState();
//     fetchContacts();
//   }

//   const deleteContact = async (id: string) => {
//     if (!db || !contactsCollectionRef) return;
//     const isConfirmed = window.confirm("Are you sure you want to delete this contact?");
//     if (isConfirmed) {
//         try {
//             await deleteDoc(doc(db, "visiting_cards", id));
//             fetchContacts();
//         } catch (e) {
//             const error = e as Error;
//             console.error("Error deleting document: ", error.message);
//             setError("Failed to delete contact.");
//         }
//     }
//   };
  
//   const editContact = (contact: ContactData) => {
//     setMode('single');
//     resetState();
//     setExtractedData(contact);
//     setFrontImageBase64(contact.imageBase64);
//     alert("Editing mode: After saving, this will create a new contact. You may want to delete the old one.");
//   }

//   const downloadVcf = (data: Partial<ContactData>) => {
//     const { name, designation, company, phoneNumbers, emails, websites, address } = data;
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
//     if (phoneNumbers) phoneNumbers.forEach(p => { vCard += `TEL;TYPE=WORK,VOICE:${p}\n`; });
//     if (emails) emails.forEach(e => { vCard += `EMAIL:${e}\n`; });
//     if (websites) websites.forEach(w => { vCard += `URL:${w}\n`; });
//     if (address) vCard += `ADR;TYPE=WORK:;;${address.replace(/\n/g, '\\n')};;;;\n`;
//     vCard += "END:VCARD";

//     const blob = new Blob([vCard], { type: "text/vcard" });
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement("a");
//     a.href = url;
//     a.download = (name?.replace(/\s/g, '_') || 'contact') + '.vcf';
//     document.body.appendChild(a);
//     a.click();
//     document.body.removeChild(a);
//     URL.revokeObjectURL(url);
//   };
  
//   const downloadCsv = (data: Partial<ContactData>[]) => {
//       const headers = "Name,Designation,Company,Phone Numbers,Emails,Websites,Address\n";
      
//       const escapeCsvField = (field: string | null | undefined): string => {
//         if (field === null || field === undefined) return '""';
//         const str = String(field).replace(/"/g, '""').replace(/\n/g, ' ');
//         return `"${str}"`;
//       };

//       const rows = data.map(d => [
//           escapeCsvField(d.name),
//           escapeCsvField(d.designation),
//           escapeCsvField(d.company),
//           escapeCsvField((d.phoneNumbers || []).join(', ')),
//           escapeCsvField((d.emails || []).join(', ')),
//           escapeCsvField((d.websites || []).join(', ')),
//           escapeCsvField(d.address),
//       ].join(','));
      
//       const csv = headers + rows.join('\n');

//       const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
//       const url = URL.createObjectURL(blob);
//       const a = document.createElement("a");
//       a.href = url;
//       a.download = data.length > 1 ? 'contacts_export.csv' : (data[0].name?.replace(/\s/g, '_') || 'contact') + '.csv';
//       document.body.appendChild(a);
//       a.click();
//       document.body.removeChild(a);
//       URL.revokeObjectURL(url);
//   };
  
//   const handleCommandSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!chatInput.trim() || isChatLoading || !isAiConfigured || !API_KEY) return;

//     const userMessage: ChatMessage = { role: 'user', text: chatInput.trim() };
//     setChatHistory(prev => [...prev, userMessage]);
//     setChatInput("");
//     setIsChatLoading(true);
//     setChatHistory(prev => [...prev, { role: 'model', text: '' }]);

//     try {
//         const genAI = new GoogleGenerativeAI(API_KEY);
//         const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

//         const contactsJson = JSON.stringify(
//             savedContacts.map(c => ({
//                 name: c.name,
//                 designation: c.designation,
//                 company: c.company,
//                 phoneNumbers: c.phoneNumbers,
//                 emails: c.emails,
//                 websites: c.websites,
//                 address: c.address,
//             }))
//         );
        
//         const prompt = `You are an AI assistant for a business card app. Your task is to answer questions about the user's saved contacts. You will be given a list of contacts in JSON format. Base your answers STRICTLY on the information provided in the JSON data. If the information is not present in the contacts, state that you cannot find the information. Do not make up any details. Keep your answers concise and helpful. Here is the contact data: ${contactsJson}\n\nUser question: ${userMessage.text}`;

//         const result = await model.generateContent(prompt);
//         const response = result.response;
//         const fullResponse = response.text();

//         setChatHistory(prev => {
//             const updated = [...prev];
//             updated[updated.length - 1] = { role: 'model', text: fullResponse };
//             return updated;
//         });

//     } catch (err) {
//         const error = err as Error;
//         console.error("Chat command failed:", error.message);
//         const errorMessage = `Sorry, I encountered an error: ${error.message}`;
//         setChatHistory(prev => {
//              const updated = [...prev];
//              updated[updated.length - 1] = { role: 'model', text: errorMessage };
//              return updated;
//         });
//     } finally {
//         setIsChatLoading(false);
//     }
//   };

//   // --- Render Logic ---
//   if (!isFirebaseConfigured || !isAiConfigured) {
//       return (
//         <div className="min-h-screen bg-gray-900 text-white font-sans flex items-center justify-center p-4">
//             <div className="bg-red-700 p-8 rounded-2xl shadow-2xl text-center max-w-md w-full">
//               <h2 className="text-3xl font-bold mb-4">Configuration Error</h2>
//               {!isFirebaseConfigured && <p className="mb-2">Your Firebase configuration is incomplete. Please check your <code>.env</code> file.</p>}
//               {!isAiConfigured && <p>Your Google AI API Key is missing. Please check your <code>.env</code> file.</p>}
//               <p className="mt-6 text-red-200">The application cannot start without valid configurations.</p>
//             </div>
//         </div>
//       )
//   }
  
//   const renderField = (label: string, field: keyof Omit<ContactData, 'id' | 'imageBase64'>) => (
//      <div className="form-group">
//       <label htmlFor={field} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
//       <input
//         type="text"
//         id={field}
//         value={((extractedData?.[field] as string) || '')}
//         onChange={(e) => handleDataChange(field, e.target.value)}
//         className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 transition"
//       />
//     </div>
//   );
  
//   const renderArrayField = (label: string, field: keyof Omit<ContactData, 'id' | 'imageBase64'>) => (
//     <div className="form-group md:col-span-2">
//       <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
//       {((extractedData?.[field] as string[]) || []).map((item, index) => (
//          <input
//             key={index}
//             type="text"
//             value={item}
//             onChange={(e) => handleArrayDataChange(field, index, e.target.value)}
//             className="w-full p-2 border border-gray-300 rounded-md shadow-sm mb-2 focus:ring-red-500 focus:border-red-500 transition"
//           />
//       ))}
//     </div>
//   );

//   return (
//     <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
//       <header className="bg-white text-gray-800 py-4 flex items-center justify-between px-6 shadow-md border-b-2 border-gray-100">
//         <div className="flex items-center gap-3">
//           <img src={logo} alt="Company Logo" className="h-12 w-12 rounded-full shadow-lg" />
//           <h1 className="text-2xl font-bold tracking-tight text-gray-900">
//              AI Business Card Scanner
//           </h1>
//         </div>
//       </header>
//       <main className="p-4 md:p-8 max-w-7xl mx-auto">
//         <div className="card input-section bg-white p-6 rounded-xl shadow-lg mb-8 border border-gray-200">
//             <div className="mode-toggle flex border-b mb-6">
//                 <button className={`py-2 px-4 text-lg ${mode === 'single' ? 'border-b-2 border-red-600 font-semibold text-red-600' : 'text-gray-500'}`} onClick={() => { resetState(); setMode('single'); }}>Single Card</button>
//                 <button className={`py-2 px-4 text-lg ${mode === 'bulk' ? 'border-b-2 border-red-600 font-semibold text-red-600' : 'text-gray-500'}`} onClick={() => { resetState(); setMode('bulk'); }}>Bulk Upload</button>
//             </div>
          
//             <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" multiple={mode === 'bulk'} style={{display: 'none'}}/>

//             {mode === 'single' && (
//                 <>
//                     <div className="actions flex flex-col sm:flex-row gap-4">
//                         <button className="btn btn-primary bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-all shadow-md w-full sm:w-auto disabled:bg-gray-400" onClick={() => fileInputRef.current?.click()} disabled={isLoading || !!backImageBase64}>
//                              {frontImageBase64 ? 'Upload Back' : 'Upload Front'}
//                         </button>
//                         <button className="btn btn-secondary bg-gray-700 text-white py-2 px-4 rounded-lg hover:bg-gray-800 transition-all shadow-md w-full sm:w-auto disabled:bg-gray-400" onClick={() => openCamera(frontImageBase64 ? 'back' : 'front')} disabled={isLoading || !!backImageBase64}>
//                              {frontImageBase64 ? 'Camera (Back)' : 'Camera (Front)'}
//                         </button>
//                     </div>
//                     {(frontImageBase64 || backImageBase64) && (
//                          <div className="image-previews grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
//                             {frontImageBase64 && <div className="preview-container"><img src={`data:image/jpeg;base64,${frontImageBase64}`} alt="Front Preview" className="w-full rounded-lg shadow-xl"/><p className="text-center mt-2 font-semibold">Front</p></div>}
//                             {backImageBase64 && <div className="preview-container"><img src={`data:image/jpeg;base64,${backImageBase64}`} alt="Back Preview" className="w-full rounded-lg shadow-xl"/><p className="text-center mt-2 font-semibold">Back</p></div>}
//                          </div>
//                     )}
//                     <div className="result-actions mt-6">
//                         {frontImageBase64 && <button className="btn btn-primary bg-red-600 text-white py-3 px-6 rounded-lg hover:bg-red-700 transition-all shadow-xl text-lg w-full sm:w-auto" onClick={handleSingleCardProcess} disabled={isLoading}>Process Card</button>}
//                     </div>
//                 </>
//             )}

//             {mode === 'bulk' && (
//                 <>
//                     <div className="actions">
//                         <button className="btn btn-primary bg-red-600 text-white py-3 px-6 rounded-lg hover:bg-red-700 transition-all shadow-xl text-lg w-full sm:w-auto" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
//                             Upload Multiple Cards
//                         </button>
//                     </div>
//                     {bulkItems.length > 0 && (
//                         <div className="bulk-list mt-6">
//                             <ul className="space-y-3">
//                                 {bulkItems.map(item => (
//                                     <li key={item.id} className="bulk-item flex justify-between items-center p-3 bg-gray-100 rounded-lg border">
//                                         <div className="info">
//                                             <h3 className="font-semibold text-gray-800">{item.file.name}</h3>
//                                             {item.status === 'error' && <p className="text-red-600 text-sm">{item.error}</p>}
//                                         </div>
//                                         <span className={`status status-${item.status} px-3 py-1 rounded-full text-sm font-semibold ${
//                                             item.status === 'success' ? 'bg-green-100 text-green-800' :
//                                             item.status === 'error' ? 'bg-red-100 text-red-800' :
//                                             item.status === 'processing' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-200 text-gray-800'
//                                         }`}>{item.status}</span>
//                                     </li>
//                                 ))}
//                             </ul>
//                             <div className="bulk-actions flex flex-col sm:flex-row gap-4 mt-6">
//                                <button className="btn btn-primary bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-all shadow-md disabled:bg-gray-400" onClick={saveAllBulk} disabled={isLoading || bulkItems.every(i => i.status !== 'success')}>
//                                    Save All Successful
//                                 </button>
//                                 <button className="btn btn-secondary bg-gray-700 text-white py-2 px-4 rounded-lg hover:bg-gray-800 transition-all shadow-md disabled:bg-gray-400" onClick={() => downloadCsv(bulkItems.filter(i => i.status === 'success').map(i => i.extractedData || {}))} disabled={isLoading || bulkItems.every(i => i.status !== 'success')}>
//                                     Export All to CSV
//                                 </button>
//                             </div>
//                         </div>
//                     )}
//                 </>
//             )}

//             {isCameraOpen && (
//                 <div className="video-container fixed inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center z-50 p-4">
//                     <video ref={videoRef} autoPlay playsInline className="w-full max-w-2xl rounded-lg"></video>
//                     <div className="controls mt-6 flex gap-4">
//                        <button className="btn btn-primary bg-red-600 text-white py-2 px-6 rounded-lg hover:bg-red-700 transition-all shadow-lg text-lg" onClick={takeSnapshot}>Capture</button>
//                        <button className="btn btn-secondary bg-gray-600 text-white py-2 px-6 rounded-lg hover:bg-gray-700 transition-all shadow-lg text-lg" onClick={closeCamera}>Cancel</button>
//                     </div>
//                 </div>
//             )}
//             {error && <div className="error-message bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mt-6" role="alert">{error}</div>}
//             {isLoading && mode !== 'bulk' && (
//                 <div className="loading-overlay fixed inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center z-50">
//                     <div className="spinner border-4 border-t-4 border-t-red-600 border-gray-200 rounded-full w-16 h-16 animate-spin"></div>
//                     <p className="ml-4 text-gray-700 text-lg font-semibold mt-4">Scanning your card...</p>
//                 </div>
//             )}
//         </div>

//         {extractedData && (
//           <div className="card results-section bg-white p-6 rounded-xl shadow-lg mb-8 border border-gray-200">
//             <h2 className="text-2xl font-bold mb-6 text-gray-900">Verify & Save</h2>
//              <div className="form-grid grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
//               {renderField("Name", "name")}
//               {renderField("Designation", "designation")}
//               {renderField("Company", "company")}
//               {renderField("Address", "address")}
//               {renderArrayField("Phone Numbers", "phoneNumbers")}
//               {renderArrayField("Emails", "emails")}
//               {renderArrayField("Websites", "websites")}
//             </div>
//             <div className="result-actions flex flex-col sm:flex-row gap-4 mt-8">
//               <button className="btn btn-primary bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-all shadow-md" onClick={saveContact} disabled={isLoading}>
//                  Save to Firebase
//               </button>
//               <button className="btn btn-secondary bg-gray-700 text-white py-2 px-4 rounded-lg hover:bg-gray-800 transition-all shadow-md" onClick={() => downloadVcf(extractedData)}>Download .vcf</button>
//               <button className="btn btn-secondary bg-gray-700 text-white py-2 px-4 rounded-lg hover:bg-gray-800 transition-all shadow-md" onClick={() => downloadCsv([extractedData])}>Download .csv</button>
//               <button className="btn btn-secondary border border-red-500 text-red-500 py-2 px-4 rounded-lg hover:bg-red-500 hover:text-white transition-all shadow-md" onClick={resetState}>Cancel</button>
//             </div>
//           </div>
//         )}

//         {savedContacts.length > 0 && !extractedData && bulkItems.length === 0 && (
//           <>
//             <div className="card command-center bg-white p-6 rounded-xl shadow-lg mb-8 border border-gray-200">
//                 <h2 className="text-2xl font-bold mb-4 text-gray-900">AI Command Center</h2>
//                 <div className="chat-display h-80 overflow-y-auto border rounded-lg p-4 mb-4 bg-gray-50" ref={chatDisplayRef}>
//                     {chatHistory.map((msg, index) => (
//                         <div key={index} className={`chat-message mb-4 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
//                              <p className={`max-w-md p-3 rounded-xl ${msg.role === 'user' ? 'bg-red-600 text-white' : 'bg-gray-200'}`}>
//                                 {msg.role === 'model' && msg.text === '' && isChatLoading ? (
//                                     <div className="typing-indicator flex gap-1 items-center">
//                                       <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
//                                       <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
//                                       <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"></span>
//                                     </div>
//                                 ) : (
//                                     msg.text
//                                 )}
//                              </p>
//                         </div>
//                     ))}
//                 </div>
//                 <form onSubmit={handleCommandSubmit} className="command-form flex gap-2">
//                     <input
//                         type="text"
//                         value={chatInput}
//                         onChange={(e) => setChatInput(e.target.value)}
//                         placeholder="e.g., 'Who works at Google?'"
//                         disabled={isChatLoading}
//                         aria-label="Ask the AI assistant a question about your contacts"
//                         className="flex-grow p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-red-500 focus:border-red-500 transition"
//                     />
//                     <button type="submit" disabled={isChatLoading || !chatInput.trim()} aria-label="Send command" className="bg-red-600 text-white p-3 rounded-lg disabled:bg-red-300 hover:bg-red-700 transition-all shadow-md">
//                         <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
//                     </button>
//                 </form>
//             </div>
//             <div className="card contact-list bg-white p-6 rounded-xl shadow-lg border border-gray-200">
//                 <h2 className="text-2xl font-bold mb-4 text-gray-900">Saved Contacts</h2>
//                 <ul className="space-y-3">
//                 {savedContacts.map(contact => (
//                     <li key={contact.id} className="contact-item flex justify-between items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 border transition-all">
//                     <div className="info">
//                         <h3 className="font-semibold text-lg text-gray-800">{contact.name || 'No Name'}</h3>
//                         <p className="text-sm text-gray-600">{contact.company || 'No Company'}</p>
//                     </div>
//                     <div className="actions flex gap-3">
//                         <button onClick={() => editContact(contact)} title="Edit" className="text-gray-500 hover:text-gray-800 transition-colors">
//                           <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
//                         </button>
//                         <button onClick={() => deleteContact(contact.id)} title="Delete" className="text-red-500 hover:text-red-700 transition-colors">
//                            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
//                         </button>
//                     </div>
//                     </li>
//                 ))}
//                 </ul>
//             </div>
//           </>
//         )}
//       </main>
//       <footer className="bg-gray-800 text-white text-center py-4 mt-12 text-sm">
//         © {new Date().getFullYear()} StarShield Technologies Pvt Ltd. All rights reserved.
//       </footer>
//     </div>
//   );
// };

// export default App;





// import React, { useState, useRef, useEffect, useCallback } from "react";
// import { GoogleGenerativeAI } from "@google/generative-ai";
// import { initializeApp } from "firebase/app";
// import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from "firebase/firestore";
// import logo from './assets/logo.jpg';

// // --- Global Error Handler ---
// window.addEventListener('unhandledrejection', function(event) {
//   event.preventDefault();
//   if (event.reason) {
//     console.error("Unhandled Rejection:", event.reason.message || event.reason);
//   } else {
//     console.error("Unhandled Rejection with no reason object.");
//   }
// });

// // --- Firebase Configuration ---
// const firebaseConfig = {
//   apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
//   authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
//   projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
//   storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
//   messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
//   appId: import.meta.env.VITE_FIREBASE_APP_ID,
// };

// const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

// // --- Configuration Checks ---
// const isFirebaseConfigured = firebaseConfig?.apiKey && firebaseConfig?.projectId;
// const isAiConfigured = !!API_KEY;

// // Initialize Firebase only if configured
// let db: Firestore | undefined;
// let contactsCollectionRef: CollectionReference | undefined;
// if (isFirebaseConfigured) {
//   try {
//     const app = initializeApp(firebaseConfig);
//     db = getFirestore(app);
//     contactsCollectionRef = collection(db, "visiting_cards");
//   } catch (e) {
//     console.error("Firebase initialization error:", (e as Error).message);
//   }
// }

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
// }

// type AppMode = 'single' | 'bulk';
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

// type Part = {
//   text: string;
// } | {
//   inlineData: {
//     mimeType: string;
//     data: string;
//   };
// };

// // --- Main App Component ---
// const App = () => {
//   // --- State Management ---
//   const [mode, setMode] = useState<AppMode>('single');
//   const [savedContacts, setSavedContacts] = useState<ContactData[]>([]);
//   const [isLoading, setIsLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   // Single Card State
//   const [frontImageBase64, setFrontImageBase64] = useState<string | null>(null);
//   const [backImageBase64, setBackImageBase64] = useState<string | null>(null);
//   const [extractedData, setExtractedData] = useState<Partial<ContactData> | null>(null);
//   const [isCameraOpen, setIsCameraOpen] = useState(false);
//   const [cameraFor, setCameraFor] = useState<'front' | 'back'>('front');

//   // Bulk Upload State
//   const [bulkItems, setBulkItems] = useState<BulkFileItem[]>([]);
  
//   // AI Command Center State
//   const [chatInput, setChatInput] = useState('');
//   const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
//   const [isChatLoading, setIsChatLoading] = useState(false);

//   // --- PWA Install State ---
//   const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
//   const [showInstallBanner, setShowInstallBanner] = useState(false);

//   // --- Refs ---
//   const fileInputRef = useRef<HTMLInputElement>(null);
//   const videoRef = useRef<HTMLVideoElement>(null);
//   const streamRef = useRef<MediaStream | null>(null);
//   const chatDisplayRef = useRef<HTMLDivElement>(null);

//   // --- Effects ---
//   useEffect(() => {
//     const handleBeforeInstallPrompt = (e: any) => {
//       e.preventDefault(); // Prevent the default browser prompt
//       setDeferredPrompt(e);
//       setShowInstallBanner(true); // Show our custom install banner
//     };

//     window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

//     return () => {
//       window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
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
//       // const contacts = data.docs.map(doc => {
//       //   const docData = doc.data();
//       const docData = doc.data() as Partial<ContactData>;

//         return {
//           id: doc.id,
//           name: docData.name || "",
//           designation: docData.designation || "",
//           company: docData.company || "",
//           phoneNumbers: docData.phoneNumbers || [],
//           emails: docData.emails || [],
//           websites: docData.websites || [],
//           address: docData.address || "",
//           imageBase64: docData.imageBase64 || "",
//         } as ContactData;
//       });
//       setSavedContacts(contacts);
//     } catch (e) {
//        const error = e as Error;
//        console.error("Failed to load contacts from Firestore:", error.message);
//        if (error.message.includes("Could not reach Cloud Firestore backend")) {
//         setError("Could not connect to Firestore. Please check your internet connection and ensure this app's domain is added to your Firebase project's authorized domains.");
//       } else if (error.message.includes("Missing or insufficient permissions")) {
//         setError("Firestore permissions error. Please check your project's Firestore security rules.");
//       } else {
//         setError("Could not load saved contacts. An unknown error occurred.");
//       }
//     }
//     setIsLoading(false);
//   }, []);

//   useEffect(() => {
//     if(isFirebaseConfigured) {
//         fetchContacts();
//     }
//   }, [fetchContacts]);

//   // --- Helper Functions ---
//   const handleInstallClick = async () => {
//     if (deferredPrompt) {
//       deferredPrompt.prompt();
//       const { outcome } = await deferredPrompt.userChoice;
//       if (outcome === "accepted") {
//         console.log("User accepted the install prompt");
//       }
//       setDeferredPrompt(null);
//       setShowInstallBanner(false);
//     }
//   };

//   const resetState = () => {
//     setFrontImageBase64(null);
//     setBackImageBase64(null);
//     setExtractedData(null);
//     setBulkItems([]);
//     setError(null);
//     setIsLoading(false);
//   };

//   const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
//     const files = event.target.files;
//     if (!files || files.length === 0) return;
    
//     if (mode === 'bulk') {
//         resetState();
//         const newBulkItems: BulkFileItem[] = Array.from(files).map((file: File) => ({
//             id: `${file.name}-${Date.now()}`,
//             file,
//             base64: '',
//             status: 'pending',
//         }));
//         setBulkItems(newBulkItems);
//         processBulkQueue(newBulkItems);
//     } else {
//         const file = files[0];
//         const reader = new FileReader();
//         reader.onloadend = () => {
//             const base64String = (reader.result as string).split(",")[1];
//             if (!frontImageBase64) {
//                 setFrontImageBase64(base64String);
//             } else {
//                 setBackImageBase64(base64String);
//             }
//         };
//         reader.readAsDataURL(file);
//     }
//     if(fileInputRef.current) fileInputRef.current.value = '';
//   };
  
//   const openCamera = async (forSide: 'front' | 'back') => {
//     setCameraFor(forSide);
//     try {
//       if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
//         const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
//         setIsCameraOpen(true);
//         streamRef.current = stream;
//         if (videoRef.current) {
//           videoRef.current.srcObject = stream;
//         }
//       } else {
//         setError("Camera not supported on this device/browser.");
//       }
//     } catch (err) {
//       const error = err as Error;
//       console.error("Error accessing camera: ", error.message);
//       setError("Could not access the camera. Please ensure permissions are granted.");
//     }
//   };

//   const closeCamera = () => {
//     if (streamRef.current) {
//       streamRef.current.getTracks().forEach(track => track.stop());
//     }
//     setIsCameraOpen(false);
//     streamRef.current = null;
//   };
  
//   const takeSnapshot = () => {
//     if (videoRef.current) {
//       const canvas = document.createElement("canvas");
//       canvas.width = videoRef.current.videoWidth;
//       canvas.height = videoRef.current.videoHeight;
//       const ctx = canvas.getContext('2d');
//       if (ctx) {
//         ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
//         const base64String = canvas.toDataURL('image/jpeg').split(',')[1];
//         if(cameraFor === 'front') setFrontImageBase64(base64String);
//         else setBackImageBase64(base64String);
//       }
//       closeCamera();
//     }
//   };

//     const processCardImages = async (frontB64: string, backB64?: string | null): Promise<Partial<ContactData>> => {
//     if (!isAiConfigured || !API_KEY) throw new Error("Google AI API Key is not configured.");

//     const genAI = new GoogleGenerativeAI(API_KEY);
//     const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

//     const parts: Part[] = [
//       { inlineData: { mimeType: 'image/jpeg', data: frontB64 } },
//     ];
    
//     let promptText = `Analyze the business card image(s) and extract the contact details. Return a single JSON object with the following keys: "name", "designation", "company", "phoneNumbers", "emails", "websites", "address". If any information is not found, return an empty string for string fields or an empty array for array fields.`;

//     if (backB64) {
//       parts.push({ inlineData: { mimeType: 'image/jpeg', data: backB64 } });
//     }
//     parts.push({ text: promptText });
    
//     const result = await model.generateContent({
//       contents: [{ role: "user", parts }],
//       generationConfig: {
//         responseMimeType: "application/json",
//       },
//     });
    
//     const response = result.response;
//     const text = response.text();
//     return JSON.parse(text);
//   };

//     const handleSingleCardProcess = async () => {
//     if(!frontImageBase64) return;
//     setIsLoading(true);
//     setError(null);
//     setExtractedData(null);
//     try {
//         const parsedData = await processCardImages(frontImageBase64, backImageBase64 ?? undefined);
//         setExtractedData(parsedData);
//     } catch (e) {
//         const error = e as Error;
//         console.error("Error processing card:", error.message);
//         setError(`Failed to process image. ${error.message || 'An unknown error occurred.'}`);
//     } finally {
//         setIsLoading(false);
//     }
//   };

//   const processBulkQueue = async (items: BulkFileItem[]) => {
//     setIsLoading(true);
//     let processedItems = [...items];

//     for (let i = 0; i < items.length; i++) {
//         const item = items[i];
        
//         const base64 = await new Promise<string>((resolve, reject) => {
//             const reader = new FileReader();
//             reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
//             reader.onerror = reject;
//             reader.readAsDataURL(item.file);
//         });
        
//         processedItems = processedItems.map(p => p.id === item.id ? { ...p, base64, status: 'processing' } : p);
//         setBulkItems(processedItems);

//         try {
//             const parsedData = await processCardImages(base64);
//             processedItems = processedItems.map(p => p.id === item.id ? { ...p, status: 'success', extractedData: parsedData } : p);
//             setBulkItems(processedItems);
//         } catch(e) {
//             const error = e as Error;
//             console.error(`Error processing ${item.file.name}:`, error.message);
//             processedItems = processedItems.map(p => p.id === item.id ? { ...p, status: 'error', error: error.message || "Failed to process" } : p);
//             setBulkItems(processedItems);
//         }
//     }
//     setIsLoading(false);
//   }

//   const handleDataChange = (field: keyof Omit<ContactData, 'id' | 'imageBase64'>, value: string | string[]) => {
//     if (extractedData) {
//       setExtractedData({ ...extractedData, [field]: value });
//     }
//   };

//   const handleArrayDataChange = (field: keyof Omit<ContactData, 'id' | 'imageBase64'>, index: number, value: string) => {
//       if (extractedData) {
//           const currentArray = (extractedData[field] as string[]) || [];
//           const newArray = [...currentArray];
//           newArray[index] = value;
//           handleDataChange(field, newArray);
//       }
//   };
  
//   const saveContact = async () => {
//     if (!contactsCollectionRef) {
//         setError("Firebase not configured. Cannot save contact.");
//         return;
//     }
//     if (extractedData && frontImageBase64) {
//       setIsLoading(true);
//       const newContactPayload = {
//         name: extractedData.name || "",
//         designation: extractedData.designation || "",
//         company: extractedData.company || "",
//         phoneNumbers: extractedData.phoneNumbers || [],
//         emails: extractedData.emails || [],
//         websites: extractedData.websites || [],
//         address: extractedData.address || "",
//         imageBase64: frontImageBase64,
//         createdAt: serverTimestamp(),
//       };
//       try {
//         await addDoc(contactsCollectionRef, newContactPayload);
//         resetState();
//         fetchContacts();
//       } catch (e) {
//         const error = e as Error;
//         console.error("Error saving to firestore:", error.message);
//         setError("Failed to save contact.");
//         setIsLoading(false);
//       }
//     }
//   };

//   const saveAllBulk = async () => {
//     if (!contactsCollectionRef) {
//         setError("Firebase not configured. Cannot save contacts.");
//         return;
//     }
//     const successfulItems = bulkItems.filter(item => item.status === 'success' && item.extractedData);
//     if(successfulItems.length === 0) return;

//     setIsLoading(true);
//     let successCount = 0;
//     for (const item of successfulItems) {
//         if(item.extractedData){
//             try {
//                 const newContactPayload = {
//                    name: item.extractedData.name || "",
//                    designation: item.extractedData.designation || "",
//                    company: item.extractedData.company || "",
//                    phoneNumbers: item.extractedData.phoneNumbers || [],
//                    emails: item.extractedData.emails || [],
//                    websites: item.extractedData.websites || [],
//                    address: item.extractedData.address || "",
//                    imageBase64: item.base64,
//                    createdAt: serverTimestamp(),
//                };
//                await addDoc(contactsCollectionRef, newContactPayload);
//                successCount++;
//            } catch (e) {
//                const error = e as Error;
//                console.error(`Failed to save ${item.file.name}:`, error.message);
//            }
//         }
//     }
//     alert(`${successCount} of ${successfulItems.length} contacts saved successfully.`);
//     resetState();
//     fetchContacts();
//   }

//   const deleteContact = async (id: string) => {
//     if (!db || !contactsCollectionRef) return;
//     const isConfirmed = window.confirm("Are you sure you want to delete this contact?");
//     if (isConfirmed) {
//         try {
//             await deleteDoc(doc(db, "visiting_cards", id));
//             fetchContacts();
//         } catch (e) {
//             const error = e as Error;
//             console.error("Error deleting document: ", error.message);
//             setError("Failed to delete contact.");
//         }
//     }
//   };
  
//   const editContact = (contact: ContactData) => {
//     setMode('single');
//     resetState();
//     setExtractedData(contact);
//     setFrontImageBase64(contact.imageBase64);
//     alert("Editing mode: After saving, this will create a new contact. You may want to delete the old one.");
//   }

//   const downloadVcf = (data: Partial<ContactData>) => {
//     const { name, designation, company, phoneNumbers, emails, websites, address } = data;
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
//     if (phoneNumbers) phoneNumbers.forEach(p => { vCard += `TEL;TYPE=WORK,VOICE:${p}\n`; });
//     if (emails) emails.forEach(e => { vCard += `EMAIL:${e}\n`; });
//     if (websites) websites.forEach(w => { vCard += `URL:${w}\n`; });
//     if (address) vCard += `ADR;TYPE=WORK:;;${address.replace(/\n/g, '\\n')};;;;\n`;
//     vCard += "END:VCARD";

//     const blob = new Blob([vCard], { type: "text/vcard" });
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement("a");
//     a.href = url;
//     a.download = (name?.replace(/\s/g, '_') || 'contact') + '.vcf';
//     document.body.appendChild(a);
//     a.click();
//     document.body.removeChild(a);
//     URL.revokeObjectURL(url);
//   };
  
//   const downloadCsv = (data: Partial<ContactData>[]) => {
//       const headers = "Name,Designation,Company,Phone Numbers,Emails,Websites,Address\n";
      
//       const escapeCsvField = (field: string | null | undefined): string => {
//         if (field === null || field === undefined) return '""';
//         const str = String(field).replace(/"/g, '""').replace(/\n/g, ' ');
//         return `"${str}"`;
//       };

//       const rows = data.map(d => [
//           escapeCsvField(d.name),
//           escapeCsvField(d.designation),
//           escapeCsvField(d.company),
//           escapeCsvField((d.phoneNumbers || []).join(', ')),
//           escapeCsvField((d.emails || []).join(', ')),
//           escapeCsvField((d.websites || []).join(', ')),
//           escapeCsvField(d.address),
//       ].join(','));
      
//       const csv = headers + rows.join('\n');

//       const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
//       const url = URL.createObjectURL(blob);
//       const a = document.createElement("a");
//       a.href = url;
//       a.download = data.length > 1 ? 'contacts_export.csv' : (data[0].name?.replace(/\s/g, '_') || 'contact') + '.csv';
//       document.body.appendChild(a);
//       a.click();
//       document.body.removeChild(a);
//       URL.revokeObjectURL(url);
//   };
  
//   const handleCommandSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!chatInput.trim() || isChatLoading || !isAiConfigured || !API_KEY) return;

//     const userMessage: ChatMessage = { role: 'user', text: chatInput.trim() };
//     setChatHistory(prev => [...prev, userMessage]);
//     setChatInput("");
//     setIsChatLoading(true);
//     setChatHistory(prev => [...prev, { role: 'model', text: '' }]);

//     try {
//         const genAI = new GoogleGenerativeAI(API_KEY);
//         const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

//         const contactsJson = JSON.stringify(
//             savedContacts.map(c => ({
//                 name: c.name,
//                 designation: c.designation,
//                 company: c.company,
//                 phoneNumbers: c.phoneNumbers,
//                 emails: c.emails,
//                 websites: c.websites,
//                 address: c.address,
//             }))
//         );
        
//         const prompt = `You are an AI assistant for a business card app. Your task is to answer questions about the user's saved contacts. You will be given a list of contacts in JSON format. Base your answers STRICTLY on the information provided in the JSON data. If the information is not present in the contacts, state that you cannot find the information. Do not make up any details. Keep your answers concise and helpful. Here is the contact data: ${contactsJson}\n\nUser question: ${userMessage.text}`;

//         const result = await model.generateContent(prompt);
//         const response = result.response;
//         const fullResponse = response.text();

//         setChatHistory(prev => {
//             const updated = [...prev];
//             updated[updated.length - 1] = { role: 'model', text: fullResponse };
//             return updated;
//         });

//     } catch (err) {
//         const error = err as Error;
//         console.error("Chat command failed:", error.message);
//         const errorMessage = `Sorry, I encountered an error: ${error.message}`;
//         setChatHistory(prev => {
//              const updated = [...prev];
//              updated[updated.length - 1] = { role: 'model', text: errorMessage };
//              return updated;
//         });
//     } finally {
//         setIsChatLoading(false);
//     }
//   };

//   // --- Render Logic ---
//   if (!isFirebaseConfigured || !isAiConfigured) {
//       return (
//         <div className="min-h-screen bg-gray-900 text-white font-sans flex items-center justify-center p-4">
//             <div className="bg-red-700 p-8 rounded-2xl shadow-2xl text-center max-w-md w-full">
//               <h2 className="text-3xl font-bold mb-4">Configuration Error</h2>
//               {!isFirebaseConfigured && <p className="mb-2">Your Firebase configuration is incomplete. Please check your <code>.env</code> file.</p>}
//               {!isAiConfigured && <p>Your Google AI API Key is missing. Please check your <code>.env</code> file.</p>}
//               <p className="mt-6 text-red-200">The application cannot start without valid configurations.</p>
//             </div>
//         </div>
//       )
//   }
  
//   const renderField = (label: string, field: keyof Omit<ContactData, 'id' | 'imageBase64'>) => (
//      <div className="form-group">
//       <label htmlFor={field} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
//       <input
//         type="text"
//         id={field}
//         value={((extractedData?.[field] as string) || '')}
//         onChange={(e) => handleDataChange(field, e.target.value)}
//         className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 transition"
//       />
//     </div>
//   );
  
//   const renderArrayField = (label: string, field: keyof Omit<ContactData, 'id' | 'imageBase64'>) => (
//     <div className="form-group md:col-span-2">
//       <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
//       {((extractedData?.[field] as string[]) || []).map((item, index) => (
//          <input
//             key={index}
//             type="text"
//             value={item}
//             onChange={(e) => handleArrayDataChange(field, index, e.target.value)}
//             className="w-full p-2 border border-gray-300 rounded-md shadow-sm mb-2 focus:ring-red-500 focus:border-red-500 transition"
//           />
//       ))}
//     </div>
//   );

//   return (
//     <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
//       <header className="bg-white text-gray-800 py-4 flex items-center justify-between px-6 shadow-md border-b-2 border-gray-100 sticky top-0 z-40">
//         <div className="flex items-center gap-3">
//           <img src={logo} alt="Company Logo" className="h-12 w-12 rounded-full shadow-lg" />
//           <h1 className="text-2xl font-bold tracking-tight text-gray-900">
//              AI Business Card Scanner
//           </h1>
//         </div>
//       </header>
      
//       {showInstallBanner && (
//         <div className="bg-gradient-to-r from-red-600 to-red-800 text-white px-4 py-3 flex flex-col sm:flex-row justify-between items-center shadow-lg text-center sm:text-left">
//           <p className="font-semibold mb-2 sm:mb-0">📲 Install this app on your device for easy access!</p>
//           <button
//             onClick={handleInstallClick}
//             className="bg-white text-red-700 font-bold px-4 py-2 rounded-lg hover:bg-red-100 transition-all shadow-md shrink-0"
//           >
//             Install App
//           </button>
//         </div>
//       )}

//       <main className="p-4 md:p-8 max-w-7xl mx-auto">
//         {/* ... The rest of your main content remains exactly the same ... */}
//         <div className="card input-section bg-white p-6 rounded-xl shadow-lg mb-8 border border-gray-200">
//             <div className="mode-toggle flex border-b mb-6">
//                 <button className={`py-2 px-4 text-lg ${mode === 'single' ? 'border-b-2 border-red-600 font-semibold text-red-600' : 'text-gray-500'}`} onClick={() => { resetState(); setMode('single'); }}>Single Card</button>
//                 <button className={`py-2 px-4 text-lg ${mode === 'bulk' ? 'border-b-2 border-red-600 font-semibold text-red-600' : 'text-gray-500'}`} onClick={() => { resetState(); setMode('bulk'); }}>Bulk Upload</button>
//             </div>
          
//             <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" multiple={mode === 'bulk'} style={{display: 'none'}}/>

//             {mode === 'single' && (
//                 <>
//                     <div className="actions flex flex-col sm:flex-row gap-4">
//                         <button className="btn btn-primary bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-all shadow-md w-full sm:w-auto disabled:bg-gray-400" onClick={() => fileInputRef.current?.click()} disabled={isLoading || !!backImageBase64}>
//                              {frontImageBase64 ? 'Upload Back' : 'Upload Front'}
//                         </button>
//                         <button className="btn btn-secondary bg-gray-700 text-white py-2 px-4 rounded-lg hover:bg-gray-800 transition-all shadow-md w-full sm:w-auto disabled:bg-gray-400" onClick={() => openCamera(frontImageBase64 ? 'back' : 'front')} disabled={isLoading || !!backImageBase64}>
//                              {frontImageBase64 ? 'Camera (Back)' : 'Camera (Front)'}
//                         </button>
//                     </div>
//                     {(frontImageBase64 || backImageBase64) && (
//                          <div className="image-previews grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
//                             {frontImageBase64 && <div className="preview-container"><img src={`data:image/jpeg;base64,${frontImageBase64}`} alt="Front Preview" className="w-full rounded-lg shadow-xl"/><p className="text-center mt-2 font-semibold">Front</p></div>}
//                             {backImageBase64 && <div className="preview-container"><img src={`data:image/jpeg;base64,${backImageBase64}`} alt="Back Preview" className="w-full rounded-lg shadow-xl"/><p className="text-center mt-2 font-semibold">Back</p></div>}
//                          </div>
//                     )}
//                     <div className="result-actions mt-6">
//                         {frontImageBase64 && <button className="btn btn-primary bg-red-600 text-white py-3 px-6 rounded-lg hover:bg-red-700 transition-all shadow-xl text-lg w-full sm:w-auto" onClick={handleSingleCardProcess} disabled={isLoading}>Process Card</button>}
//                     </div>
//                 </>
//             )}

//             {mode === 'bulk' && (
//                 <>
//                     <div className="actions">
//                         <button className="btn btn-primary bg-red-600 text-white py-3 px-6 rounded-lg hover:bg-red-700 transition-all shadow-xl text-lg w-full sm:w-auto" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
//                             Upload Multiple Cards
//                         </button>
//                     </div>
//                     {bulkItems.length > 0 && (
//                         <div className="bulk-list mt-6">
//                             <ul className="space-y-3">
//                                 {bulkItems.map(item => (
//                                     <li key={item.id} className="bulk-item flex justify-between items-center p-3 bg-gray-100 rounded-lg border">
//                                         <div className="info">
//                                             <h3 className="font-semibold text-gray-800">{item.file.name}</h3>
//                                             {item.status === 'error' && <p className="text-red-600 text-sm">{item.error}</p>}
//                                         </div>
//                                         <span className={`status status-${item.status} px-3 py-1 rounded-full text-sm font-semibold ${
//                                             item.status === 'success' ? 'bg-green-100 text-green-800' :
//                                             item.status === 'error' ? 'bg-red-100 text-red-800' :
//                                             item.status === 'processing' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-200 text-gray-800'
//                                         }`}>{item.status}</span>
//                                     </li>
//                                 ))}
//                             </ul>
//                             <div className="bulk-actions flex flex-col sm:flex-row gap-4 mt-6">
//                                <button className="btn btn-primary bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-all shadow-md disabled:bg-gray-400" onClick={saveAllBulk} disabled={isLoading || bulkItems.every(i => i.status !== 'success')}>
//                                    Save All Successful
//                                 </button>
//                                 <button className="btn btn-secondary bg-gray-700 text-white py-2 px-4 rounded-lg hover:bg-gray-800 transition-all shadow-md disabled:bg-gray-400" onClick={() => downloadCsv(bulkItems.filter(i => i.status === 'success').map(i => i.extractedData || {}))} disabled={isLoading || bulkItems.every(i => i.status !== 'success')}>
//                                     Export All to CSV
//                                 </button>
//                             </div>
//                         </div>
//                     )}
//                 </>
//             )}

//             {isCameraOpen && (
//                 <div className="video-container fixed inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center z-50 p-4">
//                     <video ref={videoRef} autoPlay playsInline className="w-full max-w-2xl rounded-lg"></video>
//                     <div className="controls mt-6 flex gap-4">
//                        <button className="btn btn-primary bg-red-600 text-white py-2 px-6 rounded-lg hover:bg-red-700 transition-all shadow-lg text-lg" onClick={takeSnapshot}>Capture</button>
//                        <button className="btn btn-secondary bg-gray-600 text-white py-2 px-6 rounded-lg hover:bg-gray-700 transition-all shadow-lg text-lg" onClick={closeCamera}>Cancel</button>
//                     </div>
//                 </div>
//             )}
//             {error && <div className="error-message bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mt-6" role="alert">{error}</div>}
//             {isLoading && mode !== 'bulk' && (
//                 <div className="loading-overlay fixed inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center z-50">
//                     <div className="spinner border-4 border-t-4 border-t-red-600 border-gray-200 rounded-full w-16 h-16 animate-spin"></div>
//                     <p className="ml-4 text-gray-700 text-lg font-semibold mt-4">Scanning your card...</p>
//                 </div>
//             )}
//         </div>

//         {extractedData && (
//           <div className="card results-section bg-white p-6 rounded-xl shadow-lg mb-8 border border-gray-200">
//             <h2 className="text-2xl font-bold mb-6 text-gray-900">Verify & Save</h2>
//              <div className="form-grid grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
//               {renderField("Name", "name")}
//               {renderField("Designation", "designation")}
//               {renderField("Company", "company")}
//               {renderField("Address", "address")}
//               {renderArrayField("Phone Numbers", "phoneNumbers")}
//               {renderArrayField("Emails", "emails")}
//               {renderArrayField("Websites", "websites")}
//             </div>
//             <div className="result-actions flex flex-col sm:flex-row gap-4 mt-8">
//               <button className="btn btn-primary bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-all shadow-md" onClick={saveContact} disabled={isLoading}>
//                  Save to Firebase
//               </button>
//               <button className="btn btn-secondary bg-gray-700 text-white py-2 px-4 rounded-lg hover:bg-gray-800 transition-all shadow-md" onClick={() => downloadVcf(extractedData)}>Download .vcf</button>
//               <button className="btn btn-secondary bg-gray-700 text-white py-2 px-4 rounded-lg hover:bg-gray-800 transition-all shadow-md" onClick={() => downloadCsv([extractedData])}>Download .csv</button>
//               <button className="btn btn-secondary border border-red-500 text-red-500 py-2 px-4 rounded-lg hover:bg-red-500 hover:text-white transition-all shadow-md" onClick={resetState}>Cancel</button>
//             </div>
//           </div>
//         )}

//         {savedContacts.length > 0 && !extractedData && bulkItems.length === 0 && (
//           <>
//             <div className="card command-center bg-white p-6 rounded-xl shadow-lg mb-8 border border-gray-200">
//                 <h2 className="text-2xl font-bold mb-4 text-gray-900">AI Command Center</h2>
//                 <div className="chat-display h-80 overflow-y-auto border rounded-lg p-4 mb-4 bg-gray-50" ref={chatDisplayRef}>
//                     {chatHistory.map((msg, index) => (
//                         <div key={index} className={`chat-message mb-4 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
//                              <p className={`max-w-md p-3 rounded-xl ${msg.role === 'user' ? 'bg-red-600 text-white' : 'bg-gray-200'}`}>
//                                 {msg.role === 'model' && msg.text === '' && isChatLoading ? (
//                                     <div className="typing-indicator flex gap-1 items-center">
//                                       <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
//                                       <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
//                                       <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"></span>
//                                     </div>
//                                 ) : (
//                                     msg.text
//                                 )}
//                              </p>
//                         </div>
//                     ))}
//                 </div>
//                 <form onSubmit={handleCommandSubmit} className="command-form flex gap-2">
//                     <input
//                         type="text"
//                         value={chatInput}
//                         onChange={(e) => setChatInput(e.target.value)}
//                         placeholder="e.g., 'Who works at Google?'"
//                         disabled={isChatLoading}
//                         aria-label="Ask the AI assistant a question about your contacts"
//                         className="flex-grow p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-red-500 focus:border-red-500 transition"
//                     />
//                     <button type="submit" disabled={isChatLoading || !chatInput.trim()} aria-label="Send command" className="bg-red-600 text-white p-3 rounded-lg disabled:bg-red-300 hover:bg-red-700 transition-all shadow-md">
//                         <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
//                     </button>
//                 </form>
//             </div>
//             <div className="card contact-list bg-white p-6 rounded-xl shadow-lg border border-gray-200">
//                 <h2 className="text-2xl font-bold mb-4 text-gray-900">Saved Contacts</h2>
//                 <ul className="space-y-3">
//                 {savedContacts.map(contact => (
//                     <li key={contact.id} className="contact-item flex justify-between items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 border transition-all">
//                     <div className="info">
//                         <h3 className="font-semibold text-lg text-gray-800">{contact.name || 'No Name'}</h3>
//                         <p className="text-sm text-gray-600">{contact.company || 'No Company'}</p>
//                     </div>
//                     <div className="actions flex gap-3">
//                         <button onClick={() => editContact(contact)} title="Edit" className="text-gray-500 hover:text-gray-800 transition-colors">
//                           <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
//                         </button>
//                         <button onClick={() => deleteContact(contact.id)} title="Delete" className="text-red-500 hover:text-red-700 transition-colors">
//                            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
//                         </button>
//                     </div>
//                     </li>
//                 ))}
//                 </ul>
//             </div>
//           </>
//         )}
//       </main>
//       <footer className="bg-gray-800 text-white text-center py-4 mt-12 text-sm">
//         © {new Date().getFullYear()} StarShield Technologies Pvt Ltd. All rights reserved.
//       </footer>
//     </div>
//   );
// };

// export default App;


import React, { useState, useRef, useEffect, useCallback } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp, 
  query, 
  orderBy
} from "firebase/firestore";
import type { FirebaseApp } from "firebase/app"; // Type-only import
import type { 
  Firestore,
  CollectionReference,
  DocumentData
} from "firebase/firestore"; // Type-only imports
import logo from './assets/logo.jpg';

// --- Global Error Handler ---
window.addEventListener('unhandledrejection', function(event) {
  event.preventDefault();
  if (event.reason) {
    console.error("Unhandled Rejection:", event.reason.message || event.reason);
  } else {
    console.error("Unhandled Rejection with no reason object.");
  }
});

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

// --- Configuration Checks ---
const isFirebaseConfigured = firebaseConfig?.apiKey && firebaseConfig?.projectId;
const isAiConfigured = !!API_KEY;

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
}

// Initialize Firebase only if configured with explicit types
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

type AppMode = 'single' | 'bulk';
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

type Part = {
  text: string;
} | {
  inlineData: {
    mimeType: string;
    data: string;
  };
};

// --- Main App Component ---
const App = () => {
  // --- State Management ---
  const [mode, setMode] = useState<AppMode>('single');
  const [savedContacts, setSavedContacts] = useState<ContactData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Single Card State
  const [frontImageBase64, setFrontImageBase64] = useState<string | null>(null);
  const [backImageBase64, setBackImageBase64] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<Partial<ContactData> | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraFor, setCameraFor] = useState<'front' | 'back'>('front');

  // Bulk Upload State
  const [bulkItems, setBulkItems] = useState<BulkFileItem[]>([]);
  
  // AI Command Center State
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // --- PWA Install State ---
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  // --- Refs ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chatDisplayRef = useRef<HTMLDivElement>(null);

  // --- Effects ---
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault(); // Prevent the default browser prompt
      setDeferredPrompt(e);
      setShowInstallBanner(true); // Show our custom install banner
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
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
      const contacts = data.docs.map(doc => {
        // Explicitly type docData to satisfy strict mode
        const docData = doc.data() as DocumentData; 
        return {
          id: doc.id,
          name: docData.name || "",
          designation: docData.designation || "",
          company: docData.company || "",
          phoneNumbers: docData.phoneNumbers || [],
          emails: docData.emails || [],
          websites: docData.websites || [],
          address: docData.address || "",
          imageBase64: docData.imageBase64 || "",
        } as ContactData;
      });
      setSavedContacts(contacts);
    } catch (e) {
       const error = e as Error;
       console.error("Failed to load contacts from Firestore:", error.message);
       if (error.message.includes("Could not reach Cloud Firestore backend")) {
        setError("Could not connect to Firestore. Please check your internet connection and ensure this app's domain is added to your Firebase project's authorized domains.");
      } else if (error.message.includes("Missing or insufficient permissions")) {
        setError("Firestore permissions error. Please check your project's Firestore security rules.");
      } else {
        setError("Could not load saved contacts. An unknown error occurred.");
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if(isFirebaseConfigured) {
        fetchContacts();
    }
  }, [fetchContacts]);

  // --- Helper Functions ---
  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        console.log("User accepted the install prompt");
      }
      setDeferredPrompt(null);
      setShowInstallBanner(false);
    }
  };

  const resetState = () => {
    setFrontImageBase64(null);
    setBackImageBase64(null);
    setExtractedData(null);
    setBulkItems([]);
    setError(null);
    setIsLoading(false);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    if (mode === 'bulk') {
        resetState();
        const newBulkItems: BulkFileItem[] = Array.from(files).map((file: File) => ({
            id: `${file.name}-${Date.now()}`,
            file,
            base64: '',
            status: 'pending',
        }));
        setBulkItems(newBulkItems);
        processBulkQueue(newBulkItems);
    } else {
        const file = files[0];
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = (reader.result as string).split(",")[1];
            if (!frontImageBase64) {
                setFrontImageBase64(base64String);
            } else {
                setBackImageBase64(base64String);
            }
        };
        reader.readAsDataURL(file);
    }
    if(fileInputRef.current) fileInputRef.current.value = '';
  };
  
  const openCamera = async (forSide: 'front' | 'back') => {
    setCameraFor(forSide);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        setIsCameraOpen(true);
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } else {
        setError("Camera not supported on this device/browser.");
      }
    } catch (err) {
      const error = err as Error;
      console.error("Error accessing camera: ", error.message);
      setError("Could not access the camera. Please ensure permissions are granted.");
    }
  };

  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setIsCameraOpen(false);
    streamRef.current = null;
  };
  
  const takeSnapshot = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const base64String = canvas.toDataURL('image/jpeg').split(',')[1];
        if(cameraFor === 'front') setFrontImageBase64(base64String);
        else setBackImageBase64(base64String);
      }
      closeCamera();
    }
  };

    const processCardImages = async (frontB64: string, backB64?: string | null): Promise<Partial<ContactData>> => {
    if (!isAiConfigured || !API_KEY) throw new Error("Google AI API Key is not configured.");

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const parts: Part[] = [
      { inlineData: { mimeType: 'image/jpeg', data: frontB64 } },
    ];
    
    let promptText = `Analyze the business card image(s) and extract the contact details. Return a single JSON object with the following keys: "name", "designation", "company", "phoneNumbers", "emails", "websites", "address". If any information is not found, return an empty string for string fields or an empty array for array fields.`;

    if (backB64) {
      parts.push({ inlineData: { mimeType: 'image/jpeg', data: backB64 } });
    }
    parts.push({ text: promptText });
    
    const result = await model.generateContent({
      contents: [{ role: "user", parts }],
      generationConfig: {
        responseMimeType: "application/json",
      },
    });
    
    const response = result.response;
    const text = response.text();
    return JSON.parse(text);
  };

    const handleSingleCardProcess = async () => {
    if(!frontImageBase64) return;
    setIsLoading(true);
    setError(null);
    setExtractedData(null);
    try {
        const parsedData = await processCardImages(frontImageBase64, backImageBase64 ?? undefined);
        setExtractedData(parsedData);
    } catch (e) {
        const error = e as Error;
        console.error("Error processing card:", error.message);
        setError(`Failed to process image. ${error.message || 'An unknown error occurred.'}`);
    } finally {
        setIsLoading(false);
    }
  };

  const processBulkQueue = async (items: BulkFileItem[]) => {
    setIsLoading(true);
    let processedItems = [...items];

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(item.file);
        });
        
        processedItems = processedItems.map(p => p.id === item.id ? { ...p, base64, status: 'processing' } : p);
        setBulkItems(processedItems);

        try {
            const parsedData = await processCardImages(base64);
            processedItems = processedItems.map(p => p.id === item.id ? { ...p, status: 'success', extractedData: parsedData } : p);
            setBulkItems(processedItems);
        } catch(e) {
            const error = e as Error;
            console.error(`Error processing ${item.file.name}:`, error.message);
            processedItems = processedItems.map(p => p.id === item.id ? { ...p, status: 'error', error: error.message || "Failed to process" } : p);
            setBulkItems(processedItems);
        }
    }
    setIsLoading(false);
  }

  const handleDataChange = (field: keyof Omit<ContactData, 'id' | 'imageBase64'>, value: string | string[]) => {
    if (extractedData) {
      setExtractedData({ ...extractedData, [field]: value });
    }
  };

  const handleArrayDataChange = (field: keyof Omit<ContactData, 'id' | 'imageBase64'>, index: number, value: string) => {
      if (extractedData) {
          const currentArray = (extractedData[field] as string[]) || [];
          const newArray = [...currentArray];
          newArray[index] = value;
          handleDataChange(field, newArray);
      }
  };
  
  const saveContact = async () => {
    if (!db || !contactsCollectionRef) {
        setError("Firebase not configured. Cannot save contact.");
        return;
    }
    if (extractedData && frontImageBase64) {
      setIsLoading(true);
      const newContactPayload = {
        name: extractedData.name || "",
        designation: extractedData.designation || "",
        company: extractedData.company || "",
        phoneNumbers: extractedData.phoneNumbers || [],
        emails: extractedData.emails || [],
        websites: extractedData.websites || [],
        address: extractedData.address || "",
        imageBase64: frontImageBase64,
        createdAt: serverTimestamp(),
      };
      try {
        await addDoc(contactsCollectionRef, newContactPayload);
        resetState();
        fetchContacts();
      } catch (e) {
        const error = e as Error;
        console.error("Error saving to firestore:", error.message);
        setError("Failed to save contact.");
        setIsLoading(false);
      }
    }
  };

  const saveAllBulk = async () => {
    if (!db || !contactsCollectionRef) {
        setError("Firebase not configured. Cannot save contacts.");
        return;
    }
    const successfulItems = bulkItems.filter(item => item.status === 'success' && item.extractedData);
    if(successfulItems.length === 0) return;

    setIsLoading(true);
    let successCount = 0;
    for (const item of successfulItems) {
        if(item.extractedData){
            try {
                const newContactPayload = {
                   name: item.extractedData.name || "",
                   designation: item.extractedData.designation || "",
                   company: item.extractedData.company || "",
                   phoneNumbers: item.extractedData.phoneNumbers || [],
                   emails: item.extractedData.emails || [],
                   websites: item.extractedData.websites || [],
                   address: item.extractedData.address || "",
                   imageBase64: item.base64,
                   createdAt: serverTimestamp(),
               };
               await addDoc(contactsCollectionRef, newContactPayload);
               successCount++;
           } catch (e) {
               const error = e as Error;
               console.error(`Failed to save ${item.file.name}:`, error.message);
           }
        }
    }
    alert(`${successCount} of ${successfulItems.length} contacts saved successfully.`);
    resetState();
    fetchContacts();
  }

  const deleteContact = async (id: string) => {
    if (!db || !contactsCollectionRef) return;
    const isConfirmed = window.confirm("Are you sure you want to delete this contact?");
    if (isConfirmed) {
        try {
            await deleteDoc(doc(db, "visiting_cards", id));
            fetchContacts();
        } catch (e) {
            const error = e as Error;
            console.error("Error deleting document: ", error.message);
            setError("Failed to delete contact.");
        }
    }
  };
  
  const editContact = (contact: ContactData) => {
    setMode('single');
    resetState();
    setExtractedData(contact);
    setFrontImageBase64(contact.imageBase64);
    alert("Editing mode: After saving, this will create a new contact. You may want to delete the old one.");
  }

  const downloadVcf = (data: Partial<ContactData>) => {
    const { name, designation, company, phoneNumbers, emails, websites, address } = data;
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
    if (phoneNumbers) phoneNumbers.forEach(p => { vCard += `TEL;TYPE=WORK,VOICE:${p}\n`; });
    if (emails) emails.forEach(e => { vCard += `EMAIL:${e}\n`; });
    if (websites) websites.forEach(w => { vCard += `URL:${w}\n`; });
    if (address) vCard += `ADR;TYPE=WORK:;;${address.replace(/\n/g, '\\n')};;;;\n`;
    vCard += "END:VCARD";

    const blob = new Blob([vCard], { type: "text/vcard" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (name?.replace(/\s/g, '_') || 'contact') + '.vcf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const downloadCsv = (data: Partial<ContactData>[]) => {
      const headers = "Name,Designation,Company,Phone Numbers,Emails,Websites,Address\n";
      
      const escapeCsvField = (field: string | null | undefined): string => {
        if (field === null || field === undefined) return '""';
        const str = String(field).replace(/"/g, '""').replace(/\n/g, ' ');
        return `"${str}"`;
      };

      const rows = data.map(d => [
          escapeCsvField(d.name),
          escapeCsvField(d.designation),
          escapeCsvField(d.company),
          escapeCsvField((d.phoneNumbers || []).join(', ')),
          escapeCsvField((d.emails || []).join(', ')),
          escapeCsvField((d.websites || []).join(', ')),
          escapeCsvField(d.address),
      ].join(','));
      
      const csv = headers + rows.join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.length > 1 ? 'contacts_export.csv' : (data[0].name?.replace(/\s/g, '_') || 'contact') + '.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };
  
  const handleCommandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading || !isAiConfigured || !API_KEY) return;

    const userMessage: ChatMessage = { role: 'user', text: chatInput.trim() };
    setChatHistory(prev => [...prev, userMessage]);
    setChatInput("");
    setIsChatLoading(true);
    setChatHistory(prev => [...prev, { role: 'model', text: '' }]);

    try {
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const contactsJson = JSON.stringify(
            savedContacts.map(c => ({
                name: c.name,
                designation: c.designation,
                company: c.company,
                phoneNumbers: c.phoneNumbers,
                emails: c.emails,
                websites: c.websites,
                address: c.address,
            }))
        );
        
        const prompt = `You are an AI assistant for a business card app. Your task is to answer questions about the user's saved contacts. You will be given a list of contacts in JSON format. Base your answers STRICTLY on the information provided in the JSON data. If the information is not present in the contacts, state that you cannot find the information. Do not make up any details. Keep your answers concise and helpful. Here is the contact data: ${contactsJson}\n\nUser question: ${userMessage.text}`;

        const result = await model.generateContent(prompt);
        const response = result.response;
        const fullResponse = response.text();

        setChatHistory(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: 'model', text: fullResponse };
            return updated;
        });

    } catch (err) {
        const error = err as Error;
        console.error("Chat command failed:", error.message);
        const errorMessage = `Sorry, I encountered an error: ${error.message}`;
        setChatHistory(prev => {
             const updated = [...prev];
             updated[updated.length - 1] = { role: 'model', text: errorMessage };
             return updated;
        });
    } finally {
        setIsChatLoading(false);
    }
  };

  // --- Render Logic ---
  if (!isFirebaseConfigured || !isAiConfigured) {
      return (
        <div className="min-h-screen bg-gray-900 text-white font-sans flex items-center justify-center p-4">
            <div className="bg-red-700 p-8 rounded-2xl shadow-2xl text-center max-w-md w-full">
              <h2 className="text-3xl font-bold mb-4">Configuration Error</h2>
              {!isFirebaseConfigured && <p className="mb-2">Your Firebase configuration is incomplete. Please check your <code>.env</code> file.</p>}
              {!isAiConfigured && <p>Your Google AI API Key is missing. Please check your <code>.env</code> file.</p>}
              <p className="mt-6 text-red-200">The application cannot start without valid configurations.</p>
            </div>
        </div>
      )
  }
  
  const renderField = (label: string, field: keyof Omit<ContactData, 'id' | 'imageBase64'>) => (
     <div className="form-group">
      <label htmlFor={field} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="text"
        id={field}
        value={((extractedData?.[field] as string) || '')}
        onChange={(e) => handleDataChange(field, e.target.value)}
        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 transition"
      />
    </div>
  );
  
  const renderArrayField = (label: string, field: keyof Omit<ContactData, 'id' | 'imageBase64'>) => (
    <div className="form-group md:col-span-2">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {((extractedData?.[field] as string[]) || []).map((item, index) => (
         <input
            key={index}
            type="text"
            value={item}
            onChange={(e) => handleArrayDataChange(field, index, e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm mb-2 focus:ring-red-500 focus:border-red-500 transition"
          />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
      <header className="bg-white text-gray-800 py-4 flex items-center justify-between px-6 shadow-md border-b-2 border-gray-100 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Company Logo" className="h-12 w-12 rounded-full shadow-lg" />
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
             AI Business Card Scanner
          </h1>
        </div>
      </header>
      
      {showInstallBanner && (
        <div className="bg-gradient-to-r from-red-600 to-red-800 text-white px-4 py-3 flex flex-col sm:flex-row justify-between items-center shadow-lg text-center sm:text-left">
          <p className="font-semibold mb-2 sm:mb-0">📲 Install this app on your device for easy access!</p>
          <button
            onClick={handleInstallClick}
            className="bg-white text-red-700 font-bold px-4 py-2 rounded-lg hover:bg-red-100 transition-all shadow-md shrink-0"
          >
            Install App
          </button>
        </div>
      )}

      <main className="p-4 md:p-8 max-w-7xl mx-auto">
        {/* ... The rest of your main content remains exactly the same ... */}
        <div className="card input-section bg-white p-6 rounded-xl shadow-lg mb-8 border border-gray-200">
            <div className="mode-toggle flex border-b mb-6">
                <button className={`py-2 px-4 text-lg ${mode === 'single' ? 'border-b-2 border-red-600 font-semibold text-red-600' : 'text-gray-500'}`} onClick={() => { resetState(); setMode('single'); }}>Single Card</button>
                <button className={`py-2 px-4 text-lg ${mode === 'bulk' ? 'border-b-2 border-red-600 font-semibold text-red-600' : 'text-gray-500'}`} onClick={() => { resetState(); setMode('bulk'); }}>Bulk Upload</button>
            </div>
          
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" multiple={mode === 'bulk'} style={{display: 'none'}}/>

            {mode === 'single' && (
                <>
                    <div className="actions flex flex-col sm:flex-row gap-4">
                        <button className="btn btn-primary bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-all shadow-md w-full sm:w-auto disabled:bg-gray-400" onClick={() => fileInputRef.current?.click()} disabled={isLoading || !!backImageBase64}>
                             {frontImageBase64 ? 'Upload Back' : 'Upload Front'}
                        </button>
                        <button className="btn btn-secondary bg-gray-700 text-white py-2 px-4 rounded-lg hover:bg-gray-800 transition-all shadow-md w-full sm:w-auto disabled:bg-gray-400" onClick={() => openCamera(frontImageBase64 ? 'back' : 'front')} disabled={isLoading || !!backImageBase64}>
                             {frontImageBase64 ? 'Camera (Back)' : 'Camera (Front)'}
                        </button>
                    </div>
                    {(frontImageBase64 || backImageBase64) && (
                         <div className="image-previews grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
                            {frontImageBase64 && <div className="preview-container"><img src={`data:image/jpeg;base64,${frontImageBase64}`} alt="Front Preview" className="w-full rounded-lg shadow-xl"/><p className="text-center mt-2 font-semibold">Front</p></div>}
                            {backImageBase64 && <div className="preview-container"><img src={`data:image/jpeg;base64,${backImageBase64}`} alt="Back Preview" className="w-full rounded-lg shadow-xl"/><p className="text-center mt-2 font-semibold">Back</p></div>}
                         </div>
                    )}
                    <div className="result-actions mt-6">
                        {frontImageBase64 && <button className="btn btn-primary bg-red-600 text-white py-3 px-6 rounded-lg hover:bg-red-700 transition-all shadow-xl text-lg w-full sm:w-auto" onClick={handleSingleCardProcess} disabled={isLoading}>Process Card</button>}
                    </div>
                </>
            )}

            {mode === 'bulk' && (
                <>
                    <div className="actions">
                        <button className="btn btn-primary bg-red-600 text-white py-3 px-6 rounded-lg hover:bg-red-700 transition-all shadow-xl text-lg w-full sm:w-auto" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
                            Upload Multiple Cards
                        </button>
                    </div>
                    {bulkItems.length > 0 && (
                        <div className="bulk-list mt-6">
                            <ul className="space-y-3">
                                {bulkItems.map(item => (
                                    <li key={item.id} className="bulk-item flex justify-between items-center p-3 bg-gray-100 rounded-lg border">
                                        <div className="info">
                                            <h3 className="font-semibold text-gray-800">{item.file.name}</h3>
                                            {item.status === 'error' && <p className="text-red-600 text-sm">{item.error}</p>}
                                        </div>
                                        <span className={`status status-${item.status} px-3 py-1 rounded-full text-sm font-semibold ${
                                            item.status === 'success' ? 'bg-green-100 text-green-800' :
                                            item.status === 'error' ? 'bg-red-100 text-red-800' :
                                            item.status === 'processing' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-200 text-gray-800'
                                        }`}>{item.status}</span>
                                    </li>
                                ))}
                            </ul>
                            <div className="bulk-actions flex flex-col sm:flex-row gap-4 mt-6">
                               <button className="btn btn-primary bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-all shadow-md disabled:bg-gray-400" onClick={saveAllBulk} disabled={isLoading || bulkItems.every(i => i.status !== 'success')}>
                                   Save All Successful
                                </button>
                                <button className="btn btn-secondary bg-gray-700 text-white py-2 px-4 rounded-lg hover:bg-gray-800 transition-all shadow-md disabled:bg-gray-400" onClick={() => downloadCsv(bulkItems.filter(i => i.status === 'success').map(i => i.extractedData || {}))} disabled={isLoading || bulkItems.every(i => i.status !== 'success')}>
                                    Export All to CSV
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {isCameraOpen && (
                <div className="video-container fixed inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center z-50 p-4">
                    <video ref={videoRef} autoPlay playsInline className="w-full max-w-2xl rounded-lg"></video>
                    <div className="controls mt-6 flex gap-4">
                       <button className="btn btn-primary bg-red-600 text-white py-2 px-6 rounded-lg hover:bg-red-700 transition-all shadow-lg text-lg" onClick={takeSnapshot}>Capture</button>
                       <button className="btn btn-secondary bg-gray-600 text-white py-2 px-6 rounded-lg hover:bg-gray-700 transition-all shadow-lg text-lg" onClick={closeCamera}>Cancel</button>
                    </div>
                </div>
            )}
            {error && <div className="error-message bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mt-6" role="alert">{error}</div>}
            {isLoading && mode !== 'bulk' && (
                <div className="loading-overlay fixed inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center z-50">
                    <div className="spinner border-4 border-t-4 border-t-red-600 border-gray-200 rounded-full w-16 h-16 animate-spin"></div>
                    <p className="ml-4 text-gray-700 text-lg font-semibold mt-4">Scanning your card...</p>
                </div>
            )}
        </div>

        {extractedData && (
          <div className="card results-section bg-white p-6 rounded-xl shadow-lg mb-8 border border-gray-200">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Verify & Save</h2>
             <div className="form-grid grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              {renderField("Name", "name")}
              {renderField("Designation", "designation")}
              {renderField("Company", "company")}
              {renderField("Address", "address")}
              {renderArrayField("Phone Numbers", "phoneNumbers")}
              {renderArrayField("Emails", "emails")}
              {renderArrayField("Websites", "websites")}
            </div>
            <div className="result-actions flex flex-col sm:flex-row gap-4 mt-8">
              <button className="btn btn-primary bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-all shadow-md" onClick={saveContact} disabled={isLoading}>
                 Save to Firebase
              </button>
              <button className="btn btn-secondary bg-gray-700 text-white py-2 px-4 rounded-lg hover:bg-gray-800 transition-all shadow-md" onClick={() => downloadVcf(extractedData)}>Download .vcf</button>
              <button className="btn btn-secondary bg-gray-700 text-white py-2 px-4 rounded-lg hover:bg-gray-800 transition-all shadow-md" onClick={() => downloadCsv([extractedData])}>Download .csv</button>
              <button className="btn btn-secondary border border-red-500 text-red-500 py-2 px-4 rounded-lg hover:bg-red-500 hover:text-white transition-all shadow-md" onClick={resetState}>Cancel</button>
            </div>
          </div>
        )}

        {savedContacts.length > 0 && !extractedData && bulkItems.length === 0 && (
          <>
            <div className="card command-center bg-white p-6 rounded-xl shadow-lg mb-8 border border-gray-200">
                <h2 className="text-2xl font-bold mb-4 text-gray-900">AI Command Center</h2>
                <div className="chat-display h-80 overflow-y-auto border rounded-lg p-4 mb-4 bg-gray-50" ref={chatDisplayRef}>
                    {chatHistory.map((msg, index) => (
                        <div key={index} className={`chat-message mb-4 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                             <p className={`max-w-md p-3 rounded-xl ${msg.role === 'user' ? 'bg-red-600 text-white' : 'bg-gray-200'}`}>
                                {msg.role === 'model' && msg.text === '' && isChatLoading ? (
                                    <div className="typing-indicator flex gap-1 items-center">
                                      <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                      <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                      <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"></span>
                                    </div>
                                ) : (
                                    msg.text
                                )}
                             </p>
                        </div>
                    ))}
                </div>
                <form onSubmit={handleCommandSubmit} className="command-form flex gap-2">
                    <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="e.g., 'Who works at Google?'"
                        disabled={isChatLoading}
                        aria-label="Ask the AI assistant a question about your contacts"
                        className="flex-grow p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-red-500 focus:border-red-500 transition"
                    />
                    <button type="submit" disabled={isChatLoading || !chatInput.trim()} aria-label="Send command" className="bg-red-600 text-white p-3 rounded-lg disabled:bg-red-300 hover:bg-red-700 transition-all shadow-md">
                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                    </button>
                </form>
            </div>
            <div className="card contact-list bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                <h2 className="text-2xl font-bold mb-4 text-gray-900">Saved Contacts</h2>
                <ul className="space-y-3">
                {savedContacts.map(contact => (
                    <li key={contact.id} className="contact-item flex justify-between items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 border transition-all">
                    <div className="info">
                        <h3 className="font-semibold text-lg text-gray-800">{contact.name || 'No Name'}</h3>
                        <p className="text-sm text-gray-600">{contact.company || 'No Company'}</p>
                    </div>
                    <div className="actions flex gap-3">
                        <button onClick={() => editContact(contact)} title="Edit" className="text-gray-500 hover:text-gray-800 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                        </button>
                        <button onClick={() => deleteContact(contact.id)} title="Delete" className="text-red-500 hover:text-red-700 transition-colors">
                           <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                        </button>
                    </div>
                    </li>
                ))}
                </ul>
            </div>
          </>
        )}
      </main>
      <footer className="bg-gray-800 text-white text-center py-4 mt-12 text-sm">
        © {new Date().getFullYear()} StarShield Technologies Pvt Ltd. All rights reserved.
      </footer>
    </div>
  );
};

export default App;