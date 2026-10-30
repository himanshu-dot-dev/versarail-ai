import React from 'react'
import {
  Activity,
  AlertCircle,
  ArrowDown,
  ArrowLeftRight,
  ArrowRight,
  ArrowUp,
  Bot,
  Boxes,
  Brain,
  Check,
  CheckCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ChevronsUpDown,
  Circle,
  Clock,
  Code,
  CornerDownRight,
  Cpu,
  CreditCard,
  Download,
  EyeOff,
  FileCode2,
  FileText,
  Folder,
  FolderGit2,
  FolderOpen,
  Gauge,
  GitBranch,
  GitCommit,
  GitCompare,
  GitFork,
  Info,
  Key,
  Layers,
  Loader2,
  Lock,
  MessageSquare,
  Minus,
  Network,
  Palette,
  PanelRight,
  PanelRightClose,
  Paperclip,
  Plus,
  RefreshCw,
  RotateCcw,
  Route,
  Search,
  Send,
  Server,
  Shield,
  ShieldCheck,
  Sliders,
  Sparkles,
  Square,
  Terminal,
  Trash2,
  TrendingUp,
  UploadCloud,
  User,
  Workflow,
  X,
  Zap,
  LucideProps
} from 'lucide-react'

export interface IconProps {
  name: string
  className?: string
  size?: number | string
  filled?: boolean
  style?: React.CSSProperties
  title?: string
  onClick?: (e: React.MouseEvent) => void
}

/**
 * Robust map from Material icon names to local SVG Lucide components.
 * 100% offline, zero Google Fonts CDN dependencies, zero ligature text leak.
 */
const ICON_MAP: Record<string, React.FC<LucideProps>> = {
  // Navigation & Shell
  chat: MessageSquare,
  folder: Folder,
  folder_open: FolderOpen,
  folder_special: FolderGit2,
  description: FileText,
  smart_toy: Bot,
  donut_large: Gauge,
  history: Clock,
  settings: Sliders,
  person: User,
  tune: Sliders,
  neurology: Brain,
  security: Shield,
  shield_lock: ShieldCheck,
  palette: Palette,
  privacy: ShieldCheck,
  advanced: Code,

  // Window Controls
  remove: Minus,
  square: Square,
  filter_none: Layers,
  close: X,

  // Actions & Controls
  add: Plus,
  send: Send,
  arrow_upward: ArrowUp,
  arrow_forward: ArrowRight,
  chevron_right: ChevronRight,
  expand_more: ChevronDown,
  expand_less: ChevronUp,
  arrow_drop_down: ChevronDown,
  unfold_more: ChevronsUpDown,
  refresh: RefreshCw,
  sync: RefreshCw,
  restart_alt: RotateCcw,
  download: Download,
  clear_all: Trash2,
  delete: Trash2,
  delete_forever: Trash2,
  search: Search,
  dock_to_left: PanelRightClose,
  attach_file: Paperclip,
  cloud_upload: UploadCloud,

  // Status & Telemetry
  check: Check,
  check_circle: CheckCircle2,
  progress_activity: Loader2,
  radio_button_unchecked: Circle,
  error: AlertCircle,
  bolt: Zap,
  speed: Gauge,
  hub: Cpu,
  alt_route: GitFork,
  route: Route,
  account_tree: Workflow,
  code: Code,
  code_blocks: FileCode2,
  commit: GitCommit,
  difference: GitCompare,
  dns: Server,
  trending_up: TrendingUp,
  payments: CreditCard,
  pending_actions: Clock,
  psychology: Brain,
  auto_awesome: Sparkles,
  visibility_off: EyeOff,
  vpn_key: Key,
  lock: Lock,
  info: Info
}

export const Icon: React.FC<IconProps> = ({
  name,
  className = '',
  size = 18,
  style = {},
  title,
  onClick
}) => {
  const numericSize = typeof size === 'number' ? size : parseInt(size, 10) || 18
  const LucideComponent = ICON_MAP[name] || Sparkles

  return (
    <LucideComponent
      size={numericSize}
      className={`shrink-0 select-none inline-block ${className}`}
      style={style}
      aria-label={title || name}
      onClick={onClick}
    />
  )
}

export default Icon
