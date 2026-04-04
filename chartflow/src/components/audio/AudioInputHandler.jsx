import React, { useState, useRef } from 'react';

export default function AudioInputHandler({ onAudioSubmit, disabled }) {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    onAudioSubmit(file, file.name); // Pass the file up to NotesPage
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
        onAudioSubmit(audioBlob, "recording.webm"); // Pass the recording up to NotesPage
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
    <div className="p-6 max-w-lg mx-auto border rounded shadow-sm bg-white">
      <div className="flex flex-col gap-6">
        {/* Option 1: Record Audio */}
        <div className="p-4 border rounded bg-gray-50">
          <h3 className="font-semibold mb-2 text-gray-800">Option 1: Dictate Note</h3>
          <button 
            onClick={isRecording ? stopRecording : startRecording}
            disabled={disabled && !isRecording}
            className={`px-4 py-2 rounded text-white w-full transition-colors ${
              isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isRecording ? "Stop Recording & Submit" : "Start Recording"}
          </button>
        </div>

        {/* Option 2: Upload Audio */}
        <div className="p-4 border rounded bg-gray-50">
          <h3 className="font-semibold mb-2 text-gray-800">Option 2: Upload File</h3>
          <input 
            type="file" 
            accept="audio/*" 
            onChange={handleFileUpload}
            disabled={isRecording || disabled}
            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
      </div>
    </div>
  );
}