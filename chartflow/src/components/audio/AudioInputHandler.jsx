import React, { useState, useRef } from 'react';

export default function AudioInputHandler({ onAudioSubmit, disabled }) {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    onAudioSubmit(file, file.name);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        onAudioSubmit(audioBlob, "recording.webm");
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Microphone access denied. Please check your browser permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 w-full p-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white transition-colors duration-200">
      
      {/* Option 1: Dictate (Primary Action) */}
      <div 
        className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all ${
          isRecording 
            ? 'border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-900/20' 
            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-primary/40'
        }`}
      >
        <button 
          onClick={isRecording ? stopRecording : startRecording}
          disabled={disabled && !isRecording}
          className={`w-14 h-14 rounded-full shadow-sm flex items-center justify-center mb-4 transition-all duration-300 ${
            isRecording 
              ? 'bg-red-500 text-white animate-pulse scale-110 shadow-red-500/40' 
              : 'bg-white dark:bg-slate-700 text-primary dark:text-blue-400 hover:scale-110 disabled:opacity-50 disabled:hover:scale-100 border border-slate-200 dark:border-slate-600'
          }`}
        >
          <span className="material-symbols-outlined text-2xl">
            {isRecording ? 'stop' : 'mic'}
          </span>
        </button>
        
        <span className={`text-sm font-semibold mb-1 ${isRecording ? 'text-red-700 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>
          {isRecording ? 'Recording in progress...' : 'Click to dictate note'}
        </span>
        <span className="text-xs text-slate-400 dark:text-slate-500">
          {isRecording ? 'Click the stop button when finished' : 'Ensure your microphone is connected'}
        </span>
      </div>

      {/* Divider */}
      <div className="flex items-center justify-center gap-4 px-2">
        <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1"></div>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">OR</span>
        <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1"></div>
      </div>

      {/* Option 2: Upload File (Secondary Action) */}
      <div className={`relative border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-white dark:bg-slate-800/80 transition-colors flex items-center justify-center group ${isRecording || disabled ? 'opacity-50' : 'hover:border-primary/40 dark:hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
        <input 
          type="file" 
          accept="audio/*" 
          onChange={handleFileUpload}
          disabled={isRecording || disabled}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 group-hover:text-primary dark:group-hover:text-blue-400 transition-colors">
          <span className="material-symbols-outlined text-lg">upload_file</span>
          Browse for audio file
        </div>
      </div>

    </div>
  );
}