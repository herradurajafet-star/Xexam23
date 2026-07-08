import React, { useState } from "react";
import { collection, doc, setDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { RobloxUser, Exam, Question, QuestionType } from "../types";
import { GlassContainer, GlassCard, GlassBadge } from "./GlassContainer";
import { Plus, Trash2, CheckCircle2, ChevronRight, Share2, Clipboard, ArrowLeft } from "lucide-react";

interface ExamCreatorProps {
  user: RobloxUser;
  onBack: () => void;
  onExamCreated: (examId: string) => void;
}

export function ExamCreator({ user, onBack, onExamCreated }: ExamCreatorProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [wallpaperUrl, setWallpaperUrl] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdExamId, setCreatedExamId] = useState<string | null>(null);

  // States for new question creation
  const [newQText, setNewQText] = useState("");
  const [newQType, setNewQType] = useState<QuestionType>("multiple_choice");
  const [newQPoints, setNewQPoints] = useState(10);
  const [newQOptions, setNewQOptions] = useState<string[]>(["", ""]);
  const [newQCorrect, setNewQCorrect] = useState("");

  const handleAddOption = () => {
    setNewQOptions([...newQOptions, ""]);
  };

  const handleRemoveOption = (index: number) => {
    if (newQOptions.length <= 2) return;
    const updated = [...newQOptions];
    updated.splice(index, 1);
    setNewQOptions(updated);
  };

  const handleOptionChange = (index: number, val: string) => {
    const updated = [...newQOptions];
    updated[index] = val;
    setNewQOptions(updated);
  };

  const handleAddQuestion = () => {
    if (!newQText.trim()) {
      alert("Question text cannot be empty.");
      return;
    }

    const cleanedOptions = newQType !== "text" 
      ? newQOptions.map(o => o.trim()).filter(o => o !== "") 
      : undefined;

    if (newQType !== "text" && (!cleanedOptions || cleanedOptions.length < 2)) {
      alert("Provide at least 2 options for multiple choice or checkbox questions.");
      return;
    }

    const q: Question = {
      id: "q_" + Math.random().toString(36).substring(2, 9),
      text: newQText.trim(),
      type: newQType,
      points: Number(newQPoints) || 5,
      ...(cleanedOptions ? { options: cleanedOptions } : {}),
      ...(newQCorrect.trim() ? { correctAnswer: newQCorrect.trim() } : {})
    };

    setQuestions([...questions, q]);

    // Reset question builder inputs
    setNewQText("");
    setNewQOptions(["", ""]);
    setNewQCorrect("");
  };

  const handleRemoveQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  // Generate 6 random uppercase letters
  const generateExamId = (): string => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleSaveExam = async () => {
    if (!title.trim()) {
      setError("Please enter a title for the exam.");
      return;
    }
    if (questions.length === 0) {
      setError("Please add at least one question to the exam.");
      return;
    }

    setSaving(true);
    setError(null);

    const examId = generateExamId();

    const examData: Exam = {
      id: examId,
      title: title.trim(),
      description: description.trim(),
      creatorId: user.id,
      creatorUsername: user.username,
      questions,
      createdAt: new Date().toISOString(),
      isActive: true,
      ...(user.displayName ? { creatorDisplayName: user.displayName } : {}),
      ...(wallpaperUrl.trim() ? { wallpaperUrl: wallpaperUrl.trim() } : {})
    };

    try {
      // Save directly to the exams collection with the random letters as doc ID!
      const pathStr = `exams/${examId}`;
      try {
        await setDoc(doc(db, "exams", examId), examData);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, pathStr);
      }
      setCreatedExamId(examId);
    } catch (err) {
      console.error("Firestore save failure:", err);
      setError("Failed to create the exam in Firestore database. Verify network or Firebase setup.");
    } finally {
      setSaving(false);
    }
  };

  const handleCopyCode = () => {
    if (!createdExamId) return;
    navigator.clipboard.writeText(createdExamId);
    alert(`Code "${createdExamId}" copied to clipboard!`);
  };

  if (createdExamId) {
    return (
      <div className="max-w-2xl w-full mx-auto" id="creator-success-view">
        <GlassContainer className="text-center py-10 px-8 border border-[#2a2a2a] bg-[#141414] relative rounded-none">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#444]" />
          
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-none bg-[#0d0d0d] border border-[#2a2a2a] mb-6 text-emerald-400">
            <CheckCircle2 className="w-10 h-10 fill-emerald-900/20" />
          </div>

          <h2 className="text-3xl font-bold text-white mb-2">
            Exam Published!
          </h2>
          <p className="text-gray-400 text-sm max-w-md mx-auto mb-8">
            Your Roblox exam form is live. Distribute the short code below to candidates. They can enter this on the home page to start.
          </p>

          <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-none p-6 max-w-sm mx-auto mb-8">
            <span className="text-[10px] font-mono tracking-widest text-gray-500 uppercase block mb-2">
              Roblox Exam Join Code
            </span>
            <div className="text-4xl font-mono font-black text-white tracking-widest uppercase py-2 select-all">
              {createdExamId}
            </div>
            <button
              onClick={handleCopyCode}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] border border-[#333] text-xs font-mono text-gray-300 rounded-none hover:bg-[#222] hover:text-white transition-all cursor-pointer"
            >
              <Clipboard className="w-4 h-4" />
              <span>Copy Code</span>
            </button>
          </div>

          <div className="space-y-3 max-w-sm mx-auto">
            <button
              onClick={() => onExamCreated(createdExamId)}
              className="w-full py-3 bg-white text-black font-bold text-sm rounded-none hover:bg-gray-200 transition-all cursor-pointer"
            >
              Go to Responses Dashboard
            </button>
            <button
              onClick={onBack}
              className="w-full py-3 bg-[#0a0a0a] border border-[#2a2a2a] text-gray-400 text-xs font-mono rounded-none hover:text-white hover:border-[#444] transition-all cursor-pointer"
            >
              Return Home
            </button>
          </div>
        </GlassContainer>
      </div>
    );
  }

  return (
    <div 
      className="w-full mx-auto relative p-6 md:p-8 border border-[#2a2a2a] bg-cover bg-center bg-no-repeat"
      id="exam-creator-workbench"
      style={wallpaperUrl ? { backgroundImage: `url(${wallpaperUrl})`, backgroundAttachment: "fixed" } : { backgroundColor: "#0a0a0a" }}
    >
      {wallpaperUrl && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-xs z-0" />
      )}
      
      <div className="relative z-10">
        {/* Upper Navigation Bar */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs font-mono text-gray-300 hover:text-white bg-[#1a1a1a] border border-[#333] hover:border-[#444] py-2 px-4 rounded-none transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Home</span>
          </button>
          <span className="text-xs font-mono text-gray-500">
            CREATOR: <strong className="text-white">{user.username}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Core Settings / Exam Meta */}
          <div className="lg:col-span-7 space-y-6">
            <GlassContainer className="space-y-5 border-[#2a2a2a] bg-[#141414] rounded-none">
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span className="w-2 h-2 rounded-none bg-white" />
                1. Form Configuration
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-gray-400 uppercase mb-1.5 font-bold">
                    Exam Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Moderator Entrance Assessment"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-glass-input text-white text-sm py-2.5 px-3 rounded-none focus:outline-none focus:border-[#444] border border-[#2a2a2a] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-gray-400 uppercase mb-1.5 font-bold">
                    Description / Instructions
                  </label>
                  <textarea
                    placeholder="Introduce candidate to expectations, time bounds, rules, etc."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full bg-glass-input text-white text-sm py-2.5 px-3 rounded-none focus:outline-none focus:border-[#444] border border-[#2a2a2a] transition-all resize-none"
                  />
                </div>

                {/* Wallpaper background image uploader */}
                <div>
                  <label className="block text-xs font-mono text-gray-400 uppercase mb-1.5 font-bold">
                    Exam Wallpaper Background (Optional)
                  </label>
                  <div className="space-y-3">
                    {/* File upload input */}
                    <div className="flex gap-4 items-center">
                      <label className="flex-1 flex flex-col items-center justify-center border border-dashed border-[#2a2a2a] bg-[#0d0d0d] hover:bg-[#111] hover:border-[#444] transition-all p-3 cursor-pointer text-center rounded-none">
                        <span className="text-[10px] font-mono text-gray-400">
                          {wallpaperUrl ? "Change Background Image" : "Upload Background Image (max 800KB)"}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (file.size > 800 * 1024) {
                              alert("Image is too large. Please select an image under 800KB.");
                              return;
                            }
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setWallpaperUrl(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                      </label>
                      {wallpaperUrl && (
                        <button
                          type="button"
                          onClick={() => setWallpaperUrl("")}
                          className="px-3 py-2 bg-red-950/20 border border-red-900/50 hover:bg-red-900/30 text-red-400 text-xs font-mono transition-all cursor-pointer rounded-none"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    
                    {/* Paste URL option */}
                    <div className="flex gap-2 items-center">
                      <span className="text-[10px] font-mono text-gray-500 uppercase">OR URL</span>
                      <input
                        type="text"
                        placeholder="https://example.com/wallpaper.jpg"
                        value={wallpaperUrl.startsWith("data:") ? "" : wallpaperUrl}
                        onChange={(e) => setWallpaperUrl(e.target.value)}
                        className="flex-1 bg-glass-input text-white text-xs py-2 px-3 rounded-none border border-[#2a2a2a] focus:outline-none focus:border-[#444] transition-all font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </GlassContainer>

          {/* Current Questions Preview list */}
          <GlassContainer className="border-[#2a2a2a] bg-[#141414]">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span className="w-2 h-2 rounded-sm bg-gray-500" />
                3. Added Questions
              </h2>
              <GlassBadge variant="grey">{questions.length} Items</GlassBadge>
            </div>

            {questions.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-[#2a2a2a] rounded-none bg-[#0d0d0d]">
                <p className="text-gray-500 text-xs font-mono">No questions have been added yet.</p>
                <p className="text-gray-600 text-[10px] font-mono mt-1">Use the builder panel on the right to append items.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {questions.map((q, idx) => (
                  <GlassCard key={q.id} className="relative bg-[#1a1a1a] p-4 rounded-none">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs font-mono text-gray-500">#{idx + 1}</span>
                          <span className="text-[10px] font-mono bg-[#222] border border-[#333] text-gray-300 py-0.5 px-2 rounded-none uppercase">
                            {q.type.replace("_", " ")}
                          </span>
                          <span className="text-[10px] font-mono text-gray-500 font-bold">
                            {q.points} Points
                          </span>
                        </div>
                        <h4 className="text-sm font-semibold text-gray-200">{q.text}</h4>
                        
                        {q.options && (
                          <ul className="mt-2 pl-3 space-y-1 list-disc text-xs text-gray-400 font-mono">
                            {q.options.map((opt, oIdx) => (
                              <li key={oIdx} className={opt === q.correctAnswer ? "text-emerald-400 font-bold" : ""}>
                                {opt} {opt === q.correctAnswer ? "✓" : ""}
                              </li>
                            ))}
                          </ul>
                        )}

                        {!q.options && q.correctAnswer && (
                          <div className="mt-2 text-xs font-mono text-gray-500">
                            Answer key: <span className="text-gray-300 font-semibold">{q.correctAnswer}</span>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleRemoveQuestion(q.id)}
                        className="text-gray-500 hover:text-red-400 p-1.5 rounded-none hover:bg-red-900/10 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </GlassCard>
                ))}
              </div>
            )}

            {error && (
              <p className="text-red-400 text-xs font-mono mt-4 text-center bg-red-900/10 p-2.5 rounded border border-red-800/40">
                {error}
              </p>
            )}

            <div className="mt-6 pt-4 border-t border-[#2a2a2a]">
              <button
                onClick={handleSaveExam}
                disabled={saving || questions.length === 0}
                className={`w-full py-3 px-4 rounded-none font-bold text-sm tracking-wide transition-all ${
                  questions.length > 0 && !saving
                    ? "bg-white text-black hover:bg-gray-200 cursor-pointer"
                    : "bg-[#1a1a1a] text-gray-600 border border-[#2a2a2a] cursor-not-allowed"
                }`}
              >
                {saving ? "Publishing form..." : "Generate Short Exam Code"}
              </button>
            </div>
          </GlassContainer>
        </div>

        {/* Question builder panel */}
        <div className="lg:col-span-5">
          <GlassContainer className="sticky top-6 border-[#2a2a2a] bg-[#141414] rounded-none">
            <h2 className="text-lg font-bold text-white tracking-tight mb-5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-none bg-gray-400" />
              2. Question Builder
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-gray-400 uppercase mb-1.5 font-bold">
                  Question Text
                </label>
                <input
                  type="text"
                  placeholder="e.g. What is the maximum player limit per server?"
                  value={newQText}
                  onChange={(e) => setNewQText(e.target.value)}
                  className="w-full bg-glass-input text-white text-xs py-2.5 px-3 rounded-none border border-[#2a2a2a] focus:outline-none focus:border-[#444] font-sans transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-gray-400 uppercase mb-1.5 font-bold">
                  Question Type
                </label>
                <select
                  value={newQType}
                  onChange={(e) => setNewQType(e.target.value as QuestionType)}
                  className="w-full bg-[#0a0a0a] text-gray-300 text-xs py-2.5 px-3 rounded-none border border-[#2a2a2a] focus:outline-none focus:border-[#444] font-mono"
                >
                  <option value="multiple_choice">Multiple Choice (Single Option)</option>
                  <option value="checkbox">Checkbox Select (Multiple Options)</option>
                  <option value="text">Written Short Answer</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-gray-400 uppercase mb-1.5 font-bold">
                  Points / Weight
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={newQPoints}
                  onChange={(e) => setNewQPoints(Number(e.target.value))}
                  className="w-full bg-glass-input text-white text-xs py-2.5 px-3 rounded-none border border-[#2a2a2a] focus:outline-none focus:border-[#444] font-mono"
                />
              </div>

              {/* Build Options for MCQ or Checkbox */}
              {newQType !== "text" && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-mono text-gray-400 uppercase font-bold">
                      Answer Choices
                    </label>
                    <button
                      type="button"
                      onClick={handleAddOption}
                      className="text-[10px] font-mono text-gray-400 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Option
                    </button>
                  </div>

                  {newQOptions.map((opt, oIdx) => (
                    <div key={oIdx} className="flex gap-2 items-center">
                      <span className="text-xs font-mono text-gray-600">#{oIdx + 1}</span>
                      <input
                        type="text"
                        placeholder={`Option ${oIdx + 1}`}
                        value={opt}
                        onChange={(e) => handleOptionChange(oIdx, e.target.value)}
                        className="flex-1 bg-glass-input text-white text-xs py-2 px-3 rounded-none focus:outline-none border border-[#2a2a2a] transition-all"
                      />
                      {newQOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(oIdx)}
                          className="text-gray-500 hover:text-red-400 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Auto grading option */}
              <div>
                <label className="block text-xs font-mono text-gray-400 uppercase mb-1.5 font-bold">
                  Correct Answer Key (Optional)
                </label>
                <input
                  type="text"
                  placeholder={
                    newQType === "text"
                      ? "e.g. exact answer phrase"
                      : newQType === "checkbox"
                      ? "e.g. Option 1, Option 3 (comma separated)"
                      : "e.g. exactly matching option text"
                  }
                  value={newQCorrect}
                  onChange={(e) => setNewQCorrect(e.target.value)}
                  className="w-full bg-glass-input text-white text-xs py-2.5 px-3 rounded-none border border-[#2a2a2a] focus:outline-none focus:border-[#444] font-mono transition-all"
                />
                <p className="text-[10px] text-gray-500 font-mono mt-1 leading-normal">
                  {newQType === "checkbox"
                    ? "Separate multiple correct options with commas. The evaluation is order-independent."
                    : "If filled, system evaluates student responses automatically on submission."}
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddQuestion}
                className="w-full inline-flex items-center justify-center gap-2 mt-4 py-3 bg-[#1a1a1a] border border-[#333] hover:border-[#444] text-xs font-mono font-bold text-white uppercase rounded-none hover:bg-[#222] transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Append to Exam</span>
              </button>
            </div>
          </GlassContainer>
        </div>
      </div>
      </div>
    </div>
  );
}
