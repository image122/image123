
import React, { useState, useCallback } from 'react';
import { editImageWithGemini } from './services/geminiService';
import { UploadIcon, SparklesIcon, ErrorIcon, DownloadIcon } from './components/icons';
import { Spinner } from './components/Spinner';

interface EditedImage {
  id: string;
  src: string;
}

const App: React.FC = () => {
  const [originalImageFiles, setOriginalImageFiles] = useState<File[]>([]);
  const [originalImagePreviews, setOriginalImagePreviews] = useState<string[]>([]);
  const [editedImages, setEditedImages] = useState<EditedImage[]>([]);
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const fileList = Array.from(files);
      setOriginalImageFiles(fileList);
      setEditedImages([]);
      setSelectedImageIds(new Set());
      setError(null);
      
      const previewPromises = fileList.map(file => {
        return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                resolve(reader.result as string);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
      });

      Promise.all(previewPromises).then(previews => {
        setOriginalImagePreviews(previews);
      }).catch(err => {
        console.error("Error reading files:", err);
        setError("There was an error loading your images.");
      });
    }
  };

  const handleEditImage = useCallback(async () => {
    if (originalImageFiles.length === 0 || !prompt) {
      setError('Please upload at least one image and provide an editing prompt.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const generatedImage = await editImageWithGemini(originalImageFiles, prompt);
      const newImage = { id: `img-${Date.now()}-${Math.random()}`, src: generatedImage };
      setEditedImages(prevImages => [newImage, ...prevImages]);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [originalImageFiles, prompt]);
  
  const handleToggleSelect = (id: string) => {
    setSelectedImageIds(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(id)) {
        newSelection.delete(id);
      } else {
        newSelection.add(id);
      }
      return newSelection;
    });
  };

  const handleDownloadSelected = () => {
    const selectedImages = editedImages.filter(img => selectedImageIds.has(img.id));
    selectedImages.forEach((image, index) => {
      const link = document.createElement('a');
      link.href = image.src;
      link.download = `medul-edit-${image.id.substring(4, 10)}-${index}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  const handleClearSelection = () => {
    setSelectedImageIds(new Set());
  };

  const canSubmit = originalImageFiles.length > 0 && prompt && !isLoading;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <header className="w-full max-w-6xl text-center mb-8">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
          Medul Image Editor pro
        </h1>
        <p className="mt-2 text-lg text-gray-400">
          Transform your images with the power of AI.
        </p>
      </header>

      <main className="w-full max-w-6xl flex-grow">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Panel: Upload and Original Image */}
          <div className="flex flex-col gap-4">
            <h2 className="text-2xl font-bold text-gray-300">1. Upload Images</h2>
            <div className="relative w-full h-80 bg-gray-800 border-2 border-dashed border-gray-600 rounded-xl flex items-center justify-center hover:border-purple-400 transition-colors duration-300 overflow-hidden">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                id="image-upload"
                multiple
              />
              {originalImagePreviews.length > 0 ? (
                 <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2 w-full h-full overflow-y-auto">
                    {originalImagePreviews.map((src, index) => (
                        <div key={index} className="relative aspect-square">
                            <img src={src} alt={`Original ${index + 1}`} className="object-cover h-full w-full rounded-lg" />
                        </div>
                    ))}
                </div>
              ) : (
                <label htmlFor="image-upload" className="flex flex-col items-center text-center text-gray-400 cursor-pointer p-4">
                  <UploadIcon className="w-12 h-12 mb-2" />
                  <span className="font-semibold">Click to upload</span>
                  <span className="text-sm">PNG, JPG, or WEBP</span>
                </label>
              )}
            </div>
          </div>

          {/* Right Panel: Prompt, Actions and Edited Image */}
          <div className="flex flex-col gap-4">
             <h2 className="text-2xl font-bold text-gray-300">2. Describe Your Edit</h2>
             <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., 'Create a collage from these photos' or 'Make them all look like watercolor paintings'"
                className="w-full p-4 bg-gray-800 border border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all resize-none text-white placeholder-gray-500"
                rows={3}
                disabled={originalImageFiles.length === 0}
              />

              <button
                onClick={handleEditImage}
                disabled={!canSubmit}
                className="w-full flex items-center justify-center gap-2 text-lg font-bold py-3 px-6 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg disabled:shadow-none"
              >
                {isLoading ? (
                  <>
                    <Spinner />
                    Editing...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="w-6 h-6" />
                    Generate Edit
                  </>
                )}
              </button>

            <div className="flex justify-between items-center mt-4">
                <h2 className="text-2xl font-bold text-gray-300">3. Results</h2>
                {selectedImageIds.size > 0 && (
                <div className="flex items-center gap-2">
                    <button
                    onClick={handleDownloadSelected}
                    className="flex items-center gap-2 text-sm font-semibold py-2 px-3 rounded-lg bg-green-600 hover:bg-green-700 transition-colors"
                    >
                    <DownloadIcon className="w-5 h-5" />
                    Download ({selectedImageIds.size})
                    </button>
                    <button
                    onClick={handleClearSelection}
                    className="text-sm font-semibold py-2 px-3 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
                    >
                    Clear
                    </button>
                </div>
                )}
            </div>
            
            {error && !isLoading && (
                <div className="text-center text-red-400 p-4 flex items-center justify-center gap-2 bg-red-900/20 rounded-lg">
                    <ErrorIcon className="w-6 h-6" />
                    <p className="text-sm">{error}</p>
                </div>
            )}

            <div className="w-full min-h-[20rem] bg-gray-800 border-2 border-gray-700 rounded-xl p-4">
                {editedImages.length === 0 && !isLoading && (
                    <div className="flex items-center justify-center h-full text-center text-gray-500 p-4">
                        <p>Your edited images will appear here.</p>
                    </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {isLoading && (
                        <div className="relative aspect-square bg-gray-700 rounded-lg flex items-center justify-center animate-pulse">
                            <Spinner size="lg" />
                        </div>
                    )}
                    {editedImages.map((image) => {
                        const isSelected = selectedImageIds.has(image.id);
                        return (
                            <div
                                key={image.id}
                                onClick={() => handleToggleSelect(image.id)}
                                className={`relative aspect-square group cursor-pointer rounded-lg overflow-hidden transition-all duration-200 ${isSelected ? 'ring-4 ring-purple-500' : 'ring-2 ring-gray-700/50 hover:ring-purple-500'}`}
                            >
                                <img
                                    src={image.src}
                                    alt="Edited result"
                                    className="w-full h-full object-cover"
                                />
                                {isSelected && (
                                    <div className="absolute top-1.5 right-1.5 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-white border-2 border-gray-900 pointer-events-none">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.052-.143z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
