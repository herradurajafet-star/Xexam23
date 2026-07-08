import React from "react";
import { GlassContainer } from "./GlassContainer";
import { Gamepad2, ArrowRight, ShieldCheck } from "lucide-react";

interface RobloxLoginProps {
  onLoginSuccess: (user: any) => void;
  oauthConfigured: boolean;
}

export function RobloxLogin({ oauthConfigured }: RobloxLoginProps) {
  const handleOAuthLogin = () => {
    // Redirect to the server's Roblox OAuth init route
    window.location.href = "/api/auth/roblox";
  };

  return (
    <div className="max-w-md w-full mx-auto" id="roblox-login-portal">
      <GlassContainer className="relative overflow-hidden border border-[#2a2a2a] bg-[#141414] rounded-none">
        {/* Shiny reflective decoration on top */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#444]" />
        
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-none bg-[#1a1a1a] border border-[#333] mb-4 shadow-inner">
            <Gamepad2 className="w-8 h-8 text-white fill-white" strokeWidth={2} />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white mb-2">
            Roblox Authentication
          </h2>
          <p className="text-xs text-gray-500">
            Securely link your Roblox identity via official OAuth to create or join exams.
          </p>
        </div>

        <div className="space-y-6">
          {/* Main Roblox OAuth Button */}
          <div>
            <button
              onClick={handleOAuthLogin}
              disabled={!oauthConfigured}
              className={`w-full flex items-center justify-center gap-3 py-3 px-5 rounded-none font-bold text-sm tracking-wide transition-all ${
                oauthConfigured
                  ? "bg-white text-black hover:bg-gray-200 cursor-pointer shadow-md"
                  : "bg-[#1a1a1a] text-gray-600 border border-[#2a2a2a] cursor-not-allowed"
              }`}
            >
              <Gamepad2 className="w-5 h-5 fill-current" />
              <span>Login with Roblox OAuth</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
            
            {!oauthConfigured && (
              <p className="text-[10px] text-gray-500 mt-3 leading-relaxed text-center font-mono">
                Roblox OAuth keys are not configured in Server Secrets.
                <br />
                Please define your Client ID and Client Secret in the workspace settings menu to enable live authentication.
              </p>
            )}
          </div>
        </div>

        <div className="mt-8 flex items-center gap-2 justify-center text-gray-500">
          <ShieldCheck className="w-4 h-4 text-gray-400" />
          <span className="text-[9px] font-mono tracking-wider uppercase">
            SECURE ACCESS • OFFICIAL ROBLOX INTEGRATION
          </span>
        </div>
      </GlassContainer>
    </div>
  );
}
