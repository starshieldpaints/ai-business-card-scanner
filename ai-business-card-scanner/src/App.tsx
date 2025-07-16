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
  
  const renderField = (label: string, field: keyof Omit<ContactData, 'id' | 'imageBase64'>) => (
     <div className="form-group">
      <label htmlFor={field} className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input
        type="text"
        id={field}
        value={((extractedData?.[field] as string) || '')}
        onChange={(e) => handleDataChange(field, e.target.value)}
        className="w-full p-2.5 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 transition"
      />
    </div>
  );
  
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

  const PrimaryButton = ({ onClick, disabled, children, className = '' }: { onClick: () => void, disabled?: boolean, children: React.ReactNode, className?: string }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`bg-red-600 text-white font-semibold py-2.5 px-5 rounded-lg hover:bg-red-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${className}`}
    >
      {children}
    </button>
  );

  const SecondaryButton = ({ onClick, disabled, children, className = '' }: { onClick: () => void, disabled?: boolean, children: React.ReactNode, className?: string }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`bg-slate-700 text-white font-semibold py-2.5 px-5 rounded-lg hover:bg-slate-800 disabled:bg-slate-400 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 ${className}`}
    >
      {children}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
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
          <button
            onClick={handleInstallClick}
            className="bg-white text-red-700 font-bold px-4 py-2 rounded-lg hover:bg-red-100 transition-all shadow-md shrink-0"
          >
            Install
          </button>
        </div>
      )}

      <main className="p-4 md:p-6 max-w-5xl mx-auto">
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-lg mb-8 border border-slate-200">
            <div className="border-b border-slate-200 mb-6">
                <nav className="-mb-px flex space-x-6">
                  <button className={`py-3 px-1 border-b-2 font-semibold text-base sm:text-lg ${mode === 'single' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`} onClick={() => { resetState(); setMode('single'); }}>Single Card</button>
                  <button className={`py-3 px-1 border-b-2 font-semibold text-base sm:text-lg ${mode === 'bulk' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`} onClick={() => { resetState(); setMode('bulk'); }}>Bulk Upload</button>
                </nav>
            </div>
          
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" multiple={mode === 'bulk'} className="hidden"/>

            {mode === 'single' && (
              <>
                {!frontImageBase64 ? (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2 flex justify-center rounded-lg border-2 border-dashed border-slate-300 px-6 py-10 hover:border-red-500 transition-all cursor-pointer"
                  >
                    <div className="text-center">
                      <svg className="mx-auto h-12 w-12 text-slate-400" stroke="currentColor" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                      <p className="mt-2 text-sm text-slate-600">
                        <span className="font-semibold text-red-600">Upload a file</span> or drag and drop
                      </p>
                      <p className="text-xs text-slate-500">PNG, JPG, GIF up to 10MB</p>
                    </div>
                  </div>
                ) : (
                  <div className="image-previews grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <div className="preview-container">
                      <img src={`data:image/jpeg;base64,${frontImageBase64}`} alt="Front Preview" className="w-full rounded-lg shadow-xl"/>
                      <p className="text-center mt-2 font-semibold text-slate-700">Front</p>
                    </div>
                    <div className="preview-container flex flex-col items-center justify-center">
                      {backImageBase64 ? (
                        <>
                          <img src={`data:image/jpeg;base64,${backImageBase64}`} alt="Back Preview" className="w-full rounded-lg shadow-xl"/>
                          <p className="text-center mt-2 font-semibold text-slate-700">Back</p>
                        </>
                      ) : (
                        <div 
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full h-full flex justify-center items-center rounded-lg border-2 border-dashed border-slate-300 px-6 py-10 hover:border-red-500 transition-all cursor-pointer"
                        >
                          <div className="text-center">
                             <svg className="mx-auto h-10 w-10 text-slate-400" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                             <p className="mt-2 text-sm text-slate-600 font-semibold text-red-600">Add back side</p>
                          </div>
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
                        <PrimaryButton onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
                            Upload Multiple Cards
                        </PrimaryButton>
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
                               <PrimaryButton onClick={saveAllBulk} disabled={isLoading || bulkItems.every(i => i.status !== 'success')}>
                                   Save All Successful
                                </PrimaryButton>
                                <SecondaryButton onClick={() => downloadCsv(bulkItems.filter(i => i.status === 'success').map(i => i.extractedData || {}))} disabled={isLoading || bulkItems.every(i => i.status !== 'success')}>
                                    Export All to CSV
                                </SecondaryButton>
                            </div>
                        </div>
                    )}
                </>
            )}

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
        </div>

        {extractedData && (
          <div className="card results-section bg-white p-6 rounded-2xl shadow-lg mb-8 border border-slate-200">
            <h2 className="text-2xl font-bold mb-6 text-slate-900">Verify & Save</h2>
             <div className="form-grid grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              {renderField("Name", "name")}
              {renderField("Designation", "designation")}
              {renderField("Company", "company")}
              {renderField("Address", "address")}
              {renderArrayField("Phone Numbers", "phoneNumbers")}
              {renderArrayField("Emails", "emails")}
              {renderArrayField("Websites", "websites")}
            </div>
            <div className="result-actions flex flex-wrap gap-4 mt-8">
              <PrimaryButton onClick={saveContact} disabled={isLoading}>Save to Firebase</PrimaryButton>
              <SecondaryButton onClick={() => downloadVcf(extractedData)}>Download .vcf</SecondaryButton>
              <SecondaryButton onClick={() => downloadCsv([extractedData])}>Download .csv</SecondaryButton>
              <button onClick={resetState} className="font-semibold text-red-600 hover:text-red-800 transition-all py-2.5 px-5">Cancel</button>
            </div>
          </div>
        )}

        {savedContacts.length > 0 && !extractedData && bulkItems.length === 0 && (
          <>
            <div className="card command-center bg-white p-6 rounded-2xl shadow-lg mb-8 border border-slate-200">
                <h2 className="text-2xl font-bold mb-4 text-slate-900">AI Command Center</h2>
                <div className="chat-display h-80 overflow-y-auto border rounded-xl p-4 mb-4 bg-slate-50" ref={chatDisplayRef}>
                    {chatHistory.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-full text-center text-slate-500">
                          <svg className="h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                          <p className="font-semibold">Ask anything about your contacts!</p>
                          <p className="text-sm">e.g., "Who works at Google?" or "What is Jane's email?"</p>
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
                                ) : (
                                    msg.text
                                )}
                             </p>
                        </div>
                    ))}
                </div>
                <form onSubmit={handleCommandSubmit} className="command-form flex gap-3">
                    <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="e.g., 'Who works at Google?'"
                        disabled={isChatLoading}
                        aria-label="Ask the AI assistant a question about your contacts"
                        className="flex-grow p-3 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 transition"
                    />
                    <button type="submit" disabled={isChatLoading || !chatInput.trim()} aria-label="Send command" className="bg-red-600 text-white p-3 rounded-lg disabled:bg-red-300 hover:bg-red-700 transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.949a.75.75 0 00.95.826L11.25 9.25v1.5l-7.597 1.266a.75.75 0 00-.95.826l1.414 4.949a.75.75 0 00.95.826l12.21-4.479a.75.75 0 000-1.416L3.105 2.29z"></path></svg>
                    </button>
                </form>
            </div>
            <div className="card contact-list bg-white p-6 rounded-2xl shadow-lg border border-slate-200">
                <h2 className="text-2xl font-bold mb-4 text-slate-900">Saved Contacts</h2>
                <ul className="space-y-3">
                {savedContacts.map(contact => (
                    <li key={contact.id} className="contact-item flex justify-between items-center p-4 bg-slate-50 rounded-xl hover:bg-red-50/50 border border-slate-200 hover:border-red-200 transition-all group">
                    <div className="info overflow-hidden mr-4">
                        <h3 className="font-semibold text-lg text-slate-800 truncate">{contact.name || 'No Name'}</h3>
                        <p className="text-sm text-slate-500 truncate">{contact.company || 'No Company'}</p>
                    </div>
                    <div className="actions flex gap-4 shrink-0">
                        <button onClick={() => editContact(contact)} title="Edit" className="text-slate-400 hover:text-slate-700 transition-colors">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z"></path><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd"></path></svg>
                        </button>
                        <button onClick={() => deleteContact(contact.id)} title="Delete" className="text-red-400 hover:text-red-600 transition-colors">
                           <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"></path></svg>
                        </button>
                    </div>
                    </li>
                ))}
                </ul>
            </div>
          </>
        )}
      </main>
      <footer className="bg-slate-800 text-slate-400 text-center py-5 mt-12 text-sm">
        <p>© {new Date().getFullYear()} StarShield Technologies Pvt Ltd. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default App;


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
//  
//   // AI Command Center State
//   const [chatInput, setChatInput] = useState('');
//   const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
//   const [isChatLoading, setIsChatLoading] = useState(false);

//   // --- Refs ---
//   const fileInputRef = useRef<HTMLInputElement>(null);
//   const videoRef = useRef<HTMLVideoElement>(null);
//   const streamRef = useRef<MediaStream | null>(null);
//   const chatDisplayRef = useRef<HTMLDivElement>(null);
//  

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
//  
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
//  
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
//  
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
//  
//     let promptText = `Analyze the business card image(s) and extract the contact details. Return a single JSON object with the following keys: "name", "designation", "company", "phoneNumbers", "emails", "websites", "address". If any information is not found, return an empty string for string fields or an empty array for array fields.`;

//     if (backB64) {
//       parts.push({ inlineData: { mimeType: 'image/jpeg', data: backB64 } });
//     }
//     parts.push({ text: promptText });
//  
//     const result = await model.generateContent({
//       contents: [{ role: "user", parts }],
//       generationConfig: {
//         responseMimeType: "application/json",
//       },
//     });
//  
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
//  
//         const base64 = await new Promise<string>((resolve, reject) => {
//             const reader = new FileReader();
//             reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
//             reader.onerror = reject;
//             reader.readAsDataURL(item.file);
//         });
//  
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
//  
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
//  
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
//         vCard += `FN:${name}\\n`;
//         vCard += `N:${lastName};${firstName};;;\\n`;
//     }
//     if (company) vCard += `ORG:${company}\\n`;
//     if (designation) vCard += `TITLE:${designation}\\n`;
//     if (phoneNumbers) phoneNumbers.forEach(p => { vCard += `TEL;TYPE=WORK,VOICE:${p}\\n`; });
//     if (emails) emails.forEach(e => { vCard += `EMAIL:${e}\\n`; });
//     if (websites) websites.forEach(w => { vCard += `URL:${w}\\n`; });
//     if (address) vCard += `ADR;TYPE=WORK:;;${address.replace(/\\n/g, '\\\\n')};;;;\\n`;
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
//  
//   const downloadCsv = (data: Partial<ContactData>[]) => {
//       const headers = "Name,Designation,Company,Phone Numbers,Emails,Websites,Address\n";
//  
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
//  
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
//  
//         const prompt = `You are an AI assistant for a business card app. Your task is to answer questions about the user's saved contacts. You will be given a list of contacts in JSON format. Base your answers STRICTLY on the information provided in the JSON data. If the information is not present in the contacts, state that you cannot find the information. Do not make up any details. Keep your answers concise and helpful. Here is the contact data: ${contactsJson}\\n\\nUser question: ${userMessage.text}`;

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
//  
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
//  
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
//  
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
//                                       <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce \[animation-delay:-0.3s]"></span>
//                                       <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce \[animation-delay:-0.15s]"></span>
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
//             <div className="result-actions flex flex-wrap gap-4 mt-8">
//               <PrimaryButton onClick={saveContact} disabled={isLoading}>Save to Firebase</PrimaryButton>
//               <SecondaryButton onClick={() => downloadVcf(extractedData)}>Download .vcf</SecondaryButton>
//               <SecondaryButton onClick={() => downloadCsv([extractedData])}>Download .csv</SecondaryButton>
//               <button onClick={resetState} className="font-semibold text-red-600 hover:text-red-800 transition-all py-2.5 px-5">Cancel</button>
//             </div>
//           </div>
//         )}

//         {savedContacts.length > 0 && !extractedData && bulkItems.length === 0 && (
//           <>
//             <div className="card command-center bg-white p-6 rounded-2xl shadow-lg mb-8 border border-slate-200">
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
//                     <li key={contact.id} className="contact-item flex justify-between items-center p-4 bg-slate-50 rounded-xl hover:bg-red-50/50 border border-slate-200 hover:border-red-200 transition-all group">
//                     <div className="info overflow-hidden mr-4">
//                         <h3 className="font-semibold text-lg text-slate-800 truncate">{contact.name || 'No Name'}</h3>
//                         <p className="text-sm text-slate-500 truncate">{contact.company || 'No Company'}</p>
//                     </div>
//                     <div className="actions flex gap-4 shrink-0">
//                         <button onClick={() => editContact(contact)} title="Edit" className="text-slate-400 hover:text-slate-700 transition-colors">
//                           <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z"></path><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd"></path></svg>
//                         </button>
//                         <button onClick={() => deleteContact(contact.id)} title="Delete" className="text-red-400 hover:text-red-600 transition-colors">
//                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"></path></svg>
//                         </button>
//                     </div>
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