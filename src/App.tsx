import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { RobloxUser } from "./types";
import { GlassContainer, GlassCard, GlassBadge } from "./components/GlassContainer";
import { RobloxLogin } from "./components/RobloxLogin";
import { ExamCreator } from "./components/ExamCreator";
import { ExamViewer } from "./components/ExamViewer";
import { SubmissionInspector } from "./components/SubmissionInspector";
import { Gamepad2, FileText, ClipboardList, PenTool, LogOut, CheckSquare, Search, AlertCircle, Info, Sun, Moon } from "lucide-react";

const SYSTEM_NAME = "XEXAM";
const OWNER_USERNAME = "reaperHook7";
const CREATOR_GROUP = "REAPEX CREATORS";

export default function App() {
  const [currentUser, setCurrentUser] = useState<RobloxUser | null>(null);
  const [oauthConfigured, setOauthConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Active workspace state: "home" | "creator" | "viewer" | "inspector"
  const [activeView, setActiveView] = useState<"home" | "creator" | "viewer" | "inspector">("home");

  // Theme toggle state: dark or light (white)
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return (localStorage.getItem("xexam_theme") as "dark" | "light") || "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") {
      root.classList.add("light-theme");
    } else {
      root.classList.remove("light-theme");
    }
    localStorage.setItem("xexam_theme", theme);
  }, [theme]);
  
  // Joincode input
  const [joinCode, setJoinCode] = useState("");
  const [activeExamId, setActiveExamId] = useState("");

  // Fetch Roblox user session on boot
  useEffect(() => {
    // Check URL parameters for authentication errors
    const urlParams = new URLSearchParams(window.location.search);
    const err = urlParams.get("auth_error");
    if (err) {
      setAuthError(decodeURIComponent(err));
      // Clear query string from address bar
      window.history.replaceState({}, document.title, "/");
    }

    async function fetchSession() {
      try {
        const response = await fetch("/api/auth/me");
        if (response.ok) {
          const data = await response.json();
          setCurrentUser(data.user);
          setOauthConfigured(data.oauthConfigured);
        }
      } catch (err) {
        console.error("Session lookup failed:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSession();
  }, []);

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (response.ok) {
        setCurrentUser(null);
        setActiveView("home");
      }
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const handleJoinExamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim() || joinCode.length !== 6) {
      alert("Please enter a valid 6-character Roblox exam code.");
      return;
    }
    setActiveExamId(joinCode.toUpperCase());
    setActiveView("viewer");
  };

  const handleOnExamCreated = (examId: string) => {
    setActiveExamId(examId);
    setActiveView("inspector");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-gray-200 font-sans">
        <div className="text-center">
          <div className="animate-spin rounded-none h-10 w-10 border-b-2 border-white mx-auto mb-4" />
          <p className="text-sm font-mono text-gray-500">Connecting to Xexam Core...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[#0a0a0a] text-gray-200 font-sans flex flex-col selection:bg-white selection:text-black ${theme === "light" ? "light-theme" : ""}`}>
      {/* Upper Navigation Header */}
      <header className="border-b border-[#2a2a2a] bg-[#111111] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#3a3a3a] rounded-none flex items-center justify-center border border-[#444] shadow-md">
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5 uppercase">
                {SYSTEM_NAME} <span className="text-[10px] font-mono font-bold text-gray-500 border border-[#2a2a2a] px-1.5 py-0.5 bg-[#0d0d0d] rounded-none">{CREATOR_GROUP}</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Dark/White Theme Toggle */}
            <button
              onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
              className="p-2.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#333] hover:border-[#444] text-gray-400 hover:text-white rounded-none transition-all cursor-pointer flex items-center justify-center"
              title={theme === "dark" ? "Switch to Light Theme" : "Switch to Dark Theme"}
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {currentUser && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-3 bg-[#1a1a1a] border border-[#333] py-1.5 px-3 rounded-none">
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.displayName}
                    className="w-7 h-7 rounded-none border border-[#444] shadow-inner"
                    referrerPolicy="no-referrer"
                  />
                  <div className="text-left hidden sm:block">
                    <span className="text-xs font-bold text-white block max-w-[120px] truncate leading-tight">
                      {currentUser.displayName}
                    </span>
                    <span className="text-[10px] font-mono text-gray-500 block leading-tight">
                      @{currentUser.username}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="p-2.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#333] hover:border-[#444] text-gray-400 hover:text-white rounded-none transition-all cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container Workspace */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 flex flex-col justify-center">
        {authError && (
          <div className="max-w-md w-full mx-auto mb-6 p-4 rounded-none bg-red-900/10 border border-red-800/40 text-red-400 text-xs flex gap-3 items-center font-mono shadow-md">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <span>{authError}</span>
          </div>
        )}

        {!currentUser ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <RobloxLogin onLoginSuccess={(u) => setCurrentUser(u)} oauthConfigured={oauthConfigured} />
          </motion.div>
        ) : (
          <div className="w-full">
            {/* View dispatch routing */}
            {activeView === "home" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="max-w-4xl w-full mx-auto space-y-8"
              >
                {/* Hero / Dashboard Greeting Card */}
                <GlassContainer className="relative overflow-hidden border-[#2a2a2a] bg-[#111111] text-center py-10 px-6 rounded-none">
                  {/* Polish top horizontal border accent */}
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#444]" />

                  {/* Owner Label Tag */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono font-bold text-yellow-500 border border-yellow-800/40 bg-yellow-950/10 uppercase tracking-wider rounded-none">
                    Owner: {OWNER_USERNAME}
                  </div>
                  
                  <span className="text-xs font-mono font-bold tracking-widest text-gray-500 uppercase block mb-1">
                    {CREATOR_GROUP} Certification & Grading System
                  </span>
                  <h2 className="text-3xl font-bold tracking-tight text-white mb-3">
                    Form Creator & Grader
                  </h2>
                  <p className="text-gray-400 text-sm max-w-md mx-auto mb-6 font-sans">
                    Create custom entrance forms, assessments, or developer evaluations. Join forms instantly via 6-letter short codes.
                  </p>
                  
                  <div className="flex flex-wrap justify-center gap-2">
                    <GlassBadge variant="silver">Created by {CREATOR_GROUP}</GlassBadge>
                    <GlassBadge variant="dark">Grey & Black Theme</GlassBadge>
                  </div>
                </GlassContainer>

                {/* Grid controls */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  {/* Form Enter join code */}
                  <GlassContainer className="md:col-span-6 flex flex-col justify-between border-[#2a2a2a] bg-[#141414] rounded-none">
                    <div>
                      <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                        <CheckSquare className="w-5 h-5 text-gray-400" />
                        Join {SYSTEM_NAME} Exam
                      </h3>
                      <p className="text-xs text-gray-500 mb-6 font-mono">
                        Got a 6-letter exam code from an owner? Input it here to open the form and register your Roblox profile.
                      </p>
                    </div>

                    <form onSubmit={handleJoinExamSubmit} className="space-y-4">
                      <div>
                        <input
                          type="text"
                          placeholder="e.g. AX7B3K"
                          maxLength={6}
                          value={joinCode}
                          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                          className="w-full bg-glass-input text-center text-xl font-mono font-black tracking-widest text-white py-3 px-4 rounded-none border border-[#2a2a2a] focus:outline-none focus:border-[#444] transition-all uppercase placeholder:font-sans placeholder:font-normal placeholder:text-gray-600 placeholder:text-sm"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={joinCode.length !== 6}
                        className={`w-full py-3 px-4 rounded-none font-bold text-sm tracking-wide transition-all ${
                          joinCode.length === 6
                            ? "bg-white text-black hover:bg-gray-200 cursor-pointer"
                            : "bg-[#1a1a1a] text-gray-600 border border-[#2a2a2a] cursor-not-allowed"
                        }`}
                      >
                        Launch Examination
                      </button>
                    </form>
                  </GlassContainer>

                  {/* Actions / Creation and Inspection */}
                  <div className="md:col-span-6 space-y-4">
                    {/* Create Form option card */}
                    <GlassCard
                      onClick={() => setActiveView("creator")}
                      className="border-[#2a2a2a] flex items-center gap-5 bg-[#1a1a1a] p-4 rounded-none cursor-pointer hover:border-[#444] transition-all"
                    >
                      <div className="h-10 w-10 rounded-none bg-[#222] border border-[#333] flex items-center justify-center text-white flex-shrink-0">
                        <PenTool className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white mb-0.5">
                          Create Exam Form
                        </h4>
                        <p className="text-xs text-gray-400">
                          Draft multiple choice and written questions to generate a 6-letter share code.
                        </p>
                      </div>
                    </GlassCard>

                    {/* Grader / Review results card */}
                    <GlassCard
                      onClick={() => setActiveView("inspector")}
                      className="border-[#2a2a2a] flex items-center gap-5 bg-[#1a1a1a] p-4 rounded-none cursor-pointer hover:border-[#444] transition-all"
                    >
                      <div className="h-10 w-10 rounded-none bg-[#222] border border-[#333] flex items-center justify-center text-white flex-shrink-0">
                        <ClipboardList className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white mb-0.5">
                          Form Responses & Grading
                        </h4>
                        <p className="text-xs text-gray-400">
                          Inspect student answers, grant points, write feedback, and verify Roblox profiles.
                        </p>
                      </div>
                    </GlassCard>
                  </div>
                </div>
              </motion.div>
            )}

            {activeView === "creator" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                <ExamCreator
                  user={currentUser}
                  onBack={() => setActiveView("home")}
                  onExamCreated={handleOnExamCreated}
                />
              </motion.div>
            )}

            {activeView === "viewer" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                <ExamViewer
                  user={currentUser}
                  examIdParam={activeExamId}
                  onBack={() => {
                    setActiveView("home");
                    setJoinCode("");
                  }}
                />
              </motion.div>
            )}

            {activeView === "inspector" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                <SubmissionInspector
                  user={currentUser}
                  initialExamId={activeExamId}
                  onBack={() => {
                    setActiveView("home");
                    setActiveExamId("");
                  }}
                />
              </motion.div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#2a2a2a] bg-[#111111] py-6 text-center text-[11px] font-mono text-gray-500 mt-12 rounded-none">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-3">
          <span className="uppercase">© 2026 {SYSTEM_NAME}. Created by {CREATOR_GROUP}. All rights reserved.</span>
          <div className="flex gap-4 uppercase">
            <span className="text-gray-400 font-bold">OWNER: {OWNER_USERNAME}</span>
            <span>•</span>
            <span className="text-gray-400 font-bold">{CREATOR_GROUP}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
