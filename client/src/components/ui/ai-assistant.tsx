import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, X, Loader2, Bot } from "lucide-react";

interface Message {
  text: string;
  isUser: boolean;
}

const DISPATCH_RESPONSES: { keywords: string[]; response: string }[] = [
  {
    keywords: ["hello", "hi", "hey", "salam", "مرحبا"],
    response: "Assalamu Alaikum. I'm the Red Crescent Dispatch AI. I can help with triage decisions, zone info, and dispatch guidance. How can I assist?",
  },
  {
    keywords: ["critical", "emergency", "urgent", "code red"],
    response: "For Critical cases: dispatch ambulance immediately. Notify the nearest field medic and activate the ER team. Confirm patient location in the zone before dispatching.",
  },
  {
    keywords: ["paramedic", "dispatch paramedic"],
    response: "To dispatch a paramedic: confirm the patient's zone and GPS coordinates. Assign the nearest available paramedic unit. ETA averages 4–7 minutes within Haram and Mina zones.",
  },
  {
    keywords: ["ambulance"],
    response: "Ambulance dispatch is reserved for critical vitals (SpO2 < 88%, HR > 150, or temp > 39.5°C). Confirm patient status before escalating to avoid overloading fleet.",
  },
  {
    keywords: ["volunteer"],
    response: "Volunteer dispatch is suitable for wellness checks and low-priority cases (risk score < 40). Volunteers cover Arafat, Muzdalifah, and outer Makkah zones.",
  },
  {
    keywords: ["zone", "mina", "arafat", "muzdalifah", "haram", "makkah", "jamarat"],
    response: "Zone coverage:\n• Makkah – Haram: Doctors + Paramedics\n• Mina: Mixed teams, high density\n• Arafat: Field medics + volunteers\n• Muzdalifah: Volunteer-primary\n• Jamarat: High-risk crush zone, paramedic priority",
  },
  {
    keywords: ["heat", "heatstroke", "temperature", "temp"],
    response: "Heat emergency protocol: Move to shade immediately. Apply cool wet towels to neck/armpits. IV fluids if available. Core temp > 40°C = Critical — dispatch ambulance now.",
  },
  {
    keywords: ["fall", "fallen", "collapse", "collapsed"],
    response: "Fall/Collapse protocol: Do not move the patient unless in immediate danger. Check consciousness and airway. Dispatch paramedic and flag as high priority in the ticket.",
  },
  {
    keywords: ["triage", "priority", "risk", "score"],
    response: "Triage levels:\n• Risk 0–40: Volunteer check-in\n• Risk 41–70: Paramedic dispatch\n• Risk 71–100: Ambulance + ER alert\n\nAlways cross-check SpO2 and heart rate before final triage.",
  },
  {
    keywords: ["spo2", "oxygen", "breathing"],
    response: "SpO2 thresholds:\n• 95–100%: Normal\n• 92–94%: Warning — monitor closely\n• < 92%: Critical — oxygen support needed, dispatch now.",
  },
  {
    keywords: ["heart", "hr", "pulse", "rate"],
    response: "Heart rate thresholds:\n• 60–100 bpm: Normal\n• 101–130 bpm: Warning — increased monitoring\n• > 130 bpm: Critical — immediate paramedic dispatch.",
  },
  {
    keywords: ["blood pressure", "bp", "hypertension"],
    response: "BP guidelines:\n• Normal: < 130/85\n• Elevated: 130–160/85–100 — flag for monitoring\n• Hypertensive crisis: > 180/110 — dispatch ambulance immediately.",
  },
  {
    keywords: ["crowd", "crush", "stampede"],
    response: "Crowd emergency protocol: Alert all nearby units immediately. Activate the mass-casualty response. Isolate the zone and establish a triage station at the nearest safe perimeter.",
  },
  {
    keywords: ["contact", "family", "emergency contact"],
    response: "To notify emergency contacts: open the patient ticket and use the 'Emergency Contact' action. The system will send an automated SMS and voice call to the registered number.",
  },
  {
    keywords: ["status", "update", "move", "resolve"],
    response: "To update a ticket status: click the ticket card and use the 'Move' dropdown, or open the detail dialog and change the status from the dropdown in the top-right.",
  },
  {
    keywords: ["help", "what can you do", "commands"],
    response: "I can assist with:\n• Triage decisions (risk, SpO2, HR, BP)\n• Zone coverage info\n• Dispatch protocols (paramedic, ambulance, volunteer)\n• Emergency procedures (heat, fall, crowd)\n• Ticket management guidance\n\nJust ask!",
  },
];

function getResponse(input: string): string {
  const lower = input.toLowerCase();
  for (const entry of DISPATCH_RESPONSES) {
    if (entry.keywords.some(k => lower.includes(k))) {
      return entry.response;
    }
  }
  return "I'm not sure about that specific query. For immediate emergencies, follow standard dispatch protocol or escalate to the command supervisor. I can help with triage, zones, dispatch, and vitals thresholds.";
}

export function AIAssistant() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;
    const userMessage = input.trim();
    setMessages(prev => [...prev, { text: userMessage, isUser: true }]);
    setInput("");
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, { text: getResponse(userMessage), isUser: false }]);
    }, 900);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  return (
    <div className="w-[272px] shrink-0 flex flex-col bg-gradient-to-b from-slate-900 to-indigo-950 border-l border-slate-700/50">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-indigo-500/30 bg-indigo-600/20">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-indigo-300" />
          <span className="text-sm font-semibold text-white">Dispatch AI</span>
        </div>
        <button
          onClick={() => setMessages([])}
          className="text-indigo-300 hover:text-white transition-colors"
          data-testid="button-clear-chat"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8 space-y-3">
            <div className="w-12 h-12 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
              <Bot className="h-6 w-6 text-indigo-300" />
            </div>
            <div>
              <p className="text-indigo-200 text-sm font-medium">Dispatch AI</p>
              <p className="text-slate-400 text-xs mt-1 leading-relaxed">Ask about triage, zones,<br />dispatch protocols, or vitals.</p>
            </div>
            <div className="space-y-1.5 w-full mt-2">
              {["Triage levels?", "Heat emergency protocol", "Dispatch ambulance?"].map(s => (
                <button
                  key={s}
                  onClick={() => { setInput(s); }}
                  className="w-full text-left text-[11px] text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-lg px-2.5 py-1.5 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.isUser ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed whitespace-pre-line ${
                    msg.isUser
                      ? "bg-indigo-600 text-white rounded-tr-none"
                      : "bg-slate-700/60 text-slate-100 rounded-tl-none border border-slate-600/40"
                  }`}
                  style={{ animation: "fadeUp 0.25s ease-out" }}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="px-3 py-2 rounded-2xl rounded-tl-none bg-slate-700/60 border border-slate-600/40 flex items-center gap-1">
                  {[0, 150, 300].map(d => (
                    <span
                      key={d}
                      className="w-1.5 h-1.5 rounded-full bg-indigo-400"
                      style={{ animation: `pulse 1s ease-in-out ${d}ms infinite` }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="p-2.5 border-t border-slate-700/50 bg-slate-800/40"
      >
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask about dispatch..."
            className="w-full bg-slate-700/50 border border-slate-600/40 rounded-full py-2 pl-3 pr-9 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/60"
            data-testid="input-ai-chat"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className={`absolute right-1 rounded-full p-1.5 transition-colors ${
              input.trim()
                ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                : "bg-slate-700/50 text-slate-500 cursor-not-allowed"
            }`}
            data-testid="button-ai-send"
          >
            {isTyping ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </button>
        </div>
      </form>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
