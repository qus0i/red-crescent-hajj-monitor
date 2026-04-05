import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Play,
  Mail,
  Database,
  Brain,
  Filter,
  Globe,
  MessageSquare,
  Zap,
  GripVertical,
  X,
  ChevronRight,
  Phone,
  Truck,
  GitBranch,
  ArrowRightLeft,
  AlertTriangle,
} from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface WorkflowNode {
  id: string;
  type: string;
  label: string;
  x: number;
  y: number;
  icon: keyof typeof NODE_ICONS;
  color: string;
  description: string;
  detail?: string;
}

interface Connection {
  from: string;
  to: string;
  label?: string;
  labelColor?: string;
}

const NODE_ICONS = {
  play: Play,
  mail: Mail,
  database: Database,
  brain: Brain,
  filter: Filter,
  globe: Globe,
  message: MessageSquare,
  zap: Zap,
  phone: Phone,
  truck: Truck,
  gitBranch: GitBranch,
  whatsapp: SiWhatsapp,
  arrowRightLeft: ArrowRightLeft,
  alertTriangle: AlertTriangle,
};

const NODE_TEMPLATES: { label: string; icon: keyof typeof NODE_ICONS; color: string; description: string }[] = [
  { label: "SMS", icon: "message", color: "bg-green-500", description: "Send SMS message" },
  { label: "Phone Call", icon: "phone", color: "bg-blue-500", description: "Automated outbound call" },
  { label: "AI Dispatch", icon: "truck", color: "bg-orange-500", description: "Route to responder" },
  { label: "WhatsApp", icon: "whatsapp", color: "bg-emerald-500", description: "Send WhatsApp message" },
  { label: "Route / Branch", icon: "gitBranch", color: "bg-violet-500", description: "Branch workflow" },
  { label: "AI Agent", icon: "brain", color: "bg-purple-500", description: "Process with AI" },
  { label: "HTTP Request", icon: "globe", color: "bg-blue-500", description: "Send HTTP request" },
  { label: "Database", icon: "database", color: "bg-emerald-500", description: "Query database" },
  { label: "Email", icon: "mail", color: "bg-rose-500", description: "Send email" },
  { label: "Webhook", icon: "zap", color: "bg-orange-500", description: "Trigger webhook" },
];

const SMS_ARABIC_TEMPLATE = `عزيزي/عزيزتي {{first_name}}،

تم رصد تغيّر في قراءة {{metric_name}} الخاصة بك.

الحالة: {{status}}
القيمة: {{metric_value}} {{metric_unit}}

يرجى الرد برقم من 1 إلى 10 لتقييم حالتك الصحية الحالية.

الهلال الأحمر - خدمات الرعاية الصحية`;

const NODE_DETAILS: Record<string, string> = {
  "trigger": "Monitors patient health metrics in real-time. Triggers when a vital sign reading exceeds the configured threshold (e.g., heart rate > 120 bpm, blood pressure > 180/120).",
  "ai-classify": "AI model analyzes the incoming health metric and patient history to classify risk level into three categories:\n• Low Risk — minor deviation, patient can self-manage\n• Medium Risk — moderate concern, requires follow-up\n• Critical — immediate intervention needed",
  "sms-low": SMS_ARABIC_TEMPLATE,
  "call-medium": "Initiates an automated AI-powered outbound phone call to the patient. The AI agent explains the detected health metric change, asks about symptoms, and records the patient's verbal response for analysis.",
  "call-critical": "Immediately initiates a PRIORITY outbound call to the patient. Bypasses normal queue. AI agent uses urgent tone, gathers critical symptom information, and keeps the line open for potential transfer to emergency services.",
  "ai-analyze": "Processes the patient's response from SMS (1–10 score) or phone call transcript. Uses NLP to assess:\n• Current symptom severity\n• Patient's self-reported condition\n• Whether escalation is needed\n• Recommended responder type",
  "ai-dispatch": "Routes to the closest available responder based on analysis result and patient GPS location:\n• Volunteer — for low-severity check-ins\n• Ambulance — for transport needs\n• Paramedic — for on-site medical care\n• ER — for critical/life-threatening situations",
  "dispatch-volunteer": "Deploys the nearest available volunteer to the patient's location for low-severity check-ins and wellness monitoring. Volunteer receives patient summary and basic instructions.",
  "dispatch-ambulance": "Dispatches the closest available ambulance unit for patient transport. Includes patient vitals, location, and hospital destination recommendations.",
  "dispatch-paramedic": "Sends a paramedic team for on-site medical care. Team receives full patient history, current vitals, and recommended treatment protocols.",
  "dispatch-er": "Routes to the nearest emergency room for critical/life-threatening situations. ER is pre-notified with patient details, ETA, and required preparations.",
  "whatsapp-location": "Sends the patient's GPS coordinates to the dispatched responder via WhatsApp. Includes:\n• Patient name and ID\n• Live location pin\n• Summary of health alert\n• Estimated distance and route",
  "transfer-call": "AI transfers the live call to the correct department or person based on dispatch decision. Provides a warm handoff with patient context and alert summary to the receiving party.",
};

const INITIAL_NODES: WorkflowNode[] = [
  { id: "trigger", type: "trigger", label: "Health Alert Received", x: 30, y: 280, icon: "play", color: "bg-teal-500", description: "Patient metric threshold exceeded" },
  { id: "ai-classify", type: "process", label: "Risk Classification", x: 270, y: 280, icon: "brain", color: "bg-purple-500", description: "AI classifies: Low / Medium / Critical" },
  { id: "sms-low", type: "action", label: "Send SMS", x: 520, y: 120, icon: "message", color: "bg-green-500", description: "Arabic SMS template to patient" },
  { id: "call-medium", type: "action", label: "AI Phone Call", x: 520, y: 280, icon: "phone", color: "bg-blue-500", description: "Automated outbound call" },
  { id: "call-critical", type: "action", label: "AI Phone Call (Priority)", x: 520, y: 440, icon: "phone", color: "bg-rose-500", description: "Immediate priority outbound call" },
  { id: "ai-analyze", type: "process", label: "AI Analyze Response", x: 780, y: 280, icon: "brain", color: "bg-violet-500", description: "Process SMS reply or call outcome" },
  { id: "ai-dispatch", type: "process", label: "AI Dispatch", x: 1040, y: 280, icon: "truck", color: "bg-orange-500", description: "Route to closest responder" },
  { id: "dispatch-volunteer", type: "action", label: "Volunteer", x: 1300, y: 100, icon: "play", color: "bg-lime-500", description: "Deploy nearby volunteer" },
  { id: "dispatch-ambulance", type: "action", label: "Ambulance", x: 1300, y: 210, icon: "truck", color: "bg-red-500", description: "Dispatch ambulance unit" },
  { id: "dispatch-paramedic", type: "action", label: "Paramedic", x: 1300, y: 320, icon: "truck", color: "bg-amber-500", description: "Send paramedic team" },
  { id: "dispatch-er", type: "action", label: "ER", x: 1300, y: 430, icon: "alertTriangle", color: "bg-rose-600", description: "Route to emergency room" },
  { id: "whatsapp-location", type: "action", label: "WhatsApp Location Drop", x: 1560, y: 210, icon: "whatsapp", color: "bg-emerald-500", description: "Send GPS to responder" },
  { id: "transfer-call", type: "action", label: "Transfer Call", x: 1560, y: 370, icon: "arrowRightLeft", color: "bg-sky-500", description: "Transfer to department" },
];

const INITIAL_CONNECTIONS: Connection[] = [
  { from: "trigger", to: "ai-classify" },
  { from: "ai-classify", to: "sms-low", label: "Low Risk", labelColor: "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700" },
  { from: "ai-classify", to: "call-medium", label: "Medium Risk", labelColor: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700" },
  { from: "ai-classify", to: "call-critical", label: "Critical", labelColor: "bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-700" },
  { from: "sms-low", to: "ai-analyze" },
  { from: "call-medium", to: "ai-analyze" },
  { from: "call-critical", to: "ai-analyze" },
  { from: "ai-analyze", to: "ai-dispatch" },
  { from: "ai-dispatch", to: "dispatch-volunteer", label: "Volunteer", labelColor: "bg-lime-100 text-lime-700 border-lime-300 dark:bg-lime-900/40 dark:text-lime-300 dark:border-lime-700" },
  { from: "ai-dispatch", to: "dispatch-ambulance", label: "Ambulance", labelColor: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700" },
  { from: "ai-dispatch", to: "dispatch-paramedic", label: "Paramedic", labelColor: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700" },
  { from: "ai-dispatch", to: "dispatch-er", label: "ER", labelColor: "bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-700" },
  { from: "dispatch-volunteer", to: "whatsapp-location" },
  { from: "dispatch-ambulance", to: "whatsapp-location" },
  { from: "dispatch-paramedic", to: "whatsapp-location" },
  { from: "dispatch-er", to: "whatsapp-location" },
  { from: "dispatch-volunteer", to: "transfer-call" },
  { from: "dispatch-ambulance", to: "transfer-call" },
  { from: "dispatch-paramedic", to: "transfer-call" },
  { from: "dispatch-er", to: "transfer-call" },
];

const NODE_WIDTH = 200;
const NODE_HEIGHT = 72;

function ConnectionLine({ from, to, nodes, label, labelColor }: { from: string; to: string; nodes: WorkflowNode[]; label?: string; labelColor?: string }) {
  const fromNode = nodes.find((n) => n.id === from);
  const toNode = nodes.find((n) => n.id === to);
  if (!fromNode || !toNode) return null;

  const x1 = fromNode.x + NODE_WIDTH;
  const y1 = fromNode.y + NODE_HEIGHT / 2;
  const x2 = toNode.x;
  const y2 = toNode.y + NODE_HEIGHT / 2;
  const cx1 = x1 + (x2 - x1) * 0.5;
  const cx2 = x2 - (x2 - x1) * 0.5;

  const pathD = `M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`;

  const labelX = x1 + (x2 - x1) * 0.5;
  const labelY = y1 + (y2 - y1) * 0.5;

  return (
    <g>
      <path d={pathD} stroke="currentColor" className="text-slate-300 dark:text-slate-600" strokeWidth={2} fill="none" />
      <motion.circle
        r={3}
        fill="currentColor"
        className="text-teal-500"
        initial={{ offsetDistance: "0%" }}
        animate={{ offsetDistance: "100%" }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        style={{ offsetPath: `path('${pathD}')` }}
      />
      {label && (
        <foreignObject x={labelX - 50} y={labelY - 12} width={100} height={24} className="overflow-visible">
          <div className="flex items-center justify-center">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${labelColor || "bg-slate-100 text-slate-600 border-slate-300"} whitespace-nowrap`}>
              {label}
            </span>
          </div>
        </foreignObject>
      )}
    </g>
  );
}

function NodeDetailPanel({ node, onClose }: { node: WorkflowNode; onClose: () => void }) {
  const Icon = NODE_ICONS[node.icon] || Zap;
  const detail = NODE_DETAILS[node.id] || node.description;
  const isSmsNode = node.id === "sms-low";

  const highlightPlaceholders = (text: string) => {
    const parts = text.split(/({{[^}]+}})/g);
    return parts.map((part, i) => {
      if (part.match(/^{{[^}]+}}$/)) {
        return (
          <span key={i} className="inline-block bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 px-1.5 py-0.5 rounded font-mono text-xs mx-0.5">
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="absolute right-4 top-4 bottom-4 w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden"
      data-testid="node-detail-panel"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg ${node.color} flex items-center justify-center`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{node.label}</h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">{node.description}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          data-testid="close-detail-panel"
          className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 dark:hover:text-slate-300"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
              {isSmsNode ? "SMS Template (Arabic)" : "Configuration"}
            </div>
            {isSmsNode ? (
              <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap" dir="rtl" data-testid="sms-template-content">
                {highlightPlaceholders(detail)}
              </div>
            ) : (
              <div className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap" data-testid="node-detail-content">
                {detail}
              </div>
            )}
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Node Info</div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Type</span>
                <span className="text-slate-700 dark:text-slate-300 font-medium">{node.type}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">ID</span>
                <span className="text-slate-700 dark:text-slate-300 font-mono text-[11px]">{node.id}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function DraggableNode({
  node,
  onDrag,
  onRemove,
  isSelected,
  onSelect,
}: {
  node: WorkflowNode;
  onDrag: (id: string, x: number, y: number) => void;
  onRemove: (id: string) => void;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  const Icon = NODE_ICONS[node.icon] || Zap;
  const dragRef = useRef<{ startX: number; startY: number; nodeX: number; nodeY: number } | null>(null);
  const nodeRef = useRef<HTMLDivElement>(null);
  const isCritical = node.id === "call-critical";

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      onSelect(node.id);
      dragRef.current = { startX: e.clientX, startY: e.clientY, nodeX: node.x, nodeY: node.y };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [node.id, node.x, node.y, onSelect]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      onDrag(node.id, dragRef.current.nodeX + dx, dragRef.current.nodeY + dy);
    },
    [node.id, onDrag]
  );

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  return (
    <motion.div
      ref={nodeRef}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={`absolute select-none cursor-grab active:cursor-grabbing group`}
      style={{ left: node.x, top: node.y, width: NODE_WIDTH }}
      data-testid={`workflow-node-${node.id}`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(node.id);
      }}
    >
      <Card
        className={`border-2 transition-colors shadow-md ${
          isCritical ? "ring-2 ring-rose-400/30" : ""
        } ${
          isSelected
            ? "border-teal-500 shadow-teal-500/20"
            : isCritical
            ? "border-rose-300 dark:border-rose-700 hover:border-rose-400"
            : "border-slate-200 dark:border-slate-700 hover:border-teal-400"
        }`}
      >
        <CardContent className="p-3 flex items-center gap-3">
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="touch-none flex items-center gap-2 flex-1 min-w-0"
          >
            <GripVertical className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className={`w-8 h-8 rounded-lg ${node.color} flex items-center justify-center flex-shrink-0`}>
              <Icon className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{node.label}</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{node.description}</div>
            </div>
          </div>
          {node.type !== "trigger" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(node.id);
              }}
              data-testid={`remove-node-${node.id}`}
              className="opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </CardContent>
      </Card>
      <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" />
      <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-teal-500 bg-white dark:bg-slate-800" />
    </motion.div>
  );
}

export function N8nWorkflowBlock() {
  const [nodes, setNodes] = useState<WorkflowNode[]>(INITIAL_NODES);
  const [connections, setConnections] = useState<Connection[]>(INITIAL_CONNECTIONS);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;

  const handleDrag = useCallback((id: string, x: number, y: number) => {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, x: Math.max(0, x), y: Math.max(0, y) } : n)));
  }, []);

  const handleRemoveNode = useCallback(
    (id: string) => {
      setNodes((prev) => prev.filter((n) => n.id !== id));
      setConnections((prev) => prev.filter((c) => c.from !== id && c.to !== id));
      if (selectedNodeId === id) setSelectedNodeId(null);
    },
    [selectedNodeId]
  );

  const handleAddNode = useCallback(
    (template: (typeof NODE_TEMPLATES)[number]) => {
      const id = `node-${Date.now()}`;
      const maxX = nodes.reduce((max, n) => Math.max(max, n.x), 0);
      const newNode: WorkflowNode = {
        id,
        type: "process",
        label: template.label,
        x: maxX + 240,
        y: 160 + Math.random() * 120,
        icon: template.icon,
        color: template.color,
        description: template.description,
      };
      setNodes((prev) => [...prev, newNode]);

      if (nodes.length > 0) {
        const lastNode = nodes[nodes.length - 1];
        setConnections((prev) => [...prev, { from: lastNode.id, to: id }]);
      }

      setShowAddMenu(false);
      setSelectedNodeId(id);
    },
    [nodes]
  );

  const handleCanvasClick = useCallback(() => {
    setSelectedNodeId(null);
    setShowAddMenu(false);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowAddMenu(false);
        setSelectedNodeId(null);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <div className="flex-1 flex flex-col overflow-hidden" data-testid="workflow-builder">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <h2 className="font-display font-bold text-lg text-slate-900 dark:text-slate-100 tracking-wide uppercase">
            AI Automation
          </h2>
          <Badge variant="secondary" className="text-xs" data-testid="badge-node-count">
            {nodes.length} nodes
          </Badge>
          <Badge variant="outline" className="text-xs" data-testid="badge-connection-count">
            {connections.length} connections
          </Badge>
        </div>
        <div className="relative">
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setShowAddMenu(!showAddMenu);
            }}
            data-testid="button-add-node"
            className="gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add Node
          </Button>
          {showAddMenu && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 py-1"
              data-testid="add-node-menu"
            >
              {NODE_TEMPLATES.map((template) => {
                const Icon = NODE_ICONS[template.icon];
                return (
                  <button
                    key={template.label}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddNode(template);
                    }}
                    data-testid={`add-node-${template.label.toLowerCase().replace(/\s+/g, "-")}`}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left"
                  >
                    <div className={`w-7 h-7 rounded-md ${template.color} flex items-center justify-center`}>
                      <Icon className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{template.label}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">{template.description}</div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 ml-auto" />
                  </button>
                );
              })}
            </motion.div>
          )}
        </div>
      </div>

      <div
        ref={canvasRef}
        className="flex-1 relative overflow-auto bg-slate-50 dark:bg-slate-900"
        onClick={handleCanvasClick}
        data-testid="workflow-canvas"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(148,163,184,0.2) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      >
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ minWidth: 1900, minHeight: 600 }}>
          {connections.map((conn) => (
            <ConnectionLine key={`${conn.from}-${conn.to}`} from={conn.from} to={conn.to} nodes={nodes} label={conn.label} labelColor={conn.labelColor} />
          ))}
        </svg>

        <div className="relative" style={{ minWidth: 1900, minHeight: 600 }}>
          {nodes.map((node) => (
            <DraggableNode
              key={node.id}
              node={node}
              onDrag={handleDrag}
              onRemove={handleRemoveNode}
              isSelected={selectedNodeId === node.id}
              onSelect={setSelectedNodeId}
            />
          ))}
        </div>

        <AnimatePresence>
          {selectedNode && (
            <NodeDetailPanel
              key={selectedNode.id}
              node={selectedNode}
              onClose={() => setSelectedNodeId(null)}
            />
          )}
        </AnimatePresence>
      </div>

      <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm flex items-center justify-between text-xs text-slate-500 dark:text-slate-400" data-testid="workflow-footer">
        <span>{nodes.length} nodes &middot; {connections.length} connections</span>
        <span>Click a node for details &middot; Drag to reposition &middot; Click + to add</span>
      </div>
    </div>
  );
}
