// import React, { useState, useRef, useEffect, useCallback } from "react";
// import { GoogleGenerativeAI } from "@google/generative-ai";
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
//   serverTimestamp, 
//   query, 
//   orderBy
// } from "firebase/firestore";
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

// // Initialize Firebase only if configured with explicit types
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
//       e.preventDefault();
//       setDeferredPrompt(e);
//       setShowInstallBanner(true);
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
//       const contacts = data.docs.map(doc => {
//         const docData = doc.data() as DocumentData; 
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
//        setError("Could not load saved contacts. Please check your Firestore rules and internet connection.");
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
//     if (!db || !contactsCollectionRef) {
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
//     if (!db || !contactsCollectionRef) {
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
//         <div className="min-h-screen bg-slate-900 font-sans flex items-center justify-center p-4">
//             <div className="bg-red-700 text-white p-8 rounded-2xl shadow-2xl text-center max-w-md w-full">
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
//       <label htmlFor={field} className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
//       <input
//         type="text"
//         id={field}
//         value={((extractedData?.[field] as string) || '')}
//         onChange={(e) => handleDataChange(field, e.target.value)}
//         className="w-full p-2.5 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 transition"
//       />
//     </div>
//   );
  
//   const renderArrayField = (label: string, field: keyof Omit<ContactData, 'id' | 'imageBase64'>) => (
//     <div className="form-group md:col-span-2">
//       <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
//       {((extractedData?.[field] as string[]) || []).map((item, index) => (
//          <input
//             key={index}
//             type="text"
//             value={item}
//             onChange={(e) => handleArrayDataChange(field, index, e.target.value)}
//             className="w-full p-2.5 border border-slate-300 rounded-lg shadow-sm mb-2 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition"
//           />
//       ))}
//     </div>
//   );

//   const PrimaryButton = ({ onClick, disabled, children, className = '' }: { onClick: () => void, disabled?: boolean, children: React.ReactNode, className?: string }) => (
//     <button
//       onClick={onClick}
//       disabled={disabled}
//       className={`bg-red-600 text-white font-semibold py-2.5 px-5 rounded-lg hover:bg-red-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${className}`}
//     >
//       {children}
//     </button>
//   );

//   const SecondaryButton = ({ onClick, disabled, children, className = '' }: { onClick: () => void, disabled?: boolean, children: React.ReactNode, className?: string }) => (
//     <button
//       onClick={onClick}
//       disabled={disabled}
//       className={`bg-slate-700 text-white font-semibold py-2.5 px-5 rounded-lg hover:bg-slate-800 disabled:bg-slate-400 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 ${className}`}
//     >
//       {children}
//     </button>
//   );

//   return (
//     <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
//       <header className="bg-white/80 backdrop-blur-lg text-slate-800 py-3 flex items-center justify-between px-4 sm:px-6 shadow-sm border-b border-slate-200 sticky top-0 z-40">
//         <div className="flex items-center gap-3">
//           <img src={logo} alt="Company Logo" className="h-10 w-10 rounded-full" />
//           <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
//              AI Card Scanner
//           </h1>
//         </div>
//       </header>
      
//       {showInstallBanner && (
//         <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-3 flex flex-col sm:flex-row justify-between items-center shadow-lg text-center sm:text-left">
//           <p className="font-semibold mb-2 sm:mb-0">📲 Install this app for a native experience!</p>
//           <button
//             onClick={handleInstallClick}
//             className="bg-white text-red-700 font-bold px-4 py-2 rounded-lg hover:bg-red-100 transition-all shadow-md shrink-0"
//           >
//             Install
//           </button>
//         </div>
//       )}

//       <main className="p-4 md:p-6 max-w-5xl mx-auto">
//         <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-lg mb-8 border border-slate-200">
//             <div className="border-b border-slate-200 mb-6">
//                 <nav className="-mb-px flex space-x-6">
//                   <button className={`py-3 px-1 border-b-2 font-semibold text-base sm:text-lg ${mode === 'single' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`} onClick={() => { resetState(); setMode('single'); }}>Single Card</button>
//                   <button className={`py-3 px-1 border-b-2 font-semibold text-base sm:text-lg ${mode === 'bulk' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`} onClick={() => { resetState(); setMode('bulk'); }}>Bulk Upload</button>
//                 </nav>
//             </div>
          
//             <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" multiple={mode === 'bulk'} className="hidden"/>

//             {mode === 'single' && (
//               <>
//                 {!frontImageBase64 ? (
//                   <div 
//                     onClick={() => fileInputRef.current?.click()}
//                     className="mt-2 flex justify-center rounded-lg border-2 border-dashed border-slate-300 px-6 py-10 hover:border-red-500 transition-all cursor-pointer"
//                   >
//                     <div className="text-center">
//                       <svg className="mx-auto h-12 w-12 text-slate-400" stroke="currentColor" fill="none" viewBox="0 0 24 24" aria-hidden="true">
//                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
//                       </svg>
//                       <p className="mt-2 text-sm text-slate-600">
//                         <span className="font-semibold text-red-600">Upload a file</span> or drag and drop
//                       </p>
//                       <p className="text-xs text-slate-500">PNG, JPG, GIF up to 10MB</p>
//                     </div>
//                   </div>
//                 ) : (
//                   <div className="image-previews grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
//                     <div className="preview-container">
//                       <img src={`data:image/jpeg;base64,${frontImageBase64}`} alt="Front Preview" className="w-full rounded-lg shadow-xl"/>
//                       <p className="text-center mt-2 font-semibold text-slate-700">Front</p>
//                     </div>
//                     <div className="preview-container flex flex-col items-center justify-center">
//                       {backImageBase64 ? (
//                         <>
//                           <img src={`data:image/jpeg;base64,${backImageBase64}`} alt="Back Preview" className="w-full rounded-lg shadow-xl"/>
//                           <p className="text-center mt-2 font-semibold text-slate-700">Back</p>
//                         </>
//                       ) : (
//                         <div 
//                           onClick={() => fileInputRef.current?.click()}
//                           className="w-full h-full flex justify-center items-center rounded-lg border-2 border-dashed border-slate-300 px-6 py-10 hover:border-red-500 transition-all cursor-pointer"
//                         >
//                           <div className="text-center">
//                              <svg className="mx-auto h-10 w-10 text-slate-400" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
//                              <p className="mt-2 text-sm text-slate-600 font-semibold text-red-600">Add back side</p>
//                           </div>
//                         </div>
//                       )}
//                     </div>
//                   </div>
//                 )}
//                 <div className="actions flex flex-wrap gap-4 mt-6">
//                   <PrimaryButton onClick={handleSingleCardProcess} disabled={isLoading || !frontImageBase64} className="w-full sm:w-auto">Process Card</PrimaryButton>
//                   <SecondaryButton onClick={() => openCamera(frontImageBase64 ? 'back' : 'front')} disabled={isLoading || (!!frontImageBase64 && !!backImageBase64)} className="w-full sm:w-auto">Use Camera</SecondaryButton>
//                 </div>
//               </>
//             )}

//             {mode === 'bulk' && (
//                 <>
//                     <div className="actions">
//                         <PrimaryButton onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
//                             Upload Multiple Cards
//                         </PrimaryButton>
//                     </div>
//                     {bulkItems.length > 0 && (
//                         <div className="bulk-list mt-6">
//                             <ul className="space-y-3">
//                                 {bulkItems.map(item => (
//                                     <li key={item.id} className="bulk-item flex justify-between items-center p-3 bg-slate-100 rounded-lg border border-slate-200">
//                                         <div className="info overflow-hidden mr-2">
//                                             <h3 className="font-semibold text-slate-800 truncate">{item.file.name}</h3>
//                                             {item.status === 'error' && <p className="text-red-600 text-sm">{item.error}</p>}
//                                         </div>
//                                         <span className={`status status-${item.status} px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shrink-0 ${
//                                             item.status === 'success' ? 'bg-green-100 text-green-800' :
//                                             item.status === 'error' ? 'bg-red-100 text-red-800' :
//                                             item.status === 'processing' ? 'bg-yellow-100 text-yellow-800' : 'bg-slate-200 text-slate-800'
//                                         }`}>{item.status}</span>
//                                     </li>
//                                 ))}
//                             </ul>
//                             <div className="bulk-actions flex flex-wrap gap-4 mt-6">
//                                <PrimaryButton onClick={saveAllBulk} disabled={isLoading || bulkItems.every(i => i.status !== 'success')}>
//                                    Save All Successful
//                                 </PrimaryButton>
//                                 <SecondaryButton onClick={() => downloadCsv(bulkItems.filter(i => i.status === 'success').map(i => i.extractedData || {}))} disabled={isLoading || bulkItems.every(i => i.status !== 'success')}>
//                                     Export All to CSV
//                                 </SecondaryButton>
//                             </div>
//                         </div>
//                     )}
//                 </>
//             )}

//             {isCameraOpen && (
//                 <div className="video-container fixed inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center z-50 p-4">
//                     <video ref={videoRef} autoPlay playsInline className="w-full max-w-2xl rounded-lg shadow-2xl"></video>
//                     <div className="controls mt-6 flex gap-4">
//                        <PrimaryButton onClick={takeSnapshot}>Capture</PrimaryButton>
//                        <SecondaryButton onClick={closeCamera}>Cancel</SecondaryButton>
//                     </div>
//                 </div>
//             )}
//             {error && <div className="error-message bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mt-6" role="alert">{error}</div>}
//             {isLoading && mode !== 'bulk' && !extractedData && (
//                 <div className="loading-overlay fixed inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
//                     <div className="spinner border-4 border-t-4 border-t-red-600 border-slate-200 rounded-full w-16 h-16 animate-spin"></div>
//                     <p className="text-slate-700 text-lg font-semibold mt-4">Scanning your card...</p>
//                 </div>
//             )}
//         </div>

//         {extractedData && (
//           <div className="card results-section bg-white p-6 rounded-2xl shadow-lg mb-8 border border-slate-200">
//             <h2 className="text-2xl font-bold mb-6 text-slate-900">Verify & Save</h2>
//              <div className="form-grid grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
//               {renderField("Name", "name")}
//               {renderField("Designation", "designation")}
//               {renderField("Company", "company")}
//               {renderField("Address", "address")}
//               {renderArrayField("Phone Numbers", "phoneNumbers")}
//               {renderArrayField("Emails", "emails")}
//               {renderArrayField("Websites", "websites")}
//             </div>
//             {/* --- MODIFIED SECTION FOR MOBILE --- */}
//             <div className="result-actions flex flex-col sm:flex-row flex-wrap gap-4 mt-8">
//               <PrimaryButton onClick={saveContact} disabled={isLoading} className="w-full sm:w-auto">Save to Firebase</PrimaryButton>
//               <SecondaryButton onClick={() => downloadVcf(extractedData)} className="w-full sm:w-auto">Download .vcf</SecondaryButton>
//               <SecondaryButton onClick={() => downloadCsv([extractedData])} className="w-full sm:w-auto">Download .csv</SecondaryButton>
//               <button onClick={resetState} className="font-semibold text-red-600 hover:text-red-800 transition-all py-2.5 px-5 w-full sm:w-auto">Cancel</button>
//             </div>
//           </div>
//         )}

//         {savedContacts.length > 0 && !extractedData && bulkItems.length === 0 && (
//           <>
//             <div className="card command-center bg-white p-6 rounded-2xl shadow-lg mb-8 border border-slate-200 overflow-y-auto max-h-[80vh]">
//                 <h2 className="text-2xl font-bold mb-4 text-slate-900">AI Command Center</h2>
//                 <div className="chat-display h-80 overflow-y-auto border rounded-xl p-4 mb-4 bg-slate-50" ref={chatDisplayRef}>
//                     {chatHistory.length === 0 && (
//                       <div className="flex flex-col items-center justify-center h-full text-center text-slate-500">
//                           <svg className="h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
//                           <p className="font-semibold">Ask anything about your contacts!</p>
//                           <p className="text-sm">e.g., "Who works at Google?" or "What is Jane's email?"</p>
//                       </div>
//                     )}
//                     {chatHistory.map((msg, index) => (
//                         <div key={index} className={`chat-message mb-4 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
//                              <p className={`max-w-lg p-3 rounded-2xl shadow-sm ${msg.role === 'user' ? 'bg-red-600 text-white rounded-br-none' : 'bg-slate-200 text-slate-800 rounded-bl-none'}`}>
//                                 {msg.role === 'model' && msg.text === '' && isChatLoading ? (
//                                     <div className="typing-indicator flex gap-1.5 items-center p-1">
//                                       <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
//                                       <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
//                                       <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce"></span>
//                                     </div>
//                                 ) : (
//                                     msg.text
//                                 )}
//                              </p>
//                         </div>
//                     ))}
//                 </div>
//                 <form onSubmit={handleCommandSubmit} className="command-form flex gap-3">
//                     <input
//                         type="text"
//                         value={chatInput}
//                         onChange={(e) => setChatInput(e.target.value)}
//                         placeholder="e.g., 'Who works at Google?'"
//                         disabled={isChatLoading}
//                         aria-label="Ask the AI assistant a question about your contacts"
//                         className="flex-grow p-3 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 transition"
//                     />
//                     <button type="submit" disabled={isChatLoading || !chatInput.trim()} aria-label="Send command" className="bg-red-600 text-white p-3 rounded-lg disabled:bg-red-300 hover:bg-red-700 transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2">
//                         <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.949a.75.75 0 00.95.826L11.25 9.25v1.5l-7.597 1.266a.75.75 0 00-.95.826l1.414 4.949a.75.75 0 00.95.826l12.21-4.479a.75.75 0 000-1.416L3.105 2.29z"></path></svg>
//                     </button>
//                 </form>
//             </div>
//             <div className="card contact-list bg-white p-6 rounded-2xl shadow-lg border border-slate-200">
//                 <h2 className="text-2xl font-bold mb-4 text-slate-900">Saved Contacts</h2>
//                 <ul className="space-y-3">
//                 {savedContacts.map(contact => (
//                     // --- MODIFIED LIST ITEM FOR MOBILE ---
//                     <li key={contact.id} className="contact-item flex flex-col sm:flex-row sm:justify-between sm:items-center p-4 bg-slate-50 rounded-xl hover:bg-red-50/50 border border-slate-200 hover:border-red-200 transition-all group">
//                       <div className="info overflow-hidden mr-0 sm:mr-4 mb-3 sm:mb-0 text-center sm:text-left w-full sm:w-auto">
//                           <h3 className="font-semibold text-lg text-slate-800 truncate">{contact.name || 'No Name'}</h3>
//                           <p className="text-sm text-slate-500 truncate">{contact.company || 'No Company'}</p>
//                       </div>
//                       <div className="actions flex gap-4 shrink-0 justify-center sm:justify-start">
//                           <button onClick={() => editContact(contact)} title="Edit" className="text-slate-400 hover:text-slate-700 transition-colors">
//                             <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z"></path><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd"></path></svg>
//                           </button>
//                           <button onClick={() => deleteContact(contact.id)} title="Delete" className="text-red-400 hover:text-red-600 transition-colors">
//                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"></path></svg>
//                           </button>
//                       </div>
//                     </li>
//                 ))}
//                 </ul>
//             </div>
//           </>
//         )}
//       </main>
//       <footer className="bg-slate-800 text-slate-400 text-center py-5 mt-12 text-sm">
//         <p>© {new Date().getFullYear()} StarShield Technologies Pvt Ltd. All rights reserved.</p>
//       </footer>
//     </div>
//   );
// };

// export default App;

import React, { useState, useRef, useEffect, useCallback } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { FirebaseApp } from "firebase/app";
import { initializeApp } from "firebase/app";
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
  serverTimestamp,
  query,
  orderBy
} from "firebase/firestore";
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
  imageBase64: string; // This will serve as the profile picture
  notes: string;
  group: string;
  whatsapp: string;
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
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
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
          notes: docData.notes || "",
          group: docData.group || "",
          whatsapp: docData.whatsapp || "",
        } as ContactData;
      });
      setSavedContacts(contacts);
    } catch (e) {
       const error = e as Error;
       console.error("Failed to load contacts from Firestore:", error.message);
       setError("Could not load saved contacts. Please check your Firestore rules and internet connection.");
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
    setMode('single'); // Default back to single mode
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    if (mode === 'bulk') {
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
    let promptText = `Analyze the business card image(s) and extract the contact details. Return a single JSON object with the following keys: "name", "designation", "company", "phoneNumbers", "emails", "websites", "address", "whatsapp", "group", "notes". For "whatsapp", find a WhatsApp number if explicitly mentioned. For "group" or "notes", extract any relevant info or leave blank. If any information is not found, return an empty string for string fields or an empty array for array fields.`;
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
        notes: extractedData.notes || "",
        group: extractedData.group || "",
        whatsapp: extractedData.whatsapp || "",
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
                   notes: item.extractedData.notes || "",
                   group: item.extractedData.group || "",
                   whatsapp: item.extractedData.whatsapp || "",
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
            if(extractedData && (extractedData as ContactData).id === id) {
              resetState();
            }
            fetchContacts();
        } catch (e) {
            const error = e as Error;
            console.error("Error deleting document: ", error.message);
            setError("Failed to delete contact.");
        }
    }
  };
  
  const editContact = (contact: ContactData) => {
    setExtractedData(contact);
    setFrontImageBase64(contact.imageBase64);
    setBackImageBase64(null); // Reset back image when editing
    setMode('single');
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
                group: c.group,
                whatsapp: c.whatsapp,
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

  // --- Render Logic Components ---
  if (!isFirebaseConfigured || !isAiConfigured) {
      return (
        <div className="min-h-screen bg-slate-900 font-sans flex items-center justify-center p-4">
            <div className="bg-red-700 text-white p-8 rounded-2xl shadow-2xl text-center max-w-md w-full">
              <h2 className="text-3xl font-bold mb-4">Configuration Error</h2>
              {!isFirebaseConfigured && <p className="mb-2">Your Firebase configuration is incomplete. Please check your <code>.env</code> file.</p>}
              {!isAiConfigured && <p>Your Google AI API Key is missing. Please check your <code>.env</code> file.</p>}
              <p className="mt-6 text-red-200">The application cannot start without valid configurations.</p>
            </div>
        </div>
      )
  }
  
  const renderField = (label: string, field: keyof Omit<ContactData, 'id' | 'imageBase64'>, isTextArea = false) => {
     const commonProps = {
        id: field,
        value: ((extractedData?.[field] as string) || ''),
        onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => handleDataChange(field, e.target.value),
        className: "w-full p-2.5 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 transition"
     };
     return (
     <div className={`form-group ${isTextArea ? 'md:col-span-2' : ''}`}>
      <label htmlFor={field} className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {isTextArea ? <textarea {...commonProps} rows={3} /> : <input type="text" {...commonProps} />}
    </div>
  )};
  
  const renderArrayField = (label: string, field: keyof Omit<ContactData, 'id' | 'imageBase64'>) => (
    <div className="form-group md:col-span-2">
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {((extractedData?.[field] as string[]) || []).map((item, index) => (
         <input
            key={index}
            type="text"
            value={item}
            onChange={(e) => handleArrayDataChange(field, index, e.target.value)}
            className="w-full p-2.5 border border-slate-300 rounded-lg shadow-sm mb-2 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition"
          />
      ))}
    </div>
  );

  const PrimaryButton = ({ onClick, disabled, children, className = '' }: { onClick: React.MouseEventHandler<HTMLButtonElement>, disabled?: boolean, children: React.ReactNode, className?: string }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`bg-red-600 text-white font-semibold py-2.5 px-5 rounded-lg hover:bg-red-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${className}`}
    >
      {children}
    </button>
  );

  const SecondaryButton = ({ onClick, disabled, children, className = '' }: { onClick: React.MouseEventHandler<HTMLButtonElement>, disabled?: boolean, children: React.ReactNode, className?: string }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`bg-slate-700 text-white font-semibold py-2.5 px-5 rounded-lg hover:bg-slate-800 disabled:bg-slate-400 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 ${className}`}
    >
      {children}
    </button>
  );

  const ActionPanel = () => {
    // If we are verifying/editing a card, show that form.
    if(extractedData) {
      return (
        <div className="card results-section bg-white p-6 rounded-2xl shadow-md border border-slate-200">
          <h2 className="text-2xl font-bold mb-6 text-slate-900">Verify & Save Contact</h2>
           <div className="form-grid grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            {renderField("Name", "name")}
            {renderField("Designation", "designation")}
            {renderField("Company", "company")}
            {renderField("Address", "address")}
            {renderField("WhatsApp Number", "whatsapp")}
            {renderField("Group", "group")}
            {renderArrayField("Phone Numbers", "phoneNumbers")}
            {renderArrayField("Emails", "emails")}
            {renderArrayField("Websites", "websites")}
            {renderField("Notes", "notes", true)}
          </div>
          <div className="result-actions flex flex-wrap gap-4 mt-8">
            <PrimaryButton onClick={saveContact} disabled={isLoading}>Save Contact</PrimaryButton>
            <SecondaryButton onClick={() => downloadVcf(extractedData)}>Download .vcf</SecondaryButton>
            <button onClick={resetState} className="font-semibold text-red-600 hover:text-red-800 transition-all py-2.5 px-5">Cancel</button>
          </div>
        </div>
      );
    }
    
    // Default view with tabs
    return (
       <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-md border border-slate-200">
          <div className="border-b border-slate-200 mb-6">
              <nav className="-mb-px flex space-x-6">
                <button className={`py-3 px-1 border-b-2 font-semibold text-base sm:text-lg ${mode === 'single' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`} onClick={() => setMode('single')}>Single Card</button>
                <button className={`py-3 px-1 border-b-2 font-semibold text-base sm:text-lg ${mode === 'bulk' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`} onClick={() => setMode('bulk')}>Bulk Upload</button>
                <button className={`py-3 px-1 border-b-2 font-semibold text-base sm:text-lg ${mode === 'chat' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`} onClick={() => setMode('chat')}>AI Assistant</button>
              </nav>
          </div>
        
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" multiple={mode === 'bulk'} className="hidden"/>

          {mode === 'single' && (
            <>
              {!frontImageBase64 ? (
                <div onClick={() => fileInputRef.current?.click()} className="mt-2 flex justify-center rounded-lg border-2 border-dashed border-slate-300 px-6 py-10 hover:border-red-500 transition-all cursor-pointer">
                  <div className="text-center">
                    <svg className="mx-auto h-12 w-12 text-slate-400" stroke="currentColor" fill="none" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                    <p className="mt-2 text-sm text-slate-600"><span className="font-semibold text-red-600">Upload Card Image</span> or drag and drop</p>
                    <p className="text-xs text-slate-500">PNG, JPG, GIF up to 10MB</p>
                  </div>
                </div>
              ) : (
                <div className="image-previews grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div className="preview-container">
                    <img src={`data:image/jpeg;base64,${frontImageBase64}`} alt="Front Preview" className="w-full rounded-lg shadow-xl"/>
                    <p className="text-center mt-2 font-semibold text-slate-700">Profile Picture / Front</p>
                  </div>
                  <div className="preview-container flex flex-col items-center justify-center">
                    {backImageBase64 ? ( <> <img src={`data:image/jpeg;base64,${backImageBase64}`} alt="Back Preview" className="w-full rounded-lg shadow-xl"/><p className="text-center mt-2 font-semibold text-slate-700">Back</p> </> ) : 
                    ( <div onClick={() => fileInputRef.current?.click()} className="w-full h-full flex justify-center items-center rounded-lg border-2 border-dashed border-slate-300 px-6 py-10 hover:border-red-500 transition-all cursor-pointer">
                        <div className="text-center"> <svg className="mx-auto h-10 w-10 text-slate-400" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg> <p className="mt-2 text-sm text-slate-600 font-semibold text-red-600">Add back side</p> </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div className="actions flex flex-wrap gap-4 mt-6">
                <PrimaryButton onClick={handleSingleCardProcess} disabled={isLoading || !frontImageBase64} className="w-full sm:w-auto">Process Card</PrimaryButton>
                <SecondaryButton onClick={() => openCamera(frontImageBase64 ? 'back' : 'front')} disabled={isLoading || (!!frontImageBase64 && !!backImageBase64)} className="w-full sm:w-auto">Use Camera</SecondaryButton>
              </div>
            </>
          )}

          {mode === 'bulk' && (
              <>
                  <div className="actions">
                      <PrimaryButton onClick={() => fileInputRef.current?.click()} disabled={isLoading}> Upload Multiple Cards </PrimaryButton>
                  </div>
                  {bulkItems.length > 0 && (
                      <div className="bulk-list mt-6">
                          <ul className="space-y-3">
                              {bulkItems.map(item => (
                                  <li key={item.id} className="bulk-item flex justify-between items-center p-3 bg-slate-100 rounded-lg border border-slate-200">
                                      <div className="info overflow-hidden mr-2">
                                          <h3 className="font-semibold text-slate-800 truncate">{item.file.name}</h3>
                                          {item.status === 'error' && <p className="text-red-600 text-sm">{item.error}</p>}
                                      </div>
                                      <span className={`status status-${item.status} px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shrink-0 ${
                                          item.status === 'success' ? 'bg-green-100 text-green-800' :
                                          item.status === 'error' ? 'bg-red-100 text-red-800' :
                                          item.status === 'processing' ? 'bg-yellow-100 text-yellow-800' : 'bg-slate-200 text-slate-800'
                                      }`}>{item.status}</span>
                                  </li>
                              ))}
                          </ul>
                          <div className="bulk-actions flex flex-wrap gap-4 mt-6">
                             <PrimaryButton onClick={saveAllBulk} disabled={isLoading || bulkItems.every(i => i.status !== 'success')}> Save All Successful </PrimaryButton>
                              <SecondaryButton onClick={() => downloadCsv(bulkItems.filter(i => i.status === 'success').map(i => i.extractedData || {}))} disabled={isLoading || bulkItems.every(i => i.status !== 'success')}> Export All to CSV </SecondaryButton>
                          </div>
                      </div>
                  )}
              </>
          )}

          {mode === 'chat' && (
             <div className="card command-center">
                <div className="chat-display h-80 overflow-y-auto border rounded-xl p-4 mb-4 bg-slate-50" ref={chatDisplayRef}>
                    {chatHistory.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-full text-center text-slate-500">
                          <svg className="h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                          <p className="font-semibold">Ask anything about your contacts!</p>
                          <p className="text-sm">e.g., "Who works at Google?" or "List contacts in the 'VIP' group"</p>
                      </div>
                    )}
                    {chatHistory.map((msg, index) => (
                        <div key={index} className={`chat-message mb-4 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                             <p className={`max-w-lg p-3 rounded-2xl shadow-sm ${msg.role === 'user' ? 'bg-red-600 text-white rounded-br-none' : 'bg-slate-200 text-slate-800 rounded-bl-none'}`}>
                                {msg.role === 'model' && msg.text === '' && isChatLoading ? (
                                    <div className="typing-indicator flex gap-1.5 items-center p-1">
                                      <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                      <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                      <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce"></span>
                                    </div>
                                ) : ( msg.text )}
                             </p>
                        </div>
                    ))}
                </div>
                <form onSubmit={handleCommandSubmit} className="command-form flex gap-3">
                    <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="e.g., 'Who works at Google?'" disabled={isChatLoading} aria-label="Ask the AI assistant a question" className="flex-grow p-3 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 transition"/>
                    <button type="submit" disabled={isChatLoading || !chatInput.trim()} aria-label="Send command" className="bg-red-600 text-white p-3 rounded-lg disabled:bg-red-300 hover:bg-red-700 transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.949a.75.75 0 00.95.826L11.25 9.25v1.5l-7.597 1.266a.75.75 0 00-.95.826l1.414 4.949a.75.75 0 00.95.826l12.21-4.479a.75.75 0 000-1.416L3.105 2.29z"></path></svg>
                    </button>
                </form>
            </div>
          )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans">
      <header className="bg-white/80 backdrop-blur-lg text-slate-800 py-3 flex items-center justify-between px-4 sm:px-6 shadow-sm border-b border-slate-200 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Company Logo" className="h-10 w-10 rounded-full" />
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
             AI Card Scanner
          </h1>
        </div>
      </header>
      
      {showInstallBanner && (
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-3 flex flex-col sm:flex-row justify-between items-center shadow-lg text-center sm:text-left">
          <p className="font-semibold mb-2 sm:mb-0">📲 Install this app for a native experience!</p>
          <button onClick={handleInstallClick} className="bg-white text-red-700 font-bold px-4 py-2 rounded-lg hover:bg-red-100 transition-all shadow-md shrink-0"> Install </button>
        </div>
      )}

      {/* Main Dashboard Layout */}
      <main className="p-4 md:p-8 grid grid-cols-1 lg:grid-cols-5 gap-8 max-w-7xl mx-auto">
        
        {/* Left Column: Action Panel */}
        <div className="lg:col-span-3">
          <ActionPanel />
        </div>

        {/* Right Column: Contact List */}
        <div className="lg:col-span-2">
           <div className="card contact-list bg-white p-6 rounded-2xl shadow-md border border-slate-200">
                <h2 className="text-2xl font-bold mb-4 text-slate-900">Saved Contacts</h2>
                <ul className="space-y-3 h-[75vh] overflow-y-auto pr-2">
                {savedContacts.map(contact => (
                    <li 
                      key={contact.id} 
                      onClick={() => editContact(contact)}
                      className="contact-item flex justify-between items-center p-3 bg-slate-50 rounded-xl hover:bg-red-50/50 border border-slate-200 hover:border-red-200 transition-all group cursor-pointer"
                    >
                      <div className="flex items-center gap-4 overflow-hidden">
                          <img src={`data:image/jpeg;base64,${contact.imageBase64 || logo}`} alt={contact.name} className="h-12 w-12 rounded-full object-cover shrink-0 border-2 border-white shadow" />
                          <div className="info overflow-hidden">
                              <h3 className="font-semibold text-lg text-slate-800 truncate">{contact.name || 'No Name'}</h3>
                              <p className="text-sm text-slate-500 truncate">{contact.company || 'No Company'}</p>
                              {contact.group && <span className="text-xs bg-blue-100 text-blue-600 font-semibold px-2 py-0.5 rounded-full mt-1 inline-block">{contact.group}</span>}
                          </div>
                      </div>
                      <div className="actions flex gap-3 shrink-0">
                          {contact.whatsapp && (
                              <a 
                                href={`https://wa.me/${contact.whatsapp.replace(/[^0-9]/g, '')}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                title="Send WhatsApp" 
                                onClick={(e) => e.stopPropagation()} // Prevent card click when clicking WhatsApp
                                className="text-green-500 hover:text-green-700 transition-colors p-1 rounded-full hover:bg-green-100"
                              >
                                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.89-5.451 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.227 1.36.195 1.871.118.571-.078 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
                              </a>
                          )}
                          <button onClick={(e) => { e.stopPropagation(); deleteContact(contact.id)}} title="Delete" className="text-red-400 hover:text-red-600 transition-colors p-1 rounded-full hover:bg-red-100">
                             <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"></path></svg>
                          </button>
                      </div>
                    </li>
                ))}
                </ul>
            </div>
        </div>

        {/* Global Modals */}
        {isCameraOpen && (
            <div className="video-container fixed inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center z-50 p-4">
                <video ref={videoRef} autoPlay playsInline className="w-full max-w-2xl rounded-lg shadow-2xl"></video>
                <div className="controls mt-6 flex gap-4">
                   <PrimaryButton onClick={takeSnapshot}>Capture</PrimaryButton>
                   <SecondaryButton onClick={closeCamera}>Cancel</SecondaryButton>
                </div>
            </div>
        )}
        {error && <div className="error-message bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mt-6" role="alert">{error}</div>}
        {isLoading && mode !== 'bulk' && !extractedData && (
            <div className="loading-overlay fixed inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
                <div className="spinner border-4 border-t-4 border-t-red-600 border-slate-200 rounded-full w-16 h-16 animate-spin"></div>
                <p className="text-slate-700 text-lg font-semibold mt-4">Scanning your card...</p>
            </div>
        )}

      </main>
      <footer className="bg-slate-800 text-slate-400 text-center py-5 mt-12 text-sm">
        <p>© {new Date().getFullYear()} StarShield Technologies Pvt Ltd. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default App;