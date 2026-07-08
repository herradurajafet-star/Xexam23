import React, { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { RobloxUser, Exam, Submission, SubmissionAnswer } from "../types";
import { GlassContainer, GlassCard, GlassBadge } from "./GlassContainer";
import { Gamepad2, AlertCircle, CheckCircle2, ChevronRight, Send, ArrowLeft } from "lucide-react";

export function isAnswerCorrect(studentAns: string, correctAns: string, type: string): boolean {
  if (!studentAns || !correctAns) return false;
  if (type === "checkbox") {
    const studentParts = studentAns.split(",")
      .map(s => s.trim().toLowerCase())
      .filter(s => s !== "")
      .sort();
    const correctParts = correctAns.split(",")
      .map(s => s.trim().toLowerCase())
      .filter(s => s !== "")
      .sort();
    if (studentParts.length !== correctParts.length) return false;
    return studentParts.every((val, index) => val === correctParts[index]);
  }
  return studentAns.trim().toLowerCase() === correctAns.trim().toLowerCase();
}

interface ExamViewerProps {
  user: RobloxUser;
  examIdParam: string; // The 6-character code entered on the homepage
  onBack: () => void;
}

export function ExamViewer({ user, examIdParam, onBack }: ExamViewerProps) {
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checkboxAnswers, setCheckboxAnswers] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<Submission | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Load Exam from Firestore
  useEffect(() => {
    async function loadExam() {
      setLoading(true);
      setError(null);
      try {
        const docRef = doc(db, "exams", examIdParam.toUpperCase());
        const pathStr = `exams/${examIdParam.toUpperCase()}`;
        let docSnap;
        try {
          docSnap = await getDoc(docRef);
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, pathStr);
        }

        if (docSnap && docSnap.exists()) {
          const data = docSnap.data() as Exam;
          if (!data.isActive) {
            setError("This Roblox exam form is currently locked or inactive.");
          } else {
            setExam(data);
          }
        } else {
          setError(`Exam with code "${examIdParam}" was not found. Verify the random letters and try again.`);
        }
      } catch (err) {
        console.error("Firestore read error:", err);
        setError("Network connection failure. Failed to query Firestore.");
      } finally {
        setLoading(false);
      }
    }

    if (examIdParam) {
      loadExam();
    }
  }, [examIdParam]);

  const handleSelectOption = (qId: string, value: string) => {
    setAnswers({
      ...answers,
      [qId]: value
    });
  };

  const handleCheckboxToggle = (qId: string, value: string) => {
    const current = checkboxAnswers[qId] || [];
    let updated: string[];
    if (current.includes(value)) {
      updated = current.filter(x => x !== value);
    } else {
      updated = [...current, value];
    }
    setCheckboxAnswers({
      ...checkboxAnswers,
      [qId]: updated
    });

    // Update flat answers record too
    setAnswers({
      ...answers,
      [qId]: updated.join(", ")
    });
  };

  const handleTextChange = (qId: string, value: string) => {
    setAnswers({
      ...answers,
      [qId]: value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exam) return;

    // Verify all questions answered
    const unanswered = exam.questions.filter(q => !answers[q.id] || answers[q.id].trim() === "");
    if (unanswered.length > 0) {
      if (!confirm(`You have left ${unanswered.length} question(s) blank. Submit anyway?`)) {
        return;
      }
    }

    setSubmitting(true);

    // Compute Auto-Score
    let earnedScore = 0;
    let maxPoints = 0;

    const submissionAnswers: SubmissionAnswer[] = exam.questions.map(q => {
      const studentAns = (answers[q.id] || "").trim();
      const correctAns = (q.correctAnswer || "").trim();
      maxPoints += q.points;

      const isCorrect = isAnswerCorrect(studentAns, correctAns, q.type);
      if (isCorrect) {
        earnedScore += q.points;
      }

      return {
        questionId: q.id,
        answerText: studentAns
      };
    });

    const submissionId = "sub_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now();

    const submissionData: Submission = {
      id: submissionId,
      examId: exam.id,
      userId: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
      answers: submissionAnswers,
      score: earnedScore,
      totalPoints: maxPoints,
      status: "submitted",
      submittedAt: new Date().toISOString(),
      ...(user.displayName ? { displayName: user.displayName } : {})
    };

    try {
      const pathStr = `submissions/${submissionId}`;
      try {
        await setDoc(doc(db, "submissions", submissionId), submissionData);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, pathStr);
      }
      setSubmissionResult(submissionData);
      setSubmitted(true);
    } catch (err) {
      console.error("Firestore submission write failed:", err);
      alert("Submission failed. Please check database permissions or network.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl w-full mx-auto" id="exam-loading-screen">
        <GlassContainer className="text-center py-16 border-[#2a2a2a] bg-[#141414]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white mx-auto mb-4" />
          <p className="text-sm font-mono text-gray-500">Loading Roblox Exam Form...</p>
        </GlassContainer>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md w-full mx-auto" id="exam-error-screen">
        <GlassContainer className="text-center py-10 border-[#2a2a2a] bg-[#141414]">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-900/10 border border-red-850 mb-4 text-red-400">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Form Access Blocked</h3>
          <p className="text-xs text-gray-500 font-mono mb-6 px-4">{error}</p>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1a1a1a] border border-[#333] text-xs font-mono text-gray-300 rounded-md hover:bg-[#222] hover:text-white transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>
        </GlassContainer>
      </div>
    );
  }

  if (submitted && exam) {
    return (
      <div className="max-w-xl w-full mx-auto" id="exam-submitted-screen">
        <GlassContainer className="text-center py-12 px-6 border-[#2a2a2a] bg-[#141414] relative">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#444]" />

          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#0d0d0d] border border-[#2a2a2a] mb-6 text-emerald-400">
            <CheckCircle2 className="w-10 h-10 fill-emerald-900/20" />
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-white mb-2">
            Exam Submitted!
          </h2>
          <p className="text-gray-400 text-sm max-w-sm mx-auto mb-6">
            Thank you, <strong className="text-white">{user.displayName}</strong>. Your answers have been logged and sent to the Roblox form owner.
          </p>

          <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-md p-5 mb-8 max-w-sm mx-auto text-left font-mono text-xs text-gray-400 space-y-2">
            <div>
              <span className="text-gray-600 block">Exam Name</span>
              <span className="text-gray-200 font-bold font-sans text-sm">{exam.title}</span>
            </div>
            <div>
              <span className="text-gray-600 block">Unique Code</span>
              <span className="text-white uppercase font-bold">{exam.id}</span>
            </div>
            {submissionResult?.score !== undefined && (
              <div className="pt-2 border-t border-[#2a2a2a] flex justify-between items-center">
                <span className="text-gray-500">Auto-Evaluated Score:</span>
                <span className="text-emerald-400 font-bold font-sans text-sm">
                  {submissionResult.score} / {submissionResult.totalPoints} pts
                </span>
              </div>
            )}
          </div>

          <button
            onClick={onBack}
            className="w-full py-3 bg-white text-black font-bold text-sm rounded-md hover:bg-gray-200 transition-all cursor-pointer"
          >
            Return to Xexam Portal
          </button>
        </GlassContainer>
      </div>
    );
  }

  return (
    <div 
      className="w-full mx-auto relative p-6 md:p-8 border border-[#2a2a2a] bg-cover bg-center bg-no-repeat"
      id="active-exam-room"
      style={exam?.wallpaperUrl ? { backgroundImage: `url(${exam.wallpaperUrl})`, backgroundAttachment: "fixed" } : { backgroundColor: "#0a0a0a" }}
    >
      {exam?.wallpaperUrl && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-xs z-0" />
      )}
      
      <div className="relative z-10 max-w-3xl w-full mx-auto">
        {/* Header Info */}
        <div className="flex items-center justify-between mb-6">
          {!showExitConfirm ? (
            <button
              type="button"
              onClick={() => setShowExitConfirm(true)}
              className="inline-flex items-center gap-2 text-xs font-mono text-gray-300 hover:text-white bg-[#1a1a1a] border border-[#333] py-2 px-4 rounded-none transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Exit Form</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-[#1a1a1a] border border-[#333] p-1.5 rounded-none font-mono text-xs">
              <span className="text-red-400 px-2 font-bold uppercase tracking-wider text-[10px]">Lose progress?</span>
              <button
                type="button"
                onClick={onBack}
                className="bg-red-900/20 border border-red-800 text-red-400 px-2.5 py-1 text-[10px] uppercase font-bold hover:bg-red-900/40 transition-all cursor-pointer"
              >
                Yes, Exit
              </button>
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="bg-[#2a2a2a] border border-[#444] text-gray-300 px-2.5 py-1 text-[10px] uppercase font-bold hover:text-white transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}

          <div className="flex items-center gap-2.5 bg-[#1a1a1a] border border-[#333] py-1.5 px-3 rounded-none">
            <img src={user.avatarUrl} alt="" className="w-5 h-5 rounded-none border border-[#444]" referrerPolicy="no-referrer" />
            <span className="text-[11px] font-mono text-gray-400">
              TESTEE: <strong className="text-white">{user.username}</strong>
            </span>
          </div>
        </div>

        {exam && (
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Exam Cover details */}
            <GlassContainer className="border-[#2a2a2a] bg-[#141414] relative rounded-none">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#444]" />
              <div className="flex justify-between items-start gap-4">
                <div>
                  <span className="text-[10px] font-mono font-bold tracking-widest text-gray-500 uppercase block mb-1">
                    Xexam Form {exam.id}
                  </span>
                  <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
                    {exam.title}
                  </h1>
                  {exam.description && (
                    <p className="text-gray-400 text-sm whitespace-pre-wrap font-sans mt-3 border-l-2 border-[#444] pl-4 py-1 leading-relaxed">
                      {exam.description}
                    </p>
                  )}
                </div>
                <GlassBadge variant="silver">{exam.questions.length} Questions</GlassBadge>
              </div>
              
              <div className="flex items-center gap-2 mt-6 pt-4 border-t border-[#2a2a2a] text-[10px] font-mono text-gray-500">
                <span>CREATED BY: {exam.creatorUsername}</span>
                <span>•</span>
                <span>TYPE: ROBLOX CERTIFICATE</span>
              </div>
            </GlassContainer>

            {/* Questions Container */}
            <div className="space-y-6">
              {exam.questions.map((q, idx) => {
                const currentAns = answers[q.id] || "";
                const currentChecked = checkboxAnswers[q.id] || [];

                return (
                  <GlassContainer key={q.id} className="border-[#2a2a2a] bg-[#141414] p-6 md:p-6 rounded-none">
                    <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#2a2a2a]">
                      <span className="text-xs font-mono font-bold text-gray-500 tracking-wider">
                        QUESTION {idx + 1} OF {exam.questions.length}
                      </span>
                      <span className="text-[10px] font-mono bg-[#222] border border-[#333] px-2 py-0.5 rounded-none text-gray-400">
                        {q.points} Pts
                      </span>
                    </div>

                    <p className="text-sm font-semibold text-gray-100 mb-4 font-sans leading-relaxed">
                      {q.text}
                    </p>

                    {/* Render based on Question Type */}
                    {q.type === "multiple_choice" && q.options && (
                      <div className="space-y-2">
                        {q.options.map((opt, oIdx) => (
                          <label
                            key={oIdx}
                            className={`flex items-center gap-3 p-3.5 rounded-none border text-xs font-mono transition-all cursor-pointer ${
                              currentAns === opt
                                ? "bg-[#222222] border-[#444444] text-white"
                                : "bg-[#0d0d0d] border-[#2a2a2a] hover:border-[#333] text-gray-400 hover:text-gray-200"
                            }`}
                          >
                            <input
                              type="radio"
                              name={`q_${q.id}`}
                              value={opt}
                              checked={currentAns === opt}
                              onChange={() => handleSelectOption(q.id, opt)}
                              className="accent-white h-4 w-4"
                            />
                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {q.type === "checkbox" && q.options && (
                      <div className="space-y-2">
                        {q.options.map((opt, oIdx) => (
                          <label
                            key={oIdx}
                            className={`flex items-center gap-3 p-3.5 rounded-none border text-xs font-mono transition-all cursor-pointer ${
                              currentChecked.includes(opt)
                                ? "bg-[#222222] border-[#444444] text-white"
                                : "bg-[#0d0d0d] border-[#2a2a2a] hover:border-[#333] text-gray-400"
                            }`}
                          >
                            <input
                              type="checkbox"
                              name={`q_${q.id}`}
                              value={opt}
                              checked={currentChecked.includes(opt)}
                              onChange={() => handleCheckboxToggle(q.id, opt)}
                              className="accent-white h-4 w-4"
                            />
                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {q.type === "text" && (
                      <textarea
                        placeholder="Type your response here..."
                        value={currentAns}
                        onChange={(e) => handleTextChange(q.id, e.target.value)}
                        rows={4}
                        className="w-full bg-glass-input text-white text-xs py-2.5 px-3 rounded-none focus:outline-none border border-[#2a2a2a] focus:border-[#444] font-sans resize-none transition-all"
                      />
                    )}
                  </GlassContainer>
                );
              })}
            </div>

            <GlassContainer className="text-center border-[#2a2a2a] bg-[#141414] p-6 rounded-none">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 py-3 px-8 bg-white hover:bg-gray-200 text-black font-bold text-sm tracking-wide rounded-none shadow-lg hover:scale-[1.01] transition-all cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4 fill-current" />
                <span>{submitting ? "Transmitting response..." : "Submit My Form responses"}</span>
              </button>
              <p className="text-[10px] text-gray-500 font-mono mt-3 uppercase tracking-wider">
                THIS SUBMISSION IS FINAL AND STAMPED WITH ROBLOX USER PROFILE
              </p>
            </GlassContainer>
          </form>
        )}
      </div>
    </div>
  );
}
