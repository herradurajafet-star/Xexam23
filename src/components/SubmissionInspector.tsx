import React, { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { RobloxUser, Exam, Submission } from "../types";
import { GlassContainer, GlassCard, GlassBadge } from "./GlassContainer";
import { Check, Clipboard, Users, FileSpreadsheet, Send, MessageSquare, ArrowLeft } from "lucide-react";
import { isAnswerCorrect } from "./ExamViewer";

interface SubmissionInspectorProps {
  user: RobloxUser;
  initialExamId?: string; // Optional: navigate directly to an exam
  onBack: () => void;
}

export function SubmissionInspector({ user, initialExamId, onBack }: SubmissionInspectorProps) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  
  const [loadingExams, setLoadingExams] = useState(true);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Manual grading fields
  const [scoreInput, setScoreInput] = useState<number>(0);
  const [feedbackInput, setFeedbackInput] = useState("");
  const [questionScores, setQuestionScores] = useState<Record<string, number>>({});
  const [successNotification, setSuccessNotification] = useState<string | null>(null);

  const handleUpdateQuestionScore = (qId: string, value: number) => {
    const updatedScores = {
      ...questionScores,
      [qId]: value
    };
    setQuestionScores(updatedScores);
    const sum = Object.values(updatedScores).reduce((acc: number, val: number) => acc + val, 0);
    setScoreInput(sum);
  };

  // Load created exams
  useEffect(() => {
    async function loadExams() {
      setLoadingExams(true);
      try {
        const q = query(collection(db, "exams"), where("creatorId", "==", user.id));
        let querySnapshot;
        try {
          querySnapshot = await getDocs(q);
        } catch (err) {
          handleFirestoreError(err, OperationType.LIST, "exams");
        }
        const loaded: Exam[] = [];
        if (querySnapshot) {
          querySnapshot.forEach((d) => {
            loaded.push(d.data() as Exam);
          });
        }

        setExams(loaded);

        if (initialExamId) {
          const matched = loaded.find(e => e.id === initialExamId);
          if (matched) {
            setSelectedExam(matched);
          }
        }
      } catch (err) {
        console.error("Error loading exams:", err);
      } finally {
        setLoadingExams(false);
      }
    }
    loadExams();
  }, [user.id, initialExamId]);

  // Load submissions for selected exam
  useEffect(() => {
    async function loadSubmissions() {
      if (!selectedExam) return;
      setLoadingSubmissions(true);
      setSelectedSubmission(null);
      try {
        const q = query(collection(db, "submissions"), where("examId", "==", selectedExam.id));
        let querySnapshot;
        try {
          querySnapshot = await getDocs(q);
        } catch (err) {
          handleFirestoreError(err, OperationType.LIST, "submissions");
        }
        const loadedSubmissions: Submission[] = [];
        if (querySnapshot) {
          querySnapshot.forEach((d) => {
            loadedSubmissions.push(d.data() as Submission);
          });
        }
        setSubmissions(loadedSubmissions);
      } catch (err) {
        console.error("Error loading submissions:", err);
      } finally {
        setLoadingSubmissions(false);
      }
    }
    loadSubmissions();
  }, [selectedExam]);

  // Handle choosing a submission
  const handleSelectSubmission = (sub: Submission) => {
    setSelectedSubmission(sub);
    setFeedbackInput(sub.feedback || "");
    setSuccessNotification(null);
    
    const scores: Record<string, number> = {};
    selectedExam?.questions.forEach((q) => {
      if (sub.questionScores && sub.questionScores[q.id] !== undefined) {
        scores[q.id] = sub.questionScores[q.id];
      } else {
        const studentAnsObj = sub.answers.find((a) => a.questionId === q.id);
        const studentAns = studentAnsObj ? studentAnsObj.answerText : "";
        const correctAns = q.correctAnswer || "";
        const isCorrect = correctAns && isAnswerCorrect(studentAns, correctAns, q.type);
        scores[q.id] = isCorrect ? q.points : 0;
      }
    });
    setQuestionScores(scores);
    setScoreInput(sub.score !== undefined ? sub.score : Object.values(scores).reduce((a, b) => a + b, 0));
  };

  // Save manual grade and feedback
  const handleSaveEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubmission || !selectedExam) return;

    setUpdating(true);
    setSuccessNotification(null);
    try {
      const docRef = doc(db, "submissions", selectedSubmission.id);
      const pathStr = `submissions/${selectedSubmission.id}`;
      try {
        await updateDoc(docRef, {
          score: Number(scoreInput),
          feedback: feedbackInput.trim(),
          questionScores: questionScores,
          status: "graded"
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, pathStr);
      }

      // Update local state
      const updatedList = submissions.map(sub => {
        if (sub.id === selectedSubmission.id) {
          return {
            ...sub,
            score: Number(scoreInput),
            feedback: feedbackInput.trim(),
            questionScores: questionScores,
            status: "graded" as const
          };
        }
        return sub;
      });

      setSubmissions(updatedList);
      setSelectedSubmission({
        ...selectedSubmission,
        score: Number(scoreInput),
        feedback: feedbackInput.trim(),
        questionScores: questionScores,
        status: "graded"
      });

      setSuccessNotification("Submission evaluation stamped and saved successfully!");
    } catch (err) {
      console.error("Failed to save grade:", err);
      setSuccessNotification("Error: Failed to save evaluation. Check database connection.");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="max-w-6xl w-full mx-auto" id="submissions-inspector">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-mono text-gray-300 hover:text-white bg-[#1a1a1a] border border-[#333] hover:border-[#444] py-2 px-4 rounded-md transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Xexam Home</span>
        </button>
        <span className="text-xs font-mono text-gray-500">
          OWNER ROLE: <strong className="text-white">{user.username}</strong>
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: List of Owner's Exams */}
        <div className="lg:col-span-4 space-y-4">
          <GlassContainer className="border-[#2a2a2a] bg-[#141414] p-5">
            <h2 className="text-sm font-bold tracking-wider uppercase text-gray-400 mb-4 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-gray-200" />
              Your Exams
            </h2>

            {loadingExams ? (
              <div className="animate-pulse space-y-2 py-4">
                <div className="h-10 bg-zinc-900 rounded"></div>
                <div className="h-10 bg-zinc-900 rounded"></div>
              </div>
            ) : exams.length === 0 ? (
              <div className="py-8 text-center text-xs font-mono text-gray-500 border border-dashed border-[#2a2a2a] rounded-md">
                No exams found.
              </div>
            ) : (
              <div className="space-y-2">
                {exams.map((examItem) => (
                  <button
                    key={examItem.id}
                    onClick={() => {
                      setSelectedExam(examItem);
                      setSelectedSubmission(null);
                    }}
                    className={`w-full text-left p-3 rounded-md border text-xs font-mono transition-all block cursor-pointer ${
                      selectedExam?.id === examItem.id
                        ? "bg-[#222222] border-[#444444] text-white"
                        : "bg-[#0d0d0d] border-[#2a2a2a] text-gray-400 hover:border-[#333] hover:text-gray-200"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold tracking-widest text-white uppercase">{examItem.id}</span>
                      <GlassBadge variant={examItem.isActive ? "grey" : "dark"}>
                        {examItem.isActive ? "ACTIVE" : "LOCKED"}
                      </GlassBadge>
                    </div>
                    <p className="font-sans font-semibold truncate text-gray-200">{examItem.title}</p>
                    <span className="text-[10px] text-gray-500 block mt-1">
                      {examItem.questions.length} Qs • {new Date(examItem.createdAt).toLocaleDateString()}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </GlassContainer>

          {/* List of responses for selected exam */}
          {selectedExam && (
            <GlassContainer className="border-[#2a2a2a] bg-[#141414] p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold tracking-wider uppercase text-gray-400 flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-200" />
                  Candidate Responses
                </h3>
                <GlassBadge variant="silver">{submissions.length}</GlassBadge>
              </div>

              {loadingSubmissions ? (
                <div className="animate-pulse space-y-2 py-4">
                  <div className="h-8 bg-zinc-900 rounded"></div>
                  <div className="h-8 bg-zinc-900 rounded"></div>
                </div>
              ) : submissions.length === 0 ? (
                <div className="py-8 text-center text-xs font-mono text-gray-500 border border-dashed border-[#2a2a2a] rounded-md">
                  No responses submitted yet for code <strong className="text-gray-300">{selectedExam.id}</strong>.
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {submissions.map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => handleSelectSubmission(sub)}
                      className={`w-full text-left p-3 rounded-md border text-xs font-mono transition-all flex items-center gap-3 cursor-pointer ${
                        selectedSubmission?.id === sub.id
                          ? "bg-[#222222] border-[#444444] text-white"
                          : "bg-[#0d0d0d] border-[#2a2a2a] text-gray-400 hover:border-[#333]"
                      }`}
                    >
                      <div className="h-8 w-8 rounded-full bg-[#1a1a1a] border border-[#333] overflow-hidden flex-shrink-0">
                        <img
                          src={sub.avatarUrl || `/api/roblox/avatar/${sub.userId.replace("roblox:", "")}`}
                          alt=""
                          className="h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-sans font-bold text-white truncate">{sub.displayName || sub.username}</p>
                        <span className="text-[10px] text-gray-500 block truncate">@{sub.username}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold block text-gray-200">
                          {sub.score !== undefined ? `${sub.score}/${sub.totalPoints}` : "—"}
                        </span>
                        <span className={`text-[9px] uppercase px-1 rounded ${
                          sub.status === "graded" ? "bg-emerald-900/10 border border-emerald-800/30 text-emerald-400" : "bg-[#1a1a1a] border border-[#2a2a2a] text-gray-500"
                        }`}>
                          {sub.status}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </GlassContainer>
          )}
        </div>

        {/* Right Column: Inspect selected Candidate Answers & Evaluation form */}
        <div className="lg:col-span-8">
          {selectedSubmission && selectedExam ? (
            <div className="space-y-6" id="submission-grader-workspace">
              {/* Submission header card */}
              <GlassContainer className="border-[#2a2a2a] bg-[#141414] relative">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#444]" />
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-full bg-[#0d0d0d] border border-[#2a2a2a] overflow-hidden">
                      <img
                        src={selectedSubmission.avatarUrl || `/api/roblox/avatar/${selectedSubmission.userId.replace("roblox:", "")}`}
                        alt=""
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div>
                      <span className="text-[9px] font-mono font-bold tracking-widest text-gray-500 uppercase block">
                        EXAM SUBMISSION INSPECTOR
                      </span>
                      <h2 className="text-2xl font-bold text-white leading-tight">
                        {selectedSubmission.displayName || selectedSubmission.username}
                      </h2>
                      <p className="text-xs font-mono text-gray-400">
                        @{selectedSubmission.username} • Roblox ID: {selectedSubmission.userId.replace("roblox:", "")}
                      </p>
                    </div>
                  </div>

                  <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-md p-3 text-right font-mono text-xs">
                    <span className="text-gray-500 block text-[9px] uppercase">Evaluation Grade</span>
                    <strong className="text-white text-lg font-sans">
                      {selectedSubmission.score} / {selectedSubmission.totalPoints}
                    </strong>
                    <span className="text-gray-500 block text-[9px]">Points</span>
                  </div>
                </div>
              </GlassContainer>

              {/* Answers inspector detail */}
              <div className="space-y-4">
                <h3 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider pl-1">
                  Responses Aligned to Question Keys
                </h3>

                {selectedExam.questions.map((q, qIdx) => {
                  const studentAnsObj = selectedSubmission.answers.find(a => a.questionId === q.id);
                  const studentAns = studentAnsObj ? studentAnsObj.answerText : "[No Response]";
                  const correctAns = q.correctAnswer || "";
                  const hasAutoGraded = !!correctAns;
                  const isCorrect = hasAutoGraded && isAnswerCorrect(studentAns, correctAns, q.type);

                  return (
                    <GlassCard key={q.id} className="bg-[#141414] border border-[#2a2a2a] p-5">
                      <div className="flex justify-between items-start gap-4 mb-2 pb-1 border-b border-[#2a2a2a]">
                        <span className="text-[10px] font-mono text-gray-500">
                          Q{qIdx + 1} ({q.type.replace("_", " ")})
                        </span>
                        <span className="text-[10px] font-mono font-bold text-gray-300">
                          Value: {q.points} Pts
                        </span>
                      </div>

                      <p className="text-sm font-semibold text-white mb-3">{q.text}</p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                        {/* Student Answer */}
                        <div className="bg-[#0d0d0d] p-3 rounded-md border border-[#2a2a2a]">
                          <span className="text-[10px] font-mono text-gray-500 block mb-1 uppercase">Candidate's Response</span>
                          <p className={`text-xs font-mono font-bold ${
                            hasAutoGraded 
                              ? isCorrect ? "text-emerald-400" : "text-red-400"
                              : "text-gray-200"
                          }`}>
                            {studentAns || "—"}
                          </p>
                        </div>

                        {/* Grading reference */}
                        {hasAutoGraded && (
                          <div className="bg-[#0d0d0d] p-3 rounded-md border border-[#2a2a2a]">
                            <span className="text-[10px] font-mono text-gray-500 block mb-1 uppercase">Correct Answer Key</span>
                            <p className="text-xs font-mono font-bold text-emerald-400">
                              {correctAns}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Per-Question Awarded Points Override */}
                      <div className="mt-4 pt-3 border-t border-[#222]/60 flex flex-wrap items-center justify-between gap-3">
                        <span className="text-[10px] font-mono text-gray-400 uppercase font-bold">
                          Evaluate Answer:
                        </span>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateQuestionScore(q.id, q.points)}
                            className={`px-3 py-1 text-[10px] font-mono uppercase font-bold border transition-all cursor-pointer ${
                              questionScores[q.id] === q.points
                                ? "bg-emerald-950/20 border-emerald-800 text-emerald-400 font-black"
                                : "bg-[#0d0d0d] border-[#222] text-gray-500 hover:text-gray-350 hover:border-[#333]"
                            }`}
                          >
                            Correct ({q.points} pts)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateQuestionScore(q.id, 0)}
                            className={`px-3 py-1 text-[10px] font-mono uppercase font-bold border transition-all cursor-pointer ${
                              questionScores[q.id] === 0
                                ? "bg-red-950/20 border-red-800 text-red-400 font-black"
                                : "bg-[#0d0d0d] border-[#222] text-gray-500 hover:text-gray-355 hover:border-[#333]"
                            }`}
                          >
                            Incorrect (0 pts)
                          </button>
                          <div className="flex items-center gap-1 bg-[#0d0d0d] border border-[#222] px-2 py-0.5 font-mono">
                            <span className="text-[10px] text-gray-500 uppercase font-bold">Custom:</span>
                            <input
                              type="number"
                              min="0"
                              max={q.points}
                              value={questionScores[q.id] ?? 0}
                              onChange={(e) => handleUpdateQuestionScore(q.id, Math.min(q.points, Math.max(0, Number(e.target.value))))}
                              className="w-10 bg-transparent text-white text-[10px] focus:outline-none font-bold text-center"
                            />
                            <span className="text-[10px] text-gray-500">/ {q.points}</span>
                          </div>
                        </div>
                      </div>
                    </GlassCard>
                  );
                })}
              </div>

              {/* Evaluation Panel form */}
              <GlassContainer className="border-[#2a2a2a] bg-[#141414]">
                <h3 className="text-md font-bold text-white mb-4 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-gray-400 fill-[#1a1a1a]" />
                  Evaluate & Add Feedback
                </h3>

                {successNotification && (
                  <div className={`mb-4 p-3 border text-xs font-mono rounded text-center ${
                    successNotification.startsWith("Error")
                      ? "bg-red-950/10 border-red-850/40 text-red-400"
                      : "bg-emerald-950/10 border-emerald-850/40 text-emerald-400"
                  }`}>
                    {successNotification}
                  </div>
                )}

                <form onSubmit={handleSaveEvaluation} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-1">
                      <label className="block text-xs font-mono text-gray-400 uppercase mb-1.5 font-bold">
                        Awarded Score
                      </label>
                      <input
                        type="number"
                        max={selectedSubmission.totalPoints}
                        min="0"
                        value={scoreInput}
                        onChange={(e) => setScoreInput(Number(e.target.value))}
                        className="w-full bg-glass-input text-white text-sm py-2 px-3 rounded-md font-mono focus:outline-none border border-[#2a2a2a] focus:border-[#444]"
                      />
                      <span className="text-[9px] font-mono text-gray-500 mt-1 block">
                        Max {selectedSubmission.totalPoints} pts
                      </span>
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-xs font-mono text-gray-400 uppercase mb-1.5 font-bold">
                        Written Feedback / Comments
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Excellent Roblox script architecture! Highly qualified."
                        value={feedbackInput}
                        onChange={(e) => setFeedbackInput(e.target.value)}
                        className="w-full bg-glass-input text-white text-sm py-2 px-3 rounded-md focus:outline-none border border-[#2a2a2a] focus:border-[#444] transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={updating}
                    className="inline-flex items-center gap-2 py-2.5 px-5 bg-white text-black font-bold text-xs uppercase rounded-md hover:bg-gray-200 transition-all cursor-pointer shadow disabled:opacity-50"
                  >
                    <Check className="w-4 h-4 stroke-[3px]" />
                    <span>{updating ? "Updating Firestore..." : "Approve & Stamp Evaluation"}</span>
                  </button>
                </form>
              </GlassContainer>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center py-20 border border-dashed border-[#2a2a2a] rounded-md bg-[#0d0d0d]/40">
              <Users className="w-12 h-12 text-gray-500 mb-3" />
              <h3 className="text-lg text-white font-bold">Response Dashboard</h3>
              <p className="text-xs text-gray-500 font-mono mt-1 max-w-sm px-4">
                Select an exam form on the left list, then click a candidate's submission to grade answers and write feedback.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
