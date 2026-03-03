import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import supabase from '../../lib/supabase'

const STATUS_STYLES = {
    pending:    { dot: 'bg-yellow-400', text: 'text-yellow-700', label: 'Pending' },
    processing: { dot: 'bg-blue-400 animate-pulse', text: 'text-blue-700', label: 'Processing...' },
    completed:  { dot: 'bg-green-400', text: 'text-green-700', label: 'Completed' },
    failed:     { dot: 'bg-red-400', text: 'text-red-700', label: 'Failed' },
};

function StatusBadge({ status }) {
    const s = STATUS_STYLES[status] || STATUS_STYLES.pending;
    return (
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${s.text}`}>
            <span className={`w-2 h-2 rounded-full ${s.dot}`} />
            {s.label}
        </span>
    );
}

function FileUpload({ 
    elementId, 
    onUploadComplete,
    entityName = 'chart',           // For UI text (e.g., "chart" or "note")
    bucketName = 'chart-uploads',   // Supabase storage bucket
    dbTableName = 'chart_uploads',
    dbColumnName = 'chart_id',      // Foreign key column in your 'uploads' table
    acceptedTypes,                  // The accepted object for useDropzone
    acceptedTypesLabel = 'CSV, JSON, XML, PDF, Excel, TXT' // UI helper text
}) {
    const [uploads, setUploads] = useState([]);

    const onDrop = useCallback(async (acceptedFiles) => {
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            console.error("Authentication error:", authError);
            alert("You must be logged in to upload files.");
            return; 
        }

        const userId = user.id;

        for (const file of acceptedFiles) {
            const tempId = `${Date.now()}_${file.name}`;

            // Add optimistic entry
            setUploads(prev => [...prev, {
                id: tempId,
                file_name: file.name,
                status: 'uploading',
                created_at: new Date().toISOString(),
            }]);

            try {
                // 1. Upload file to the dynamic storage bucket
                const filePath = `${userId}/${elementId}/${Date.now()}_${file.name}`;
                const { error: storageError } = await supabase.storage
                    .from(bucketName)
                    .upload(filePath, file);

                if (storageError) throw storageError;

                // 2. Create uploads record dynamically
                const { data: uploadRecord, error: dbError } = await supabase
                    .from(dbTableName)
                    .insert({
                        [dbColumnName]: elementId, // Dynamically sets 'chart_id' or 'note_id'
                        user_id: userId,
                        file_name: file.name,
                        file_path: filePath,
                        file_type: file.type || 'application/octet-stream',
                        status: 'pending',
                    })
                    .select()
                    .single();

                if (dbError) throw dbError;

                // Replace optimistic entry with real record
                setUploads(prev =>
                    prev.map(u => u.id === tempId ? uploadRecord : u)
                );

                if (onUploadComplete) onUploadComplete(uploadRecord);

            } catch (error) {
                console.error('Upload error:', error);
                setUploads(prev =>
                    prev.map(u =>
                        u.id === tempId
                            ? { ...u, status: 'failed', error_message: error.message }
                            : u
                    )
                );
            }
        }
    }, [elementId, bucketName, dbTableName, dbColumnName, onUploadComplete]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: acceptedTypes,
        disabled: !elementId,
    });

    return (
        <div className="space-y-4">
            <div
                {...getRootProps()}
                className={`
                    relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
                    ${!elementId ? 'opacity-50 cursor-not-allowed border-gray-200' : ''}
                    ${isDragActive
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                    }
                `}
            >
                <input {...getInputProps()} />

                <div className="flex flex-col items-center gap-2">
                    <p className="text-sm font-medium text-gray-700">
                        {isDragActive ? `Drop your ${entityName} file here` : 'Drag & drop or click to upload'}
                    </p>
                    <p className="text-xs text-gray-400">
                        {acceptedTypesLabel}
                    </p>
                    {!elementId && (
                        <p className="text-xs text-amber-600 font-medium mt-1">
                            Select or create a {entityName} first
                        </p>
                    )}
                </div>
            </div>

            {uploads.length > 0 && (
                <div className="space-y-2">
                    {uploads.map(upload => (
                        <div key={upload.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="text-gray-400">📄</span>
                                <span className="text-gray-700 truncate">{upload.file_name}</span>
                            </div>
                            <div className="ml-3 shrink-0">
                                {upload.status === 'uploading'
                                    ? <span className="text-xs text-blue-600 animate-pulse">Uploading...</span>
                                    : <StatusBadge status={upload.status} />
                                }
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default FileUpload;