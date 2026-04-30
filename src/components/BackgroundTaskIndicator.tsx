import { useBackgroundTasks, type BackgroundTask } from '@/hooks/BackgroundTaskContext';
import { Link } from 'react-router-dom';
import { Loader2, CheckCircle, AlertTriangle, ScanLine, Search } from 'lucide-react';

/* ─── Floating Background Task Indicator ─────────────────────────────────── */

const BackgroundTaskIndicator = () => {
  const { activeTasks, getPlagiarismTask, getAutomationTask } = useBackgroundTasks();

  const plagiarismTask = getPlagiarismTask();
  const automationTask = getAutomationTask();

  // Show all tasks that are either processing or recently completed
  const visibleTasks: BackgroundTask[] = [];
  if (plagiarismTask) visibleTasks.push(plagiarismTask);
  if (automationTask) visibleTasks.push(automationTask);

  if (visibleTasks.length === 0) return null;

  // Only show tasks that are actively processing
  const processingTasks = visibleTasks.filter((t) => t.status === 'processing');
  if (processingTasks.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      {processingTasks.map((task) => (
        <Link
          key={task.id}
          to={task.type === 'plagiarism' ? '/plagiarism' : '/automation'}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-all text-xs font-medium text-primary animate-pulse"
          title={`${task.stage} — ${task.progress}%`}
        >
          {task.type === 'plagiarism' ? (
            <Search className="w-3 h-3" />
          ) : (
            <ScanLine className="w-3 h-3" />
          )}
          <Loader2 className="w-3 h-3 animate-spin" />
          <span className="hidden sm:inline max-w-[120px] truncate">
            {task.label}
          </span>
          <span>{task.progress}%</span>
        </Link>
      ))}
    </div>
  );
};

export default BackgroundTaskIndicator;
