import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import supabase from '../../lib/supabase';

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
    entityName = 'chart',          
    bucketName = 'chart-uploads',  
    dbTableName = 'chart_uploads',
    dbColumnName = 'chart_id',     
    acceptedTypes,                 
    acceptedTypesLabel = 'CSV, JSON, XML, PDF, Excel, TXT' 
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
                // If there's no elementId, place it in an 'unassigned' folder so it doesn't break the path
                const folderPath = elementId ? elementId : 'unassigned';
                const filePath = `${userId}/${folderPath}/${Date.now()}_${file.name}`;
                
                const { error: storageError } = await supabase.storage
                    .from(bucketName)
                    .upload(filePath, file);

                if (storageError) throw storageError;

                // 2. Create the base insert payload
                const payload = {
                    user_id: userId,
                    file_name: file.name,
                    file_path: filePath,
                    file_type: file.type || 'application/octet-stream',
                    status: 'pending',
                };

                // Only attach the elementId if we actually have one
                if (elementId) {
                    payload[dbColumnName] = elementId;
                }

                // 3. Create uploads record
                const { data: uploadRecord, error: dbError } = await supabase
                    .from(dbTableName)
                    .insert(payload)
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

    // Removed the disabled property so users can always drop files
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: acceptedTypes
    });

    return (
        <div className="space-y-4">
            <div
                {...getRootProps()}
                // Cleaned up the disabled styling logic since it's always active now
                className={`
                    relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
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
                    {/* Removed the "Select or create a note first" warning */}
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